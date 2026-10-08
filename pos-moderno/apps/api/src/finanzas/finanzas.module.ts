import {
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Query,
} from '@nestjs/common';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

// --- DTOs ---
export class CrearConceptoDto {
  @IsString() @IsNotEmpty() descripcion!: string;
}
export class CrearGastoDto {
  @IsNumber() @Min(0) importe!: number;
  @IsString() @IsNotEmpty() descripcion!: string;
  @IsInt() idCaja!: number;
  @IsOptional() @IsInt() idConcepto?: number;
  @IsOptional() @IsString() nroDocumento?: string;
  @IsOptional() @IsString() tipoComprobante?: string;
}
export class CrearIngresoDto {
  @IsNumber() @Min(0) importe!: number;
  @IsString() @IsNotEmpty() descripcion!: string;
  @IsInt() idCaja!: number;
  @IsOptional() @IsString() nroComprobante?: string;
  @IsOptional() @IsString() tipoComprobante?: string;
}

// --- Service (nativo Prisma) ---
@Injectable()
export class FinanzasService {
  constructor(private readonly prisma: PrismaService) {}

  conceptos() {
    return this.prisma.concepto.findMany({ orderBy: { idConcepto: 'asc' } });
  }

  async crearConcepto(dto: CrearConceptoDto) {
    const dup = await this.prisma.concepto.findFirst({
      where: { descripcion: dto.descripcion },
    });
    if (dup) throw new ConflictException('Concepto ya registrado');
    return this.prisma.concepto.create({ data: { descripcion: dto.descripcion } });
  }

  gastos(idCaja?: number) {
    return this.prisma.gastoVario.findMany({
      where: idCaja ? { idCaja } : undefined,
      orderBy: { idGasto: 'desc' },
      take: 200,
    });
  }

  crearGasto(dto: CrearGastoDto) {
    return this.prisma.gastoVario.create({
      data: {
        fecha: new Date(),
        importe: dto.importe,
        descripcion: dto.descripcion,
        idCaja: dto.idCaja,
        idConcepto: dto.idConcepto ?? null,
        nroDocumento: dto.nroDocumento ?? '',
        tipoComprobante: dto.tipoComprobante ?? '',
      },
      select: { idGasto: true },
    });
  }

  ingresos(idCaja?: number) {
    return this.prisma.ingresoVario.findMany({
      where: idCaja ? { idCaja } : undefined,
      orderBy: { idIngreso: 'desc' },
      take: 200,
    });
  }

  crearIngreso(dto: CrearIngresoDto) {
    return this.prisma.ingresoVario.create({
      data: {
        fecha: new Date(),
        importe: dto.importe,
        descripcion: dto.descripcion,
        idCaja: dto.idCaja,
        nroComprobante: dto.nroComprobante ?? '',
        tipoComprobante: dto.tipoComprobante ?? '',
      },
      select: { idIngreso: true },
    });
  }
}

// --- Controllers ---
@Controller('conceptos')
export class ConceptosController {
  constructor(private readonly srv: FinanzasService) {}
  @Get() listar() {
    return this.srv.conceptos();
  }
  @Post() crear(@Body() dto: CrearConceptoDto) {
    return this.srv.crearConcepto(dto);
  }
}

@Controller('gastos')
export class GastosController {
  constructor(private readonly srv: FinanzasService) {}
  @Get() listar(@Query('idCaja') idCaja?: string) {
    return this.srv.gastos(idCaja ? Number(idCaja) : undefined);
  }
  @Post() crear(@Body() dto: CrearGastoDto) {
    return this.srv.crearGasto(dto);
  }
}

@Controller('ingresos')
export class IngresosController {
  constructor(private readonly srv: FinanzasService) {}
  @Get() listar(@Query('idCaja') idCaja?: string) {
    return this.srv.ingresos(idCaja ? Number(idCaja) : undefined);
  }
  @Post() crear(@Body() dto: CrearIngresoDto) {
    return this.srv.crearIngreso(dto);
  }
}

@Module({
  controllers: [ConceptosController, GastosController, IngresosController],
  providers: [FinanzasService],
})
export class FinanzasModule {}
