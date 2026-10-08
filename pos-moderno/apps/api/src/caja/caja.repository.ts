import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AperturaCajaDto, CierreCajaDto } from './dto/caja.dto';

interface TurnoRow {
  Id_caja: number;
  fechainicio: Date | null;
  SaldoInicial: number | null;
}

export interface Arqueo {
  saldoInicial: number;
  ventasEfectivo: number;
  ingresos: number;
  gastos: number;
  saldoEsperado: number;
}

/**
 * Ciclo de caja (tabla MOVIMIENTOCAJACIERRE). Conmutable con CAJA_NATIVO (Fase 4):
 *  - SP (legacy): insertar_DETALLE_cierre_de_caja / mostrar_cierre_de_caja_pendiente / cerrarCaja.
 *  - NATIVO: Prisma puro.
 * Además expone un ARQUEO del turno (saldo esperado en caja).
 */
@Injectable()
export class CajaRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get nativo(): boolean {
    return process.env.CAJA_NATIVO === 'true';
  }

  async abrir(dto: AperturaCajaDto): Promise<void> {
    const ahora = new Date();
    if (this.nativo) {
      const abierto = await this.prisma.movimientoCajaCierre.findFirst({
        where: { idCaja: dto.idCaja, estado: 'CAJA APERTURADA' },
      });
      if (abierto) {
        throw new ConflictException('Ya Fue Iniciado el Turno de esta Caja');
      }
      await this.prisma.movimientoCajaCierre.create({
        data: {
          fechaInicio: ahora,
          fechaFin: ahora,
          fechaCierre: ahora,
          ingresos: 0,
          egresos: 0,
          saldoQuedaEnCaja: dto.saldoInicial,
          idUsuario: dto.idUsuario,
          totalCalculado: 0,
          totalReal: 0,
          estado: 'CAJA APERTURADA',
          diferencia: 0,
          idCaja: dto.idCaja,
        },
      });
      return;
    }
    await this.prisma.$executeRawUnsafe(
      `EXEC dbo.insertar_DETALLE_cierre_de_caja @P1,@P2,@P3,@P4,@P5,@P6,@P7,@P8,@P9,@P10,@P11,@P12`,
      ahora, ahora, ahora, 0, 0, dto.saldoInicial, dto.idUsuario, 0, 0,
      'CAJA APERTURADA', 0, dto.idCaja,
    );
  }

  async turnoAbierto(idCaja: number): Promise<TurnoRow | null> {
    if (this.nativo) {
      const t = await this.prisma.movimientoCajaCierre.findFirst({
        where: { idCaja, estado: 'CAJA APERTURADA' },
        orderBy: { idCierreCaja: 'desc' },
      });
      return t
        ? {
            Id_caja: t.idCaja ?? idCaja,
            fechainicio: t.fechaInicio,
            SaldoInicial: t.saldoQuedaEnCaja ? Number(t.saldoQuedaEnCaja) : 0,
          }
        : null;
    }
    const filas = await this.prisma.$queryRawUnsafe<TurnoRow[]>(
      'EXEC dbo.mostrar_cierre_de_caja_pendiente @P1',
      idCaja,
    );
    return filas[0] ?? null;
  }

  async cerrar(dto: CierreCajaDto): Promise<void> {
    const ahora = new Date();
    if (this.nativo) {
      await this.prisma.movimientoCajaCierre.updateMany({
        where: { idCaja: dto.idCaja, estado: 'CAJA APERTURADA' },
        data: {
          fechaFin: ahora,
          fechaCierre: ahora,
          ingresos: dto.ingresos,
          egresos: dto.egresos,
          saldoQuedaEnCaja: dto.saldoQuedaEnCaja,
          idUsuario: dto.idUsuario,
          totalCalculado: dto.totalCalculado,
          totalReal: dto.totalReal,
          estado: 'CAJA CERRADA',
          diferencia: dto.diferencia,
        },
      });
      return;
    }
    await this.prisma.$executeRawUnsafe(
      `EXEC dbo.cerrarCaja @P1,@P2,@P3,@P4,@P5,@P6,@P7,@P8,@P9,@P10,@P11`,
      ahora, ahora, dto.ingresos, dto.egresos, dto.saldoQuedaEnCaja,
      dto.idUsuario, dto.totalCalculado, dto.totalReal, 'CAJA CERRADA',
      dto.diferencia, dto.idCaja,
    );
  }

  /** Arqueo del turno abierto: efectivo esperado en caja. */
  async arqueo(idCaja: number): Promise<Arqueo | null> {
    const turno = await this.turnoAbierto(idCaja);
    if (!turno) return null;
    const desde = turno.fechainicio ?? new Date(0);
    const saldoInicial = Number(turno.SaldoInicial ?? 0);

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ ventasEfectivo: number | null; ingresos: number | null; gastos: number | null }>
    >(
      `SELECT
         (SELECT ISNULL(SUM(Efectivo),0) FROM ventas
            WHERE Id_caja=@P1 AND Estado='PAGADO' AND fecha_venta>=@P2) AS ventasEfectivo,
         (SELECT ISNULL(SUM(Importe),0) FROM Ingresos_varios
            WHERE Id_caja=@P1 AND Fecha>=@P2) AS ingresos,
         (SELECT ISNULL(SUM(Importe),0) FROM Gastos_varios
            WHERE Id_caja=@P1 AND Fecha>=@P2) AS gastos`,
      idCaja,
      desde,
    );
    const r = rows[0];
    const ventasEfectivo = Number(r?.ventasEfectivo ?? 0);
    const ingresos = Number(r?.ingresos ?? 0);
    const gastos = Number(r?.gastos ?? 0);
    return {
      saldoInicial,
      ventasEfectivo,
      ingresos,
      gastos,
      saldoEsperado: saldoInicial + ventasEfectivo + ingresos - gastos,
    };
  }
}
