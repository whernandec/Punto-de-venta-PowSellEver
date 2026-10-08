'use client';

import { useCallback, useEffect, useState } from 'react';
import type { InventarioItemDTO } from '@pos/types';
import { api } from '@/lib/api';

// Back-office: operaciones atribuidas a la caja/usuario administrativo.
const ID_CAJA = 1;
const ID_USUARIO = 1;

export default function InventarioPage(): JSX.Element {
  const [items, setItems] = useState<InventarioItemDTO[]>([]);
  const [q, setQ] = useState('');
  const [soloBajo, setSoloBajo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [sel, setSel] = useState<InventarioItemDTO | null>(null);
  const [tipo, setTipo] = useState<'Entrada' | 'Salida'>('Entrada');
  const [cantidad, setCantidad] = useState('1');
  const [motivo, setMotivo] = useState('');

  const cargar = useCallback(() => {
    (soloBajo ? api.bajoMinimo() : api.inventario(q))
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, [soloBajo, q]);

  useEffect(cargar, [cargar]);

  async function aplicar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!sel) return;
    setError(null);
    try {
      await api.ajuste({
        idProducto: sel.idProducto,
        idCaja: ID_CAJA,
        idUsuario: ID_USUARIO,
        tipo: tipo as never,
        cantidad: Number(cantidad),
        motivo,
      });
      setMsg(`Ajuste ${tipo} de ${cantidad} en ${sel.descripcion}.`);
      setSel(null);
      setMotivo('');
      setCantidad('1');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h2>Inventario</h2>
      <div className="toolbar">
        <input
          placeholder="Buscar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={soloBajo}
        />
        <label className="row">
          <input
            type="checkbox"
            checked={soloBajo}
            onChange={(e) => setSoloBajo(e.target.checked)}
          />
          Solo bajo mínimo
        </label>
      </div>

      {error && <p className="alert alert--error">{error}</p>}
      {msg && <p className="alert alert--ok">{msg}</p>}

      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th className="num">Stock</th>
            <th className="num">Mínimo</th>
            <th className="num">Costo</th>
            <th className="num">P. Venta</th>
            <th />
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
                  <button className="btn btn--ghost" onClick={() => setSel(it)}>
                    Ajustar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sel && (
        <form className="panel" onSubmit={aplicar}>
          <h3>
            Ajustar: {sel.descripcion} (stock {sel.stock})
          </h3>
          <div className="row">
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
            <button className="btn" type="submit">
              Aplicar
            </button>
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => setSel(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
