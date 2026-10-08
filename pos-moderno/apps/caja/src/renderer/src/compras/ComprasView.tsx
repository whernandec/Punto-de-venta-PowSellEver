import { useEffect, useState } from 'react';
import type {
  CompraLineaDTO,
  ProductoDTO,
  ProveedorDTO,
} from '@pos/types';
import {
  crearProveedor,
  obtenerProductos,
  obtenerProveedores,
  registrarCompra,
} from '../api';

interface Props {
  idCaja: number;
  idUsuario: number;
}

export function ComprasView({ idCaja, idUsuario }: Props): JSX.Element {
  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [idProveedor, setIdProveedor] = useState<number | ''>('');
  const [lineas, setLineas] = useState<CompraLineaDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [nuevoProv, setNuevoProv] = useState('');

  function cargar(): void {
    obtenerProveedores().then(setProveedores).catch(() => undefined);
    obtenerProductos().then(setProductos).catch(() => undefined);
  }
  useEffect(cargar, []);

  const total = lineas.reduce((a, l) => a + l.cantidad * l.costo, 0);

  function agregarLinea(p: ProductoDTO): void {
    if (lineas.some((l) => l.idProducto === p.id)) return;
    setLineas((prev) => [
      ...prev,
      {
        idProducto: p.id,
        descripcion: p.descripcion ?? '',
        cantidad: 1,
        costo: p.precioCompra ?? 0,
        usaInventarios: p.usaInventarios ?? 'NO',
      },
    ]);
  }

  function actualizar(idx: number, campo: 'cantidad' | 'costo', val: string): void {
    setLineas((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [campo]: Number(val) } : l)),
    );
  }

  async function guardarProveedor(): Promise<void> {
    if (!nuevoProv.trim()) return;
    try {
      await crearProveedor({ nombre: nuevoProv.trim(), estado: 'ACTIVO' });
      setNuevoProv('');
      cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function guardarCompra(): Promise<void> {
    setError(null);
    if (!idProveedor || lineas.length === 0) {
      setError('Selecciona un proveedor y al menos un producto.');
      return;
    }
    try {
      const r = await registrarCompra({
        idCaja,
        idUsuario,
        idProveedor: Number(idProveedor),
        lineas,
      });
      setMensaje(`Compra #${r.idCompra} registrada por ${r.total.toFixed(2)}.`);
      setLineas([]);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <main className="page">
      <div className="page__head">
        <h2>Nueva compra</h2>
      </div>
      {error && <p className="alert alert--error">{error}</p>}
      {mensaje && <p className="alert alert--ok">{mensaje}</p>}

      <div className="compra__prov">
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
        <span className="compra__nuevo">
          <input
            placeholder="Nuevo proveedor…"
            value={nuevoProv}
            onChange={(e) => setNuevoProv(e.target.value)}
          />
          <button onClick={guardarProveedor}>+ Agregar</button>
        </span>
      </div>

      <div className="compra__cols">
        <section>
          <h3>Productos</h3>
          <ul className="lista">
            {productos.map((p) => (
              <li key={p.id} className="lista__item">
                <span>{p.descripcion}</span>
                <button onClick={() => agregarLinea(p)}>Añadir</button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3>Líneas de compra</h3>
          <table className="tabla">
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
                      onChange={(e) => actualizar(i, 'cantidad', e.target.value)}
                    />
                  </td>
                  <td className="num">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.costo}
                      onChange={(e) => actualizar(i, 'costo', e.target.value)}
                    />
                  </td>
                  <td className="num">{(l.cantidad * l.costo).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ventas__total">
            <strong>Total</strong>
            <strong>{total.toFixed(2)}</strong>
          </div>
          <button
            className="btn btn--primary"
            disabled={lineas.length === 0}
            onClick={guardarCompra}
          >
            Registrar compra (suma inventario)
          </button>
        </section>
      </div>
    </main>
  );
}
