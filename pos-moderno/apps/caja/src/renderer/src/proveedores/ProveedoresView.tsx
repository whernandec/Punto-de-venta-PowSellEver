import { useEffect, useState } from 'react';
import type { ProveedorDTO } from '@pos/types';
import { crearProveedor, obtenerProveedores } from '../api';

export function ProveedoresView(): JSX.Element {
  const [items, setItems] = useState<ProveedorDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');

  function cargar(): void {
    obtenerProveedores().then(setItems).catch((e: Error) => setError(e.message));
  }
  useEffect(cargar, []);

  async function crear(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await crearProveedor({ nombre, celular, estado: 'ACTIVO' });
      setNombre('');
      setCelular('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="page">
      <h2>Proveedores</h2>
      {error && <p className="alert alert--error">{error}</p>}
      <form className="panel row" onSubmit={crear}>
        <input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <input placeholder="Celular" value={celular} onChange={(e) => setCelular(e.target.value)} />
        <button className="btn btn--primary" type="submit">Agregar</button>
      </form>
      <table className="tabla">
        <thead><tr><th>#</th><th>Nombre</th><th>Celular</th><th className="num">Saldo</th></tr></thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.idProveedor}><td>{p.idProveedor}</td><td>{p.nombre}</td><td>{p.celular}</td><td className="num">{p.saldo}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
