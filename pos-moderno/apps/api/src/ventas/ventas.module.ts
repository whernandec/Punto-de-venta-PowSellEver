import { Module } from '@nestjs/common';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';
import { VentasRepository } from './ventas.repository';

@Module({
  controllers: [VentasController],
  providers: [VentasService, VentasRepository],
})
export class VentasModule {}
