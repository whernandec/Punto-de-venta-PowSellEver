'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, API_BASE, type ReporteVentas } from '@/lib/api';

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}
function haceUnMes(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

export default function ReportesPage(): JSX.Element {
  const [desde, setDesde] = useState(haceUnMes());
  const [hasta, setHasta] = useState(hoy());
  const [data, setData] = useState<ReporteVentas | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    api
      .reporteVentas(desde, hasta)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [desde, hasta]);

  useEffect(cargar, [cargar]);

  const urlExcel = `${API_BASE}/reportes/ventas.xlsx?desde=${desde}&hasta=${hasta}`;

  return (
    <div>
      <h2>Reporte de ventas</h2>
      {error && <p className="alert alert--error">{error}</p>}

      <div className="toolbar">
        <label>
          Desde&nbsp;
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </label>
        <label>
          Hasta&nbsp;
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </label>
        <button className="btn" onClick={cargar}>
          Consultar
        </button>
        <a className="btn btn--ghost" href={urlExcel}>
          Exportar Excel
        </a>
        <button className="btn btn--ghost" onClick={() => window.print()}>
          Imprimir / PDF
        </button>
      </div>

      {data && (
        <>
          <div className="cards">
            <div className="card">
              <div className="card__value">{data.resumen.numVentas}</div>
              <div className="card__label">Ventas</div>
            </div>
            <div className="card">
              <div className="card__value">{data.resumen.total.toFixed(2)}</div>
              <div className="card__label">Total</div>
            </div>
            <div className="card">
              <div className="card__value">
                {data.resumen.efectivo.toFixed(2)}
              </div>
              <div className="card__label">Efectivo</div>
            </div>
            <div className="card">
              <div className="card__value">
                {data.resumen.tarjeta.toFixed(2)}
              </div>
              <div className="card__label">Tarjeta</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Comprobante</th>
                <th>Documento</th>
                <th>Cajero</th>
                <th>Pago</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.filas.map((f) => (
                <tr key={f.idVenta}>
                  <td>{f.idVenta}</td>
                  <td>{f.fecha ? String(f.fecha).slice(0, 10) : ''}</td>
                  <td>{f.comprobante}</td>
                  <td>{f.numeroDoc}</td>
                  <td>{f.cajero}</td>
                  <td>{f.tipoPago}</td>
                  <td className="num">{Number(f.montoTotal ?? 0).toFixed(2)}</td>
                </tr>
              ))}
              {data.filas.length === 0 && (
                <tr>
                  <td colSpan={7}>Sin ventas en el rango.</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
