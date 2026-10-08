'use client';

import { useEffect, useState } from 'react';
import type { InventarioItemDTO } from '@pos/types';
import { api } from '@/lib/api';

export default function Dashboard(): JSX.Element {
  const [inventario, setInventario] = useState<InventarioItemDTO[]>([]);
  const [bajo, setBajo] = useState<InventarioItemDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.inventario(), api.bajoMinimo()])
      .then(([inv, bm]) => {
        setInventario(inv);
        setBajo(bm);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const valorInventario = inventario.reduce(
    (a, it) => a + Number(it.importe ?? 0),
    0,
  );

  return (
    <div>
      <h2>Dashboard</h2>
      {error && (
        <p className="alert alert--error">
          {error} — ¿está corriendo la API en :3000?
        </p>
      )}

      <div className="cards">
        <div className="card">
          <div className="card__value">{inventario.length}</div>
          <div className="card__label">Productos con inventario</div>
        </div>
        <div className="card">
          <div className="card__value">{valorInventario.toFixed(2)}</div>
          <div className="card__label">Valor del inventario (costo)</div>
        </div>
        <div className="card card--alert">
          <div className="card__value">{bajo.length}</div>
          <div className="card__label">Productos bajo mínimo</div>
        </div>
      </div>

      <h3>Bajo mínimo</h3>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th className="num">Stock</th>
            <th className="num">Mínimo</th>
          </tr>
        </thead>
        <tbody>
          {bajo.map((it) => (
            <tr key={it.idProducto} className="fila--alerta">
              <td>{it.codigo}</td>
              <td>{it.descripcion}</td>
              <td className="num">{it.stock}</td>
              <td className="num">{it.stockMinimo}</td>
            </tr>
          ))}
          {bajo.length === 0 && (
            <tr>
              <td colSpan={4}>Sin productos bajo mínimo 🎉</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
