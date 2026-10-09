import { useState } from 'react';
import type { UsuarioAutenticadoDTO } from '@pos/types';
import { LoginView } from './auth/LoginView';
import { CajaGate } from './caja/CajaGate';
import { DashboardView } from './dashboard/DashboardView';
import { ConfiguracionesView } from './config/ConfiguracionesView';
import { ModuloView } from './modulos';
import { setToken } from './api';

const ID_CAJA = 1;

function esAdministrador(u: UsuarioAutenticadoDTO): boolean {
  return (u.rol ?? '').toLowerCase().includes('admin');
}

// Rutas: 'dashboard' | 'caja' | 'config' | 'm:<modulo>'
type Vista = string;

export function App(): JSX.Element {
  const [usuario, setUsuario] = useState<UsuarioAutenticadoDTO | null>(null);
  const [vista, setVista] = useState<Vista>('caja');
  const [origenModulo, setOrigenModulo] = useState<Vista>('dashboard');

  function alIniciarSesion(u: UsuarioAutenticadoDTO): void {
    setToken(u.token);
    void window.posAPI.auth.setToken(u.token);
    setVista(esAdministrador(u) ? 'dashboard' : 'caja');
    setUsuario(u);
  }
  function salir(): void {
    setToken(null);
    void window.posAPI.auth.setToken(null);
    setUsuario(null);
  }

  if (!usuario) return <LoginView onLogin={alIniciarSesion} />;

  const admin = esAdministrador(usuario);

  function abrirModulo(key: string, origen: Vista): void {
    setOrigenModulo(origen);
    setVista(`m:${key}`);
  }

  // --- Dashboard (solo admin) ---
  if (vista === 'dashboard' && admin) {
    return (
      <DashboardView
        usuario={usuario}
        onSalir={salir}
        onIr={(key) => {
          if (key === 'ventas') setVista('caja');
          else if (key === 'config') setVista('config');
          else abrirModulo(key ?? 'ventas', 'dashboard');
        }}
      />
    );
  }

  // --- Configuraciones (solo admin) ---
  if (vista === 'config' && admin) {
    return (
      <ConfiguracionesView
        onAbrir={(k) => abrirModulo(k, 'config')}
        onVolver={() => setVista('dashboard')}
      />
    );
  }

  // --- Módulo individual ---
  if (vista.startsWith('m:')) {
    return (
      <ModuloView
        moduloKey={vista.slice(2)}
        idCaja={ID_CAJA}
        idUsuario={usuario.idUsuario}
        onVolver={() => setVista(origenModulo)}
      />
    );
  }

  // --- Caja (POS) — todos los roles ---
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
        onIr={(key) => abrirModulo(key, 'caja')}
        onInicio={admin ? () => setVista('dashboard') : undefined}
      />
    </div>
  );
}
