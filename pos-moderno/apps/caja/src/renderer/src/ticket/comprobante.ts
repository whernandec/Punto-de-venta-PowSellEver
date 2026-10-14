/**
 * Modelo compartido del comprobante (ticket) para que lo que se configura en
 * "Diseño de Comprobantes" aparezca igual en el ticket de la venta.
 */

export type FormatoComprobante = 'TICKET' | 'FACTURA';

/** Diseño editable (se guarda en la BD / AppConfig). */
export interface DisenoComprobante {
  formato: FormatoComprobante;
  logo: string; // data URL (base64) o ''
  identificadorFiscal: string;
  direccion: string;
  provinciaDepartamentoPais: string;
  nombreDeMoneda: string;
  agradecimiento: string;
  paginaWebFacebook: string;
  anuncio: string;
  datosFiscales: string;
}

export const DISENO_DEFAULT: DisenoComprobante = {
  formato: 'TICKET',
  logo: '',
  identificadorFiscal: 'RUC IDENTIFICADOR FISCAL DE LA EMPRESA',
  direccion: 'CALLE, NRO, AVENIDA',
  provinciaDepartamentoPais: 'PROVINCIA - DEPARTAMENTO - PAIS',
  nombreDeMoneda: 'SOLES',
  agradecimiento: 'GRACIAS POR SU COMPRA',
  paginaWebFacebook: 'pagina web ó facebook',
  anuncio: 'ANUNCIO',
  datosFiscales: 'Datos Fiscales - Número de Autorización, Resolución…',
};

/** Datos de una venta concreta para pintar el comprobante. */
export interface VentaComprobante {
  empresa: string;
  numeroDoc: string;
  cajero: string;
  cliente: string;
  fecha: string;
  lineas: Array<{ descripcion: string; cantidad: number; precio: number }>;
  subtotal: number;
  descuento: number;
  total: number;
  efectivo: number;
  vuelto: number;
  tipoPago: string;
  numProductos: number;
}

/** Venta de ejemplo para la vista previa del diseñador. */
export const VENTA_EJEMPLO: VentaComprobante = {
  empresa: 'NOMBRE DE TU EMPRESA',
  numeroDoc: 'T0001',
  cajero: 'Nombre del Cajero',
  cliente: 'NOMBRE DEL CLIENTE',
  fecha: new Date().toLocaleDateString(),
  lineas: [{ descripcion: 'Gaseosa Coca Cola x 1 Lt', cantidad: 1, precio: 26 }],
  subtotal: 26,
  descuento: 0,
  total: 26,
  efectivo: 50,
  vuelto: 24,
  tipoPago: 'Efectivo',
  numProductos: 1,
};

const UNID = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
const DEC = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CEN = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function cientos(nn: number): string {
  if (nn === 0) return '';
  if (nn === 100) return 'CIEN';
  if (nn <= 20) return UNID[nn];
  if (nn < 100) {
    const d = Math.floor(nn / 10);
    const u = nn % 10;
    if (d === 2) return 'VEINTI' + UNID[u];
    return DEC[d] + (u ? ' Y ' + UNID[u] : '');
  }
  const c = Math.floor(nn / 100);
  return CEN[c] + (nn % 100 ? ' ' + cientos(nn % 100) : '');
}

export function numeroALetras(valor: number): string {
  const entero = Math.floor(valor);
  const cent = Math.round((valor - entero) * 100);
  let txt: string;
  if (entero === 0) txt = 'CERO';
  else if (entero < 1000) txt = cientos(entero);
  else {
    const miles = Math.floor(entero / 1000);
    const resto = entero % 1000;
    const milesTxt = miles === 1 ? 'MIL' : cientos(miles) + ' MIL';
    txt = milesTxt + (resto ? ' ' + cientos(resto) : '');
  }
  return `${txt} CON ${String(cent).padStart(2, '0')}/100`;
}
