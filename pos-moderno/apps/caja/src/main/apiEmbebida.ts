import { app } from 'electron';
import { spawn, type ChildProcess } from 'child_process';
import { join } from 'path';
import type { AppConfig } from './config';

let proceso: ChildProcess | null = null;

/**
 * Arranca la API NestJS empaquetada dentro de la app (modo local).
 * Usa el runtime de Node incluido en Electron (ELECTRON_RUN_AS_NODE),
 * así no se necesita instalar Node en el equipo.
 *
 * Solo se ejecuta cuando la app está empaquetada y el modo es 'local';
 * en desarrollo se usa la API levantada aparte.
 */
export function iniciarApiEmbebida(cfg: AppConfig): void {
  if (!app.isPackaged || cfg.modo !== 'local') return;

  // Los recursos extra (api/) se copian junto al ejecutable (extraResources).
  const apiMain = join(process.resourcesPath, 'api', 'dist', 'main.js');

  proceso = spawn(process.execPath, [apiMain], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(cfg.puerto ?? 3000),
      DATABASE_URL: cfg.databaseUrl ?? '',
      JWT_SECRET: cfg.jwtSecret ?? 'cambia-este-secreto-en-produccion',
    },
    stdio: 'ignore',
    windowsHide: true,
  });

  proceso.on('exit', (code) => {
    // eslint-disable-next-line no-console
    console.log(`API embebida finalizó (code ${code ?? 'null'})`);
  });
}

export function detenerApiEmbebida(): void {
  if (proceso && !proceso.killed) proceso.kill();
  proceso = null;
}
