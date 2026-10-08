import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class CrearClienteDto {
  @IsString() @IsNotEmpty() nombre!: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() identificadorFiscal?: string;
  @IsOptional() @IsString() celular?: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsNumber() saldo?: number;
}
export class ActualizarClienteDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() identificadorFiscal?: string;
  @IsOptional() @IsString() celular?: string;
  @IsOptional() @IsNumber() saldo?: number;
}

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    const rows = await this.prisma.cliente.findMany({
      where: { estado: { not: 'ELIMINADO' }, nombre: { not: 'GENERICO' } },
      orderBy: { idClienteV: 'asc' },
    });
    // Normaliza idClienteV -> idCliente para el DTO compartido.
    return rows.map((c) => ({
      idCliente: c.idClienteV,
      nombre: c.nombre,
      direccion: c.direccion,
      identificadorFiscal: c.identificadorFiscal,
      celular: c.celular,
      estado: c.estado,
      saldo: c.saldo,
    }));
  }

  crear(dto: CrearClienteDto) {
    return this.prisma.cliente.create({
      data: {
        nombre: dto.nombre,
        direccion: dto.direccion ?? '',
        identificadorFiscal: dto.identificadorFiscal ?? '',
        celular: dto.celular ?? '',
        estado: dto.estado ?? 'ACTIVO',
        saldo: dto.saldo ?? 0,
      },
      select: { idClienteV: true, nombre: true },
    });
  }

  async actualizar(id: number, dto: ActualizarClienteDto) {
    const c = await this.prisma.cliente.findUnique({ where: { idClienteV: id } });
    if (!c) throw new NotFoundException(`Cliente ${id} no encontrado`);
    return this.prisma.cliente.update({
      where: { idClienteV: id },
      data: {
        nombre: dto.nombre ?? undefined,
        direccion: dto.direccion ?? undefined,
        identificadorFiscal: dto.identificadorFiscal ?? undefined,
        celular: dto.celular ?? undefined,
        saldo: dto.saldo ?? undefined,
      },
      select: { idClienteV: true },
    });
  }

  async eliminar(id: number) {
    const c = await this.prisma.cliente.findUnique({ where: { idClienteV: id } });
    if (!c) throw new NotFoundException(`Cliente ${id} no encontrado`);
    if (c.nombre === 'GENERICO') {
      throw new BadRequestException('El cliente GENERICO no se puede eliminar');
    }
    await this.prisma.cliente.update({
      where: { idClienteV: id },
      data: { estado: 'ELIMINADO' },
    });
    return { eliminado: true, idCliente: id };
  }
}

@Controller('clientes')
export class ClientesController {
  constructor(private readonly srv: ClientesService) {}

  @Get()
  listar() {
    return this.srv.listar();
  }

  @Post()
  crear(@Body() dto: CrearClienteDto) {
    return this.srv.crear(dto);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarClienteDto,
  ) {
    return this.srv.actualizar(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.srv.eliminar(id);
  }
}

@Module({
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
