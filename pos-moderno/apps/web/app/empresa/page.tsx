'use client';

import { useEffect, useState } from 'react';
import type { EmpresaDTO } from '@pos/types';
import { api } from '@/lib/api';

export default function EmpresaPage(): JSX.Element {
  const [emp, setEmp] = useState<EmpresaDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api
      .empresa()
      .then(setEmp)
      .catch((e: Error) => setError(e.message));
  }, []);

  function set<K extends keyof EmpresaDTO>(campo: K, valor: EmpresaDTO[K]): void {
    setEmp((prev) => (prev ? { ...prev, [campo]: valor } : prev));
  }

  async function guardar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!emp) return;
    setError(null);
    try {
      const actualizada = await api.actualizarEmpresa(emp.idEmpresa, {
        nombreEmpresa: emp.nombreEmpresa ?? undefined,
        impuesto: emp.impuesto ?? undefined,
        porcentajeImpuesto: emp.porcentajeImpuesto ?? undefined,
        moneda: emp.moneda ?? undefined,
        trabajasConImpuestos: emp.trabajasConImpuestos ?? undefined,
        modoDeBusqueda: emp.modoDeBusqueda ?? undefined,
        correoParaReportes: emp.correoParaReportes ?? undefined,
        pais: emp.pais ?? undefined,
      });
      setEmp(actualizada);
      setMsg('Configuración guardada.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (error) return <p className="alert alert--error">{error}</p>;
  if (!emp)
    return (
      <div>
        <h2>Empresa</h2>
        <p>No hay empresa configurada.</p>
      </div>
    );

  return (
    <div>
      <h2>Configuración de empresa</h2>
      {msg && <p className="alert alert--ok">{msg}</p>}

      <form className="panel" onSubmit={guardar} style={{ maxWidth: 520 }}>
        <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
          <label>
            Nombre
            <input
              value={emp.nombreEmpresa ?? ''}
              onChange={(e) => set('nombreEmpresa', e.target.value)}
            />
          </label>
          <label>
            Moneda
            <input
              value={emp.moneda ?? ''}
              onChange={(e) => set('moneda', e.target.value)}
            />
          </label>
          <label>
            Impuesto
            <input
              value={emp.impuesto ?? ''}
              onChange={(e) => set('impuesto', e.target.value)}
            />
          </label>
          <label>
            % Impuesto
            <input
              type="number"
              value={emp.porcentajeImpuesto ?? 0}
              onChange={(e) => set('porcentajeImpuesto', Number(e.target.value))}
            />
          </label>
          <label>
            ¿Trabaja con impuestos? (SI/NO)
            <input
              value={emp.trabajasConImpuestos ?? ''}
              onChange={(e) => set('trabajasConImpuestos', e.target.value)}
            />
          </label>
          <label>
            Correo para reportes
            <input
              value={emp.correoParaReportes ?? ''}
              onChange={(e) => set('correoParaReportes', e.target.value)}
            />
          </label>
          <label>
            País
            <input
              value={emp.pais ?? ''}
              onChange={(e) => set('pais', e.target.value)}
            />
          </label>
          <button className="btn" type="submit">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
