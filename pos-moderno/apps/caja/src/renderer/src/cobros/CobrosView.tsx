import { useEffect, useState } from 'react';
import type { ClienteDTO } from '@pos/types';
import { crearCobro, obtenerClientes, obtenerCobros } from '../api';

interface Props {
  idCaja: number;
  idUsuario: number;
}

export function CobrosView({ idCaja, idUsuario }: Props): JSX.Element {
  const [clientes, setClientes] = useState<ClienteDTO[]>([]);
  const [cobros, setCobros] = useState<Array<Record<string, unknown>>>([]);
  const [idCliente, setIdCliente] = useState<number | ''>('');
  const [monto, setMonto] = useState('0');
  const [detalle, setDetalle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function cargar(): void {
    obtenerClientes().then(setClientes).catch(() => undefined);
    obtenerCobros().then(setCobros).catch(() => undefined);
  }
  useEffect(cargar, []);

  async function registrar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (!idCliente) {
      setError('Selecciona un cliente.');
      return;
    }
    try {
      await crearCobro({
        idCliente: Number(idCliente),
        idUsuario,
        idCaja,
        monto: Number(monto),
        detalle,
      });
      setMsg('Cobro registrado; saldo del cliente actualizado.');
      setMonto('0');
      setDetalle('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="page">
      <h2>Cobros (abonos)</h2>
      {error && <p className="alert alert--error">{error}</p>}
      {msg && <p className="alert alert--ok">{msg}</p>}
      <form className="panel row" onSubmit={registrar}>
        <select value={idCliente} onChange={(e) => setIdCliente(e.target.value ? Number(e.target.value) : '')}>
          <option value="">— cliente —</option>
          {clientes.map((c) => (
            <option key={c.idCliente} value={c.idCliente}>{c.nombre} (saldo {c.saldo})</option>
          ))}
        </select>
        <input type="number" step="0.01" placeholder="Monto" value={monto} onChange={(e) => setMonto(e.target.value)} />
        <input placeholder="Detalle" value={detalle} onChange={(e) => setDetalle(e.target.value)} />
        <button className="btn btn--primary" type="submit">Registrar</button>
      </form>
      <table className="tabla">
        <thead><tr><th>#</th><th>Fecha</th><th>Detalle</th><th className="num">Monto</th></tr></thead>
        <tbody>
          {cobros.map((c) => (
            <tr key={String(c.idControlCobro)}>
              <td>{String(c.idControlCobro)}</td>
              <td>{c.fecha ? String(c.fecha).slice(0, 10) : ''}</td>
              <td>{String(c.detalle ?? '')}</td>
              <td className="num">{String(c.monto ?? '')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
