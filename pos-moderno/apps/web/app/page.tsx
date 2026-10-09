'use client';

import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, type DashboardData } from '@/lib/api';

const DONUT = ['#a855f7', '#ec4899', '#6366f1', '#22d3ee', '#f59e0b'];

function Kpi({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">{value}</div>
    </div>
  );
}

export default function Dashboard(): JSX.Element {
  const [d, setD] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.dashboard().then(setD).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="alert alert--error">{error} — ¿está la API en :3000?</p>;
  if (!d) return <p>Cargando dashboard…</p>;

  return (
    <div className="dash">
      <div className="dash__head">
        <div>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          <span className="dash__sub">Bienvenido al Panel de Control</span>
        </div>
        <div className="dash__mes">{d.mes}</div>
      </div>

      {/* KPIs */}
      <div className="kpis">
        <Kpi label="CUENTAS POR COBRAR" value={`$ ${d.kpis.cuentasPorCobrar.toFixed(2)}`} />
        <Kpi label="CUENTAS POR PAGAR" value={`$ ${d.kpis.cuentasPorPagar.toFixed(2)}`} />
        <Kpi label="GANANCIA" value={`$ ${d.kpis.ganancia.toFixed(2)}`} />
        <Kpi label="STOCK BAJO" value={String(d.kpis.stockBajo)} />
        <Kpi label="N° CLIENTES" value={String(d.kpis.numClientes)} />
        <Kpi label="N° PRODUCTOS" value={String(d.kpis.numProductos)} />
      </div>

      <div className="dash__grid">
        {/* Ventas por mes */}
        <div className="dash__card">
          <div className="dash__totales">
            <div><span>Total VENTAS</span><strong>$ {d.totalVentas.toFixed(2)}</strong></div>
            <div><span>Total GANANCIA</span><strong>$ {d.totalGanancia.toFixed(2)}</strong></div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={d.ventasPorMes} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
              <XAxis dataKey="mes" stroke="#cbd5e1" fontSize={12} />
              <YAxis stroke="#cbd5e1" fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" name="Monto Total" stroke="#c084fc" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top productos */}
        <div className="dash__card">
          <h3 style={{ textAlign: 'center', marginTop: 0 }}>5 Productos más vendidos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={d.topProductos} dataKey="cantidad" nameKey="producto" innerRadius={70} outerRadius={110} paddingAngle={2}>
                {d.topProductos.map((_, i) => (<Cell key={i} fill={DONUT[i % DONUT.length]} />))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dash__grid">
        <div className="dash__card">
          <h3 style={{ marginTop: 0 }}>En qué gastaste más</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.gastosPorConcepto}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
              <XAxis dataKey="concepto" stroke="#cbd5e1" fontSize={12} />
              <YAxis stroke="#cbd5e1" fontSize={12} />
              <Tooltip />
              <Bar dataKey="total" name="Monto Total" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="dash__card">
          <h3 style={{ marginTop: 0 }}>Gastos por mes</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.gastosPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
              <XAxis dataKey="mes" stroke="#cbd5e1" fontSize={12} />
              <YAxis stroke="#cbd5e1" fontSize={12} />
              <Tooltip />
              <Bar dataKey="total" name="Monto Total" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
