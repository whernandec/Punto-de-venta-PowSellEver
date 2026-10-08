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
}

@Injectable()
export class TicketService {
  constructor(private readonly prisma: PrismaService) {}

  obtener() {
    return this.prisma.ticket.findFirst({ orderBy: { idTicket: 'asc' } });
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
    if (existente) {
      return this.prisma.ticket.update({
        where: { idTicket: existente.idTicket },
        data,
      });
    }
    return this.prisma.ticket.create({ data: { ...data, porDefecto: 'SI' } });
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
