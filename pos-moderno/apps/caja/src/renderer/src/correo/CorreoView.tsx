import { useEffect, useState } from 'react';
import { enviarReporteCorreo, guardarCorreo, obtenerCorreo } from '../api';

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CorreoView(): JSX.Element {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [para, setPara] = useState('');
  const [desde, setDesde] = useState(hoy());
  const [hasta, setHasta] = useState(hoy());
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    obtenerCorreo()
      .then((c) => setCorreo((c?.correo as string) ?? ''))
      .catch((e: Error) => setError(e.message));
  }, []);

  async function guardar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await guardarCorreo({ correo, password, estadoEnvio: 'ACTIVO' });
      setMsg('Configuración guardada.');
      setPassword('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function enviar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await enviarReporteCorreo(para, desde, hasta);
      setMsg(`Reporte enviado a ${para}.`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="page">
      <h2>Correo</h2>
      {error && <p className="alert alert--error">{error}</p>}
      {msg && <p className="alert alert--ok">{msg}</p>}
      <form className="panel row" onSubmit={guardar}>
        <input placeholder="Correo" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <input type="password" placeholder="Contraseña / App password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn btn--primary" type="submit">Guardar config</button>
      </form>
      <form className="panel row" onSubmit={enviar}>
        <input placeholder="Enviar reporte a (correo)" value={para} onChange={(e) => setPara(e.target.value)} required />
        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        <button className="btn btn--primary" type="submit">Enviar PDF</button>
      </form>
    </main>
  );
}
