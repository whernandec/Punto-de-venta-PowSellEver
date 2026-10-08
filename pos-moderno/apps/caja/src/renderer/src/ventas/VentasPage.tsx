import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ProductoDTO,
  RegistrarVentaDTO,
  VentaPendienteDTO,
} from '@pos/types';
import { obtenerProductos } from '../api';

interface LineaVenta {
  producto: ProductoDTO;
  cantidad: number;
}

interface Props {
  idCaja: number;
  idUsuario: number;
}

export function VentasPage({ idCaja, idUsuario }: Props): JSX.Element {
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [carrito, setCarrito] = useState<LineaVenta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState<VentaPendienteDTO[]>([]);

  const refrescarPendientes = useCallback(() => {
    void window.posAPI.ventas.pendientes().then(setPendientes);
  }, []);

  useEffect(() => {
    obtenerProductos()
      .then(setProductos)
      .catch((e: Error) => setError(e.message));
    refrescarPendientes();
  }, [refrescarPendientes]);

  const total = useMemo(
    () =>
      carrito.reduce(
        (acc, l) => acc + (l.producto.precioVenta ?? 0) * l.cantidad,
        0,
      ),
    [carrito],
  );

  function agregar(p: ProductoDTO, cantidad = 1): void {
    setCarrito((prev) => {
      const existe = prev.find((l) => l.producto.id === p.id);
      if (existe) {
        return prev.map((l) =>
          l.producto.id === p.id
            ? { ...l, cantidad: l.cantidad + cantidad }
            : l,
        );
      }
      return [...prev, { producto: p, cantidad }];
    });
  }

  async function pesarYAgregar(p: ProductoDTO): Promise<void> {
    try {
      const disponible = await window.posAPI.balanza.disponible();
      if (!disponible) {
        setError('Balanza no disponible en esta caja.');
        return;
      }
      const peso = await window.posAPI.balanza.leerPeso('COM1');
      agregar(p, peso);
      setMensaje(`Peso leído: ${peso} kg`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function cobrar(): Promise<void> {
    setError(null);
    const numeroDeDoc = `T-${Date.now()}`;
    const venta: RegistrarVentaDTO = {
      idCaja,
      idUsuario,
      tipoPago: 'Efectivo',
      numeroDeDoc,
      comprobante: 'TICKET',
      montoTotal: total,
      efectivo: total,
      pagoCon: total,
      vuelto: 0,
      lineas: carrito.map((l) => ({
        idProducto: l.producto.id,
        descripcion: l.producto.descripcion ?? '',
        codigo: l.producto.codigo ?? undefined,
        cantidad: l.cantidad,
        precioUnitario: l.producto.precioVenta ?? 0,
        costo: l.producto.precioCompra ?? 0,
        usaInventarios: l.producto.usaInventarios ?? 'NO',
      })),
    };

    try {
      // 1) Registrar la venta: SIEMPRE funciona (se guarda local y se sincroniza).
      const { idLocal } = await window.posAPI.ventas.registrar(venta);

      // 2) Imprimir el ticket (si falla la impresora, la venta ya quedó registrada).
      try {
        await window.posAPI.impresora.imprimirTicket('192.168.1.100', 9100, {
          empresa: 'Mi Negocio',
          lineas: carrito.map((l) => ({
            descripcion: l.producto.descripcion ?? '',
            cantidad: l.cantidad,
            precio: l.producto.precioVenta ?? 0,
          })),
          total,
          pie: '¡Gracias por su compra!',
        });
      } catch {
        setError('Venta registrada, pero la impresora no respondió.');
      }

      setMensaje(`Venta ${numeroDeDoc} registrada (local #${idLocal}).`);
      setCarrito([]);
      refrescarPendientes();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function sincronizar(): Promise<void> {
    const r = await window.posAPI.ventas.sincronizar();
    setMensaje(`Sincronización: ${r.enviadas} enviadas, ${r.fallidas} fallidas.`);
    refrescarPendientes();
  }

  const pendientesSinEnviar = pendientes.filter(
    (p) => p.estado !== 'sincronizada',
  ).length;

  return (
    <main className="ventas">
      <section className="ventas__catalogo">
        <h2>Productos</h2>
        {error && <p className="alert alert--error">{error}</p>}
        {mensaje && <p className="alert alert--ok">{mensaje}</p>}
        {productos.length === 0 && !error && <p>Cargando productos…</p>}
        <ul className="lista">
          {productos.map((p) => (
            <li key={p.id} className="lista__item">
              <span>{p.descripcion ?? '(sin nombre)'}</span>
              <span>{(p.precioVenta ?? 0).toFixed(2)}</span>
              <button onClick={() => agregar(p)}>Agregar</button>
              <button onClick={() => pesarYAgregar(p)}>⚖ Pesar</button>
            </li>
          ))}
        </ul>
      </section>

      <aside className="ventas__ticket">
        <h2>Venta actual</h2>
        <ul className="lista">
          {carrito.map((l) => (
            <li key={l.producto.id} className="lista__item">
              <span>
                {l.cantidad} × {l.producto.descripcion}
              </span>
              <span>
                {((l.producto.precioVenta ?? 0) * l.cantidad).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        <div className="ventas__total">
          <strong>Total</strong>
          <strong>{total.toFixed(2)}</strong>
        </div>
        <button
          className="btn btn--primary"
          disabled={carrito.length === 0}
          onClick={cobrar}
        >
          Cobrar e imprimir ticket
        </button>

        <div className="sync">
          <span>
            Pendientes de sincronizar: <strong>{pendientesSinEnviar}</strong>
          </span>
          <button onClick={sincronizar}>Sincronizar ahora</button>
        </div>
      </aside>
    </main>
  );
}
