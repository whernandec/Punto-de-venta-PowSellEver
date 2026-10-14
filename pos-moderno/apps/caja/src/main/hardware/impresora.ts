/**
 * Impresión de tickets ESC/POS. Equivale al módulo Impresoras del POS viejo.
 * Soporta impresora por red (TCP 9100, lo más común en térmicas) y por serial.
 */
import { Socket } from 'net';

export interface LineaTicket {
  descripcion: string;
  cantidad: number;
  precio: number;
}

export interface DatosTicket {
  empresa: string;
  identificadorFiscal?: string;
  direccion?: string;
  provinciaDepartamentoPais?: string;
  numeroDoc?: string;
  cajero?: string;
  cliente?: string;
  fecha?: string;
  lineas: LineaTicket[];
  subtotal?: number;
  descuento?: number;
  total: number;
  son?: string; // total en letras
  nombreDeMoneda?: string;
  efectivo?: number;
  vuelto?: number;
  tipoPago?: string;
  numProductos?: number;
  agradecimiento?: string;
  paginaWebFacebook?: string;
  anuncio?: string;
  datosFiscales?: string;
  esFactura?: boolean;
  pie?: string; // compat
}

// Comandos ESC/POS básicos.
const ESC = '\x1b';
const GS = '\x1d';
const INIT = `${ESC}@`;
const CENTER = `${ESC}a1`;
const LEFT = `${ESC}a0`;
const BOLD_ON = `${ESC}E1`;
const BOLD_OFF = `${ESC}E0`;
const CUT = `${GS}V1`;
const ANCHO = 32;
const SEP = '-'.repeat(ANCHO) + '\n';

/** Línea con etiqueta a la izquierda y valor a la derecha (ancho fijo). */
function lr(izq: string, der: string): string {
  const espacio = Math.max(1, ANCHO - izq.length - der.length);
  return izq + ' '.repeat(espacio) + der + '\n';
}

/** Construye el buffer ESC/POS de un ticket a partir del diseño configurado. */
export function construirTicket(d: DatosTicket): Buffer {
  const sim = 'S/.';
  let out = INIT + CENTER + BOLD_ON + d.empresa + '\n' + BOLD_OFF;
  if (d.identificadorFiscal) out += d.identificadorFiscal + '\n';
  if (d.direccion) out += d.direccion + '\n';
  if (d.provinciaDepartamentoPais) out += d.provinciaDepartamentoPais + '\n';
  out += LEFT;

  const doc = d.esFactura ? 'FACTURA' : 'TICKET';
  out += BOLD_ON + `${doc} : ${d.numeroDoc ?? ''}\n` + BOLD_OFF;
  if (d.cajero) out += `Cajero: ${d.cajero}\n`;
  if (d.fecha) out += `Fecha : ${d.fecha}\n`;
  if (d.cliente) out += `Cliente: ${d.cliente}\n`;
  out += SEP;

  out += 'Cant Descripcion            Importe\n';
  for (const l of d.lineas) {
    out += `${l.descripcion}\n`;
    out += lr(`  ${l.cantidad} x ${l.precio.toFixed(2)}`, `${sim} ${(l.cantidad * l.precio).toFixed(2)}`);
  }
  out += SEP;

  if (d.subtotal != null) out += lr('Sub Total:', `${sim} ${d.subtotal.toFixed(2)}`);
  if (d.descuento != null) out += lr('Descuento:', `${sim} ${d.descuento.toFixed(2)}`);
  out += BOLD_ON + lr('TOTAL:', `${sim} ${d.total.toFixed(2)}`) + BOLD_OFF;
  if (d.son) out += `SON: ${d.son} ${d.nombreDeMoneda ?? ''}\n`;
  if (d.efectivo != null) out += lr('EFECTIVO:', `${sim} ${d.efectivo.toFixed(2)}`);
  if (d.vuelto != null) out += lr('VUELTO:', `${sim} ${d.vuelto.toFixed(2)}`);
  if (d.tipoPago) out += lr('Tipo de Pago:', d.tipoPago);
  if (d.numProductos != null) out += lr('Numero de Productos', String(d.numProductos));
  out += SEP;

  out += CENTER;
  if (d.agradecimiento) out += d.agradecimiento + '\n';
  if (d.paginaWebFacebook) out += d.paginaWebFacebook + '\n';
  if (d.anuncio) out += d.anuncio + '\n';
  if (d.esFactura && d.datosFiscales) out += '\n' + d.datosFiscales + '\n';
  if (d.pie) out += d.pie + '\n';
  out += '\n\n\n' + CUT;
  return Buffer.from(out, 'ascii');
}

/** Imprime un ticket en una impresora de red (ip:puerto, por defecto 9100). */
export function imprimirPorRed(
  ip: string,
  puerto: number,
  datos: DatosTicket,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('Tiempo de espera agotado conectando a la impresora'));
    }, 5000);

    socket.connect(puerto, ip, () => {
      socket.write(construirTicket(datos), () => {
        clearTimeout(timer);
        socket.end();
        resolve();
      });
    });
    socket.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}
