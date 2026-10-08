import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import type { RegistrarVentaDTO } from '@pos/types';
import { balanzaDisponible, leerPeso } from './hardware/balanza';
import { imprimirPorRed, type DatosTicket } from './hardware/impresora';
import {
  iniciarSyncAutomatico,
  listarPendientes,
  registrarVentaLocal,
  sincronizar,
} from './sync/syncService';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.on('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // En dev carga el servidor de Vite; en prod el HTML empaquetado.
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// ---- Canales IPC: hardware local (lo que en WinForms se hacía inline) ----

ipcMain.handle('balanza:disponible', () => balanzaDisponible());

ipcMain.handle(
  'balanza:leerPeso',
  (_e, puerto: string, baudRate?: number) => leerPeso(puerto, baudRate),
);

ipcMain.handle(
  'impresora:imprimirTicket',
  (_e, ip: string, puerto: number, datos: DatosTicket) =>
    imprimirPorRed(ip, puerto, datos),
);

// Proceso de venta offline: guardar local + sincronizar con el servidor.
ipcMain.handle('ventas:registrar', async (_e, venta: RegistrarVentaDTO) => {
  const r = registrarVentaLocal(venta); // 1) persistencia local inmediata
  void sincronizar(); // 2) intento de envío en segundo plano
  return r;
});

ipcMain.handle('ventas:pendientes', () => listarPendientes());

ipcMain.handle('ventas:sincronizar', () => sincronizar());

app.whenReady().then(() => {
  createWindow();
  iniciarSyncAutomatico(); // reintenta enviar ventas pendientes periódicamente
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
