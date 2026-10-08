import { useCallback, useEffect, useState } from 'react';
import {
  descargarReporteExcel,
  descargarReportePdf,
  reporteVentas,
  type ReporteVentasResp,
} from '../api';

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}
function haceUnMes(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

export function ReportesView(): JSX.Element {
  const [desde, setDesde] = useState(haceUnMes());
  const [hasta, setHasta] = useState(hoy());
  const [data, setData] = useState<ReporteVentasResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    reporteVentas(desde, hasta).then(setData).catch((e: Error) => setError(e.message));
  }, [desde, hasta]);

  useEffect(cargar, [cargar]);

  return (
    <main className="page">
      <h2>Reporte de ventas</h2>
      {error && <p className="alert alert--error">{error}</p>}
      <div className="toolbar">
        <label>Desde <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
        <label>Hasta <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
        <button className="btn btn--primary" onClick={cargar}>Consultar</button>
        <button className="btn" onClick={() => void descargarReporteExcel(desde, hasta)}>Exportar Excel</button>
        <button className="btn" onClick={() => void descargarReportePdf(desde, hasta)}>Exportar PDF</button>
      </div>
      {data && (
        <>
          <div className="cards">
            <div className="card"><div className="card__value">{data.resumen.numVentas}</div><div className="card__label">Ventas</div></div>
            <div className="card"><div className="card__value">{data.resumen.total.toFixed(2)}</div><div className="card__label">Total</div></div>
            <div className="card"><div className="card__value">{data.resumen.efectivo.toFixed(2)}</div><div className="card__label">Efectivo</div></div>
            <div className="card"><div className="card__value">{data.resumen.tarjeta.toFixed(2)}</div><div className="card__label">Tarjeta</div></div>
          </div>
          <table className="tabla">
            <thead><tr><th>ID</th><th>Fecha</th><th>Comprobante</th><th>Cajero</th><th>Pago</th><th className="num">Total</th></tr></thead>
            <tbody>
              {data.filas.map((f) => (
                <tr key={String(f.idVenta)}>
                  <td>{String(f.idVenta)}</td>
                  <td>{f.fecha ? String(f.fecha).slice(0, 10) : ''}</td>
                  <td>{String(f.comprobante ?? '')} {String(f.numeroDoc ?? '')}</td>
                  <td>{String(f.cajero ?? '')}</td>
                  <td>{String(f.tipoPago ?? '')}</td>
                  <td className="num">{Number(f.montoTotal ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
