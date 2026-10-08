'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CorreoPage(): JSX.Element {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // envío de reporte
  const [para, setPara] = useState('');
  const [desde, setDesde] = useState(hoy());
  const [hasta, setHasta] = useState(hoy());

  useEffect(() => {
    api
      .correo()
      .then((c) => setCorreo((c?.correo as string) ?? ''))
      .catch((e: Error) => setError(e.message));
  }, []);

  async function guardar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await api.guardarCorreo({ correo, password, estadoEnvio: 'ACTIVO' });
      setMsg('Configuración de correo guardada.');
      setPassword('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function enviar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await api.enviarReporteCorreo(para, desde, hasta);
      setMsg(`Reporte enviado a ${para}.`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h2>Correo</h2>
      {error && <p className="alert alert--error">{error}</p>}
      {msg && <p className="alert alert--ok">{msg}</p>}

      <form className="panel" onSubmit={guardar}>
        <h3>Configuración (cuenta de envío)</h3>
        <div className="row">
          <input placeholder="Correo" value={correo} onChange={(e) => setCorreo(e.target.value)} />
          <input type="password" placeholder="Contraseña / App password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn" type="submit">Guardar</button>
        </div>
        <p className="card__label">SMTP configurable por variables SMTP_HOST/SMTP_PORT (por defecto Gmail).</p>
      </form>

      <form className="panel" onSubmit={enviar}>
        <h3>Enviar reporte de ventas (PDF)</h3>
        <div className="row">
          <input placeholder="Para (correo destino)" value={para} onChange={(e) => setPara(e.target.value)} required />
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <button className="btn" type="submit">Enviar</button>
        </div>
      </form>
    </div>
  );
}
