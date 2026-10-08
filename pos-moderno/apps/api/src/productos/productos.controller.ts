import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ProductosService } from './productos.service';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';

/**
 * API REST de Productos. Equivale al formulario PRODUCTOS_OK, pero ahora
 * consumible tanto por la app de caja (Electron) como por la web (Next.js).
 */
@Controller('productos')
export class ProductosController {
  constructor(private readonly productos: ProductosService) {}

  @Get()
  findAll() {
    return this.productos.findAll();
  }

  /** Plantilla .xlsx para la importación (declarada antes de :id). */
  @Get('plantilla.xlsx')
  async plantilla(@Res() res: Response): Promise<void> {
    const buffer = await this.productos.plantillaExcel();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla_productos.xlsx"',
    });
    res.send(buffer);
  }

  /** Importación masiva desde un archivo Excel (.xlsx). */
  @Post('importar')
  @UseInterceptors(FileInterceptor('archivo'))
  importar(@UploadedFile() archivo?: { buffer: Buffer }) {
    if (!archivo) throw new BadRequestException('Falta el archivo (campo "archivo")');
    return this.productos.importarExcel(archivo.buffer);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productos.findOne(id);
  }

  @Post()
  create(@Body() dto: CrearProductoDto) {
    return this.productos.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarProductoDto,
  ) {
    return this.productos.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productos.remove(id);
  }
}
