import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class CrearCobroDto {
  @IsInt() idCliente!: number;
  @IsInt() idUsuario!: number;
  @IsInt() idCaja!: number;
  @IsNumber() @Min(0.01) monto!: number;
  @IsOptional() @IsString() detalle?: string;
  @IsOptional() @IsNumber() efectivo?: number;
  @IsOptional() @IsNumber() tarjeta?: number;
  @IsOptional() @IsString() comprobante?: string;
}

@Injectable()
export class CobrosService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.controlCobro.findMany({
      orderBy: { idControlCobro: 'desc' },
      take: 200,
    });
  }

  /** Registra un abono y descuenta el saldo del cliente (transacción). */
  async registrar(dto: CrearCobroDto) {
    return this.prisma.$transaction(async (tx) => {
      const cli = await tx.cliente.findUnique({
        where: { idClienteV: dto.idCliente },
      });
      if (!cli) throw new NotFoundException(`Cliente ${dto.idCliente} no encontrado`);

      const cobro = await tx.controlCobro.create({
        data: {
          monto: dto.monto,
          fecha: new Date(),
          detalle: dto.detalle ?? '',
          idCliente: dto.idCliente,
          idUsuario: dto.idUsuario,
          idCaja: dto.idCaja,
          comprobante: dto.comprobante ?? '',
          efectivo: dto.efectivo ?? dto.monto,
          tarjeta: dto.tarjeta ?? 0,
        },
        select: { idControlCobro: true },
      });

      await tx.cliente.update({
        where: { idClienteV: dto.idCliente },
        data: { saldo: { decrement: dto.monto } },
      });

      return { idCobro: cobro.idControlCobro, idCliente: dto.idCliente };
    });
  }
}

@Controller('cobros')
export class CobrosController {
  constructor(private readonly srv: CobrosService) {}

  @Get()
  listar() {
    return this.srv.listar();
  }

  @Post()
  registrar(@Body() dto: CrearCobroDto) {
    return this.srv.registrar(dto);
  }
}

@Module({
  controllers: [CobrosController],
  providers: [CobrosService],
})
export class CobrosModule {}
