'use client';

import { useEffect, useState } from 'react';
import type { ProveedorDTO } from '@pos/types';
import { api } from '@/lib/api';

export default function ProveedoresPage(): JSX.Element {
  const [items, setItems] = useState<ProveedorDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [rfc, setRfc] = useState('');

  function cargar(): void {
    api.proveedores().then(setItems).catch((e: Error) => setError(e.message));
  }
  useEffect(cargar, []);

  async function crear(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await api.crearProveedor({
        nombre,
        celular,
        identificadorFiscal: rfc,
        estado: 'ACTIVO',
      });
      setNombre('');
      setCelular('');
      setRfc('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h2>Proveedores</h2>
      {error && <p className="alert alert--error">{error}</p>}

      <form className="panel" onSubmit={crear}>
        <h3>Nuevo proveedor</h3>
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
            <th>Estado</th>
            <th className="num">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.idProveedor}>
              <td>{p.idProveedor}</td>
              <td>{p.nombre}</td>
              <td>{p.celular}</td>
              <td>{p.identificadorFiscal}</td>
              <td>{p.estado}</td>
              <td className="num">{p.saldo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
