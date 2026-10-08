import { Module } from '@nestjs/common';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// --- DTO ---
export class CrearProveedorDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() identificadorFiscal?: string;
  @IsOptional() @IsString() celular?: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsNumber() saldo?: number;
}

// --- Repository (lecturas limpias; alta vía SP insertar_Proveedores) ---
@Injectable()
export class ProveedoresRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.proveedor.findMany({ orderBy: { idProveedor: 'asc' } });
  }

  crear(dto: CrearProveedorDto) {
    // insertar_Proveedores valida nombre duplicado (RAISERROR) y usa este orden de params.
    return this.prisma.$executeRawUnsafe(
      'EXEC dbo.insertar_Proveedores @P1,@P2,@P3,@P4,@P5,@P6',
      dto.nombre,
      dto.direccion ?? '',
      dto.identificadorFiscal ?? '',
      dto.celular ?? '',
      dto.estado ?? 'ACTIVO',
      dto.saldo ?? 0,
    );
  }
}

// --- Controller ---
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly repo: ProveedoresRepository) {}

  @Get()
  findAll() {
    return this.repo.findAll();
  }

  @Post()
  async crear(@Body() dto: CrearProveedorDto) {
    await this.repo.crear(dto);
    return { creado: true, nombre: dto.nombre };
  }
}

@Module({
  controllers: [ProveedoresController],
  providers: [ProveedoresRepository],
  exports: [ProveedoresRepository],
})
export class ProveedoresModule {}
