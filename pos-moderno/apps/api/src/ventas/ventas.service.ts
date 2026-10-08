import { BadRequestException, Injectable } from '@nestjs/common';
import { VentasRepository } from './ventas.repository';
import { RegistrarVentaDto } from './dto/registrar-venta.dto';

/** Lógica de negocio de Ventas (equivale a Logica/Lventas.cs). */
@Injectable()
export class VentasService {
  constructor(private readonly repo: VentasRepository) {}

  async registrar(dto: RegistrarVentaDto) {
    // Validación de negocio: el total declarado debe cuadrar con las líneas.
    const calculado = dto.lineas.reduce(
      (acc, l) => acc + l.cantidad * l.precioUnitario,
      0,
    );
    // Tolerancia por redondeo/impuestos.
    if (Math.abs(calculado - dto.montoTotal) > Math.max(calculado, 1) * 0.5) {
      throw new BadRequestException(
        `El total (${dto.montoTotal}) no corresponde a las líneas (${calculado.toFixed(2)})`,
      );
    }

    return this.repo.registrarVentaCompleta(dto);
  }
}
