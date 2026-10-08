/**
 * Contratos (DTOs y enums) compartidos entre la API y las apps (caja/web).
 * Equivalen a los "modelos" que antes se pasaban entre capas en el proyecto C#.
 */

// ---- Enums de dominio ----

export enum EstadoRegistro {
  Activo = 'Activo',
  Inactivo = 'Inactivo',
}

export enum TipoPago {
  Efectivo = 'Efectivo',
  Tarjeta = 'Tarjeta',
  Credito = 'Credito',
  Mixto = 'Mixto',
}

export enum TipoMovimientoKardex {
  Entrada = 'Entrada',
  Salida = 'Salida',
}

export enum RolUsuario {
  Admin = 'Admin',
  Cajero = 'Cajero',
  Supervisor = 'Supervisor',
}

// ---- DTOs: Productos (slice vertical de la Fase 0) ----

export interface ProductoDTO {
  id: number;
  descripcion: string | null;
  codigo: string | null;
  idGrupo: number | null;
  usaInventarios: string | null;
  stock: string | null;
  precioCompra: number | null;
  precioVenta: number | null;
  precioMayoreo: number | null;
  impuesto: string | null;
  stockMinimo: number | null;
  fechaVencimiento: string | null;
  /** Columna computada en SQL Server (solo lectura). */
  subTotalPv: number | null;
  /** Columna computada en SQL Server (solo lectura). */
  subTotalPm: number | null;
}

export interface CrearProductoDTO {
  descripcion: string;
  codigo?: string;
  idGrupo?: number;
  usaInventarios?: string;
  stock?: string;
  precioCompra?: number;
  precioVenta?: number;
  precioMayoreo?: number;
  impuesto?: string;
  stockMinimo?: number;
}

export type ActualizarProductoDTO = Partial<CrearProductoDTO>;

// ---- DTOs: Ventas (proceso SQL completo de la Fase 1) ----

export interface VentaLineaDTO {
  idProducto: number;
  descripcion: string;
  codigo?: string;
  cantidad: number;
  precioUnitario: number;
  costo?: number;
  /** 'SI' si descuenta inventario (mueve KARDEX y stock). */
  usaInventarios?: string;
  unidadDeMedida?: string;
  seVendeA?: string;
  moneda?: string;
}

export interface RegistrarVentaDTO {
  idCaja: number;
  idUsuario: number;
  idCliente?: number;
  tipoPago: TipoPago | string;
  numeroDeDoc: string;
  comprobante?: string;
  montoTotal: number;
  igv?: number;
  porcentajeIgv?: number;
  pagoCon?: number;
  vuelto?: number;
  efectivo?: number;
  tarjeta?: number;
  credito?: number;
  saldo?: number;
  referenciaTarjeta?: string;
  /** ISO-8601; si se omite, la API usa la fecha del servidor. */
  fechaVenta?: string;
  lineas: VentaLineaDTO[];
}

export interface VentaRegistradaDTO {
  idVenta: number;
  numeroDeDoc: string;
}

/** Estado de una venta en la cola offline de la caja (SQLite). */
export enum EstadoSync {
  Pendiente = 'pendiente',
  Sincronizada = 'sincronizada',
  Error = 'error',
}

export interface VentaPendienteDTO {
  idLocal: number;
  numeroDeDoc: string;
  estado: EstadoSync;
  idVentaRemota: number | null;
  intentos: number;
  ultimoError: string | null;
  creadaEn: string;
}

// ---- DTOs: Autenticación (login) ----

export interface LoginDTO {
  login: string;
  password: string;
}

export interface UsuarioAutenticadoDTO {
  idUsuario: number;
  nombres: string | null;
  login: string | null;
  rol: string | null;
  correo: string | null;
  /** JWT para autorizar las siguientes llamadas a la API. */
  token: string;
}

// ---- DTOs: Caja (apertura / cierre de turno) ----

export interface AperturaCajaDTO {
  idCaja: number;
  idUsuario: number;
  saldoInicial: number;
}

export interface CierreCajaDTO {
  idCaja: number;
  idUsuario: number;
  ingresos: number;
  egresos: number;
  saldoQuedaEnCaja: number;
  totalCalculado: number;
  totalReal: number;
  diferencia: number;
}

export interface TurnoAbiertoDTO {
  idCaja: number;
  fechaInicio: string;
  saldoInicial: number;
}

// ---- DTOs: Proveedores ----

export interface ProveedorDTO {
  idProveedor: number;
  nombre: string | null;
  direccion: string | null;
  identificadorFiscal: string | null;
  celular: string | null;
  estado: string | null;
  saldo: number | null;
}

export interface CrearProveedorDTO {
  nombre: string;
  direccion?: string;
  identificadorFiscal?: string;
  celular?: string;
  estado?: string;
  saldo?: number;
}

// ---- DTOs: Compras (proceso SQL de entrada de inventario) ----

export interface CompraLineaDTO {
  idProducto: number;
  descripcion: string;
  cantidad: number;
  costo: number;
  moneda?: string;
  /** 'SI' si suma inventario (mueve KARDEX y stock). */
  usaInventarios?: string;
}

export interface RegistrarCompraDTO {
  idCaja: number;
  idUsuario: number;
  idProveedor: number;
  fechaCompra?: string;
  lineas: CompraLineaDTO[];
}

export interface CompraRegistradaDTO {
  idCompra: number;
  total: number;
}

// ---- DTOs: Inventario / Kardex ----

export interface InventarioItemDTO {
  idProducto: number;
  codigo: string | null;
  descripcion: string | null;
  costo: number | null;
  precioVenta: number | null;
  stock: number | null;
  stockMinimo: number | null;
  importe: number | null;
}

export interface MovimientoKardexDTO {
  idKardex: number;
  fecha: string | null;
  descripcion: string | null;
  motivo: string | null;
  tipo: string | null;
  cantidad: number | null;
  hay: number | null;
  costoUnt: number | null;
  cajero: string | null;
}

export interface AjusteInventarioDTO {
  idProducto: number;
  idCaja: number;
  idUsuario: number;
  tipo: TipoMovimientoKardex;
  cantidad: number;
  motivo: string;
}

// ---- DTOs: Usuarios ----

export interface UsuarioDTO {
  idUsuario: number;
  nombres: string | null;
  login: string | null;
  correo: string | null;
  rol: string | null;
  estado: string | null;
}

export interface CrearUsuarioDTO {
  nombres: string;
  login: string;
  password: string;
  correo?: string;
  rol?: string;
}

export type ActualizarUsuarioDTO = Partial<CrearUsuarioDTO>;

// ---- DTOs: Empresa (configuración) ----

export interface EmpresaDTO {
  idEmpresa: number;
  nombreEmpresa: string | null;
  impuesto: string | null;
  porcentajeImpuesto: number | null;
  moneda: string | null;
  trabajasConImpuestos: string | null;
  modoDeBusqueda: string | null;
  correoParaReportes: string | null;
  pais: string | null;
}

export type ActualizarEmpresaDTO = Partial<Omit<EmpresaDTO, 'idEmpresa'>>;

// ---- DTOs: Clientes ----

export interface ClienteDTO {
  idCliente: number;
  nombre: string | null;
  direccion: string | null;
  identificadorFiscal: string | null;
  celular: string | null;
  estado: string | null;
  saldo: number | null;
}

export interface CrearClienteDTO {
  nombre: string;
  direccion?: string;
  identificadorFiscal?: string;
  celular?: string;
  estado?: string;
  saldo?: number;
}

// ---- DTOs: Conceptos / Gastos / Ingresos ----

export interface ConceptoDTO {
  idConcepto: number;
  descripcion: string | null;
}

export interface MovimientoCajaDTO {
  id: number;
  fecha: string | null;
  tipoComprobante: string | null;
  numero: string | null;
  importe: number | null;
  descripcion: string | null;
}

export interface CrearGastoDTO {
  importe: number;
  descripcion: string;
  idCaja: number;
  idConcepto?: number;
  nroDocumento?: string;
  tipoComprobante?: string;
}

export interface CrearIngresoDTO {
  importe: number;
  descripcion: string;
  idCaja: number;
  nroComprobante?: string;
  tipoComprobante?: string;
}

// ---- DTOs: Cobros (abonos de clientes a crédito) ----

export interface CrearCobroDTO {
  idCliente: number;
  idUsuario: number;
  idCaja: number;
  monto: number;
  detalle?: string;
  efectivo?: number;
  tarjeta?: number;
  comprobante?: string;
}

// ---- DTOs: Arqueo de caja ----

export interface ArqueoDTO {
  saldoInicial: number;
  ventasEfectivo: number;
  ingresos: number;
  gastos: number;
  saldoEsperado: number;
}

// ---- DTOs: Serialización de comprobantes ----

export interface SerializacionDTO {
  idSerializacion: number;
  serie: string | null;
  tipoDoc: string | null;
  destino: string | null;
  cantidadDeNumeros: string | null;
  numeroFin: string | null;
  porDefecto: string | null;
}

export interface CrearSerieDTO {
  serie: string;
  tipoDoc?: string;
  destino?: string;
  cantidadDeNumeros?: string;
  numeroFin?: string;
  porDefecto?: string;
}

// ---- DTOs: Ticket (plantilla de comprobante impreso) ----

export interface TicketDTO {
  idTicket: number;
  idEmpresa: number | null;
  identificadorFiscal: string | null;
  direccion: string | null;
  provinciaDepartamentoPais: string | null;
  nombreDeMoneda: string | null;
  agradecimiento: string | null;
  paginaWebFacebook: string | null;
  anuncio: string | null;
  datosFiscales: string | null;
  porDefecto: string | null;
}

export type ActualizarTicketDTO = Partial<Omit<TicketDTO, 'idTicket'>>;

// ---- DTOs: Correo ----

export interface CorreoConfigDTO {
  idCorreo: number;
  correo: string | null;
  estadoEnvio: string | null;
}

export interface EnviarReporteDTO {
  para: string;
  desde: string;
  hasta: string;
}

// ---- Respuesta estándar de la API ----

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
