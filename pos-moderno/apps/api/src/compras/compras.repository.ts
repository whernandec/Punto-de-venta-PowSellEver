import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrarCompraDto } from './dto/registrar-compra.dto';
import { aplicarMovimientoInventario } from '../common/movimientos-inventario';

type Tx = Prisma.TransactionClient;

/**
 * Acceso a datos de Compras. Dos implementaciones del mismo flujo, conmutables
 * con el flag COMPRAS_NATIVO (Fase 4):
 *  - SP (legacy): insertar_Compras → insertar_DetalleCompra → insertar_KARDEX_Entrada
 *                 + aumentarStock → confirmarCompra.
 *  - NATIVO:      Prisma puro (compra.create + detalleCompra.create + movimiento
 *                 de inventario nativo), con numeración de comprobante de la serie 'TC'.
 */
@Injectable()
export class ComprasRepository {
  constructor(private readonly prisma: PrismaService) {}

  private execSp(tx: Tx, proc: string, params: unknown[]): Promise<number> {
    const placeholders = params.map((_, i) => `@P${i + 1}`).join(', ');
    return tx.$executeRawUnsafe(`EXEC dbo.${proc} ${placeholders}`, ...params);
  }

  registrarCompraCompleta(
    dto: RegistrarCompraDto,
  ): Promise<{ idCompra: number; total: number }> {
    return process.env.COMPRAS_NATIVO === 'true'
      ? this.registrarCompraNativa(dto)
      : this.registrarCompraSp(dto);
  }

  private async registrarCompraSp(
    dto: RegistrarCompraDto,
  ): Promise<{ idCompra: number; total: number }> {
    const fecha = dto.fechaCompra ? new Date(dto.fechaCompra) : new Date();
    const [primera, ...resto] = dto.lineas;

    return this.prisma.$transaction(async (tx) => {
      // 1) Cabecera + 1ª línea de detalle (insertar_Compras lo hace en un paso).
      await this.execSp(tx, 'insertar_Compras', [
        dto.idCaja, // @Idcaja
        fecha, // @fechacompra
        'COMPRA NUEVA', // @Estado
        primera.cantidad, // @Cantidad
        primera.costo, // @Costo
        primera.moneda ?? '', // @Moneda
        primera.idProducto, // @IdProducto
        primera.descripcion, // @Descripcion
      ]);

      // 2) Id de la compra recién creada.
      const filas = await tx.$queryRawUnsafe<Array<{ idCompra: number }>>(
        `SELECT MAX(Idcompra) AS idCompra FROM Compras WHERE Idcaja = @P1`,
        dto.idCaja,
      );
      const idCompra = Number(filas[0]?.idCompra);
      if (!idCompra) {
        throw new Error('No se pudo obtener el id de la compra recién creada');
      }

      // 3) Líneas restantes de detalle.
      for (const l of resto) {
        await this.execSp(tx, 'insertar_DetalleCompra', [
          idCompra, // @IdCompra
          l.cantidad, // @Cantidad
          l.costo, // @Costo
          l.moneda ?? '', // @Moneda
          l.idProducto, // @IdProducto
          l.descripcion, // @Descripcion
        ]);
      }

      // 4) Kardex de entrada + aumento de stock por cada línea con inventario.
      let total = 0;
      for (const l of dto.lineas) {
        total += l.cantidad * l.costo;
        if ((l.usaInventarios ?? 'NO').toUpperCase() === 'SI') {
          await this.execSp(tx, 'insertar_KARDEX_Entrada', [
            fecha, // @Fecha
            'Compra', // @Motivo
            l.cantidad, // @Cantidad
            l.idProducto, // @Id_producto
            dto.idUsuario, // @Id_usuario
            'ENTRADA', // @Tipo
            'Activo', // @Estado
            dto.idCaja, // @Id_caja
          ]);
          await this.execSp(tx, 'aumentarStock', [l.idProducto, l.cantidad]);
        }
      }

      // 5) Confirmación: fija Total, genera Comprobante (Serie 'TC') y proveedor real.
      await this.execSp(tx, 'confirmarCompra', [
        idCompra, // @Idcompra
        total, // @Total
        dto.idCaja, // @Idcaja
        dto.idProveedor, // @Idproveedor
        fecha, // @fechacompra
      ]);

      return { idCompra, total };
    });
  }

  /** Fase 4 — flujo de compra NATIVO (Prisma puro, sin stored procedures). */
  private async registrarCompraNativa(
    dto: RegistrarCompraDto,
  ): Promise<{ idCompra: number; total: number }> {
    const fecha = dto.fechaCompra ? new Date(dto.fechaCompra) : new Date();
    const total = dto.lineas.reduce((a, l) => a + l.cantidad * l.costo, 0);

    return this.prisma.$transaction(async (tx) => {
      // Comprobante desde la serie 'TC' (lo que hacía confirmarCompra).
      let comprobante = '-';
      const serie = await tx.serializacion.findFirst({
        where: { serie: 'TC' },
      });
      if (serie) {
        const n = Number(serie.numeroFin ?? 0) + 1;
        await tx.serializacion.update({
          where: { idSerializacion: serie.idSerializacion },
          data: { numeroFin: String(n) },
        });
        comprobante = `${serie.tipoDoc ?? ''}-${serie.serie ?? ''}${n}`;
      }

      const compra = await tx.compra.create({
        data: {
          fechaCompra: fecha,
          total,
          comprobante,
          idProveedor: dto.idProveedor,
          idCaja: dto.idCaja,
        },
        select: { idCompra: true },
      });

      for (const l of dto.lineas) {
        await tx.detalleCompra.create({
          data: {
            idCompra: compra.idCompra,
            cantidad: l.cantidad,
            costo: l.costo,
            moneda: l.moneda ?? '',
            idProducto: l.idProducto,
            descripcion: l.descripcion,
          },
        });

        if ((l.usaInventarios ?? 'NO').toUpperCase() === 'SI') {
          await aplicarMovimientoInventario(tx, {
            idProducto: l.idProducto,
            idUsuario: dto.idUsuario,
            idCaja: dto.idCaja,
            cantidad: l.cantidad,
            tipo: 'ENTRADA',
            motivo: 'Compra',
            fecha,
          });
        }
      }

      return { idCompra: compra.idCompra, total };
    });
  }

  listar() {
    return this.prisma.compra.findMany({ orderBy: { idCompra: 'desc' } });
  }
}
