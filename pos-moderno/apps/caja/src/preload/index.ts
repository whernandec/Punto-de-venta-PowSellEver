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
