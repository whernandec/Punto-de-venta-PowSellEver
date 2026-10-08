import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrarVentaDto } from './dto/registrar-venta.dto';
import { aplicarMovimientoInventario } from '../common/movimientos-inventario';

type Tx = Prisma.TransactionClient;

/**
 * Acceso a datos de Ventas. Dos implementaciones del mismo flujo, conmutables
 * con el flag VENTAS_NATIVO (Fase 4 — migración gradual de SPs):
 *
 *  - SP (legacy):  insertar_venta → insertar_detalle_venta → insertar_KARDEX_SALIDA
 *                  + disminuir_stock → Confirmar_venta.
 *  - NATIVO:       Prisma puro (venta.create + detalleVenta.create + movimiento de
 *                  inventario nativo), inserta directo como PAGADO.
 *
 * Ambas en una única transacción: o se registra la venta completa, o nada.
 */
@Injectable()
export class VentasRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Ejecuta un SP por nombre con parámetros posicionales (@P1, @P2, ...). */
  private execSp(tx: Tx, proc: string, params: unknown[]): Promise<number> {
    const placeholders = params.map((_, i) => `@P${i + 1}`).join(', ');
    return tx.$executeRawUnsafe(`EXEC dbo.${proc} ${placeholders}`, ...params);
  }

  /** Resuelve el cliente: el enviado o el GENERICO (ventas al público). */
  private async resolverCliente(tx: Tx, idCliente?: number): Promise<number> {
    if (idCliente) return idCliente;
    const cli = await tx.$queryRawUnsafe<Array<{ idclientev: number }>>(
      `SELECT TOP 1 idclientev FROM clientes WHERE Nombre = 'GENERICO' ORDER BY idclientev`,
    );
    const id = cli[0]?.idclientev;
    if (!id) {
      throw new Error('No hay cliente GENERICO configurado para ventas al público');
    }
    return id;
  }

  registrarVentaCompleta(
    dto: RegistrarVentaDto,
  ): Promise<{ idVenta: number; numeroDeDoc: string }> {
    return process.env.VENTAS_NATIVO === 'true'
      ? this.registrarVentaNativa(dto)
      : this.registrarVentaSp(dto);
  }

  private async registrarVentaSp(
    dto: RegistrarVentaDto,
  ): Promise<{ idVenta: number; numeroDeDoc: string }> {
    const fechaVenta = dto.fechaVenta ? new Date(dto.fechaVenta) : new Date();
    const comprobante = dto.comprobante ?? 'TICKET';
    const fechaPago = fechaVenta.toISOString().slice(0, 10);

    return this.prisma.$transaction(async (tx) => {
      // Resolver cliente: si no se envía, usar el cliente GENERICO (ventas al público).
      let idCliente = dto.idCliente;
      if (!idCliente) {
        const cli = await tx.$queryRawUnsafe<Array<{ idclientev: number }>>(
          `SELECT TOP 1 idclientev FROM clientes WHERE Nombre = 'GENERICO' ORDER BY idclientev`,
        );
        idCliente = cli[0]?.idclientev;
        if (!idCliente) {
          throw new Error(
            'No hay cliente GENERICO configurado para ventas al público',
          );
        }
      }

      // 1) Cabecera (borrador) SIN número final: Confirmar_venta lo asigna y valida.
      await this.execSp(tx, 'insertar_venta', [
        idCliente, // @idcliente
        fechaVenta, // @fecha_venta
        '', // @nume_documento (se asigna en Confirmar_venta)
        dto.montoTotal, // @montototal
        dto.tipoPago, // @Tipo_de_pago
        'EN PROCESO', // @estado
        dto.igv ?? 0, // @IGV
        comprobante, // @Comprobante
        dto.idUsuario, // @id_usuario
        fechaPago, // @Fecha_de_pago
        'VENTA', // @ACCION
        dto.saldo ?? 0, // @Saldo
        dto.pagoCon ?? 0, // @Pago_con
        dto.porcentajeIgv ?? 0, // @Porcentaje_IGV
        dto.idCaja, // @Id_caja
        dto.referenciaTarjeta ?? '', // @Referencia_tarjeta
      ]);

      // 2) Id de la venta recién creada (dentro de la misma transacción).
      const filas = await tx.$queryRawUnsafe<Array<{ idVenta: number }>>(
        `SELECT MAX(idventa) AS idVenta FROM ventas WHERE Id_caja = @P1`,
        dto.idCaja,
      );
      const idVenta = Number(filas[0]?.idVenta);
      if (!idVenta) {
        throw new Error('No se pudo obtener el id de la venta recién creada');
      }

      // 3) Detalle + movimientos de inventario por cada línea.
      for (const l of dto.lineas) {
        await this.execSp(tx, 'insertar_detalle_venta', [
          idVenta, // @idventa
          l.idProducto, // @Id_presentacionfraccionada
          l.cantidad, // @cantidad
          l.precioUnitario, // @preciounitario
          l.moneda ?? '', // @moneda
          l.unidadDeMedida ?? '', // @unidades
          l.cantidad, // @Cantidad_mostrada
          'Activo', // @Estado
          l.descripcion, // @Descripcion
          l.codigo ?? '', // @Codigo
          '', // @Stock
          l.seVendeA ?? '', // @Se_vende_a
          l.usaInventarios ?? 'NO', // @Usa_inventarios
          l.costo ?? 0, // @Costo
        ]);

        if ((l.usaInventarios ?? 'NO').toUpperCase() === 'SI') {
          await this.execSp(tx, 'insertar_KARDEX_SALIDA', [
            fechaVenta, // @Fecha
            `Venta ${dto.numeroDeDoc}`, // @Motivo
            l.cantidad, // @Cantidad
            l.idProducto, // @Id_producto
            dto.idUsuario, // @Id_usuario
            'SALIDA', // @Tipo
            'Activo', // @Estado
            dto.idCaja, // @Id_caja
          ]);
          await this.execSp(tx, 'disminuir_stock', [l.idProducto, l.cantidad]);
        }
      }

      // 4) Confirmación final. Confirmar_venta espera 18 parámetros.
      await this.execSp(tx, 'Confirmar_venta', [
        idVenta, // @idventa
        dto.montoTotal, // @montototal
        dto.igv ?? 0, // @IGV
        dto.saldo ?? 0, // @Saldo
        dto.tipoPago, // @Tipo_de_pago
        'PAGADO', // @Estado
        comprobante, // @Comprobante
        dto.numeroDeDoc, // @Numero_de_doc
        fechaVenta, // @fecha_venta
        'VENTA', // @ACCION
        fechaPago, // @Fecha_de_pago
        idCliente, // @idcliente
        dto.pagoCon ?? 0, // @Pago_con
        dto.referenciaTarjeta ?? '', // @Referencia_tarjeta
        dto.vuelto ?? 0, // @Vuelto
        dto.efectivo ?? 0, // @Efectivo
        dto.credito ?? 0, // @Credito
        dto.tarjeta ?? 0, // @Tarjeta
      ]);

      return { idVenta, numeroDeDoc: dto.numeroDeDoc };
    });
  }

  /** Fase 4 — flujo de venta NATIVO (Prisma puro, sin stored procedures). */
  private async registrarVentaNativa(
    dto: RegistrarVentaDto,
  ): Promise<{ idVenta: number; numeroDeDoc: string }> {
    const fechaVenta = dto.fechaVenta ? new Date(dto.fechaVenta) : new Date();
    const fechaPago = fechaVenta.toISOString().slice(0, 10);

    return this.prisma.$transaction(async (tx) => {
      const idCliente = await this.resolverCliente(tx, dto.idCliente);

      // Unicidad del comprobante (lo que validaba Confirmar_venta).
      const dup = await tx.venta.findFirst({
        where: { numeroDeDoc: dto.numeroDeDoc },
        select: { idVenta: true },
      });
      if (dup) {
        throw new ConflictException(
          `Ya existe una venta con el número ${dto.numeroDeDoc}`,
        );
      }

      // Cabecera directa como PAGADO (sin el paso borrador→confirmar de los SPs).
      const venta = await tx.venta.create({
        data: {
          idClienteV: idCliente,
          fechaVenta,
          numeroDeDoc: dto.numeroDeDoc,
          montoTotal: dto.montoTotal,
          tipoDePago: dto.tipoPago,
          estado: 'PAGADO',
          igv: dto.igv ?? 0,
          comprobante: dto.comprobante ?? 'TICKET',
          idUsuario: dto.idUsuario,
          fechaDePago: fechaPago,
          accion: 'VENTA',
          saldo: dto.saldo ?? 0,
          pagoCon: dto.pagoCon ?? 0,
          porcentajeIgv: dto.porcentajeIgv ?? 0,
          idCaja: dto.idCaja,
          referenciaTarjeta: dto.referenciaTarjeta ?? '',
          vuelto: dto.vuelto ?? 0,
          efectivo: dto.efectivo ?? 0,
          credito: dto.credito ?? 0,
          tarjeta: dto.tarjeta ?? 0,
        },
        select: { idVenta: true },
      });

      for (const l of dto.lineas) {
        await tx.detalleVenta.create({
          data: {
            idVenta: venta.idVenta,
            idProducto: l.idProducto,
            cantidad: l.cantidad,
            precioUnitario: l.precioUnitario,
            moneda: l.moneda ?? '',
            unidadDeMedida: l.unidadDeMedida ?? '',
            cantidadMostrada: l.cantidad,
            estado: 'Activo',
            descripcion: l.descripcion,
            codigo: l.codigo ?? '',
            seVendeA: l.seVendeA ?? '',
            usaInventarios: l.usaInventarios ?? 'NO',
            costo: l.costo ?? 0,
          },
        });

        if ((l.usaInventarios ?? 'NO').toUpperCase() === 'SI') {
          await aplicarMovimientoInventario(tx, {
            idProducto: l.idProducto,
            idUsuario: dto.idUsuario,
            idCaja: dto.idCaja,
            cantidad: l.cantidad,
            tipo: 'SALIDA',
            motivo: `Venta ${dto.numeroDeDoc}`,
            fecha: fechaVenta,
          });
        }
      }

      return { idVenta: venta.idVenta, numeroDeDoc: dto.numeroDeDoc };
    });
  }
}
