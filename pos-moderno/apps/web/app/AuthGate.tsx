'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { UsuarioAutenticadoDTO } from '@pos/types';
import { api } from '@/lib/api';

const STORAGE_KEY = 'pos_usuario';

export function AuthGate({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [usuario, setUsuario] = useState<UsuarioAutenticadoDTO | null>(null);
  const [listo, setListo] = useState(false);

  // login form
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setUsuario(JSON.parse(raw) as UsuarioAutenticadoDTO);
    setListo(true);
  }, []);

  async function entrar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const u = await api.login({ login, password });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      setUsuario(u);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  function salir(): void {
    localStorage.removeItem(STORAGE_KEY);
    setUsuario(null);
  }

  if (!listo) return <div />; // evita parpadeo/hydration mismatch

  if (!usuario) {
    return (
      <div className="loginbox">
        <form className="loginbox__card" onSubmit={entrar}>
          <h1>POS Admin</h1>
          <p className="loginbox__sub">Back-office</p>
          {error && <p className="alert alert--error">{error}</p>}
          <input
            placeholder="Usuario"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn" disabled={cargando}>
            {cargando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <h1 className="sidebar__brand">POS Admin</h1>
        <nav className="sidebar__nav">
          <Link href="/">Dashboard</Link>
          <Link href="/productos">Productos</Link>
          <Link href="/inventario">Inventario</Link>
          <Link href="/compras">Compras</Link>
          <Link href="/proveedores">Proveedores</Link>
          <Link href="/clientes">Clientes</Link>
          <Link href="/cobros">Cobros</Link>
          <Link href="/movimientos">Movimientos</Link>
          <Link href="/usuarios">Usuarios</Link>
          <Link href="/reportes">Reportes</Link>
          <Link href="/comprobantes">Comprobantes</Link>
          <Link href="/ticket">Ticket</Link>
          <Link href="/correo">Correo</Link>
          <Link href="/empresa">Empresa</Link>
        </nav>
        <div className="sidebar__user">
          <div>{usuario.nombres ?? usuario.login}</div>
          <button className="btn btn--ghost" onClick={salir}>
            Salir
          </button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
