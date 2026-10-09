import type {
  ActualizarEmpresaDTO,
  ActualizarUsuarioDTO,
  AjusteInventarioDTO,
  ClienteDTO,
  ConceptoDTO,
  CrearClienteDTO,
  CrearCobroDTO,
  CrearGastoDTO,
  CrearIngresoDTO,
  CrearProveedorDTO,
  CrearUsuarioDTO,
  EmpresaDTO,
  InventarioItemDTO,
  LoginDTO,
  ProveedorDTO,
  RegistrarCompraDTO,
  UsuarioAutenticadoDTO,
  UsuarioDTO,
} from '@pos/types';

// La API NestJS corre en el puerto 3000 (con CORS habilitado).
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface ReporteVentas {
  desde: string;
  hasta: string;
  resumen: {
    numVentas: number;
    total: number;
    efectivo: number;
    tarjeta: number;
    credito: number;
  };
  filas: Array<{
    idVenta: number;
    fecha: string | null;
    comprobante: string | null;
    numeroDoc: string | null;
    montoTotal: string | number | null;
    tipoPago: string | null;
    cajero: string | null;
  }>;
}

/** Header Authorization con el JWT guardado en localStorage (si hay sesión). */
function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem('pos_usuario');
  if (!raw) return {};
  try {
    const u = JSON.parse(raw) as { token?: string };
    return u.token ? { Authorization: `Bearer ${u.token}` } : {};
  } catch {
    return {};
  }
}

async function get<T>(ruta: string): Promise<T> {
  const res = await fetch(`${API_BASE}${ruta}`, {
    cache: 'no-store',
    headers: { ...authHeader() },
  });
  if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function send<T>(
  metodo: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  ruta: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}${ruta}`, {
    method: metodo,
    headers: {
      ...authHeader(),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(
      Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message ?? `Error HTTP ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

const post = <T>(ruta: string, body: unknown) => send<T>('POST', ruta, body);

/** Descarga un archivo autenticado (Excel/PDF) vía blob. */
async function descargarArchivo(ruta: string, nombre: string): Promise<void> {
  const res = await fetch(`${API_BASE}${ruta}`, { headers: { ...authHeader() } });
  if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export interface DashboardData {
  mes: string;
  kpis: {
    cuentasPorCobrar: number;
    cuentasPorPagar: number;
    ganancia: number;
    stockBajo: number;
    numClientes: number;
    numProductos: number;
  };
  totalVentas: number;
  totalGanancia: number;
  ventasPorMes: Array<{ mes: string; total: number }>;
  topProductos: Array<{ producto: string; cantidad: number }>;
  gastosPorConcepto: Array<{ concepto: string; total: number }>;
  gastosPorMes: Array<{ mes: string; total: number }>;
}

export const api = {
  login: (dto: LoginDTO) =>
    post<UsuarioAutenticadoDTO>('/auth/login', dto),
  dashboard: () => get<DashboardData>('/dashboard'),
  terminal: () => get<Record<string, unknown>>('/terminal'),
  guardarTerminal: (dto: Record<string, unknown>) => send('PUT', '/terminal', dto),
  dispositivosTerminal: () => get<Array<{ id: string; name: string }>>('/terminal/dispositivos'),
  modoTerminal: (deviceId: string, modo: 'PDV' | 'STANDALONE') =>
    post('/terminal/modo', { deviceId, modo }),
  reporteVentas: (desde: string, hasta: string) =>
    get<ReporteVentas>(`/reportes/ventas?desde=${desde}&hasta=${hasta}`),
  descargarReporteExcel: (desde: string, hasta: string) =>
    descargarArchivo(`/reportes/ventas.xlsx?desde=${desde}&hasta=${hasta}`, `ventas_${desde}_${hasta}.xlsx`),
  descargarReportePdf: (desde: string, hasta: string) =>
    descargarArchivo(`/reportes/ventas.pdf?desde=${desde}&hasta=${hasta}`, `ventas_${desde}_${hasta}.pdf`),
  inventario: (q = '') =>
    get<InventarioItemDTO[]>(`/inventario?q=${encodeURIComponent(q)}`),
  bajoMinimo: () => get<InventarioItemDTO[]>('/inventario/bajo-minimo'),
  ajuste: (dto: AjusteInventarioDTO) => post('/inventario/ajuste', dto),
  proveedores: () => get<ProveedorDTO[]>('/proveedores'),
  crearProveedor: (dto: CrearProveedorDTO) => post('/proveedores', dto),
  productos: () => get<Array<Record<string, unknown>>>('/productos'),
  grupos: () => get<Array<{ idLine: number; linea: string }>>('/grupos'),
  crearGrupo: (linea: string) => post('/grupos', { linea }),
  descargarPlantillaProductos: () =>
    descargarArchivo('/productos/plantilla.xlsx', 'plantilla_productos.xlsx'),
  importarProductos: async (file: File) => {
    const fd = new FormData();
    fd.append('archivo', file);
    const res = await fetch(`${API_BASE}/productos/importar`, {
      method: 'POST',
      headers: { ...authHeader() },
      body: fd,
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(d.message ?? `Error HTTP ${res.status}`);
    }
    return res.json() as Promise<{
      creados: number;
      omitidos: number;
      errores: string[];
    }>;
  },
  crearProducto: (dto: Record<string, unknown>) => post('/productos', dto),
  actualizarProducto: (id: number, dto: Record<string, unknown>) =>
    send('PATCH', `/productos/${id}`, dto),
  eliminarProducto: (id: number) => send('DELETE', `/productos/${id}`),
  compras: () => get<Array<Record<string, unknown>>>('/compras'),
  registrarCompra: (dto: RegistrarCompraDTO) =>
    post<{ idCompra: number; total: number }>('/compras', dto),
  usuarios: () => get<UsuarioDTO[]>('/usuarios'),
  crearUsuario: (dto: CrearUsuarioDTO) => post('/usuarios', dto),
  actualizarUsuario: (id: number, dto: ActualizarUsuarioDTO) =>
    send('PATCH', `/usuarios/${id}`, dto),
  eliminarUsuario: (id: number) => send('DELETE', `/usuarios/${id}`),
  empresa: () => get<EmpresaDTO | null>('/empresa'),
  actualizarEmpresa: (id: number, dto: ActualizarEmpresaDTO) =>
    send<EmpresaDTO>('PUT', `/empresa/${id}`, dto),
  clientes: () => get<ClienteDTO[]>('/clientes'),
  crearCliente: (dto: CrearClienteDTO) => post('/clientes', dto),
  eliminarCliente: (id: number) => send('DELETE', `/clientes/${id}`),
  conceptos: () => get<ConceptoDTO[]>('/conceptos'),
  crearConcepto: (descripcion: string) => post('/conceptos', { descripcion }),
  gastos: () => get<Array<Record<string, unknown>>>('/gastos'),
  crearGasto: (dto: CrearGastoDTO) => post('/gastos', dto),
  ingresos: () => get<Array<Record<string, unknown>>>('/ingresos'),
  crearIngreso: (dto: CrearIngresoDTO) => post('/ingresos', dto),
  cobros: () => get<Array<Record<string, unknown>>>('/cobros'),
  crearCobro: (dto: CrearCobroDTO) => post('/cobros', dto),
  // Serialización de comprobantes
  series: () => get<Array<Record<string, unknown>>>('/serializacion'),
  crearSerie: (dto: Record<string, unknown>) => post('/serializacion', dto),
  eliminarSerie: (id: number) => send('DELETE', `/serializacion/${id}`),
  // Ticket
  ticket: () => get<Record<string, unknown> | null>('/ticket'),
  guardarTicket: (dto: Record<string, unknown>) => send('PUT', '/ticket', dto),
  // Correo
  correo: () => get<Record<string, unknown> | null>('/correo'),
  guardarCorreo: (dto: Record<string, unknown>) => send('PUT', '/correo', dto),
  enviarReporteCorreo: (para: string, desde: string, hasta: string) =>
    post('/correo/enviar-reporte', { para, desde, hasta }),
};
