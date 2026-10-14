import { contextBridge, ipcRenderer } from 'electron';
import type {
  RegistrarVentaDTO,
  VentaPendienteDTO,
} from '@pos/types';
import type { DatosTicket } from '../main/hardware/impresora';

/**
 * API segura expuesta al renderer (React). El renderer NUNCA accede a Node
 * directamente; solo a través de estos canales (contextIsolation).
 */
const posAPI = {
  balanza: {
    disponible: (): Promise<boolean> =>
      ipcRenderer.invoke('balanza:disponible'),
    leerPeso: (puerto: string, baudRate?: number): Promise<number> =>
      ipcRenderer.invoke('balanza:leerPeso', puerto, baudRate),
  },
  impresora: {
    imprimirTicket: (
      ip: string,
      puerto: number,
      datos: DatosTicket,
    ): Promise<void> =>
      ipcRenderer.invoke('impresora:imprimirTicket', ip, puerto, datos),
  },
  config: {
    apiUrl: (): string =>
      (ipcRenderer.sendSync('config:get') as { apiUrl: string })?.apiUrl ??
      'http://localhost:3000',
    instalado: (): boolean =>
      (ipcRenderer.sendSync('config:get') as { instalado: boolean })
        ?.instalado === true,
  },
  setup: {
    probar: (sql: unknown): Promise<{ ok: boolean; dbExiste?: boolean; error?: string }> =>
      ipcRenderer.invoke('setup:probar', sql),
    instalarPrincipal: (datos: unknown): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke('setup:instalarPrincipal', datos),
    instalarSecundaria: (apiUrl: string): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke('setup:instalarSecundaria', apiUrl),
    onProgreso: (
      cb: (d: { etapa: string; hecho?: number; total?: number }) => void,
    ): (() => void) => {
      const h = (_e: unknown, d: { etapa: string; hecho?: number; total?: number }): void =>
        cb(d);
      ipcRenderer.on('setup:progreso', h);
      return () => ipcRenderer.removeListener('setup:progreso', h);
    },
  },
  auth: {
    setToken: (token: string | null): Promise<void> =>
      ipcRenderer.invoke('auth:setToken', token),
  },
  ventas: {
    registrar: (venta: RegistrarVentaDTO): Promise<{ idLocal: number }> =>
      ipcRenderer.invoke('ventas:registrar', venta),
    pendientes: (): Promise<VentaPendienteDTO[]> =>
      ipcRenderer.invoke('ventas:pendientes'),
    sincronizar: (): Promise<{ enviadas: number; fallidas: number }> =>
      ipcRenderer.invoke('ventas:sincronizar'),
  },
};

contextBridge.exposeInMainWorld('posAPI', posAPI);

export type PosAPI = typeof posAPI;
