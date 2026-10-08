import { useState } from 'react';
import type { UsuarioAutenticadoDTO } from '@pos/types';
import { login } from '../api';

interface Props {
  onLogin: (usuario: UsuarioAutenticadoDTO) => void;
}

export function LoginView({ onLogin }: Props): JSX.Element {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const u = await login({ login: usuario, password });
      onLogin(u);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={entrar}>
        <h1>Iniciar sesión</h1>
        {error && <p className="alert alert--error">{error}</p>}
        <label>
          Usuario
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoFocus
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="btn btn--primary" disabled={cargando}>
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
