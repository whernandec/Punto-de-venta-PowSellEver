'use client';

import { useEffect, useState } from 'react';
import type { ConceptoDTO } from '@pos/types';
import { api } from '@/lib/api';

const ID_CAJA = 1;

export default function MovimientosPage(): JSX.Element {
  const [gastos, setGastos] = useState<Array<Record<string, unknown>>>([]);
  const [ingresos, setIngresos] = useState<Array<Record<string, unknown>>>([]);
  const [conceptos, setConceptos] = useState<ConceptoDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // gasto
  const [gImporte, setGImporte] = useState('0');
  const [gDesc, setGDesc] = useState('');
  const [gConcepto, setGConcepto] = useState<number | ''>('');
  // ingreso
  const [iImporte, setIImporte] = useState('0');
  const [iDesc, setIDesc] = useState('');

  function cargar(): void {
    api.gastos().then(setGastos).catch(() => undefined);
    api.ingresos().then(setIngresos).catch(() => undefined);
    api.conceptos().then(setConceptos).catch(() => undefined);
  }
  useEffect(cargar, []);

  async function crearGasto(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await api.crearGasto({
        importe: Number(gImporte),
        descripcion: gDesc,
        idCaja: ID_CAJA,
        idConcepto: gConcepto ? Number(gConcepto) : undefined,
        tipoComprobante: 'TICKET',
      });
      setMsg('Gasto registrado.');
      setGImporte('0');
      setGDesc('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function crearIngreso(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await api.crearIngreso({
        importe: Number(iImporte),
        descripcion: iDesc,
        idCaja: ID_CAJA,
        tipoComprobante: 'RECIBO',
      });
      setMsg('Ingreso registrado.');
      setIImporte('0');
      setIDesc('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h2>Movimientos de caja</h2>
      {error && <p className="alert alert--error">{error}</p>}
      {msg && <p className="alert alert--ok">{msg}</p>}

      <div className="grid2">
        <div className="panel">
          <h3>Registrar gasto</h3>
          <form onSubmit={crearGasto} className="row">
            <input
              type="number"
              step="0.01"
              placeholder="Importe"
              value={gImporte}
              onChange={(e) => setGImporte(e.target.value)}
            />
            <input
              placeholder="Descripción"
              value={gDesc}
              onChange={(e) => setGDesc(e.target.value)}
              required
            />
            <select
              value={gConcepto}
              onChange={(e) =>
                setGConcepto(e.target.value ? Number(e.target.value) : '')
              }
            >
              <option value="">— concepto —</option>
              {conceptos.map((c) => (
                <option key={c.idConcepto} value={c.idConcepto}>
                  {c.descripcion}
                </option>
              ))}
            </select>
            <button className="btn" type="submit">
              Agregar gasto
            </button>
          </form>
        </div>

        <div className="panel">
          <h3>Registrar ingreso</h3>
          <form onSubmit={crearIngreso} className="row">
            <input
              type="number"
              step="0.01"
              placeholder="Importe"
              value={iImporte}
              onChange={(e) => setIImporte(e.target.value)}
            />
            <input
              placeholder="Descripción"
              value={iDesc}
              onChange={(e) => setIDesc(e.target.value)}
              required
            />
            <button className="btn" type="submit">
              Agregar ingreso
            </button>
          </form>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 16 }}>
        <div>
          <h3>Gastos</h3>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th className="num">Importe</th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={String(g.idGasto)}>
                  <td>{g.fecha ? String(g.fecha).slice(0, 10) : ''}</td>
                  <td>{String(g.descripcion ?? '')}</td>
                  <td className="num">{String(g.importe ?? '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Ingresos</h3>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th className="num">Importe</th>
              </tr>
            </thead>
            <tbody>
              {ingresos.map((i) => (
                <tr key={String(i.idIngreso)}>
                  <td>{i.fecha ? String(i.fecha).slice(0, 10) : ''}</td>
                  <td>{String(i.descripcion ?? '')}</td>
                  <td className="num">{String(i.importe ?? '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
