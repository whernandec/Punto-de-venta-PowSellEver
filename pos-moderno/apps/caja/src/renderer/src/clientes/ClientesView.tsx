import { useEffect, useState } from 'react';
import type { ClienteDTO } from '@pos/types';
import { crearCliente, eliminarCliente, obtenerClientes } from '../api';

export function ClientesView(): JSX.Element {
  const [items, setItems] = useState<ClienteDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');

  function cargar(): void {
    obtenerClientes().then(setItems).catch((e: Error) => setError(e.message));
  }
  useEffect(cargar, []);

  async function crear(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await crearCliente({ nombre, celular });
      setNombre('');
      setCelular('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function baja(id: number): Promise<void> {
    try {
      await eliminarCliente(id);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="page">
      <h2>Clientes</h2>
      {error && <p className="alert alert--error">{error}</p>}
      <form className="panel row" onSubmit={crear}>
        <input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <input placeholder="Celular" value={celular} onChange={(e) => setCelular(e.target.value)} />
        <button className="btn btn--primary" type="submit">Agregar</button>
      </form>
      <table className="tabla">
        <thead><tr><th>#</th><th>Nombre</th><th>Celular</th><th className="num">Saldo</th><th></th></tr></thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.idCliente}>
              <td>{c.idCliente}</td><td>{c.nombre}</td><td>{c.celular}</td><td className="num">{c.saldo}</td>
              <td><button onClick={() => baja(c.idCliente)}>Baja</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
