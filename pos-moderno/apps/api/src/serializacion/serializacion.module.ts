import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class CrearSerieDto {
  @IsString() @IsNotEmpty() serie!: string;
  @IsOptional() @IsString() tipoDoc?: string;
  @IsOptional() @IsString() destino?: string;
  @IsOptional() @IsString() cantidadDeNumeros?: string;
  @IsOptional() @IsString() numeroFin?: string;
  @IsOptional() @IsString() porDefecto?: string;
}
export class ActualizarSerieDto {
  @IsOptional() @IsString() serie?: string;
  @IsOptional() @IsString() tipoDoc?: string;
  @IsOptional() @IsString() destino?: string;
  @IsOptional() @IsString() cantidadDeNumeros?: string;
  @IsOptional() @IsString() numeroFin?: string;
  @IsOptional() @IsString() porDefecto?: string;
}

@Injectable()
export class SerializacionService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.serializacion.findMany({
      orderBy: { idSerializacion: 'asc' },
    });
  }

  crear(dto: CrearSerieDto) {
    return this.prisma.serializacion.create({
      data: {
        serie: dto.serie,
        tipoDoc: dto.tipoDoc ?? '',
        destino: dto.destino ?? '',
        cantidadDeNumeros: dto.cantidadDeNumeros ?? '8',
        numeroFin: dto.numeroFin ?? '0',
        porDefecto: dto.porDefecto ?? 'NO',
      },
    });
  }

  actualizar(id: number, dto: ActualizarSerieDto) {
    return this.prisma.serializacion.update({
      where: { idSerializacion: id },
      data: {
        serie: dto.serie ?? undefined,
        tipoDoc: dto.tipoDoc ?? undefined,
        destino: dto.destino ?? undefined,
        cantidadDeNumeros: dto.cantidadDeNumeros ?? undefined,
        numeroFin: dto.numeroFin ?? undefined,
        porDefecto: dto.porDefecto ?? undefined,
      },
    });
  }

  async eliminar(id: number) {
    await this.prisma.serializacion.delete({ where: { idSerializacion: id } });
    return { eliminado: true, id };
  }
}

@Controller('serializacion')
export class SerializacionController {
  constructor(private readonly srv: SerializacionService) {}

  @Get() listar() {
    return this.srv.listar();
  }
  @Post() crear(@Body() dto: CrearSerieDto) {
    return this.srv.crear(dto);
  }
  @Patch(':id') actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarSerieDto,
  ) {
    return this.srv.actualizar(id, dto);
  }
  @Delete(':id') eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.srv.eliminar(id);
  }
}

@Module({
  controllers: [SerializacionController],
  providers: [SerializacionService],
})
export class SerializacionModule {}
