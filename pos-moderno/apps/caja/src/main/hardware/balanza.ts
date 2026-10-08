/**
 * Integración con balanza electrónica por puerto serial.
 * Equivale al módulo BalanzaElectronica del POS viejo (WinForms).
 *
 * `serialport` es un módulo nativo; se carga de forma perezosa para que la app
 * arranque aunque el binding no esté compilado para Electron (ver electron-rebuild).
 */

type SerialPortCtor = new (opts: {
  path: string;
  baudRate: number;
  autoOpen?: boolean;
}) => any;

let SerialPort: SerialPortCtor | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SerialPort = require('serialport').SerialPort as SerialPortCtor;
} catch {
  SerialPort = null;
}

export function balanzaDisponible(): boolean {
  return SerialPort !== null;
}

/**
 * Lee un peso (en kg) de la balanza. Abre el puerto, espera una lectura
 * estable y lo cierra. El parseo asume que la balanza emite líneas con el
 * peso en texto (ajustable según el protocolo del modelo).
 */
export function leerPeso(
  puerto: string,
  baudRate = 9600,
  timeoutMs = 4000,
): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!SerialPort) {
      reject(
        new Error(
          'serialport no disponible. Ejecuta `npx electron-rebuild -f -w serialport`.',
        ),
      );
      return;
    }

    const port = new SerialPort({ path: puerto, baudRate, autoOpen: false });
    let buffer = '';

    const finish = (err: Error | null, peso?: number) => {
      try {
        port.close(() => undefined);
      } catch {
        /* noop */
      }
      clearTimeout(timer);
      if (err) reject(err);
      else resolve(peso ?? 0);
    };

    const timer = setTimeout(
      () => finish(new Error('Tiempo de espera agotado leyendo la balanza')),
      timeoutMs,
    );

    port.open((err: Error | null) => {
      if (err) {
        finish(err);
        return;
      }
    });

    port.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('ascii');
      // Busca el primer número decimal en el flujo (p. ej. "ST,GS,  1.234kg").
      const match = buffer.match(/(\d+[.,]\d+)/);
      if (match) {
        const peso = parseFloat(match[1].replace(',', '.'));
        if (!Number.isNaN(peso)) finish(null, peso);
      }
    });

    port.on('error', (e: Error) => finish(e));
  });
}
