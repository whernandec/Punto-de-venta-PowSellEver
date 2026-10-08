import { useEffect, useState } from 'react';
import type { UsuarioDTO } from '@pos/types';
import { crearUsuario, eliminarUsuario, obtenerUsuarios } from '../api';

export function UsuariosView(): JSX.Element {
  const [items, setItems] = useState<UsuarioDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nombres, setNombres] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('Cajero');

  function cargar(): void {
    obtenerUsuarios().then(setItems).catch((e: Error) => setError(e.message));
  }
  useEffect(cargar, []);

  async function crear(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await crearUsuario({ nombres, login, password, rol });
      setNombres('');
      setLogin('');
      setPassword('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function baja(id: number): Promise<void> {
    try {
      await eliminarUsuario(id);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="page">
      <h2>Usuarios</h2>
      {error && <p className="alert alert--error">{error}</p>}
      <form className="panel row" onSubmit={crear}>
        <input placeholder="Nombre" value={nombres} onChange={(e) => setNombres(e.target.value)} required />
        <input placeholder="Login" value={login} onChange={(e) => setLogin(e.target.value)} required />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <select value={rol} onChange={(e) => setRol(e.target.value)}><option>Cajero</option><option>Supervisor</option><option>Admin</option></select>
        <button className="btn btn--primary" type="submit">Crear</button>
      </form>
      <table className="tabla">
        <thead><tr><th>#</th><th>Nombre</th><th>Login</th><th>Rol</th><th></th></tr></thead>
        <tbody>
          {items.map((u) => (
            <tr key={u.idUsuario}>
              <td>{u.idUsuario}</td><td>{u.nombres}</td><td>{u.login}</td><td>{u.rol}</td>
              <td>{u.login !== 'admin' && <button onClick={() => baja(u.idUsuario)}>Baja</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
