import { useState } from 'react';
import type { UsuarioAutenticadoDTO } from '@pos/types';
import { LoginView } from './auth/LoginView';
import { CajaGate } from './caja/CajaGate';
import { DashboardView } from './dashboard/DashboardView';
import { setToken } from './api';

// En producción la caja se identifica por el serial del equipo; aquí fija = 1.
const ID_CAJA = 1;

function esAdministrador(u: UsuarioAutenticadoDTO): boolean {
  return (u.rol ?? '').toLowerCase().includes('admin');
}

export function App(): JSX.Element {
  const [usuario, setUsuario] = useState<UsuarioAutenticadoDTO | null>(null);
  const [pantalla, setPantalla] = useState<'dashboard' | 'caja'>('caja');
  const [tabInicial, setTabInicial] = useState<string>('ventas');

  function alIniciarSesion(u: UsuarioAutenticadoDTO): void {
    setToken(u.token);
    void window.posAPI.auth.setToken(u.token);
    // Regla de rol: el Administrador ve primero el Dashboard; el resto va a la caja.
    setPantalla(esAdministrador(u) ? 'dashboard' : 'caja');
    setTabInicial('ventas');
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

  const admin = esAdministrador(usuario);

  // Dashboard (solo Administrador).
  if (pantalla === 'dashboard' && admin) {
    return (
      <DashboardView
        usuario={usuario}
        onSalir={salir}
        onIr={(tab) => {
          setTabInicial(tab ?? 'ventas');
          setPantalla('caja');
        }}
      />
    );
  }

  // Caja (POS) — todos los roles.
  return (
    <div className="app">
      <header className="app__header">
        <h1>POS — Punto de Venta</h1>
        <span className="app__badge">
          {usuario.nombres ?? usuario.login} · {usuario.rol ?? 'sin rol'}
        </span>
        <button className="app__logout" onClick={salir}>Salir</button>
      </header>
      <CajaGate
        idCaja={ID_CAJA}
        usuario={usuario}
        tabInicial={tabInicial}
        onInicio={admin ? () => setPantalla('dashboard') : undefined}
      />
    </div>
  );
}
