'use client';

import { useEffect, useState } from 'react';
import type { ClienteDTO } from '@pos/types';
import { api } from '@/lib/api';

export default function ClientesPage(): JSX.Element {
  const [items, setItems] = useState<ClienteDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [rfc, setRfc] = useState('');

  function cargar(): void {
    api.clientes().then(setItems).catch((e: Error) => setError(e.message));
  }
  useEffect(cargar, []);

  async function crear(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await api.crearCliente({ nombre, celular, identificadorFiscal: rfc });
      setNombre('');
      setCelular('');
      setRfc('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function eliminar(id: number): Promise<void> {
    if (!confirm('¿Dar de baja este cliente?')) return;
    try {
      await api.eliminarCliente(id);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h2>Clientes</h2>
      {error && <p className="alert alert--error">{error}</p>}

      <form className="panel" onSubmit={crear}>
        <h3>Nuevo cliente</h3>
        <div className="row">
          <input
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          <input
            placeholder="Celular"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
          />
          <input
            placeholder="RFC / Id fiscal"
            value={rfc}
            onChange={(e) => setRfc(e.target.value)}
          />
          <button className="btn" type="submit">
            Agregar
          </button>
        </div>
      </form>

      <table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Nombre</th>
            <th>Celular</th>
            <th>Id fiscal</th>
            <th className="num">Saldo</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.idCliente}>
              <td>{c.idCliente}</td>
              <td>{c.nombre}</td>
              <td>{c.celular}</td>
              <td>{c.identificadorFiscal}</td>
              <td className="num">{c.saldo}</td>
              <td>
                <button
                  className="btn btn--ghost"
                  onClick={() => eliminar(c.idCliente)}
                >
                  Baja
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
