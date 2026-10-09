import { useEffect, useState } from 'react';
import type { ClienteDTO } from '@pos/types';

export interface DatosCobro {
  modo: 'directo' | 'pantalla';
  efectivo: number;
  tarjeta: number;
  credito: number;
  vuelto: number;
  idCliente?: number;
  tipoDoc: 'BOLETA' | 'FACTURA';
}

interface Props {
  total: number;
  numeroDoc: string;
  clientes: ClienteDTO[];
  onCancelar: () => void;
  onConfirmar: (d: DatosCobro) => void;
}

type Campo = 'efectivo' | 'tarjeta' | 'credito';

export function CobroModal({ total, numeroDoc, clientes, onCancelar, onConfirmar }: Props): JSX.Element {
  const [efectivo, setEfectivo] = useState(total.toFixed(2));
  const [tarjeta, setTarjeta] = useState('0');
  const [credito, setCredito] = useState('0');
  const [campo, setCampo] = useState<Campo>('efectivo');
  const [idCliente, setIdCliente] = useState<number | ''>('');
  const [tipoDoc, setTipoDoc] = useState<'BOLETA' | 'FACTURA'>('BOLETA');

  const pagado = (Number(efectivo) || 0) + (Number(tarjeta) || 0) + (Number(credito) || 0);
  const vuelto = Math.max(0, pagado - total);
  const restante = Math.max(0, total - pagado);

  const set = (v: string): void => {
    if (campo === 'efectivo') setEfectivo(v);
    else if (campo === 'tarjeta') setTarjeta(v);
    else setCredito(v);
  };
  const valor = (): string => (campo === 'efectivo' ? efectivo : campo === 'tarjeta' ? tarjeta : credito);
  const tecla = (d: string): void =>
    set(d === ',' ? (valor().includes('.') ? valor() : valor() + '.') : (valor() === '0' ? d : valor() + d));

  function confirmar(modo: 'directo' | 'pantalla'): void {
    onConfirmar({
      modo,
      efectivo: Number(efectivo) || 0,
      tarjeta: Number(tarjeta) || 0,
      credito: Number(credito) || 0,
      vuelto,
      idCliente: idCliente ? Number(idCliente) : undefined,
      tipoDoc,
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); confirmar('directo'); }
      else if (e.key === 'F1') { e.preventDefault(); e.stopImmediatePropagation(); confirmar('pantalla'); }
      else if (e.key === 'Escape') { e.preventDefault(); onCancelar(); }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [efectivo, tarjeta, credito, idCliente, tipoDoc, vuelto]);

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="cobro" onClick={(e) => e.stopPropagation()}>
        <button className="cobro__x" onClick={onCancelar}>✕</button>
        <div className="cobro__left">
          <div className="cobro__total">$ {total.toFixed(2)}</div>
          <div className="cobro__pagos">
            <label className={campo === 'efectivo' ? 'on' : ''} onClick={() => setCampo('efectivo')}>
              Efectivo: <input value={efectivo} readOnly />
            </label>
            <label className={campo === 'tarjeta' ? 'on' : ''} onClick={() => setCampo('tarjeta')}>
              Tarjeta: <input value={tarjeta} readOnly />
            </label>
            <label className={campo === 'credito' ? 'on' : ''} onClick={() => setCampo('credito')}>
              Credito: <input value={credito} readOnly />
            </label>
          </div>
          <div className="cobro__vuelto">Vuelto: <strong>{vuelto.toFixed(2)}</strong></div>
          <div className="cobro__rest">Restante: {restante.toFixed(2)}</div>
        </div>

        <div className="cobro__keypad">
          {['1','2','3','4','5','6','7','8','9'].map((d) => (
            <button key={d} onClick={() => tecla(d)}>{d}</button>
          ))}
          <button onClick={() => tecla('0')}>0</button>
          <button onClick={() => tecla(',')}>,</button>
          <button onClick={() => set('0')}>Borrar</button>
        </div>

        <div className="cobro__right">
          <label className="cobro__imp">Impresora:
            <select><option>Ninguna</option><option>Predeterminada</option></select>
          </label>
          <button className="cobro__directo" disabled={restante > 0} onClick={() => confirmar('directo')}>
            Imprimir directo (ENTER)
          </button>
          <button className="cobro__pantalla" disabled={restante > 0} onClick={() => confirmar('pantalla')}>
            Guardar y ver en Pantalla (F1)
          </button>
          <div className="cobro__doc">
            <button className={tipoDoc === 'BOLETA' ? 'on' : ''} onClick={() => setTipoDoc('BOLETA')}>BOLETA</button>
            <button className={tipoDoc === 'FACTURA' ? 'on' : ''} onClick={() => setTipoDoc('FACTURA')}>FACTURA</button>
          </div>
          <div className="cobro__cli">
            <span>Cliente: (Opcional)</span>
            <select value={idCliente} onChange={(e) => setIdCliente(e.target.value ? Number(e.target.value) : '')}>
              <option value="">GENERICO</option>
              {clientes.map((c) => (<option key={c.idCliente} value={c.idCliente}>{c.nombre}</option>))}
            </select>
          </div>
          <div className="cobro__ticket">TICKET {numeroDoc}</div>
        </div>
      </div>
    </div>
  );
}
