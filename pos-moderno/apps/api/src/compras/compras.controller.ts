import { Body, Controller, Get, Post } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { RegistrarCompraDto } from './dto/registrar-compra.dto';

@Controller('compras')
export class ComprasController {
  constructor(private readonly compras: ComprasService) {}

  /** Registra una compra completa (cabecera + detalle + kardex entrada + stock). */
  @Post()
  registrar(@Body() dto: RegistrarCompraDto) {
    return this.compras.registrar(dto);
  }

  @Get()
  listar() {
    return this.compras.listar();
  }
}
