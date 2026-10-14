import { useEffect, useState } from 'react';
import type { EmpresaDTO } from '@pos/types';
import {
  actualizarCajaPrincipal,
  actualizarEmpresa,
  guardarTicket,
  obtenerCajaPrincipal,
  obtenerEmpresa,
  obtenerTicket,
} from '../api';

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

export function EmpresaView(): JSX.Element {
  const [emp, setEmp] = useState<EmpresaDTO | null>(null);
  const [nombreCaja, setNombreCaja] = useState('');
  const [idCaja, setIdCaja] = useState<number | null>(null);
  const [logo, setLogo] = useState('');
  const [logoNueva, setLogoNueva] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    obtenerEmpresa().then(setEmp).catch((e: Error) => setError(e.message));
    obtenerCajaPrincipal()
      .then((c) => {
        if (c) {
          setIdCaja(c.idCaja);
          setNombreCaja(c.descripcion ?? '');
        }
      })
      .catch(() => undefined);
    obtenerTicket()
      .then((t) => {
        const l = (t as { logo?: string })?.logo;
        if (typeof l === 'string') setLogo(l);
      })
      .catch(() => undefined);
  }, []);

  function set<K extends keyof EmpresaDTO>(k: K, v: EmpresaDTO[K]): void {
    setEmp((p) => (p ? { ...p, [k]: v } : p));
    setMsg(null);
  }

  function subirLogo(e: React.ChangeEvent<HTMLInputElement>): void {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = () => {
      setLogo(String(r.result));
      setLogoNueva(true);
    };
    r.readAsDataURL(f);
  }

  async function guardar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!emp) return;
    setError(null);
    try {
      const u = await actualizarEmpresa(emp.idEmpresa, emp);
      setEmp(u);
      if (idCaja && nombreCaja.trim()) await actualizarCajaPrincipal(nombreCaja.trim());
      if (logoNueva) await guardarTicket({ logo });
      setMsg('Configuración de empresa guardada.');
      setLogoNueva(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (error && !emp)
    return (
      <main className="page">
        <h2>Empresa</h2>
        <p className="alert alert--error">{error}</p>
      </main>
    );
  if (!emp)
    return (
      <main className="page">
        <h2>Empresa</h2>
        <p>No hay empresa configurada.</p>
      </main>
    );

  const conImpuestos = (emp.trabajasConImpuestos ?? '').toUpperCase() === 'SI';

  return (
    <div className="emp">
      <form className="emp__card" onSubmit={guardar}>
        {error && <p className="alert alert--error">{error}</p>}
        {msg && <p className="alert alert--ok">{msg}</p>}

        <div className="emp__top">
          <label className="emp__logo" title="Subir logo">
            {logo ? <img src={logo} alt="logo" /> : <span>TU LOGO AQUÍ</span>}
            <input type="file" accept="image/*" hidden onChange={subirLogo} />
            <span className="emp__cam">📷</span>
          </label>
          <div className="emp__head">
            <label className="emp__linea">
              NOMBRE DE TU EMPRESA
              <input
                value={emp.nombreEmpresa ?? ''}
                onChange={(e) => set('nombreEmpresa', e.target.value)}
              />
            </label>
            <div className="emp__fila">
              <label>
                País
                <select
                  value={emp.pais ?? ''}
                  onChange={(e) => {
                    const p = PAISES.find((x) => x.pais === e.target.value);
                    set('pais', e.target.value);
                    if (p) set('moneda', p.moneda);
                  }}
                >
                  <option value="">—</option>
                  {PAISES.map((p) => (
                    <option key={p.pais} value={p.pais}>{p.pais}</option>
                  ))}
                </select>
              </label>
              <label>
                Moneda
                <input value={emp.moneda ?? ''} onChange={(e) => set('moneda', e.target.value)} />
              </label>
            </div>
          </div>
        </div>

        <div className="emp__bloque">
          <label className="chk">
            <input
              type="checkbox"
              checked={conImpuestos}
              onChange={(e) => set('trabajasConImpuestos', e.target.checked ? 'SI' : 'NO')}
            />
            Vendes con impuestos
          </label>
          {conImpuestos && (
            <label className="emp__inline">
              % Impuesto
              <input
                type="number"
                value={emp.porcentajeImpuesto ?? 0}
                onChange={(e) => set('porcentajeImpuesto', Number(e.target.value))}
              />
            </label>
          )}

          <fieldset className="emp__filtros">
            <legend>¿Cómo buscarás tus productos?</legend>
            <label>
              <input
                type="radio"
                name="modo"
                checked={(emp.modoDeBusqueda ?? 'LECTORA') === 'LECTORA'}
                onChange={() => set('modoDeBusqueda', 'LECTORA')}
              />
              Con una lectora de barras
            </label>
            <label>
              <input
                type="radio"
                name="modo"
                checked={emp.modoDeBusqueda === 'TECLADO'}
                onChange={() => set('modoDeBusqueda', 'TECLADO')}
              />
              Escribiendo con mi teclado
            </label>
          </fieldset>
        </div>

        <label className="emp__linea emp__caja">
          CAJA: Nombre de caja
          <input value={nombreCaja} onChange={(e) => { setNombreCaja(e.target.value); setMsg(null); }} />
        </label>

        <div className="emp__futuro">
          <label>
            📁 Carpeta donde guardar las copias de seguridad
            <input
              value={emp.carpetaParaCopias ?? ''}
              onChange={(e) => set('carpetaParaCopias', e.target.value)}
              placeholder="C:\\POS\\Respaldos"
            />
          </label>
          <label>
            Correo para enviarte el reporte del cierre de caja
            <input
              type="text"
              value={emp.correoParaReportes ?? ''}
              onChange={(e) => set('correoParaReportes', e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </label>
        </div>

        <div className="emp__btns">
          <button className="btn btn--primary" type="submit">Guardar</button>
        </div>
      </form>
    </div>
  );
}
