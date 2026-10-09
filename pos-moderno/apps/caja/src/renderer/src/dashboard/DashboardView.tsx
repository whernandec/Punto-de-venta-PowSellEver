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
import type { UsuarioAutenticadoDTO } from '@pos/types';
import { obtenerDashboard, type DashboardData } from '../api';

const DONUT = ['#a855f7', '#ec4899', '#6366f1', '#22d3ee', '#f59e0b'];

interface Props {
  usuario?: UsuarioAutenticadoDTO;
  onIr: (tab?: string) => void;
  onSalir?: () => void;
}

function Kpi({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="dkpi">
      <div className="dkpi__label">{label}</div>
      <div className="dkpi__value">{value}</div>
    </div>
  );
}

export function DashboardView({ usuario, onIr, onSalir }: Props): JSX.Element {
  const [d, setD] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerDashboard().then(setD).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="dash">
      <div className="dash__top">
        <div className="dash__brand">🖥️ PSE</div>
        <nav className="dash__nav">
          <button onClick={() => onIr('reportes')}>Reportes</button>
          <button onClick={() => onIr('inventario')}>Inventarios</button>
          <button onClick={() => onIr('empresa')}>Configurar</button>
          <button className="nav--orange" onClick={() => onIr('compras')}>Comprar</button>
        </nav>
        <span className="dash__user">👑 {usuario?.nombres ?? usuario?.login ?? 'Administrador'}</span>
        <button className="dash__vender" onClick={() => onIr('ventas')}>Vender</button>
        {onSalir && <button className="dash__salir" onClick={onSalir}>Salir</button>}
      </div>

      <div className="dash__body">
        <div className="dash__head">
          <div>
            <h2 style={{ margin: 0 }}>Dashboard</h2>
            <span className="dash__sub">Bienvenido al Panel de Control</span>
          </div>
          <div className="dash__mes">{d?.mes ?? ''}</div>
        </div>

        {error && <p className="alert alert--error">{error}</p>}
        {!d && !error && <p>Cargando…</p>}

        {d && (
          <>
            <div className="dkpis">
              <Kpi label="CUENTAS POR COBRAR" value={`$ ${d.kpis.cuentasPorCobrar.toFixed(2)}`} />
              <Kpi label="CUENTAS POR PAGAR" value={`$ ${d.kpis.cuentasPorPagar.toFixed(2)}`} />
              <Kpi label="GANANCIA" value={`$ ${d.kpis.ganancia.toFixed(2)}`} />
              <Kpi label="STOCK BAJO" value={String(d.kpis.stockBajo)} />
              <Kpi label="N° CLIENTES" value={String(d.kpis.numClientes)} />
              <Kpi label="N° PRODUCTOS" value={String(d.kpis.numProductos)} />
            </div>

            <div className="dash__grid">
              <div className="dash__card">
                <div className="dash__totales">
                  <div><span>Total VENTAS</span><strong>$ {d.totalVentas.toFixed(2)}</strong></div>
                  <div><span>Total GANANCIA</span><strong>$ {d.totalGanancia.toFixed(2)}</strong></div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={d.ventasPorMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
                    <XAxis dataKey="mes" stroke="#cbd5e1" fontSize={12} />
                    <YAxis stroke="#cbd5e1" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" name="Monto Total" stroke="#c084fc" strokeWidth={3} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="dash__card">
                <h3 style={{ textAlign: 'center', marginTop: 0 }}>5 Productos más vendidos</h3>
                <ResponsiveContainer width="100%" height={290}>
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
                <ResponsiveContainer width="100%" height={200}>
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
                <ResponsiveContainer width="100%" height={200}>
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
          </>
        )}
      </div>
    </div>
  );
}
