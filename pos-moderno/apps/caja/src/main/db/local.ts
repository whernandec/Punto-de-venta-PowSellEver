/**
 * Base de datos LOCAL de la caja (SQLite) — habilita operación OFFLINE.
 *
 * La venta se guarda primero aquí (siempre funciona, haya o no internet) y
 * luego un proceso de sincronización la envía a la API/SQL Server. Es el núcleo
 * del "proceso SQL" de la caja en la Fase 1.
 *
 * better-sqlite3 es un módulo nativo: se carga de forma perezosa para no romper
 * el arranque si el binding no está compilado para Electron (ver electron-rebuild).
 */
import { app } from 'electron';
import { join } from 'path';

type Database = any;

let db: Database | null = null;

export function getDb(): Database {
  if (db) return db;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const BetterSqlite3 = require('better-sqlite3');
  const ruta = join(app.getPath('userData'), 'caja-local.db');
  db = new BetterSqlite3(ruta);
  db.pragma('journal_mode = WAL');

  // Cola de ventas pendientes de sincronizar con el servidor central.
  db.exec(`
    CREATE TABLE IF NOT EXISTS venta_pendiente (
      idLocal        INTEGER PRIMARY KEY AUTOINCREMENT,
      numeroDeDoc    TEXT NOT NULL,
      payload        TEXT NOT NULL,            -- RegistrarVentaDTO en JSON
      estado         TEXT NOT NULL DEFAULT 'pendiente',
      idVentaRemota  INTEGER,
      intentos       INTEGER NOT NULL DEFAULT 0,
      ultimoError    TEXT,
      creadaEn       TEXT NOT NULL DEFAULT (datetime('now')),
      sincronizadaEn TEXT
    );
  `);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_venta_pendiente_estado
       ON venta_pendiente (estado);`,
  );

  return db;
}
