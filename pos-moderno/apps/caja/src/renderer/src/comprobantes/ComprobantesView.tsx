import { useEffect, useState } from 'react';
import { crearSerie, eliminarSerie, obtenerSeries } from '../api';

export function ComprobantesView(): JSX.Element {
  const [series, setSeries] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [serie, setSerie] = useState('');
  const [tipoDoc, setTipoDoc] = useState('TICKET');

  function cargar(): void {
    obtenerSeries().then(setSeries).catch((e: Error) => setError(e.message));
  }
  useEffect(cargar, []);

  async function crear(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await crearSerie({ serie, tipoDoc, numeroFin: '0', porDefecto: 'NO' });
      setSerie('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function eliminar(id: number): Promise<void> {
    try {
      await eliminarSerie(id);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="page">
      <h2>Serialización de comprobantes</h2>
      {error && <p className="alert alert--error">{error}</p>}
      <form className="panel row" onSubmit={crear}>
        <input placeholder="Serie (ej. TC)" value={serie} onChange={(e) => setSerie(e.target.value)} required />
        <input placeholder="Tipo de documento" value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)} />
        <button className="btn btn--primary" type="submit">Agregar</button>
      </form>
      <table className="tabla">
        <thead><tr><th>#</th><th>Serie</th><th>Tipo</th><th className="num">Último nº</th><th></th></tr></thead>
        <tbody>
          {series.map((s) => (
            <tr key={String(s.idSerializacion)}>
              <td>{String(s.idSerializacion)}</td>
              <td>{String(s.serie ?? '')}</td>
              <td>{String(s.tipoDoc ?? '')}</td>
              <td className="num">{String(s.numeroFin ?? '')}</td>
              <td><button onClick={() => eliminar(Number(s.idSerializacion))}>Eliminar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
