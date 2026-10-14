import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CajaService } from './caja.service';
import { AperturaCajaDto, CierreCajaDto } from './dto/caja.dto';

@Controller('caja')
export class CajaController {
  constructor(private readonly caja: CajaService) {}

  @Get('principal')
  principal() {
    return this.caja.principal();
  }

  @Patch('principal')
  actualizarPrincipal(@Body() dto: { descripcion: string }) {
    return this.caja.actualizarPrincipal(dto.descripcion);
  }

  @Post('apertura')
  abrir(@Body() dto: AperturaCajaDto) {
    return this.caja.abrir(dto);
  }

  @Get(':idCaja/turno-abierto')
  turnoAbierto(@Param('idCaja', ParseIntPipe) idCaja: number) {
    return this.caja.turnoAbierto(idCaja);
  }

  @Get(':idCaja/arqueo')
  arqueo(@Param('idCaja', ParseIntPipe) idCaja: number) {
    return this.caja.arqueo(idCaja);
  }

  @Post('cierre')
  cerrar(@Body() dto: CierreCajaDto) {
    return this.caja.cerrar(dto);
  }
}
