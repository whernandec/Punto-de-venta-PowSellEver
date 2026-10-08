import { useEffect, useState } from 'react';
import { guardarTicket, obtenerTicket } from '../api';

type Ticket = Record<string, string>;

const CAMPOS: Array<[string, string]> = [
  ['identificadorFiscal', 'Identificador fiscal'],
  ['direccion', 'Dirección'],
  ['provinciaDepartamentoPais', 'Provincia / Departamento / País'],
  ['nombreDeMoneda', 'Nombre de la moneda'],
  ['agradecimiento', 'Mensaje de agradecimiento'],
  ['paginaWebFacebook', 'Página web / Facebook'],
  ['anuncio', 'Anuncio'],
  ['datosFiscales', 'Datos fiscales de autorización'],
];

export function TicketView(): JSX.Element {
  const [t, setT] = useState<Ticket>({});
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    obtenerTicket()
      .then((d) => setT((d as Ticket) ?? {}))
      .catch((e: Error) => setError(e.message));
  }, []);

  function set(k: string, v: string): void {
    setT((p) => ({ ...p, [k]: v }));
  }

  async function guardar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await guardarTicket(
        Object.fromEntries(CAMPOS.map(([k]) => [k, t[k] ?? ''])),
      );
      setMsg('Plantilla de ticket guardada.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="page">
      <h2>Plantilla del ticket</h2>
      {error && <p className="alert alert--error">{error}</p>}
      {msg && <p className="alert alert--ok">{msg}</p>}
      <form className="panel" onSubmit={guardar} style={{ maxWidth: 560 }}>
        <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          {CAMPOS.map(([k, label]) => (
            <label key={k}>
              {label}
              <input value={t[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
            </label>
          ))}
          <button className="btn btn--primary" type="submit">Guardar</button>
        </div>
      </form>
    </main>
  );
}
