'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Prod {
  idProducto: number;
  descripcion: string;
  codigo: string;
  precioCompra: number;
  precioVenta: number;
  usaInventarios: string;
  stock: string;
  stockMinimo: number;
}

function mapProd(f: Record<string, unknown>): Prod {
  return {
    idProducto: Number(f.idProducto),
    descripcion: String(f.descripcion ?? ''),
    codigo: String(f.codigo ?? ''),
    precioCompra: f.precioDeCompra != null ? Number(f.precioDeCompra) : 0,
    precioVenta: f.precioDeVenta != null ? Number(f.precioDeVenta) : 0,
    usaInventarios: String(f.usaInventarios ?? 'NO'),
    stock: String(f.stock ?? ''),
    stockMinimo: f.stockMinimo != null ? Number(f.stockMinimo) : 0,
  };
}

export default function ProductosPage(): JSX.Element {
  const [items, setItems] = useState<Prod[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [descripcion, setDescripcion] = useState('');
  const [codigo, setCodigo] = useState('');
  const [precioCompra, setPrecioCompra] = useState('0');
  const [precioVenta, setPrecioVenta] = useState('0');
  const [stock, setStock] = useState('0');
  const [stockMinimo, setStockMinimo] = useState('0');
  const [usaInv, setUsaInv] = useState(true);

  function cargar(): void {
    api
      .productos()
      .then((rows) => setItems(rows.map(mapProd)))
      .catch((e: Error) => setError(e.message));
  }
  useEffect(cargar, []);

  async function crear(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await api.crearProducto({
        descripcion,
        codigo,
        precioCompra: Number(precioCompra),
        precioVenta: Number(precioVenta),
        stock,
        stockMinimo: Number(stockMinimo),
        usaInventarios: usaInv ? 'SI' : 'NO',
        impuesto: '0',
      });
      setMsg(`Producto "${descripcion}" creado.`);
      setDescripcion('');
      setCodigo('');
      setPrecioCompra('0');
      setPrecioVenta('0');
      setStock('0');
      setStockMinimo('0');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function eliminar(id: number): Promise<void> {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await api.eliminarProducto(id);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h2>Productos</h2>
      {error && <p className="alert alert--error">{error}</p>}
      {msg && <p className="alert alert--ok">{msg}</p>}

      <form className="panel" onSubmit={crear}>
        <h3>Nuevo producto</h3>
        <div className="row">
          <input
            placeholder="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
          />
          <input
            placeholder="Código"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Costo"
            value={precioCompra}
            onChange={(e) => setPrecioCompra(e.target.value)}
          />
          <input
            type="number"
            step="0.01"
            placeholder="P. Venta"
            value={precioVenta}
            onChange={(e) => setPrecioVenta(e.target.value)}
          />
          <input
            type="number"
            placeholder="Stock"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
          <input
            type="number"
            placeholder="Stock mín."
            value={stockMinimo}
            onChange={(e) => setStockMinimo(e.target.value)}
          />
          <label className="row">
            <input
              type="checkbox"
              checked={usaInv}
              onChange={(e) => setUsaInv(e.target.checked)}
            />
            Inventario
          </label>
          <button className="btn" type="submit">
            Crear
          </button>
        </div>
      </form>

      <table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Código</th>
            <th>Descripción</th>
            <th className="num">Costo</th>
            <th className="num">P. Venta</th>
            <th className="num">Stock</th>
            <th>Inv.</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.idProducto}>
              <td>{p.idProducto}</td>
              <td>{p.codigo}</td>
              <td>{p.descripcion}</td>
              <td className="num">{p.precioCompra}</td>
              <td className="num">{p.precioVenta}</td>
              <td className="num">{p.usaInventarios === 'SI' ? p.stock : '—'}</td>
              <td>{p.usaInventarios}</td>
              <td>
                <button
                  className="btn btn--ghost"
                  onClick={() => eliminar(p.idProducto)}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
