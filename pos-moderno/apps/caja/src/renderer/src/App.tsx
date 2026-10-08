import { useState } from 'react';
import type { UsuarioAutenticadoDTO } from '@pos/types';
import { LoginView } from './auth/LoginView';
import { CajaGate } from './caja/CajaGate';

// En producción la caja se identifica por el serial del equipo; aquí fija = 1.
const ID_CAJA = 1;

export function App(): JSX.Element {
  const [usuario, setUsuario] = useState<UsuarioAutenticadoDTO | null>(null);

  if (!usuario) {
    return <LoginView onLogin={setUsuario} />;
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>POS — Punto de Venta</h1>
        <span className="app__badge">
          {usuario.nombres ?? usuario.login} · {usuario.rol ?? 'sin rol'}
        </span>
        <button className="app__logout" onClick={() => setUsuario(null)}>
          Salir
        </button>
      </header>
      <CajaGate idCaja={ID_CAJA} usuario={usuario} />
    </div>
  );
}
