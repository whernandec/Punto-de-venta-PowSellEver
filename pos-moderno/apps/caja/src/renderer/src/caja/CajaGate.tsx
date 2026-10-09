import { useCallback, useEffect, useState } from 'react';
import type { TurnoAbiertoDTO, UsuarioAutenticadoDTO } from '@pos/types';
import { aperturaCaja, arqueoCaja, cierreCaja, turnoAbierto } from '../api';
import { VentasPage } from '../ventas/VentasPage';
import { InventarioView } from '../inventario/InventarioView';
import { ComprasView } from '../compras/ComprasView';
import { ProductosView } from '../productos/ProductosView';
import { ProveedoresView } from '../proveedores/ProveedoresView';
import { ClientesView } from '../clientes/ClientesView';
import { CobrosView } from '../cobros/CobrosView';
import { MovimientosView } from '../finanzas/MovimientosView';
import { UsuariosView } from '../usuarios/UsuariosView';
import { ReportesView } from '../reportes/ReportesView';
import { EmpresaView } from '../empresa/EmpresaView';
import { ComprobantesView } from '../comprobantes/ComprobantesView';
import { TicketView } from '../ticket/TicketView';
import { CorreoView } from '../correo/CorreoView';

type Tab =
  | 'ventas'
  | 'inventario'
  | 'compras'
  | 'productos'
  | 'proveedores'
  | 'clientes'
  | 'cobros'
  | 'movimientos'
  | 'usuarios'
  | 'reportes'
  | 'comprobantes'
  | 'ticket'
  | 'correo'
  | 'empresa';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'ventas', label: 'Ventas' },
  { key: 'productos', label: 'Productos' },
  { key: 'inventario', label: 'Inventario' },
  { key: 'compras', label: 'Compras' },
  { key: 'proveedores', label: 'Proveedores' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'cobros', label: 'Cobros' },
  { key: 'movimientos', label: 'Movimientos' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'reportes', label: 'Reportes' },
  { key: 'comprobantes', label: 'Comprobantes' },
  { key: 'ticket', label: 'Ticket' },
  { key: 'correo', label: 'Correo' },
  { key: 'empresa', label: 'Empresa' },
];

interface Props {
  idCaja: number;
  usuario: UsuarioAutenticadoDTO;
  tabInicial?: string;
  onInicio?: () => void;
}

/**
 * Exige un turno de caja ABIERTO antes de permitir vender.
 * - Sin turno → formulario de apertura (saldo inicial).
 * - Con turno → ventas + botón de cierre.
 */
export function CajaGate({ idCaja, usuario, tabInicial, onInicio }: Props): JSX.Element {
  const [turno, setTurno] = useState<TurnoAbiertoDTO | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saldoInicial, setSaldoInicial] = useState('0');
  const [cierreInfo, setCierreInfo] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>((tabInicial as Tab) ?? 'ventas');

  const refrescar = useCallback(() => {
    setCargando(true);
    turnoAbierto(idCaja)
      .then(setTurno)
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false));
  }, [idCaja]);

  useEffect(refrescar, [refrescar]);

  async function abrir(): Promise<void> {
    setError(null);
    try {
      await aperturaCaja({
        idCaja,
        idUsuario: usuario.idUsuario,
        saldoInicial: Number(saldoInicial) || 0,
      });
      refrescar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function cerrar(): Promise<void> {
    setError(null);
    try {
      // Arqueo del turno: calcula el efectivo esperado antes de cerrar.
      const arqueo = await arqueoCaja(idCaja);
      const esperado = arqueo?.saldoEsperado ?? turno?.saldoInicial ?? 0;
      await cierreCaja({
        idCaja,
        idUsuario: usuario.idUsuario,
        ingresos: arqueo?.ingresos ?? 0,
        egresos: arqueo?.gastos ?? 0,
        saldoQuedaEnCaja: esperado,
        totalCalculado: esperado,
        totalReal: esperado,
        diferencia: 0,
      });
      setCierreInfo(
        arqueo
          ? `Caja cerrada. Esperado en efectivo: ${esperado.toFixed(2)} ` +
              `(inicial ${arqueo.saldoInicial.toFixed(2)} + ventas ${arqueo.ventasEfectivo.toFixed(2)} ` +
              `+ ingresos ${arqueo.ingresos.toFixed(2)} − gastos ${arqueo.gastos.toFixed(2)})`
          : 'Caja cerrada.',
      );
      refrescar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (cargando) return <p style={{ padding: 16 }}>Cargando estado de la caja…</p>;

  if (!turno) {
    return (
      <div className="apertura">
        <div className="apertura__card">
          {onInicio && (
            <button className="btn btn--ghost" onClick={onInicio} style={{ marginBottom: 8 }}>
              ⌂ Volver al Dashboard
            </button>
          )}
          <h2>Abrir caja {idCaja}</h2>
          {cierreInfo && <p className="alert alert--ok">{cierreInfo}</p>}
          {error && <p className="alert alert--error">{error}</p>}
          <label>
            Saldo inicial
            <input
              type="number"
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
            />
          </label>
          <button className="btn btn--primary" onClick={abrir}>
            Abrir turno
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="turno-bar">
        <span>
          Turno abierto · Caja {turno.idCaja} · Saldo inicial{' '}
          {turno.saldoInicial.toFixed(2)}
        </span>
        <span style={{ display: 'flex', gap: 8 }}>
          {onInicio && <button onClick={onInicio}>⌂ Dashboard</button>}
          <button onClick={cerrar}>Cerrar caja</button>
        </span>
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'tabs__btn tabs__btn--on' : 'tabs__btn'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error && <p className="alert alert--error">{error}</p>}

      {tab === 'ventas' && (
        <VentasPage
          idCaja={idCaja}
          idUsuario={usuario.idUsuario}
          usuario={usuario}
          onIr={(t) => setTab(t as Tab)}
          onCerrarTurno={cerrar}
        />
      )}
      {tab === 'productos' && <ProductosView />}
      {tab === 'inventario' && <InventarioView idCaja={idCaja} idUsuario={usuario.idUsuario} />}
      {tab === 'compras' && <ComprasView idCaja={idCaja} idUsuario={usuario.idUsuario} />}
      {tab === 'proveedores' && <ProveedoresView />}
      {tab === 'clientes' && <ClientesView />}
      {tab === 'cobros' && <CobrosView idCaja={idCaja} idUsuario={usuario.idUsuario} />}
      {tab === 'movimientos' && <MovimientosView idCaja={idCaja} />}
      {tab === 'usuarios' && <UsuariosView />}
      {tab === 'reportes' && <ReportesView />}
      {tab === 'comprobantes' && <ComprobantesView />}
      {tab === 'ticket' && <TicketView />}
      {tab === 'correo' && <CorreoView />}
      {tab === 'empresa' && <EmpresaView />}
    </>
  );
}
