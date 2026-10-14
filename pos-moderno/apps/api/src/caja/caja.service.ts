import { ConflictException, Injectable } from '@nestjs/common';
import { CajaRepository } from './caja.repository';
import { AperturaCajaDto, CierreCajaDto } from './dto/caja.dto';

@Injectable()
export class CajaService {
  constructor(private readonly repo: CajaRepository) {}

  principal() {
    return this.repo.principal();
  }

  async actualizarPrincipal(descripcion: string) {
    const c = await this.repo.principal();
    if (!c) throw new ConflictException('No hay una caja registrada');
    await this.repo.actualizarDescripcion(c.idCaja, descripcion);
    return { idCaja: c.idCaja, descripcion };
  }

  async abrir(dto: AperturaCajaDto) {
    const abierto = await this.repo.turnoAbierto(dto.idCaja);
    if (abierto) {
      throw new ConflictException('Ya existe un turno abierto en esta caja');
    }
    await this.repo.abrir(dto);
    return { abierto: true, idCaja: dto.idCaja };
  }

  async turnoAbierto(idCaja: number) {
    const t = await this.repo.turnoAbierto(idCaja);
    if (!t) return null;
    return {
      idCaja: t.Id_caja,
      fechaInicio: t.fechainicio ? t.fechainicio.toISOString() : '',
      saldoInicial: Number(t.SaldoInicial ?? 0),
    };
  }

  arqueo(idCaja: number) {
    return this.repo.arqueo(idCaja);
  }

  async cerrar(dto: CierreCajaDto) {
    const abierto = await this.repo.turnoAbierto(dto.idCaja);
    if (!abierto) {
      throw new ConflictException('No hay un turno abierto para cerrar');
    }
    await this.repo.cerrar(dto);
    return { cerrado: true, idCaja: dto.idCaja };
  }
}
