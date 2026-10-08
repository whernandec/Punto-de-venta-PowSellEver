import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Capa de acceso a datos de Productos.
 * Equivale a `Datos/Dproductos.cs` del sistema viejo, pero con Prisma
 * (tipado, pooling) en lugar de SqlCommand/ADO.NET crudo.
 */
@Injectable()
export class ProductosRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.producto.findMany({ orderBy: { idProducto: 'asc' } });
  }

  findById(id: number) {
    return this.prisma.producto.findUnique({ where: { idProducto: id } });
  }

  findByCodigo(codigo: string) {
    return this.prisma.producto.findFirst({ where: { codigo } });
  }

  create(data: Prisma.ProductoCreateInput) {
    return this.prisma.producto.create({ data });
  }

  update(id: number, data: Prisma.ProductoUpdateInput) {
    return this.prisma.producto.update({ where: { idProducto: id }, data });
  }

  delete(id: number) {
    return this.prisma.producto.delete({ where: { idProducto: id } });
  }
}
