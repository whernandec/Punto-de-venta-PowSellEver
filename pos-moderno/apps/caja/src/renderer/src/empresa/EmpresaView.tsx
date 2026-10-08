import { useEffect, useState } from 'react';
import type { EmpresaDTO } from '@pos/types';
import { actualizarEmpresa, obtenerEmpresa } from '../api';

export function EmpresaView(): JSX.Element {
  const [emp, setEmp] = useState<EmpresaDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    obtenerEmpresa().then(setEmp).catch((e: Error) => setError(e.message));
  }, []);

  function set<K extends keyof EmpresaDTO>(k: K, v: EmpresaDTO[K]): void {
    setEmp((p) => (p ? { ...p, [k]: v } : p));
  }

  async function guardar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!emp) return;
    setError(null);
    try {
      const u = await actualizarEmpresa(emp.idEmpresa, emp);
      setEmp(u);
      setMsg('Configuración guardada.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (error) return <main className="page"><h2>Empresa</h2><p className="alert alert--error">{error}</p></main>;
  if (!emp) return <main className="page"><h2>Empresa</h2><p>No hay empresa configurada.</p></main>;

  return (
    <main className="page">
      <h2>Configuración de empresa</h2>
      {msg && <p className="alert alert--ok">{msg}</p>}
      <form className="panel" onSubmit={guardar} style={{ maxWidth: 480 }}>
        <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <label>Nombre<input value={emp.nombreEmpresa ?? ''} onChange={(e) => set('nombreEmpresa', e.target.value)} /></label>
          <label>Moneda<input value={emp.moneda ?? ''} onChange={(e) => set('moneda', e.target.value)} /></label>
          <label>Impuesto<input value={emp.impuesto ?? ''} onChange={(e) => set('impuesto', e.target.value)} /></label>
          <label>% Impuesto<input type="number" value={emp.porcentajeImpuesto ?? 0} onChange={(e) => set('porcentajeImpuesto', Number(e.target.value))} /></label>
          <label>País<input value={emp.pais ?? ''} onChange={(e) => set('pais', e.target.value)} /></label>
          <button className="btn btn--primary" type="submit">Guardar</button>
        </div>
      </form>
    </main>
  );
}
