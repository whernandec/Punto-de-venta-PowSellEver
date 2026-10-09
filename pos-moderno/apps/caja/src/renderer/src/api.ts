import type {
  AjusteInventarioDTO,
  AperturaCajaDTO,
  ArqueoDTO,
  CierreCajaDTO,
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
  ProductoDTO,
  ProveedorDTO,
  RegistrarCompraDTO,
  TurnoAbiertoDTO,
  UsuarioAutenticadoDTO,
  UsuarioDTO,
} from '@pos/types';

/**
 * Cliente de la API del POS. La URL base se podrá configurar por caja;
 * por ahora apunta al servidor NestJS local (Fase 0).
 */
export const API_BASE = 'http://localhost:3000';

// JWT de la sesión (se fija tras el login).
let authToken: string | null = null;
export function setToken(token: string | null): void {
  authToken = token;
}
function authHeader(): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

async function post<T>(ruta: string, body: unknown): Promise<T> {
  return send<T>('POST', ruta, body);
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

export function login(dto: LoginDTO): Promise<UsuarioAutenticadoDTO> {
  return post<UsuarioAutenticadoDTO>('/auth/login', dto);
}

export function aperturaCaja(dto: AperturaCajaDTO): Promise<unknown> {
  return post('/caja/apertura', dto);
}

export function cierreCaja(dto: CierreCajaDTO): Promise<unknown> {
  return post('/caja/cierre', dto);
}

export async function arqueoCaja(idCaja: number): Promise<ArqueoDTO | null> {
  const res = await fetch(`${API_BASE}/caja/${idCaja}/arqueo`, {
    headers: { ...authHeader() },
  });
  if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
  const texto = await res.text();
  return texto ? (JSON.parse(texto) as ArqueoDTO) : null;
}

export async function turnoAbierto(
  idCaja: number,
): Promise<TurnoAbiertoDTO | null> {
  const res = await fetch(`${API_BASE}/caja/${idCaja}/turno-abierto`, {
    headers: { ...authHeader() },
  });
  if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
  const texto = await res.text();
  return texto ? (JSON.parse(texto) as TurnoAbiertoDTO) : null;
}

// ---- Inventario / Kardex ----

async function get<T>(ruta: string): Promise<T> {
  const res = await fetch(`${API_BASE}${ruta}`, { headers: { ...authHeader() } });
  if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export function obtenerInventario(q = ''): Promise<InventarioItemDTO[]> {
  return get<InventarioItemDTO[]>(`/inventario?q=${encodeURIComponent(q)}`);
}

export function inventarioBajoMinimo(): Promise<InventarioItemDTO[]> {
  return get<InventarioItemDTO[]>('/inventario/bajo-minimo');
}

export function ajusteInventario(dto: AjusteInventarioDTO): Promise<unknown> {
  return post('/inventario/ajuste', dto);
}

// ---- Proveedores ----

export function obtenerProveedores(): Promise<ProveedorDTO[]> {
  return get<ProveedorDTO[]>('/proveedores');
}

export function crearProveedor(dto: CrearProveedorDTO): Promise<unknown> {
  return post('/proveedores', dto);
}

// ---- Compras ----

export function registrarCompra(
  dto: RegistrarCompraDTO,
): Promise<{ idCompra: number; total: number }> {
  return post('/compras', dto);
}

export async function obtenerProductos(): Promise<ProductoDTO[]> {
  const res = await fetch(`${API_BASE}/productos`, {
    headers: { ...authHeader() },
  });
  if (!res.ok) throw new Error(`Error al cargar productos (HTTP ${res.status})`);
  // La API devuelve el modelo Prisma; lo adaptamos al DTO compartido.
  const filas = (await res.json()) as Array<Record<string, unknown>>;
  return filas.map((f) => ({
    id: Number(f.idProducto),
    descripcion: (f.descripcion as string) ?? null,
    codigo: (f.codigo as string) ?? null,
    idGrupo: (f.idGrupo as number) ?? null,
    usaInventarios: (f.usaInventarios as string) ?? null,
    stock: (f.stock as string) ?? null,
    precioCompra: f.precioDeCompra != null ? Number(f.precioDeCompra) : null,
    precioVenta: f.precioDeVenta != null ? Number(f.precioDeVenta) : null,
    precioMayoreo: f.precioMayoreo != null ? Number(f.precioMayoreo) : null,
    impuesto: (f.impuesto as string) ?? null,
    stockMinimo: f.stockMinimo != null ? Number(f.stockMinimo) : null,
    fechaVencimiento: (f.fechaVencimiento as string) ?? null,
    subTotalPv: null,
    subTotalPm: null,
  }));
}

export const crearProducto = (dto: Record<string, unknown>) =>
  post('/productos', dto);
export const actualizarProducto = (id: number, dto: Record<string, unknown>) =>
  send('PATCH', `/productos/${id}`, dto);
export const eliminarProducto = (id: number) =>
  send('DELETE', `/productos/${id}`);
export const obtenerGrupos = () =>
  get<Array<{ idLine: number; linea: string }>>('/grupos');
export const crearGrupo = (linea: string) => post('/grupos', { linea });

export async function importarProductosExcel(
  file: File,
): Promise<{ creados: number; omitidos: number; errores: string[] }> {
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
}
export const descargarPlantillaProductos = () =>
  descargarArchivo('/productos/plantilla.xlsx', 'plantilla_productos.xlsx');
export const obtenerCompras = () =>
  get<Array<Record<string, unknown>>>('/compras');

// ---- Clientes ----
export const obtenerClientes = () => get<ClienteDTO[]>('/clientes');
export const crearCliente = (dto: CrearClienteDTO) => post('/clientes', dto);
export const eliminarCliente = (id: number) => send('DELETE', `/clientes/${id}`);

// ---- Cobros ----
export const obtenerCobros = () =>
  get<Array<Record<string, unknown>>>('/cobros');
export const crearCobro = (dto: CrearCobroDTO) => post('/cobros', dto);

// ---- Finanzas ----
export const obtenerConceptos = () => get<ConceptoDTO[]>('/conceptos');
export const crearConcepto = (descripcion: string) =>
  post('/conceptos', { descripcion });
export const obtenerGastos = () =>
  get<Array<Record<string, unknown>>>('/gastos');
export const crearGasto = (dto: CrearGastoDTO) => post('/gastos', dto);
export const obtenerIngresos = () =>
  get<Array<Record<string, unknown>>>('/ingresos');
export const crearIngreso = (dto: CrearIngresoDTO) => post('/ingresos', dto);

// ---- Usuarios ----
export const obtenerUsuarios = () => get<UsuarioDTO[]>('/usuarios');
export const crearUsuario = (dto: CrearUsuarioDTO) => post('/usuarios', dto);
export const eliminarUsuario = (id: number) => send('DELETE', `/usuarios/${id}`);

// ---- Empresa ----
export const obtenerEmpresa = () => get<EmpresaDTO | null>('/empresa');
export const actualizarEmpresa = (id: number, dto: Partial<EmpresaDTO>) =>
  send<EmpresaDTO>('PUT', `/empresa/${id}`, dto);

// ---- Serialización / Ticket / Correo ----
export const obtenerSeries = () =>
  get<Array<Record<string, unknown>>>('/serializacion');
export const crearSerie = (dto: Record<string, unknown>) =>
  post('/serializacion', dto);
export const eliminarSerie = (id: number) =>
  send('DELETE', `/serializacion/${id}`);

export const obtenerTicket = () =>
  get<Record<string, unknown> | null>('/ticket');
export const guardarTicket = (dto: Record<string, unknown>) =>
  send('PUT', '/ticket', dto);

export const obtenerCorreo = () =>
  get<Record<string, unknown> | null>('/correo');
export const guardarCorreo = (dto: Record<string, unknown>) =>
  send('PUT', '/correo', dto);
export const enviarReporteCorreo = (
  para: string,
  desde: string,
  hasta: string,
) => post('/correo/enviar-reporte', { para, desde, hasta });

// ---- Reportes ----
export interface ReporteVentasResp {
  desde: string;
  hasta: string;
  resumen: {
    numVentas: number;
    total: number;
    efectivo: number;
    tarjeta: number;
    credito: number;
  };
  filas: Array<Record<string, unknown>>;
}
export const reporteVentas = (desde: string, hasta: string) =>
  get<ReporteVentasResp>(`/reportes/ventas?desde=${desde}&hasta=${hasta}`);

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
export const obtenerDashboard = () => get<DashboardData>('/dashboard');

// ---- Terminal (Mercado Pago) ----
export interface TerminalConfig {
  proveedor: string;
  enabled: boolean;
  simulacion: boolean;
  deviceId: string;
  storeId: string;
  tokenConfigurado: boolean;
}
export const obtenerTerminal = () => get<TerminalConfig>('/terminal');
export const guardarTerminal = (dto: Record<string, unknown>) =>
  send<TerminalConfig>('PUT', '/terminal', dto);
export const dispositivosTerminal = () =>
  get<Array<{ id: string; name: string }>>('/terminal/dispositivos');
export const pagarTerminal = (monto: number) =>
  post<{ status: string; id: string; simulado?: boolean; estado?: string }>(
    '/terminal/pago',
    { monto },
  );

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

export const descargarReporteExcel = (desde: string, hasta: string) =>
  descargarArchivo(
    `/reportes/ventas.xlsx?desde=${desde}&hasta=${hasta}`,
    `ventas_${desde}_${hasta}.xlsx`,
  );
export const descargarReportePdf = (desde: string, hasta: string) =>
  descargarArchivo(
    `/reportes/ventas.pdf?desde=${desde}&hasta=${hasta}`,
    `ventas_${desde}_${hasta}.pdf`,
  );
