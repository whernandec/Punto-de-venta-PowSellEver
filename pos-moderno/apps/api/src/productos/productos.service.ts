import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductosRepository } from './productos.repository';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';

/**
 * Lógica de negocio de Productos.
 * Equivale a `Logica/Lproductos.cs` del sistema viejo.
 */
@Injectable()
export class ProductosService {
  constructor(private readonly repo: ProductosRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  async findOne(id: number) {
    const producto = await this.repo.findById(id);
    if (!producto) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }
    return producto;
  }

  async create(dto: CrearProductoDto) {
    // Regla de negocio: no permitir código duplicado (como validaba el POS viejo).
    if (dto.codigo) {
      const existente = await this.repo.findByCodigo(dto.codigo);
      if (existente) {
        throw new ConflictException(
          `Ya existe un producto con el código ${dto.codigo}`,
        );
      }
    }

    return this.repo.create({
      descripcion: dto.descripcion,
      codigo: dto.codigo,
      idGrupo: dto.idGrupo,
      usaInventarios: dto.usaInventarios,
      stock: dto.stock,
      precioDeCompra: dto.precioCompra,
      precioDeVenta: dto.precioVenta,
      precioMayoreo: dto.precioMayoreo,
      impuesto: dto.impuesto,
      stockMinimo: dto.stockMinimo,
    });
  }

  async update(id: number, dto: ActualizarProductoDto) {
    await this.findOne(id); // 404 si no existe
    return this.repo.update(id, {
      descripcion: dto.descripcion,
      codigo: dto.codigo,
      idGrupo: dto.idGrupo,
      usaInventarios: dto.usaInventarios,
      stock: dto.stock,
      precioDeCompra: dto.precioCompra,
      precioDeVenta: dto.precioVenta,
      precioMayoreo: dto.precioMayoreo,
      impuesto: dto.impuesto,
      stockMinimo: dto.stockMinimo,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.repo.delete(id);
    return { deleted: true, id };
  }
}
