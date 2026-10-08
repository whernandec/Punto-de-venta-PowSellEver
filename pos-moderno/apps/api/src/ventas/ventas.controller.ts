import { Body, Controller, Post } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { RegistrarVentaDto } from './dto/registrar-venta.dto';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventas: VentasService) {}

  /** Registra una venta completa (cabecera + detalle + kardex + stock). */
  @Post()
  registrar(@Body() dto: RegistrarVentaDto) {
    return this.ventas.registrar(dto);
  }
}
