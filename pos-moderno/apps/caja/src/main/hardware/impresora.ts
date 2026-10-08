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
  lineas: LineaTicket[];
  total: number;
  pie?: string;
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

/** Construye el buffer ESC/POS de un ticket. */
export function construirTicket(datos: DatosTicket): Buffer {
  let out = INIT + CENTER + BOLD_ON + datos.empresa + '\n' + BOLD_OFF + LEFT;
  out += '--------------------------------\n';
  for (const l of datos.lineas) {
    const sub = (l.cantidad * l.precio).toFixed(2);
    out += `${l.cantidad} x ${l.descripcion}\n`;
    out += `${' '.repeat(Math.max(0, 32 - sub.length))}${sub}\n`;
  }
  out += '--------------------------------\n';
  out += BOLD_ON + `TOTAL: ${datos.total.toFixed(2)}\n` + BOLD_OFF;
  if (datos.pie) out += CENTER + '\n' + datos.pie + '\n';
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
