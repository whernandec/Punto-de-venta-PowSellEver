'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ComprobantesPage(): JSX.Element {
  const [series, setSeries] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [serie, setSerie] = useState('');
  const [tipoDoc, setTipoDoc] = useState('TICKET');

  function cargar(): void {
    api.series().then(setSeries).catch((e: Error) => setError(e.message));
  }
  useEffect(cargar, []);

  async function crear(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await api.crearSerie({ serie, tipoDoc, numeroFin: '0', porDefecto: 'NO' });
      setSerie('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function eliminar(id: number): Promise<void> {
    try {
      await api.eliminarSerie(id);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h2>Serialización de comprobantes</h2>
      {error && <p className="alert alert--error">{error}</p>}
      <form className="panel" onSubmit={crear}>
        <h3>Nueva serie</h3>
        <div className="row">
          <input placeholder="Serie (ej. TC)" value={serie} onChange={(e) => setSerie(e.target.value)} required />
          <input placeholder="Tipo de documento" value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)} />
          <button className="btn" type="submit">Agregar</button>
        </div>
      </form>
      <table>
        <thead><tr><th>#</th><th>Serie</th><th>Tipo</th><th className="num">Último nº</th><th>Por defecto</th><th /></tr></thead>
        <tbody>
          {series.map((s) => (
            <tr key={String(s.idSerializacion)}>
              <td>{String(s.idSerializacion)}</td>
              <td>{String(s.serie ?? '')}</td>
              <td>{String(s.tipoDoc ?? '')}</td>
              <td className="num">{String(s.numeroFin ?? '')}</td>
              <td>{String(s.porDefecto ?? '')}</td>
              <td><button className="btn btn--ghost" onClick={() => eliminar(Number(s.idSerializacion))}>Eliminar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
