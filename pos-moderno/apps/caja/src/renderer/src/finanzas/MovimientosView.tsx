import { useEffect, useState } from 'react';
import type { ConceptoDTO } from '@pos/types';
import {
  crearGasto,
  crearIngreso,
  obtenerConceptos,
  obtenerGastos,
  obtenerIngresos,
} from '../api';

interface Props {
  idCaja: number;
}

export function MovimientosView({ idCaja }: Props): JSX.Element {
  const [gastos, setGastos] = useState<Array<Record<string, unknown>>>([]);
  const [ingresos, setIngresos] = useState<Array<Record<string, unknown>>>([]);
  const [conceptos, setConceptos] = useState<ConceptoDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gImporte, setGImporte] = useState('0');
  const [gDesc, setGDesc] = useState('');
  const [gConcepto, setGConcepto] = useState<number | ''>('');
  const [iImporte, setIImporte] = useState('0');
  const [iDesc, setIDesc] = useState('');

  function cargar(): void {
    obtenerGastos().then(setGastos).catch(() => undefined);
    obtenerIngresos().then(setIngresos).catch(() => undefined);
    obtenerConceptos().then(setConceptos).catch(() => undefined);
  }
  useEffect(cargar, []);

  async function addGasto(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await crearGasto({
        importe: Number(gImporte),
        descripcion: gDesc,
        idCaja,
        idConcepto: gConcepto ? Number(gConcepto) : undefined,
        tipoComprobante: 'TICKET',
      });
      setGImporte('0');
      setGDesc('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function addIngreso(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await crearIngreso({ importe: Number(iImporte), descripcion: iDesc, idCaja, tipoComprobante: 'RECIBO' });
      setIImporte('0');
      setIDesc('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="page">
      <h2>Movimientos de caja</h2>
      {error && <p className="alert alert--error">{error}</p>}
      <div className="grid2">
        <form className="panel" onSubmit={addGasto}>
          <h3>Gasto</h3>
          <div className="row">
            <input type="number" step="0.01" placeholder="Importe" value={gImporte} onChange={(e) => setGImporte(e.target.value)} />
            <input placeholder="Descripción" value={gDesc} onChange={(e) => setGDesc(e.target.value)} required />
            <select value={gConcepto} onChange={(e) => setGConcepto(e.target.value ? Number(e.target.value) : '')}>
              <option value="">— concepto —</option>
              {conceptos.map((c) => (<option key={c.idConcepto} value={c.idConcepto}>{c.descripcion}</option>))}
            </select>
            <button className="btn btn--primary" type="submit">Agregar gasto</button>
          </div>
        </form>
        <form className="panel" onSubmit={addIngreso}>
          <h3>Ingreso</h3>
          <div className="row">
            <input type="number" step="0.01" placeholder="Importe" value={iImporte} onChange={(e) => setIImporte(e.target.value)} />
            <input placeholder="Descripción" value={iDesc} onChange={(e) => setIDesc(e.target.value)} required />
            <button className="btn btn--primary" type="submit">Agregar ingreso</button>
          </div>
        </form>
      </div>
      <div className="grid2">
        <div>
          <h3>Gastos</h3>
          <table className="tabla"><thead><tr><th>Fecha</th><th>Descripción</th><th className="num">Importe</th></tr></thead>
            <tbody>{gastos.map((g) => (<tr key={String(g.idGasto)}><td>{g.fecha ? String(g.fecha).slice(0, 10) : ''}</td><td>{String(g.descripcion ?? '')}</td><td className="num">{String(g.importe ?? '')}</td></tr>))}</tbody>
          </table>
        </div>
        <div>
          <h3>Ingresos</h3>
          <table className="tabla"><thead><tr><th>Fecha</th><th>Descripción</th><th className="num">Importe</th></tr></thead>
            <tbody>{ingresos.map((i) => (<tr key={String(i.idIngreso)}><td>{i.fecha ? String(i.fecha).slice(0, 10) : ''}</td><td>{String(i.descripcion ?? '')}</td><td className="num">{String(i.importe ?? '')}</td></tr>))}</tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
