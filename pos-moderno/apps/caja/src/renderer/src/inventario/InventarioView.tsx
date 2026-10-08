import { useCallback, useEffect, useState } from 'react';
import type { InventarioItemDTO } from '@pos/types';
import {
  ajusteInventario,
  inventarioBajoMinimo,
  obtenerInventario,
} from '../api';

interface Props {
  idCaja: number;
  idUsuario: number;
}

export function InventarioView({ idCaja, idUsuario }: Props): JSX.Element {
  const [items, setItems] = useState<InventarioItemDTO[]>([]);
  const [soloBajoMinimo, setSoloBajoMinimo] = useState(false);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Ajuste
  const [sel, setSel] = useState<InventarioItemDTO | null>(null);
  const [tipo, setTipo] = useState<'Entrada' | 'Salida'>('Entrada');
  const [cantidad, setCantidad] = useState('1');
  const [motivo, setMotivo] = useState('');

  const cargar = useCallback(() => {
    const p = soloBajoMinimo ? inventarioBajoMinimo() : obtenerInventario(q);
    p.then(setItems).catch((e: Error) => setError(e.message));
  }, [soloBajoMinimo, q]);

  useEffect(cargar, [cargar]);

  async function aplicarAjuste(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!sel) return;
    setError(null);
    try {
      await ajusteInventario({
        idProducto: sel.idProducto,
        idCaja,
        idUsuario,
        tipo: tipo as never,
        cantidad: Number(cantidad),
        motivo,
      });
      setMensaje(
        `Ajuste ${tipo} de ${cantidad} aplicado a ${sel.descripcion}.`,
      );
      setSel(null);
      setMotivo('');
      setCantidad('1');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="page">
      <div className="page__head">
        <h2>Inventario</h2>
        <div className="page__tools">
          <input
            placeholder="Buscar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={soloBajoMinimo}
          />
          <label className="chk">
            <input
              type="checkbox"
              checked={soloBajoMinimo}
              onChange={(e) => setSoloBajoMinimo(e.target.checked)}
            />
            Solo bajo mínimo
          </label>
        </div>
      </div>

      {error && <p className="alert alert--error">{error}</p>}
      {mensaje && <p className="alert alert--ok">{mensaje}</p>}

      <table className="tabla">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th className="num">Stock</th>
            <th className="num">Mínimo</th>
            <th className="num">Costo</th>
            <th className="num">P. Venta</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const bajo =
              it.stock != null &&
              it.stockMinimo != null &&
              Number(it.stock) <= Number(it.stockMinimo);
            return (
              <tr key={it.idProducto} className={bajo ? 'fila--alerta' : ''}>
                <td>{it.codigo}</td>
                <td>{it.descripcion}</td>
                <td className="num">{it.stock}</td>
                <td className="num">{it.stockMinimo}</td>
                <td className="num">{it.costo}</td>
                <td className="num">{it.precioVenta}</td>
                <td>
                  <button onClick={() => setSel(it)}>Ajustar</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sel && (
        <form className="ajuste" onSubmit={aplicarAjuste}>
          <h3>Ajustar: {sel.descripcion} (stock {sel.stock})</h3>
          <div className="ajuste__row">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'Entrada' | 'Salida')}
            >
              <option value="Entrada">Entrada (+)</option>
              <option value="Salida">Salida (−)</option>
            </select>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
            <input
              placeholder="Motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
            />
            <button className="btn btn--primary" type="submit">
              Aplicar
            </button>
            <button type="button" onClick={() => setSel(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
