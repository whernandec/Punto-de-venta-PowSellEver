import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Put,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class GuardarTicketDto {
  @IsOptional() @IsString() identificadorFiscal?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() provinciaDepartamentoPais?: string;
  @IsOptional() @IsString() nombreDeMoneda?: string;
  @IsOptional() @IsString() agradecimiento?: string;
  @IsOptional() @IsString() paginaWebFacebook?: string;
  @IsOptional() @IsString() anuncio?: string;
  @IsOptional() @IsString() datosFiscales?: string;
  /** 'TICKET' | 'FACTURA' (se guarda en AppConfig). */
  @IsOptional() @IsString() formato?: string;
  /** Logo como data URL (se guarda en AppConfig). */
  @IsOptional() @IsString() logo?: string;
}

const CLAVE_FORMATO = 'ticket.formato';
const CLAVE_LOGO = 'ticket.logo';

@Injectable()
export class TicketService {
  constructor(private readonly prisma: PrismaService) {}

  private async appGet(clave: string): Promise<string | null> {
    const r = await this.prisma.appConfig.findUnique({ where: { clave } });
    return r?.valor ?? null;
  }
  private async appSet(clave: string, valor: string): Promise<void> {
    await this.prisma.appConfig.upsert({
      where: { clave },
      create: { clave, valor },
      update: { valor },
    });
  }

  async obtener() {
    const t = await this.prisma.ticket.findFirst({ orderBy: { idTicket: 'asc' } });
    const formato = (await this.appGet(CLAVE_FORMATO)) ?? 'TICKET';
    const logo = (await this.appGet(CLAVE_LOGO)) ?? '';
    return { ...(t ?? {}), formato, logo };
  }

  async guardar(dto: GuardarTicketDto) {
    const data = {
      identificadorFiscal: dto.identificadorFiscal ?? undefined,
      direccion: dto.direccion ?? undefined,
      provinciaDepartamentoPais: dto.provinciaDepartamentoPais ?? undefined,
      nombreDeMoneda: dto.nombreDeMoneda ?? undefined,
      agradecimiento: dto.agradecimiento ?? undefined,
      paginaWebFacebook: dto.paginaWebFacebook ?? undefined,
      anuncio: dto.anuncio ?? undefined,
      datosFiscales: dto.datosFiscales ?? undefined,
    };
    const existente = await this.prisma.ticket.findFirst();
    const t = existente
      ? await this.prisma.ticket.update({
          where: { idTicket: existente.idTicket },
          data,
        })
      : await this.prisma.ticket.create({ data: { ...data, porDefecto: 'SI' } });

    if (dto.formato !== undefined) await this.appSet(CLAVE_FORMATO, dto.formato);
    if (dto.logo !== undefined) await this.appSet(CLAVE_LOGO, dto.logo);
    return this.obtener();
  }
}

@Controller('ticket')
export class TicketController {
  constructor(private readonly srv: TicketService) {}

  @Get() obtener() {
    return this.srv.obtener();
  }
  // Upsert simple: guarda la única plantilla de ticket.
  @Post() crear(@Body() dto: GuardarTicketDto) {
    return this.srv.guardar(dto);
  }
  @Put() actualizar(@Body() dto: GuardarTicketDto) {
    return this.srv.guardar(dto);
  }
}

@Module({
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketModule {}
