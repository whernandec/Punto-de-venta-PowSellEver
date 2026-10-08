import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export interface MovimientoParams {
  idProducto: number;
  idUsuario: number;
  idCaja: number;
  cantidad: number;
  tipo: 'ENTRADA' | 'SALIDA';
  motivo: string;
  fecha?: Date;
}

/**
 * Fase 4 — Lógica NATIVA de movimiento de inventario (kardex + stock), compartida
 * por ventas, compras y ajustes. Reemplaza a los SPs insertar_KARDEX_Entrada/SALIDA,
 * aumentarStock y disminuir_stock, con idéntica semántica Hay/Habia/Costo_unt.
 *
 * - No-op si el producto no maneja inventario (Usa_inventarios != 'SI').
 * - En salida sin stock suficiente lanza error (el SP lo dejaba pasar en silencio).
 */
export async function aplicarMovimientoInventario(
  tx: Tx,
  p: MovimientoParams,
): Promise<void> {
  const prod = await tx.producto.findUnique({
    where: { idProducto: p.idProducto },
  });
  if (!prod || prod.usaInventarios !== 'SI') return; // sin inventario: nada que mover

  const esEntrada = p.tipo === 'ENTRADA';
  const hay = Number(prod.stock ?? 0); // stock antes del movimiento
  const costoUnt = prod.precioDeCompra ?? 0;

  if (!esEntrada && hay < p.cantidad) {
    throw new Error(
      `Stock insuficiente de "${prod.descripcion}" (hay ${hay}, se intentó retirar ${p.cantidad})`,
    );
  }

  const habia = esEntrada ? hay - p.cantidad : hay + p.cantidad;
  const nuevoStock = esEntrada ? hay + p.cantidad : hay - p.cantidad;

  await tx.kardex.create({
    data: {
      fecha: p.fecha ?? new Date(),
      motivo: p.motivo,
      cantidad: p.cantidad,
      idProducto: p.idProducto,
      idUsuario: p.idUsuario,
      tipo: p.tipo,
      estado: 'Activo',
      costoUnt,
      habia,
      hay,
      idCaja: p.idCaja,
    },
  });

  await tx.producto.update({
    where: { idProducto: p.idProducto },
    data: { stock: String(nuevoStock) },
  });
}
