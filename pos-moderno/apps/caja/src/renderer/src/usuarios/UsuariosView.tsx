import { useEffect, useMemo, useState } from 'react';
import type { UsuarioDTO } from '@pos/types';
import {
  actualizarUsuario,
  crearUsuario,
  eliminarUsuario,
  obtenerUsuarios,
} from '../api';

const ROLES = [
  { valor: 'Administrador', label: 'Administrador (acceso total)' },
  { valor: 'Cajero', label: 'Cajero (si está autorizado para manejar la caja)' },
];

interface FormState {
  idUsuario: number | null; // null = nuevo
  nombres: string;
  login: string;
  password: string;
  correo: string;
  rol: string;
  foto: string; // data URL (base64) o ''
  fotoNueva: boolean; // true si se cargó una imagen en esta edición
}

const FORM_VACIO: FormState = {
  idUsuario: null,
  nombres: '',
  login: '',
  password: '',
  correo: '',
  rol: 'Cajero',
  foto: '',
  fotoNueva: false,
};

/** Avatar con las iniciales del nombre (no guardamos foto en el POS moderno). */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '👤';
  return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase();
}

export function UsuariosView(): JSX.Element {
  const [items, setItems] = useState<UsuarioDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState<FormState | null>(null); // null = modo lista

  function cargar(): void {
    obtenerUsuarios()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }
  useEffect(cargar, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return items;
    return items.filter((u) =>
      [u.nombres, u.login, u.correo, u.rol]
        .map((v) => (v ?? '').toLowerCase())
        .some((v) => v.includes(q)),
    );
  }, [items, busqueda]);

  function nuevo(): void {
    setError(null);
    setForm({ ...FORM_VACIO });
  }

  function editar(u: UsuarioDTO): void {
    setError(null);
    setForm({
      idUsuario: u.idUsuario,
      nombres: u.nombres ?? '',
      login: u.login ?? '',
      password: u.password ?? '',
      correo: u.correo ?? '',
      rol: u.rol ?? 'Cajero',
      foto: u.foto ?? '',
      fotoNueva: false,
    });
  }

  async function guardar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!form) return;
    setError(null);

    // Validación propia (sin depender de la del navegador, que bloquea en silencio).
    if (!form.nombres.trim()) return setError('El nombre es obligatorio.');
    if (!form.login.trim()) return setError('El usuario (login) es obligatorio.');
    if (form.idUsuario == null && form.password.length < 4) {
      return setError('La contraseña debe tener al menos 4 caracteres.');
    }
    if (form.correo.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.correo.trim())) {
      return setError('El correo no tiene un formato válido.');
    }

    try {
      if (form.idUsuario == null) {
        await crearUsuario({
          nombres: form.nombres,
          login: form.login,
          password: form.password,
          correo: form.correo,
          rol: form.rol,
          ...(form.foto ? { foto: form.foto } : {}),
        });
      } else {
        await actualizarUsuario(form.idUsuario, {
          nombres: form.nombres,
          login: form.login,
          correo: form.correo,
          rol: form.rol,
          // Solo enviamos contraseña si se escribió algo (evita pisarla por vacío).
          ...(form.password ? { password: form.password } : {}),
          // La foto solo se reenvía si se cargó una nueva en esta edición.
          ...(form.fotoNueva && form.foto ? { foto: form.foto } : {}),
        });
      }
      setForm(null);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function baja(id: number, nombre: string): Promise<void> {
    if (!window.confirm(`¿Eliminar al usuario "${nombre}"?`)) return;
    setError(null);
    try {
      await eliminarUsuario(id);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="usr">
      <header className="usr__header">USUARIOS</header>

      <div className="usr__body">
        <div className="usr__search">
          <span className="usr__search-ico">🔍</span>
          <input
            type="text"
            placeholder="Buscar usuario…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {error && <p className="alert alert--error">{error}</p>}

        {form ? (
          <FormularioUsuario
            form={form}
            setForm={setForm}
            onGuardar={guardar}
            onVolver={() => setForm(null)}
          />
        ) : (
          <>
            <table className="usr__tabla">
              <thead>
                <tr>
                  <th aria-label="acciones" />
                  <th>Nombres</th>
                  <th>Login</th>
                  <th>Password</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u) => (
                  <tr key={u.idUsuario} onDoubleClick={() => editar(u)}>
                    <td className="usr__acc-cell">
                      <button
                        className="usr__edit"
                        title="Editar"
                        onClick={() => editar(u)}
                      >
                        ✏️
                      </button>
                      {u.login !== 'admin' && (
                        <button
                          className="usr__del"
                          title="Eliminar"
                          onClick={() => baja(u.idUsuario, u.nombres ?? '')}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                    <td>
                      <button className="usr__link" onClick={() => editar(u)}>
                        {u.nombres}
                      </button>
                    </td>
                    <td>{u.login}</td>
                    <td>{u.password}</td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      Sin usuarios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <button className="usr__fab" title="Agregar usuario" onClick={nuevo}>
              +
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function FormularioUsuario({
  form,
  setForm,
  onGuardar,
  onVolver,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  onGuardar: (e: React.FormEvent) => void;
  onVolver: () => void;
}): JSX.Element {
  const set = (campo: keyof FormState, valor: string): void =>
    setForm({ ...form, [campo]: valor });

  function elegirFoto(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () =>
      setForm({ ...form, foto: String(reader.result), fotoNueva: true });
    reader.readAsDataURL(file);
  }

  return (
    <form className="usr__form" onSubmit={onGuardar} noValidate>
      <div className="usr__form-grid">
        <div className="usr__fields">
          <label>
            <span>Nombres y Apellidos:</span>
            <input
              value={form.nombres}
              onChange={(e) => set('nombres', e.target.value)}
              autoFocus
            />
          </label>
          <label>
            <span>Usuario:</span>
            <input
              value={form.login}
              onChange={(e) => set('login', e.target.value)}
            />
          </label>
          <label>
            <span>Contraseña:</span>
            <input
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder={form.idUsuario ? '(dejar vacío para no cambiar)' : ''}
            />
          </label>
          <label>
            <span>Correo electrónico:</span>
            <input
              type="text"
              value={form.correo}
              onChange={(e) => set('correo', e.target.value)}
            />
            <small className="muted">Servirá para recuperar su contraseña</small>
          </label>
          <label>
            <span>Rol:</span>
            <select value={form.rol} onChange={(e) => set('rol', e.target.value)}>
              {ROLES.map((r) => (
                <option key={r.valor} value={r.valor}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="usr__avatar">
          {form.foto ? (
            <img className="usr__avatar-img" src={form.foto} alt="Foto del usuario" />
          ) : (
            <div className="usr__avatar-img">{iniciales(form.nombres)}</div>
          )}
          <label className="usr__foto-btn">
            📷 {form.foto ? 'Cambiar foto' : 'Subir foto'}
            <input type="file" accept="image/*" onChange={elegirFoto} hidden />
          </label>
          {form.idUsuario != null && (
            <span className="usr__id">#{form.idUsuario}</span>
          )}
        </div>
      </div>

      <div className="usr__actions">
        <button className="btn btn--amarillo" type="submit">
          Guardar Cambios
        </button>
        <button className="btn btn--texto" type="button" onClick={onVolver}>
          Volver
        </button>
      </div>
    </form>
  );
}
