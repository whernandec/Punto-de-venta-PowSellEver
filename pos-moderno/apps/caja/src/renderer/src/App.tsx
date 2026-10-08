import { useState } from 'react';
import type { UsuarioAutenticadoDTO } from '@pos/types';
import { LoginView } from './auth/LoginView';
import { CajaGate } from './caja/CajaGate';
import { setToken } from './api';

// En producción la caja se identifica por el serial del equipo; aquí fija = 1.
const ID_CAJA = 1;

export function App(): JSX.Element {
  const [usuario, setUsuario] = useState<UsuarioAutenticadoDTO | null>(null);

  function alIniciarSesion(u: UsuarioAutenticadoDTO): void {
    setToken(u.token); // cliente del renderer
    void window.posAPI.auth.setToken(u.token); // proceso main (sync offline)
    setUsuario(u);
  }

  function salir(): void {
    setToken(null);
    void window.posAPI.auth.setToken(null);
    setUsuario(null);
  }

  if (!usuario) {
    return <LoginView onLogin={alIniciarSesion} />;
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>POS — Punto de Venta</h1>
        <span className="app__badge">
          {usuario.nombres ?? usuario.login} · {usuario.rol ?? 'sin rol'}
        </span>
        <button className="app__logout" onClick={salir}>
          Salir
        </button>
      </header>
      <CajaGate idCaja={ID_CAJA} usuario={usuario} />
    </div>
  );
}
