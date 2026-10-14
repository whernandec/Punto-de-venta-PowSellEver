import { useEffect, useState } from 'react';
import {
  actualizarEmpresa,
  guardarTicket,
  obtenerTicket,
  obtenerEmpresa,
} from '../api';
import {
  DISENO_DEFAULT,
  VENTA_EJEMPLO,
  type DisenoComprobante,
  type FormatoComprobante,
} from './comprobante';
import { TicketComprobante } from './TicketComprobante';

function aDiseno(d: Record<string, unknown>): DisenoComprobante {
  const s = (k: string, def: string): string => {
    const v = d[k];
    return typeof v === 'string' && v.trim() ? v : def;
  };
  return {
    formato: (d.formato === 'FACTURA' ? 'FACTURA' : 'TICKET') as FormatoComprobante,
    logo: typeof d.logo === 'string' ? d.logo : '',
    identificadorFiscal: s('identificadorFiscal', DISENO_DEFAULT.identificadorFiscal),
    direccion: s('direccion', DISENO_DEFAULT.direccion),
    provinciaDepartamentoPais: s('provinciaDepartamentoPais', DISENO_DEFAULT.provinciaDepartamentoPais),
    nombreDeMoneda: s('nombreDeMoneda', DISENO_DEFAULT.nombreDeMoneda),
    agradecimiento: s('agradecimiento', DISENO_DEFAULT.agradecimiento),
    paginaWebFacebook: s('paginaWebFacebook', DISENO_DEFAULT.paginaWebFacebook),
    anuncio: s('anuncio', DISENO_DEFAULT.anuncio),
    datosFiscales: s('datosFiscales', DISENO_DEFAULT.datosFiscales),
  };
}

const CAMPOS: Array<[keyof DisenoComprobante, string]> = [
  ['identificadorFiscal', 'RUC / Identificador fiscal'],
  ['direccion', 'Dirección (calle, nro, avenida)'],
  ['provinciaDepartamentoPais', 'Provincia - Departamento - País'],
  ['nombreDeMoneda', 'Nombre de la moneda'],
  ['agradecimiento', 'Mensaje de agradecimiento'],
  ['paginaWebFacebook', 'Página web / Facebook'],
  ['anuncio', 'Anuncio'],
];

export function TicketView(): JSX.Element {
  const [diseno, setDiseno] = useState<DisenoComprobante>(DISENO_DEFAULT);
  const [empresa, setEmpresa] = useState('NOMBRE DE TU EMPRESA');
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    obtenerTicket()
      .then((d) => setDiseno(aDiseno((d as Record<string, unknown>) ?? {})))
      .catch((e: Error) => setError(e.message));
    obtenerEmpresa()
      .then((e) => {
        if (e?.idEmpresa) setEmpresaId(e.idEmpresa);
        if (e?.nombreEmpresa) setEmpresa(e.nombreEmpresa);
      })
      .catch(() => undefined);
  }, []);

  function set<K extends keyof DisenoComprobante>(k: K, v: DisenoComprobante[K]): void {
    setDiseno((p) => ({ ...p, [k]: v }));
    setMsg(null);
  }

  function subirLogo(e: React.ChangeEvent<HTMLInputElement>): void {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = () => set('logo', String(r.result));
    r.readAsDataURL(f);
  }

  async function guardar(): Promise<void> {
    setError(null);
    try {
      await guardarTicket(diseno as unknown as Record<string, unknown>);
      if (empresaId) await actualizarEmpresa(empresaId, { nombreEmpresa: empresa });
      setMsg('Diseño del comprobante guardado. Aparecerá en el ticket de cada venta.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="cmp">
      <div className="cmp__preview">
        <TicketComprobante diseno={diseno} venta={{ ...VENTA_EJEMPLO, empresa }} />
      </div>

      <div className="cmp__panel">
        <h2>Diseño de Comprobantes</h2>
        {error && <p className="alert alert--error">{error}</p>}
        {msg && <p className="alert alert--ok">{msg}</p>}

        <p className="cmp__sub">Elige un formato de comprobante con el que trabajarás</p>
        <div className="cmp__formatos">
          <button
            className={`cmp__fmt ${diseno.formato === 'TICKET' ? 'cmp__fmt--on' : ''}`}
            onClick={() => set('formato', 'TICKET')}
          >
            Ticket No Fiscal
          </button>
          <button
            className={`cmp__fmt ${diseno.formato === 'FACTURA' ? 'cmp__fmt--on' : ''}`}
            onClick={() => set('formato', 'FACTURA')}
          >
            Factura - Boleta
          </button>
        </div>

        <label className="cmp__logo-btn">
          📷 {diseno.logo ? 'Cambiar logo' : 'Subir logo'}
          <input type="file" accept="image/*" hidden onChange={subirLogo} />
        </label>

        <div className="cmp__campos">
          <label>
            Nombre del negocio
            <input
              value={empresa}
              placeholder="Mi Negocio S.A."
              onChange={(e) => {
                setEmpresa(e.target.value);
                setMsg(null);
              }}
            />
          </label>
          {CAMPOS.map(([k, label]) => (
            <label key={k}>
              {label}
              <input value={diseno[k]} onChange={(e) => set(k, e.target.value as never)} />
            </label>
          ))}
          {diseno.formato === 'FACTURA' && (
            <label>
              Datos fiscales (autorización, resolución…)
              <input
                value={diseno.datosFiscales}
                onChange={(e) => set('datosFiscales', e.target.value)}
              />
            </label>
          )}
        </div>

        <button className="cmp__guardar" onClick={guardar}>Guardar</button>
      </div>
    </div>
  );
}
