'use client';

import { useEffect, useState } from 'react';
import type { CompraLineaDTO, ProveedorDTO } from '@pos/types';
import { api } from '@/lib/api';

const ID_CAJA = 1;
const ID_USUARIO = 1;

interface ProductoLite {
  id: number;
  descripcion: string;
  costo: number;
  usaInventarios: string;
}

export default function ComprasPage(): JSX.Element {
  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [productos, setProductos] = useState<ProductoLite[]>([]);
  const [compras, setCompras] = useState<Array<Record<string, unknown>>>([]);
  const [idProveedor, setIdProveedor] = useState<number | ''>('');
  const [lineas, setLineas] = useState<CompraLineaDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function cargar(): void {
    api.proveedores().then(setProveedores).catch(() => undefined);
    api.compras().then(setCompras).catch(() => undefined);
    api
      .productos()
      .then((rows) =>
        setProductos(
          rows.map((f) => ({
            id: Number(f.idProducto),
            descripcion: String(f.descripcion ?? ''),
            costo: f.precioDeCompra != null ? Number(f.precioDeCompra) : 0,
            usaInventarios: String(f.usaInventarios ?? 'NO'),
          })),
        ),
      )
      .catch(() => undefined);
  }
  useEffect(cargar, []);

  const total = lineas.reduce((a, l) => a + l.cantidad * l.costo, 0);

  function agregar(p: ProductoLite): void {
    if (lineas.some((l) => l.idProducto === p.id)) return;
    setLineas((prev) => [
      ...prev,
      {
        idProducto: p.id,
        descripcion: p.descripcion,
        cantidad: 1,
        costo: p.costo,
        usaInventarios: p.usaInventarios,
      },
    ]);
  }

  function editar(i: number, campo: 'cantidad' | 'costo', v: string): void {
    setLineas((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, [campo]: Number(v) } : l)),
    );
  }

  async function guardar(): Promise<void> {
    setError(null);
    if (!idProveedor || lineas.length === 0) {
      setError('Selecciona proveedor y al menos un producto.');
      return;
    }
    try {
      const r = await api.registrarCompra({
        idCaja: ID_CAJA,
        idUsuario: ID_USUARIO,
        idProveedor: Number(idProveedor),
        lineas,
      });
      setMsg(`Compra #${r.idCompra} registrada por ${r.total.toFixed(2)}.`);
      setLineas([]);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h2>Compras</h2>
      {error && <p className="alert alert--error">{error}</p>}
      {msg && <p className="alert alert--ok">{msg}</p>}

      <div className="toolbar">
        <label>
          Proveedor:&nbsp;
          <select
            value={idProveedor}
            onChange={(e) =>
              setIdProveedor(e.target.value ? Number(e.target.value) : '')
            }
          >
            <option value="">— selecciona —</option>
            {proveedores.map((p) => (
              <option key={p.idProveedor} value={p.idProveedor}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid2">
        <div className="panel">
          <h3>Productos</h3>
          <table>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id}>
                  <td>{p.descripcion}</td>
                  <td className="num">
                    <button className="btn btn--ghost" onClick={() => agregar(p)}>
                      Añadir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h3>Líneas</h3>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="num">Cantidad</th>
                <th className="num">Costo</th>
                <th className="num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l, i) => (
                <tr key={l.idProducto}>
                  <td>{l.descripcion}</td>
                  <td className="num">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.cantidad}
                      onChange={(e) => editar(i, 'cantidad', e.target.value)}
                    />
                  </td>
                  <td className="num">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.costo}
                      onChange={(e) => editar(i, 'costo', e.target.value)}
                    />
                  </td>
                  <td className="num">{(l.cantidad * l.costo).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="total">
            <strong>Total</strong>
            <strong>{total.toFixed(2)}</strong>
          </div>
          <button className="btn" disabled={lineas.length === 0} onClick={guardar}>
            Registrar compra (suma inventario)
          </button>
        </div>
      </div>

      <h3 style={{ marginTop: 24 }}>Compras recientes</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Fecha</th>
            <th className="num">Total</th>
            <th>Comprobante</th>
            <th className="num">Proveedor</th>
          </tr>
        </thead>
        <tbody>
          {compras.map((c) => (
            <tr key={String(c.idCompra)}>
              <td>{String(c.idCompra)}</td>
              <td>{c.fechaCompra ? String(c.fechaCompra).slice(0, 10) : ''}</td>
              <td className="num">{String(c.total ?? '')}</td>
              <td>{String(c.comprobante ?? '')}</td>
              <td className="num">{String(c.idProveedor ?? '')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
