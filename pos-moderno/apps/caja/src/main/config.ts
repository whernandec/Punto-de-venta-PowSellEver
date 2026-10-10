import { app } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface AppConfig {
  /** 'local' = API embebida; 'servidor' = API remota (apiUrl). */
  modo: 'local' | 'servidor';
  /** URL de la API a consumir desde la caja. */
  apiUrl: string;
  /** Puerto de la API embebida (modo local). */
  puerto: number;
  /** Conexión a SQL Server (solo modo local, para la API embebida). */
  databaseUrl?: string;
  jwtSecret?: string;
}

const DEFAULTS: AppConfig = {
  modo: 'local',
  apiUrl: 'http://localhost:3000',
  puerto: 3000,
  databaseUrl:
    'sqlserver://localhost:1433;database=BASEADACURSO;user=sa;password=TU_PASSWORD;encrypt=true;trustServerCertificate=true',
  jwtSecret: 'cambia-este-secreto-en-produccion',
};

/**
 * Lee (o crea) el archivo de configuración editable por el instalador/usuario:
 *   <userData>/config.json
 * Permite el mismo ejecutable en modo local o apuntando a un servidor.
 */
export function cargarConfig(): AppConfig {
  try {
    const ruta = join(app.getPath('userData'), 'config.json');
    if (existsSync(ruta)) {
      const cfg = JSON.parse(readFileSync(ruta, 'utf8')) as Partial<AppConfig>;
      return { ...DEFAULTS, ...cfg };
    }
    writeFileSync(ruta, JSON.stringify(DEFAULTS, null, 2), 'utf8');
  } catch {
    /* si falla, usa valores por defecto */
  }
  return DEFAULTS;
}
