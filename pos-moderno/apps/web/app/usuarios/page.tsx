'use client';

import { useEffect, useState } from 'react';
import type { UsuarioDTO } from '@pos/types';
import { api } from '@/lib/api';

export default function UsuariosPage(): JSX.Element {
  const [items, setItems] = useState<UsuarioDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [nombres, setNombres] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState('Cajero');

  function cargar(): void {
    api.usuarios().then(setItems).catch((e: Error) => setError(e.message));
  }
  useEffect(cargar, []);

  async function crear(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await api.crearUsuario({ nombres, login, password, correo, rol });
      setMsg(`Usuario "${login}" creado.`);
      setNombres('');
      setLogin('');
      setPassword('');
      setCorreo('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function eliminar(id: number): Promise<void> {
    if (!confirm('¿Dar de baja este usuario?')) return;
    try {
      await api.eliminarUsuario(id);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h2>Usuarios</h2>
      {error && <p className="alert alert--error">{error}</p>}
      {msg && <p className="alert alert--ok">{msg}</p>}

      <form className="panel" onSubmit={crear}>
        <h3>Nuevo usuario</h3>
        <div className="row">
          <input
            placeholder="Nombre y apellidos"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
            required
          />
          <input
            placeholder="Login"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            placeholder="Correo"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
          <select value={rol} onChange={(e) => setRol(e.target.value)}>
            <option>Cajero</option>
            <option>Supervisor</option>
            <option>Admin</option>
          </select>
          <button className="btn" type="submit">
            Crear
          </button>
        </div>
      </form>

      <table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Nombre</th>
            <th>Login</th>
            <th>Correo</th>
            <th>Rol</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((u) => (
            <tr key={u.idUsuario}>
              <td>{u.idUsuario}</td>
              <td>{u.nombres}</td>
              <td>{u.login}</td>
              <td>{u.correo}</td>
              <td>{u.rol}</td>
              <td>
                {u.login !== 'admin' && (
                  <button
                    className="btn btn--ghost"
                    onClick={() => eliminar(u.idUsuario)}
                  >
                    Baja
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
