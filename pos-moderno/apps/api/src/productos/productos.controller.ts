import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
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
