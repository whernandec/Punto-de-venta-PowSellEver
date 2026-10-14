/**
 * Prepara una copia autónoma de la API (NestJS + Prisma) para empaquetarla
 * dentro del instalador de la caja (modo local / API embebida).
 *
 * En el monorepo las dependencias se "hoistean" a la raíz, por lo que
 * apps/api/node_modules está casi vacío y no sirve tal cual como recurso.
 * Este script genera apps/caja/build-api/ con su propio node_modules de
 * producción y el cliente de Prisma generado para el SO donde se ejecute
 * (en CI de Windows produce el query engine de Windows).
 *
 * El `npm install` se hace en un directorio temporal FUERA del workspace;
 * si se ejecutara dentro de apps/caja, npm detectaría el monorepo y volvería
 * a hoistear las dependencias a la raíz (dejando build-api vacío).
 *
 * Uso:  node scripts/empaquetar-api.mjs
 * Lo invoca el script "dist:win" de apps/caja antes de electron-builder.
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origenApi = join(raiz, 'apps', 'api');
const destino = join(raiz, 'apps', 'caja', 'build-api');

function log(msg) {
  console.log(`[empaquetar-api] ${msg}`);
}

if (!existsSync(join(origenApi, 'dist', 'main.js'))) {
  console.error('[empaquetar-api] Falta apps/api/dist/main.js. Ejecuta "npm run build" en apps/api primero.');
  process.exit(1);
}

// 1) Montar la API en un directorio temporal fuera del workspace del monorepo.
const staging = mkdtempSync(join(tmpdir(), 'pse-api-'));
log(`Montando API en ${staging} ...`);
cpSync(join(origenApi, 'dist'), join(staging, 'dist'), { recursive: true });
cpSync(join(origenApi, 'prisma'), join(staging, 'prisma'), { recursive: true });

// package.json de producción: sin @pos/types (solo tipos, no se usa en runtime),
// sin scripts ni devDependencies, para que npm install no toque el registro privado.
const pkg = JSON.parse(readFileSync(join(origenApi, 'package.json'), 'utf8'));
// Versión de la CLI de Prisma que usa el proyecto (debe coincidir con @prisma/client).
const prismaVersion = pkg.devDependencies?.prisma ?? pkg.dependencies?.['@prisma/client'] ?? 'latest';
delete pkg.devDependencies;
delete pkg.scripts;
if (pkg.dependencies) delete pkg.dependencies['@pos/types'];
writeFileSync(join(staging, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');

try {
  log('Instalando dependencias de producción...');
  execSync('npm install --omit=dev --no-package-lock --no-audit --no-fund', {
    cwd: staging,
    stdio: 'inherit',
  });

  // La CLI de Prisma es devDependency; se instala aquí con la versión EXACTA del
  // proyecto para evitar que npx baje una versión más nueva incompatible.
  log(`Instalando CLI de Prisma (${prismaVersion})...`);
  execSync(`npm install --no-save --no-audit --no-fund prisma@${prismaVersion}`, {
    cwd: staging,
    stdio: 'inherit',
  });

  log('Generando cliente de Prisma...');
  execSync(join(staging, 'node_modules', '.bin', 'prisma') + ' generate', {
    cwd: staging,
    stdio: 'inherit',
  });

  // 2) Copiar el resultado ya instalado al recurso que empaqueta electron-builder.
  log('Copiando a apps/caja/build-api ...');
  rmSync(destino, { recursive: true, force: true });
  mkdirSync(destino, { recursive: true });
  cpSync(staging, destino, { recursive: true });
} finally {
  rmSync(staging, { recursive: true, force: true });
}

log('Listo: apps/caja/build-api preparado para electron-builder.');
