import { Injectable } from '@nestjs/common';
import { ComprasRepository } from './compras.repository';
import { RegistrarCompraDto } from './dto/registrar-compra.dto';

/** Lógica de negocio de Compras (equivale a Logica/Lcompras.cs). */
@Injectable()
export class ComprasService {
  constructor(private readonly repo: ComprasRepository) {}

  registrar(dto: RegistrarCompraDto) {
    return this.repo.registrarCompraCompleta(dto);
  }

  listar() {
    return this.repo.listar();
  }
}
