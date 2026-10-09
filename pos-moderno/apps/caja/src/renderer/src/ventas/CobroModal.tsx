import { useEffect, useRef, useState } from 'react';
import type { ClienteDTO } from '@pos/types';
import {
  cancelarPagoTerminal,
  estadoPagoTerminal,
  iniciarPagoTerminal,
  obtenerTerminal,
} from '../api';

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
  const [terminalOn, setTerminalOn] = useState(false);
  const [terminalMsg, setTerminalMsg] = useState<string | null>(null);
  const [procesandoTerminal, setProcesandoTerminal] = useState(false);
  const [confirmandoTerminal, setConfirmandoTerminal] = useState(false);
  const [exitoTerminal, setExitoTerminal] = useState(false);
  const intentRef = useRef<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    obtenerTerminal()
      .then((c) => setTerminalOn(c.enabled))
      .catch(() => setTerminalOn(false));
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const pagado = (Number(efectivo) || 0) + (Number(tarjeta) || 0) + (Number(credito) || 0);
  const vuelto = Math.max(0, pagado - total);
  const restante = Math.max(0, total - pagado);
  // Monto a cobrar en terminal = total menos lo ya puesto en tarjeta/crédito
  // (el efectivo se limpia al cobrar con terminal).
  const montoTerminal = Math.max(
    0,
    total - (Number(tarjeta) || 0) - (Number(credito) || 0),
  );

  const set = (v: string): void => {
    if (campo === 'efectivo') setEfectivo(v);
    else if (campo === 'tarjeta') setTarjeta(v);
    else setCredito(v);
  };
  const valor = (): string => (campo === 'efectivo' ? efectivo : campo === 'tarjeta' ? tarjeta : credito);
  const tecla = (d: string): void =>
    set(d === ',' ? (valor().includes('.') ? valor() : valor() + '.') : (valor() === '0' ? d : valor() + d));

  function detenerPoll(): void {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setProcesandoTerminal(false);
  }

  async function cobrarConTerminal(): Promise<void> {
    const monto = montoTerminal;
    if (monto <= 0) return;
    setEfectivo('0'); // la terminal cubre el importe; no hay efectivo
    setProcesandoTerminal(true);
    setTerminalMsg('Enviando cobro a la terminal…');
    try {
      const { intentId } = await iniciarPagoTerminal(monto);
      intentRef.current = intentId;
      setTerminalMsg('💳 Esperando que el cliente pague en la terminal…');
      pollRef.current = window.setInterval(async () => {
        try {
          const r = await estadoPagoTerminal(intentId);
          if (r.status === 'approved') {
            detenerPoll();
            setTarjeta(((Number(tarjeta) || 0) + monto).toFixed(2));
            setTerminalMsg(`✔ Pago aprobado en terminal${r.simulado ? ' (simulado)' : ''}.`);
            setExitoTerminal(true);
            intentRef.current = null;
          } else if (r.status === 'canceled' || r.status === 'rejected') {
            detenerPoll();
            setTerminalMsg(`Terminal: pago ${r.status}.`);
            intentRef.current = null;
          }
        } catch {
          /* reintentar en el siguiente tick */
        }
      }, 1500);
    } catch (e) {
      detenerPoll();
      setTerminalMsg((e as Error).message);
    }
  }

  async function cancelarTerminal(): Promise<void> {
    if (intentRef.current) {
      try {
        await cancelarPagoTerminal(intentRef.current);
      } catch {
        /* ignorar */
      }
    }
    detenerPoll();
    intentRef.current = null;
    setTerminalMsg('Cobro con terminal cancelado.');
  }

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
            <label className={campo === 'efectivo' ? 'on' : ''}>
              Efectivo:
              <input
                inputMode="decimal"
                value={efectivo}
                onFocus={(e) => { setCampo('efectivo'); e.target.select(); }}
                onChange={(e) => setEfectivo(e.target.value)}
              />
            </label>
            <label className={campo === 'tarjeta' ? 'on' : ''}>
              Tarjeta:
              <input
                inputMode="decimal"
                value={tarjeta}
                onFocus={(e) => { setCampo('tarjeta'); e.target.select(); }}
                onChange={(e) => setTarjeta(e.target.value)}
              />
            </label>
            <label className={campo === 'credito' ? 'on' : ''}>
              Credito:
              <input
                inputMode="decimal"
                value={credito}
                onFocus={(e) => { setCampo('credito'); e.target.select(); }}
                onChange={(e) => setCredito(e.target.value)}
              />
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
          {terminalOn && !procesandoTerminal && (
            <button
              className="cobro__terminal"
              disabled={montoTerminal <= 0}
              onClick={() => setConfirmandoTerminal(true)}
            >
              💳 Cobrar con Terminal MP
            </button>
          )}
          {terminalOn && procesandoTerminal && (
            <button className="cobro__cancelar" onClick={() => void cancelarTerminal()}>
              ✕ Cancelar cobro en terminal
            </button>
          )}
          {terminalMsg && <div className="cobro__tmsg">{terminalMsg}</div>}
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

        {confirmandoTerminal && (
          <div className="dlg">
            <div className="dlg__box">
              <h3>Cobrar con Terminal</h3>
              <p>¿Enviar un cobro de <strong>$ {montoTerminal.toFixed(2)}</strong> a la terminal Mercado Pago?</p>
              <div className="dlg__btns">
                <button className="btn btn--ghost" onClick={() => setConfirmandoTerminal(false)}>Cancelar</button>
                <button className="cobro__terminal" onClick={() => { setConfirmandoTerminal(false); void cobrarConTerminal(); }}>Sí, cobrar</button>
              </div>
            </div>
          </div>
        )}

        {exitoTerminal && (
          <div className="dlg">
            <div className="dlg__box dlg__box--ok">
              <div style={{ fontSize: 56 }}>✅</div>
              <h2 style={{ color: '#16a34a', margin: '6px 0' }}>¡Pago aprobado en la terminal!</h2>
              <p>El cobro se realizó correctamente. Finaliza la venta:</p>
              <div className="dlg__btns">
                <button className="cobro__directo" onClick={() => { setExitoTerminal(false); confirmar('directo'); }}>🖨 Imprimir y finalizar</button>
                <button className="cobro__pantalla" onClick={() => { setExitoTerminal(false); confirmar('pantalla'); }}>Ver en pantalla</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
