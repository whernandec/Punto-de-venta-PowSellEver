import { useEffect, useState } from 'react';
import type { ProductoDTO } from '@pos/types';
import { crearProducto, eliminarProducto, obtenerProductos } from '../api';

export function ProductosView(): JSX.Element {
  const [items, setItems] = useState<ProductoDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [codigo, setCodigo] = useState('');
  const [precioCompra, setPrecioCompra] = useState('0');
  const [precioVenta, setPrecioVenta] = useState('0');
  const [stock, setStock] = useState('0');
  const [stockMinimo, setStockMinimo] = useState('0');
  const [usaInv, setUsaInv] = useState(true);

  function cargar(): void {
    obtenerProductos().then(setItems).catch((e: Error) => setError(e.message));
  }
  useEffect(cargar, []);

  async function crear(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await crearProducto({
        descripcion,
        codigo,
        precioCompra: Number(precioCompra),
        precioVenta: Number(precioVenta),
        stock,
        stockMinimo: Number(stockMinimo),
        usaInventarios: usaInv ? 'SI' : 'NO',
        impuesto: '0',
      });
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
    try {
      await eliminarProducto(id);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="page">
      <h2>Productos</h2>
      {error && <p className="alert alert--error">{error}</p>}
      <form className="panel row" onSubmit={crear}>
        <input placeholder="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required />
        <input placeholder="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        <input type="number" step="0.01" placeholder="Costo" value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} />
        <input type="number" step="0.01" placeholder="P. Venta" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} />
        <input type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} />
        <input type="number" placeholder="Stock mín." value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} />
        <label className="row"><input type="checkbox" checked={usaInv} onChange={(e) => setUsaInv(e.target.checked)} /> Inventario</label>
        <button className="btn btn--primary" type="submit">Crear</button>
      </form>
      <table className="tabla">
        <thead>
          <tr><th>#</th><th>Código</th><th>Descripción</th><th className="num">Costo</th><th className="num">P. Venta</th><th className="num">Stock</th><th></th></tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td><td>{p.codigo}</td><td>{p.descripcion}</td>
              <td className="num">{p.precioCompra}</td><td className="num">{p.precioVenta}</td>
              <td className="num">{p.usaInventarios === 'SI' ? p.stock : '—'}</td>
              <td><button onClick={() => eliminar(p.id)}>Eliminar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
