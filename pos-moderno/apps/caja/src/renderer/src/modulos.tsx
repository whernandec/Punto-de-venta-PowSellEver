import { EmpresaView } from './empresa/EmpresaView';
import { UsuariosView } from './usuarios/UsuariosView';
import { ComprobantesView } from './comprobantes/ComprobantesView';
import { ProductosView } from './productos/ProductosView';
import { ClientesView } from './clientes/ClientesView';
import { ProveedoresView } from './proveedores/ProveedoresView';
import { TicketView } from './ticket/TicketView';
import { CorreoView } from './correo/CorreoView';
import { InventarioView } from './inventario/InventarioView';
import { ComprasView } from './compras/ComprasView';
import { CobrosView } from './cobros/CobrosView';
import { MovimientosView } from './finanzas/MovimientosView';
import { ReportesView } from './reportes/ReportesView';
import { TerminalMPView } from './terminal/TerminalMPView';

interface Ctx {
  idCaja: number;
  idUsuario: number;
}

function Placeholder({ titulo }: { titulo: string }): JSX.Element {
  return (
    <main className="page">
      <h2>{titulo}</h2>
      <p className="muted">Módulo en construcción.</p>
    </main>
  );
}

export const MODULOS: Record<
  string,
  { label: string; comp: (c: Ctx) => JSX.Element }
> = {
  empresa: { label: 'Empresa', comp: () => <EmpresaView /> },
  usuarios: { label: 'Usuarios', comp: () => <UsuariosView /> },
  cajas: { label: 'Cajas', comp: () => <Placeholder titulo="Cajas" /> },
  serializacion: { label: 'Serialización', comp: () => <ComprobantesView /> },
  productos: { label: 'Productos', comp: () => <ProductosView /> },
  clientes: { label: 'Clientes', comp: () => <ClientesView /> },
  proveedores: { label: 'Proveedores', comp: () => <ProveedoresView /> },
  comprobantes: { label: 'Diseño de Comprobantes', comp: () => <TicketView /> },
  impresoras: { label: 'Impresoras', comp: () => <Placeholder titulo="Impresoras" /> },
  balanza: { label: 'Balanza', comp: () => <Placeholder titulo="Balanza" /> },
  correo: { label: 'Notificaciones por Correo', comp: () => <CorreoView /> },
  terminalmp: { label: 'Terminal Mercado Pago', comp: () => <TerminalMPView /> },
  respaldo: { label: 'Respaldo de Base de datos', comp: () => <Placeholder titulo="Respaldo de Base de datos" /> },
  // Operativos (se abren desde el POS):
  inventario: { label: 'Inventario', comp: (c) => <InventarioView idCaja={c.idCaja} idUsuario={c.idUsuario} /> },
  compras: { label: 'Compras', comp: (c) => <ComprasView idCaja={c.idCaja} idUsuario={c.idUsuario} /> },
  cobros: { label: 'Cobros', comp: (c) => <CobrosView idCaja={c.idCaja} idUsuario={c.idUsuario} /> },
  movimientos: { label: 'Movimientos', comp: (c) => <MovimientosView idCaja={c.idCaja} /> },
  reportes: { label: 'Reportes', comp: () => <ReportesView /> },
};

export function ModuloView({
  moduloKey,
  idCaja,
  idUsuario,
  onVolver,
}: {
  moduloKey: string;
  idCaja: number;
  idUsuario: number;
  onVolver: () => void;
}): JSX.Element {
  const m = MODULOS[moduloKey];
  return (
    <div>
      <div className="modbar">
        <button className="btn" onClick={onVolver}>← Volver</button>
        <strong>{m?.label ?? 'Módulo'}</strong>
      </div>
      {m ? m.comp({ idCaja, idUsuario }) : <p className="page">Módulo desconocido</p>}
    </div>
  );
}
