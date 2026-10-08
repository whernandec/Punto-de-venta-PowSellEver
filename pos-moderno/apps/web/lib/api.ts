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

async function get<T>(ruta: string): Promise<T> {
  const res = await fetch(`${API_BASE}${ruta}`, { cache: 'no-store' });
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
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
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

export const api = {
  login: (dto: LoginDTO) =>
    post<UsuarioAutenticadoDTO>('/auth/login', dto),
  reporteVentas: (desde: string, hasta: string) =>
    get<ReporteVentas>(`/reportes/ventas?desde=${desde}&hasta=${hasta}`),
  inventario: (q = '') =>
    get<InventarioItemDTO[]>(`/inventario?q=${encodeURIComponent(q)}`),
  bajoMinimo: () => get<InventarioItemDTO[]>('/inventario/bajo-minimo'),
  ajuste: (dto: AjusteInventarioDTO) => post('/inventario/ajuste', dto),
  proveedores: () => get<ProveedorDTO[]>('/proveedores'),
  crearProveedor: (dto: CrearProveedorDTO) => post('/proveedores', dto),
  productos: () => get<Array<Record<string, unknown>>>('/productos'),
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
};
