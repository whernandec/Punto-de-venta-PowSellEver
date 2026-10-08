import { Module } from '@nestjs/common';
import { ProductosController } from './productos.controller';
import { ProductosService } from './productos.service';
import { ProductosRepository } from './productos.repository';

@Module({
  controllers: [ProductosController],
  providers: [ProductosService, ProductosRepository],
})
export class ProductosModule {}
