import {
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class CrearGrupoDto {
  @IsString() @IsNotEmpty() linea!: string;
}

@Injectable()
export class GruposService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.grupoDeProductos.findMany({ orderBy: { idLine: 'asc' } });
  }

  async crear(dto: CrearGrupoDto) {
    const dup = await this.prisma.grupoDeProductos.findFirst({
      where: { linea: dto.linea },
    });
    if (dup) throw new ConflictException('El grupo ya existe');
    return this.prisma.grupoDeProductos.create({
      data: { linea: dto.linea, porDefecto: 'NO' },
    });
  }
}

@Controller('grupos')
export class GruposController {
  constructor(private readonly srv: GruposService) {}

  @Get() listar() {
    return this.srv.listar();
  }
  @Post() crear(@Body() dto: CrearGrupoDto) {
    return this.srv.crear(dto);
  }
}

@Module({
  controllers: [GruposController],
  providers: [GruposService],
})
export class GruposModule {}
