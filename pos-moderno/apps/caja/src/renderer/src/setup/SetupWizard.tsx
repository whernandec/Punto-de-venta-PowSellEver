import { useEffect, useState } from 'react';

interface Props {
  onFinish: () => void;
}

type Paso =
  | 'tipo'
  | 'sql'
  | 'empresa'
  | 'admin'
  | 'instalando'
  | 'listo'
  | 'servidor';

const PAISES: { pais: string; moneda: string }[] = [
  { pais: 'México', moneda: 'MXN' },
  { pais: 'Perú', moneda: 'PEN' },
  { pais: 'Costa Rica', moneda: 'CRC' },
  { pais: 'Guatemala', moneda: 'GTQ' },
  { pais: 'Honduras', moneda: 'HNL' },
  { pais: 'Nicaragua', moneda: 'NIO' },
  { pais: 'Panamá', moneda: 'USD' },
  { pais: 'Cuba', moneda: 'CUP' },
  { pais: 'Puerto Rico', moneda: 'USD' },
  { pais: 'Colombia', moneda: 'COP' },
];

export function SetupWizard({ onFinish }: Props): JSX.Element {
  const [paso, setPaso] = useState<Paso>('tipo');
  const [error, setError] = useState<string | null>(null);

  // SQL
  const [host, setHost] = useState('localhost');
  const [puerto, setPuerto] = useState('1433');
  const [sqlUser, setSqlUser] = useState('sa');
  // Debe coincidir con la contraseña que fija el instalador (installer.nsh).
  const [sqlPass, setSqlPass] = useState('Ada369$ecure1');
  const [probando, setProbando] = useState(false);

  // Empresa
  const [nombre, setNombre] = useState('');
  const [paisIdx, setPaisIdx] = useState(0);
  const [moneda, setMoneda] = useState('MXN');
  const [conImpuestos, setConImpuestos] = useState(false);
  const [pctImpuesto, setPctImpuesto] = useState('16');
  const [modoBusqueda, setModoBusqueda] = useState<'LECTORA' | 'TECLADO'>('LECTORA');
  const [nombreCaja, setNombreCaja] = useState('Caja 1');
  const [carpeta, setCarpeta] = useState('');
  const [correo, setCorreo] = useState('');

  // Admin
  const [cajero, setCajero] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminPass2, setAdminPass2] = useState('');

  // Secundaria
  const [servidorUrl, setServidorUrl] = useState('http://');

  // Progreso
  const [progreso, setProgreso] = useState<{ etapa: string; hecho?: number; total?: number }>({
    etapa: 'Preparando…',
  });

  useEffect(() => {
    const off = window.posAPI.setup.onProgreso(setProgreso);
    return off;
  }, []);

  async function probarSql(): Promise<void> {
    setError(null);
    setProbando(true);
    try {
      const r = await window.posAPI.setup.probar({
        host,
        port: Number(puerto) || 1433,
        user: sqlUser,
        password: sqlPass,
      });
      if (!r.ok) {
        setError(r.error ?? 'No se pudo conectar a SQL Server.');
        return;
      }
      setPaso('empresa');
    } finally {
      setProbando(false);
    }
  }

  async function instalar(): Promise<void> {
    setError(null);
    if (!nombre.trim()) {
      setPaso('empresa');
      return setError('Indica el nombre de la empresa.');
    }
    if (adminPass.length < 3) return setError('La contraseña debe tener al menos 3 dígitos.');
    if (adminPass !== adminPass2) return setError('Las contraseñas no coinciden.');

    setPaso('instalando');
    try {
      await window.posAPI.setup.instalarPrincipal({
        sql: { host, port: Number(puerto) || 1433, user: sqlUser, password: sqlPass },
        empresa: {
          nombre,
          pais: PAISES[paisIdx].pais,
          moneda,
          conImpuestos,
          porcentajeImpuesto: conImpuestos ? Number(pctImpuesto) || 0 : 0,
          modoBusqueda,
          nombreCaja,
          carpetaCopias: carpeta,
          correoCierre: correo,
        },
        admin: { nombre: cajero, password: adminPass },
      });
      setPaso('listo');
    } catch (e) {
      setError((e as Error).message);
      setPaso('admin');
    }
  }

  async function instalarSecundaria(): Promise<void> {
    setError(null);
    if (!/^https?:\/\/.+/.test(servidorUrl)) {
      return setError('Ingresa la dirección del servidor (ej. http://192.168.1.50:3000).');
    }
    try {
      await window.posAPI.setup.instalarSecundaria(servidorUrl);
      setPaso('listo');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  /* ---------- Paso 1: tipo de equipo ---------- */
  if (paso === 'tipo') {
    return (
      <div className="setup setup--dark">
        <header className="setup__brand">ADA 369 🍬</header>
        <h1 className="setup__q">¿Esta Computadora es?</h1>
        <div className="setup__tipos">
          <button className="setup__tipo" onClick={() => setPaso('sql')}>
            <span className="setup__tipo-nom">Principal</span>
            <span className="setup__tipo-desc">
              Esta computadora debe estar encendida para que las secundarias se
              conecten. Tiene la base de datos.
            </span>
          </button>
          <button className="setup__tipo" onClick={() => setPaso('servidor')}>
            <span className="setup__tipo-nom">Secundaria</span>
            <span className="setup__tipo-desc">
              Se conecta a la computadora Principal (siempre que esté encendida).
            </span>
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Paso 2: conexión SQL (Principal) ---------- */
  if (paso === 'sql') {
    return (
      <div className="setup setup--dark">
        <header className="setup__brand">ADA 369 🍬</header>
        <div className="setup__card setup__card--sql">
          <h2>Conexión a SQL Server</h2>
          <p className="setup__hint">
            Datos de tu instancia de SQL Server (la instala el instalador con el
            usuario <strong>sa</strong>).
          </p>
          {error && <p className="alert alert--error">{error}</p>}
          <label>Servidor<input value={host} onChange={(e) => setHost(e.target.value)} /></label>
          <label>Puerto<input value={puerto} onChange={(e) => setPuerto(e.target.value)} /></label>
          <label>Usuario<input value={sqlUser} onChange={(e) => setSqlUser(e.target.value)} /></label>
          <label>
            Contraseña
            <input type="password" value={sqlPass} onChange={(e) => setSqlPass(e.target.value)} />
          </label>
          <div className="setup__btns">
            <button className="btn" onClick={() => setPaso('tipo')}>Atrás</button>
            <button className="btn btn--primary" onClick={probarSql} disabled={probando}>
              {probando ? 'Buscando instancia…' : 'Continuar →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Paso 3: empresa ---------- */
  if (paso === 'empresa') {
    return (
      <div className="setup setup--amarillo">
        <div className="setup__card">
          <div className="setup__logo">TU LOGO AQUÍ</div>
          <h2 className="setup__titulo">NOMBRE DE TU EMPRESA</h2>
          {error && <p className="alert alert--error">{error}</p>}
          <label className="setup__linea">
            Nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <div className="setup__fila">
            <label>
              País
              <select
                value={paisIdx}
                onChange={(e) => {
                  const i = Number(e.target.value);
                  setPaisIdx(i);
                  setMoneda(PAISES[i].moneda);
                }}
              >
                {PAISES.map((p, i) => (
                  <option key={p.pais} value={i}>{p.pais}</option>
                ))}
              </select>
            </label>
            <label>
              Moneda
              <input value={moneda} onChange={(e) => setMoneda(e.target.value)} />
            </label>
          </div>
          <label className="chk">
            <input
              type="checkbox"
              checked={conImpuestos}
              onChange={(e) => setConImpuestos(e.target.checked)}
            />
            Vendes con impuestos
          </label>
          {conImpuestos && (
            <label className="setup__linea">
              % Impuesto
              <input value={pctImpuesto} onChange={(e) => setPctImpuesto(e.target.value)} />
            </label>
          )}
          <fieldset className="setup__filtros">
            <legend>¿Cómo buscarás tus productos?</legend>
            <label>
              <input
                type="radio"
                checked={modoBusqueda === 'LECTORA'}
                onChange={() => setModoBusqueda('LECTORA')}
              />
              Con una lectora de barras
            </label>
            <label>
              <input
                type="radio"
                checked={modoBusqueda === 'TECLADO'}
                onChange={() => setModoBusqueda('TECLADO')}
              />
              Escribiendo con mi teclado
            </label>
          </fieldset>
          <label className="setup__linea">
            CAJA: Nombre de caja
            <input value={nombreCaja} onChange={(e) => setNombreCaja(e.target.value)} />
          </label>
          <label className="setup__linea">
            Carpeta para copias de seguridad
            <input value={carpeta} onChange={(e) => setCarpeta(e.target.value)} placeholder="C:\\POS\\Respaldos" />
          </label>
          <label className="setup__linea">
            Correo para reporte de cierre de caja
            <input value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </label>
          <div className="setup__btns">
            <button className="btn" onClick={() => setPaso('sql')}>Atrás</button>
            <button
              className="btn btn--primary"
              onClick={() => {
                if (!nombre.trim()) return setError('Indica el nombre de la empresa.');
                setError(null);
                setPaso('admin');
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Paso 4: usuario administrador ---------- */
  if (paso === 'admin') {
    return (
      <div className="setup setup--amarillo">
        <div className="setup__card">
          <h2 className="setup__titulo-azul">¿Qué cajero principal usará el programa?</h2>
          {error && <p className="alert alert--error">{error}</p>}
          <label className="setup__linea">
            Nombre del cajero(a)
            <input value={cajero} onChange={(e) => setCajero(e.target.value)} autoFocus />
          </label>
          <label className="setup__linea">
            Usuario
            <input value="admin" disabled />
          </label>
          <label className="setup__linea">
            Contraseña (hasta 6 dígitos)
            <input
              type="password"
              maxLength={6}
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
            />
          </label>
          <label className="setup__linea">
            Confirmar contraseña
            <input
              type="password"
              maxLength={6}
              value={adminPass2}
              onChange={(e) => setAdminPass2(e.target.value)}
            />
          </label>
          <p className="muted">
            El Administrador siempre tendrá acceso a todas las funciones del programa.
          </p>
          <div className="setup__btns">
            <button className="btn" onClick={() => setPaso('empresa')}>Atrás</button>
            <button className="btn btn--primary" onClick={instalar}>Finalizar →</button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Instalando (progreso) ---------- */
  if (paso === 'instalando') {
    const pct =
      progreso.total && progreso.hecho
        ? Math.round((progreso.hecho / progreso.total) * 100)
        : null;
    return (
      <div className="setup setup--dark">
        <div className="setup__loader">
          <div className="setup__spin" />
          <h2>No cierres esta ventana</h2>
          <p>Se cerrará automáticamente cuando esté todo listo.</p>
          <p className="setup__etapa">{progreso.etapa}{pct != null ? ` (${pct}%)` : ''}</p>
        </div>
      </div>
    );
  }

  /* ---------- Servidor (Secundaria) ---------- */
  if (paso === 'servidor') {
    return (
      <div className="setup setup--dark">
        <header className="setup__brand">ADA 369 🍬</header>
        <div className="setup__card setup__card--sql">
          <h2>Conectar a la computadora Principal</h2>
          <p className="setup__hint">Dirección de la API del equipo Principal.</p>
          {error && <p className="alert alert--error">{error}</p>}
          <label>
            Servidor
            <input
              value={servidorUrl}
              onChange={(e) => setServidorUrl(e.target.value)}
              placeholder="http://192.168.1.50:3000"
            />
          </label>
          <div className="setup__btns">
            <button className="btn" onClick={() => setPaso('tipo')}>Atrás</button>
            <button className="btn btn--primary" onClick={instalarSecundaria}>Conectar →</button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Listo ---------- */
  return (
    <div className="setup setup--amarillo">
      <div className="setup__card setup__card--ok">
        <div className="setup__check">✓</div>
        <h2>¡Listo!</h2>
        <p>
          Recuerda que para iniciar sesión tu usuario es <strong>admin</strong>
          {paso === 'listo' && adminPass ? (
            <>
              {' '}y tu contraseña es <strong>{adminPass}</strong>
            </>
          ) : null}
          .
        </p>
        <button className="btn btn--primary" onClick={onFinish}>Ir al Login</button>
      </div>
    </div>
  );
}
