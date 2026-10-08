/**
 * Servicio de sincronización offline → servidor.
 *
 * Flujo del "proceso SQL" de una venta en la caja:
 *   1. registrarVentaLocal(): guarda la venta en SQLite (estado 'pendiente').
 *      → La caja nunca se bloquea por falta de internet.
 *   2. sincronizar(): recorre las pendientes y hace POST /ventas a la API,
 *      que las persiste transaccionalmente en SQL Server (SPs).
 *      → Marca 'sincronizada' (con el id remoto) o 'error' (reintentable).
 *   3. Corre automáticamente al arrancar y cada cierto intervalo.
 */
import type {
  RegistrarVentaDTO,
  VentaPendienteDTO,
} from '@pos/types';
import { getDb } from '../db/local';

const API_BASE = process.env.POS_API_URL ?? 'http://localhost:3000';
const MAX_INTENTOS = 10;

export function registrarVentaLocal(venta: RegistrarVentaDTO): {
  idLocal: number;
} {
  let db;
  try {
    db = getDb();
  } catch {
    throw new Error(
      'Almacenamiento local no disponible. Ejecuta: npx electron-rebuild -f -w better-sqlite3',
    );
  }
  const info = db
    .prepare(
      `INSERT INTO venta_pendiente (numeroDeDoc, payload) VALUES (?, ?)`,
    )
    .run(venta.numeroDeDoc, JSON.stringify(venta));
  return { idLocal: Number(info.lastInsertRowid) };
}

/** true si el almacenamiento local (better-sqlite3) está disponible. */
export function almacenamientoLocalDisponible(): boolean {
  try {
    getDb();
    return true;
  } catch {
    return false;
  }
}

export function listarPendientes(): VentaPendienteDTO[] {
  let db;
  try {
    db = getDb();
  } catch {
    return []; // sin binding nativo aún: la UI se ve, el offline llega con electron-rebuild
  }
  const filas = db
    .prepare(
      `SELECT idLocal, numeroDeDoc, estado, idVentaRemota, intentos,
              ultimoError, creadaEn
         FROM venta_pendiente
        ORDER BY idLocal DESC`,
    )
    .all();
  return filas as VentaPendienteDTO[];
}

async function hayConexion(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { db?: string };
    return data.db === 'ok'; // solo sincroniza si la BD central está viva
  } catch {
    return false;
  }
}

export async function sincronizar(): Promise<{
  enviadas: number;
  fallidas: number;
}> {
  let db;
  try {
    db = getDb();
  } catch {
    return { enviadas: 0, fallidas: 0 }; // almacenamiento local no disponible aún
  }
  if (!(await hayConexion())) return { enviadas: 0, fallidas: 0 };

  const pendientes = db
    .prepare(
      `SELECT idLocal, payload FROM venta_pendiente
        WHERE estado IN ('pendiente','error') AND intentos < ?
        ORDER BY idLocal ASC`,
    )
    .all(MAX_INTENTOS) as Array<{ idLocal: number; payload: string }>;

  let enviadas = 0;
  let fallidas = 0;

  for (const p of pendientes) {
    try {
      const res = await fetch(`${API_BASE}/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: p.payload,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const data = (await res.json()) as { idVenta: number };
      db.prepare(
        `UPDATE venta_pendiente
            SET estado='sincronizada', idVentaRemota=?, ultimoError=NULL,
                intentos=intentos+1, sincronizadaEn=datetime('now')
          WHERE idLocal=?`,
      ).run(data.idVenta, p.idLocal);
      enviadas++;
    } catch (e) {
      db.prepare(
        `UPDATE venta_pendiente
            SET estado='error', ultimoError=?, intentos=intentos+1
          WHERE idLocal=?`,
      ).run((e as Error).message, p.idLocal);
      fallidas++;
    }
  }

  return { enviadas, fallidas };
}

let timer: NodeJS.Timeout | null = null;

/** Arranca la sincronización periódica (y un intento inmediato). */
export function iniciarSyncAutomatico(intervaloMs = 30_000): void {
  if (timer) return;
  void sincronizar();
  timer = setInterval(() => void sincronizar(), intervaloMs);
}
