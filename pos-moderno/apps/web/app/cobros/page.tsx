'use client';

import { useEffect, useState } from 'react';
import type { ClienteDTO } from '@pos/types';
import { api } from '@/lib/api';

const ID_CAJA = 1;
const ID_USUARIO = 1;

export default function CobrosPage(): JSX.Element {
  const [clientes, setClientes] = useState<ClienteDTO[]>([]);
  const [cobros, setCobros] = useState<Array<Record<string, unknown>>>([]);
  const [idCliente, setIdCliente] = useState<number | ''>('');
  const [monto, setMonto] = useState('0');
  const [detalle, setDetalle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function cargar(): void {
    api.clientes().then(setClientes).catch(() => undefined);
    api.cobros().then(setCobros).catch(() => undefined);
  }
  useEffect(cargar, []);

  const clienteSel = clientes.find((c) => c.idCliente === idCliente);

  async function registrar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (!idCliente) {
      setError('Selecciona un cliente.');
      return;
    }
    try {
      await api.crearCobro({
        idCliente: Number(idCliente),
        idUsuario: ID_USUARIO,
        idCaja: ID_CAJA,
        monto: Number(monto),
        detalle,
      });
      setMsg('Cobro registrado y saldo del cliente actualizado.');
      setMonto('0');
      setDetalle('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h2>Cobros (abonos de clientes)</h2>
      {error && <p className="alert alert--error">{error}</p>}
      {msg && <p className="alert alert--ok">{msg}</p>}

      <form className="panel" onSubmit={registrar}>
        <h3>Registrar abono</h3>
        <div className="row">
          <select
            value={idCliente}
            onChange={(e) =>
              setIdCliente(e.target.value ? Number(e.target.value) : '')
            }
          >
            <option value="">— cliente —</option>
            {clientes.map((c) => (
              <option key={c.idCliente} value={c.idCliente}>
                {c.nombre} (saldo {c.saldo})
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Monto"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
          <input
            placeholder="Detalle"
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
          />
          <button className="btn" type="submit">
            Registrar
          </button>
        </div>
        {clienteSel && (
          <p className="card__label">
            Saldo actual de {clienteSel.nombre}: {clienteSel.saldo}
          </p>
        )}
      </form>

      <table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Fecha</th>
            <th>Detalle</th>
            <th className="num">Monto</th>
            <th className="num">Cliente</th>
          </tr>
        </thead>
        <tbody>
          {cobros.map((c) => (
            <tr key={String(c.idControlCobro)}>
              <td>{String(c.idControlCobro)}</td>
              <td>{c.fecha ? String(c.fecha).slice(0, 10) : ''}</td>
              <td>{String(c.detalle ?? '')}</td>
              <td className="num">{String(c.monto ?? '')}</td>
              <td className="num">{String(c.idCliente ?? '')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
