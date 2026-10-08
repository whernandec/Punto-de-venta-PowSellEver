import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class ActualizarEmpresaDto {
  @IsOptional() @IsString() nombreEmpresa?: string;
  @IsOptional() @IsString() impuesto?: string;
  @IsOptional() @IsNumber() porcentajeImpuesto?: number;
  @IsOptional() @IsString() moneda?: string;
  @IsOptional() @IsString() trabajasConImpuestos?: string;
  @IsOptional() @IsString() modoDeBusqueda?: string;
  @IsOptional() @IsString() correoParaReportes?: string;
  @IsOptional() @IsString() pais?: string;
}

const SELECT = {
  idEmpresa: true,
  nombreEmpresa: true,
  impuesto: true,
  porcentajeImpuesto: true,
  moneda: true,
  trabajasConImpuestos: true,
  modoDeBusqueda: true,
  correoParaReportes: true,
  pais: true,
} as const;

@Injectable()
export class EmpresaService {
  constructor(private readonly prisma: PrismaService) {}

  // Devuelve la empresa configurada (sin el blob Logo).
  obtener() {
    return this.prisma.empresa.findFirst({ select: SELECT });
  }

  async actualizar(id: number, dto: ActualizarEmpresaDto) {
    const existe = await this.prisma.empresa.findUnique({
      where: { idEmpresa: id },
    });
    if (!existe) throw new NotFoundException(`Empresa ${id} no encontrada`);
    return this.prisma.empresa.update({
      where: { idEmpresa: id },
      data: {
        nombreEmpresa: dto.nombreEmpresa ?? undefined,
        impuesto: dto.impuesto ?? undefined,
        porcentajeImpuesto: dto.porcentajeImpuesto ?? undefined,
        moneda: dto.moneda ?? undefined,
        trabajasConImpuestos: dto.trabajasConImpuestos ?? undefined,
        modoDeBusqueda: dto.modoDeBusqueda ?? undefined,
        correoParaReportes: dto.correoParaReportes ?? undefined,
        pais: dto.pais ?? undefined,
      },
      select: SELECT,
    });
  }
}

@Controller('empresa')
export class EmpresaController {
  constructor(private readonly srv: EmpresaService) {}

  @Get()
  obtener() {
    return this.srv.obtener();
  }

  @Put(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarEmpresaDto,
  ) {
    return this.srv.actualizar(id, dto);
  }
}

@Module({
  controllers: [EmpresaController],
  providers: [EmpresaService],
})
export class EmpresaModule {}
