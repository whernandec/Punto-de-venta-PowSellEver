import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Put,
} from '@nestjs/common';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { ReportesModule } from '../reportes/reportes.module';
import { ReportesService } from '../reportes/reportes.service';

export class GuardarCorreoDto {
  @IsOptional() @IsString() correo?: string;
  @IsOptional() @IsString() password?: string;
  @IsOptional() @IsString() estadoEnvio?: string;
}

export class EnviarReporteDto {
  @IsEmail() para!: string;
  @IsString() desde!: string;
  @IsString() hasta!: string;
}

@Injectable()
export class CorreoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportes: ReportesService,
  ) {}

  /** Config sin exponer la contraseña. */
  async obtener() {
    const c = await this.prisma.correoBase.findFirst();
    return c
      ? { idCorreo: c.idCorreo, correo: c.correo, estadoEnvio: c.estadoEnvio }
      : null;
  }

  async guardar(dto: GuardarCorreoDto) {
    const existente = await this.prisma.correoBase.findFirst();
    const data = {
      correo: dto.correo ?? undefined,
      password: dto.password ?? undefined,
      estadoEnvio: dto.estadoEnvio ?? undefined,
    };
    const c = existente
      ? await this.prisma.correoBase.update({
          where: { idCorreo: existente.idCorreo },
          data,
        })
      : await this.prisma.correoBase.create({
          data: {
            correo: dto.correo ?? '',
            password: dto.password ?? '',
            estadoEnvio: dto.estadoEnvio ?? 'ACTIVO',
          },
        });
    return { idCorreo: c.idCorreo, correo: c.correo, estadoEnvio: c.estadoEnvio };
  }

  /** Envía el reporte de ventas (PDF) por correo usando la config guardada. */
  async enviarReporte(dto: EnviarReporteDto) {
    const cfg = await this.prisma.correoBase.findFirst();
    if (!cfg?.correo || !cfg.password) {
      throw new BadRequestException(
        'No hay correo configurado (correo/contraseña).',
      );
    }

    const pdf = await this.reportes.ventasPdf(dto.desde, dto.hasta);

    // SMTP configurable por entorno; por defecto Gmail.
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: (process.env.SMTP_SECURE ?? 'true') === 'true',
      auth: { user: cfg.correo, pass: cfg.password },
    });

    await transporter.sendMail({
      from: cfg.correo,
      to: dto.para,
      subject: `Reporte de ventas ${dto.desde} a ${dto.hasta}`,
      text: 'Adjunto el reporte de ventas del periodo solicitado.',
      attachments: [
        {
          filename: `ventas_${dto.desde}_${dto.hasta}.pdf`,
          content: pdf,
        },
      ],
    });

    return { enviado: true, para: dto.para };
  }
}

@Controller('correo')
export class CorreoController {
  constructor(private readonly srv: CorreoService) {}

  @Get() obtener() {
    return this.srv.obtener();
  }
  @Post() crear(@Body() dto: GuardarCorreoDto) {
    return this.srv.guardar(dto);
  }
  @Put() actualizar(@Body() dto: GuardarCorreoDto) {
    return this.srv.guardar(dto);
  }
  @Post('enviar-reporte') enviar(@Body() dto: EnviarReporteDto) {
    return this.srv.enviarReporte(dto);
  }
}

@Module({
  imports: [ReportesModule],
  controllers: [CorreoController],
  providers: [CorreoService],
})
export class CorreoModule {}
