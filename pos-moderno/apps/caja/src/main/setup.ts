/**
 * Asistente de primera ejecución: prepara SQL Server en el equipo Principal.
 *  - Detecta/valida la instancia (conexión sa).
 *  - Crea la base BASEADACURSO (rutas por defecto; ignora el CREATE DATABASE
 *    con ruta fija del script.sql original).
 *  - Ejecuta el script.sql (tablas + 178 procedimientos) por lotes (GO).
 *  - Inserta Empresa, Caja y el usuario administrador.
 *  - Guarda la configuración (config.json) y marca instalado = true.
 */
import { app } from 'electron';
import { randomBytes } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import * as sql from 'mssql';
import { guardarConfig, type AppConfig } from './config';

export interface DatosSql {
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface DatosEmpresa {
  nombre: string;
  pais: string;
  moneda: string;
  conImpuestos: boolean;
  porcentajeImpuesto?: number;
  modoBusqueda: 'LECTORA' | 'TECLADO';
  nombreCaja: string;
  carpetaCopias?: string;
  correoCierre?: string;
}

export interface DatosAdmin {
  nombre: string;
  password: string;
}

const DB = 'BASEADACURSO';

function conf(d: DatosSql, database?: string): sql.config {
  return {
    server: d.host,
    port: d.port,
    user: d.user,
    password: d.password,
    database,
    options: {
      encrypt: true,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    connectionTimeout: 15000,
    requestTimeout: 180000,
    // UNA sola conexión: el script usa `USE [BASEADACURSO]` y con varias
    // conexiones el contexto no persiste entre lotes (los CREATE caen en master).
    pool: { max: 1, min: 1, idleTimeoutMillis: 30000 },
  };
}

/** Prueba la conexión a la instancia y reporta si la base ya existe. */
export async function probarConexion(
  d: DatosSql,
): Promise<{ ok: boolean; dbExiste?: boolean; error?: string }> {
  let pool: sql.ConnectionPool | undefined;
  try {
    pool = await new sql.ConnectionPool(conf(d, 'master')).connect();
    const r = await pool
      .request()
      .query(`SELECT DB_ID('${DB}') AS id`);
    return { ok: true, dbExiste: r.recordset[0]?.id != null };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  } finally {
    await pool?.close().catch(() => undefined);
  }
}

/** Ubica un .sql empaquetado (resources/db) o en el repo (desarrollo). */
function rutaSql(nombre: string, extra: string[] = []): string | null {
  const candidatos = [
    join(process.resourcesPath ?? '', 'db', nombre),
    ...extra,
  ];
  return candidatos.find((p) => p && existsSync(p)) ?? null;
}

function leerSql(ruta: string, utf16: boolean): string {
  const txt = readFileSync(ruta, utf16 ? 'utf16le' : 'utf8');
  return txt.replace(/^﻿/, ''); // quita BOM
}

/** Divide un script en lotes por líneas 'GO'. */
function lotes(script: string): string[] {
  return script
    .split(/^\s*GO\s*$/gim)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function ejecutarScript(
  pool: sql.ConnectionPool,
  script: string,
  onProgreso?: (hecho: number, total: number) => void,
): Promise<string[]> {
  const batches = lotes(script);
  const errores: string[] = [];
  for (let i = 0; i < batches.length; i++) {
    const b = batches[i];
    // El CREATE DATABASE del script trae una ruta fija de archivo; la base ya la
    // creamos nosotros con rutas por defecto, así que saltamos ese lote.
    if (/\bCREATE\s+DATABASE\b/i.test(b)) continue;
    try {
      await pool.request().batch(b);
    } catch (e) {
      errores.push(`Lote ${i + 1}: ${(e as Error).message}`);
    }
    onProgreso?.(i + 1, batches.length);
  }
  return errores;
}

async function existeObjeto(
  pool: sql.ConnectionPool,
  nombre: string,
): Promise<boolean> {
  const r = await pool
    .request()
    .query(`SELECT OBJECT_ID('${nombre}') AS id`);
  return r.recordset[0]?.id != null;
}

/**
 * Instalación del equipo Principal (modo local).
 * Devuelve la config guardada (con instalado=true).
 */
export async function instalarPrincipal(params: {
  sql: DatosSql;
  empresa: DatosEmpresa;
  admin: DatosAdmin;
  puerto?: number;
  onProgreso?: (etapa: string, hecho?: number, total?: number) => void;
}): Promise<AppConfig> {
  const { sql: ds, empresa, admin } = params;
  const puerto = params.puerto ?? 3000;
  const prog = params.onProgreso ?? (() => undefined);

  // 1) Crear la base (rutas por defecto) si no existe.
  prog('Conectando a SQL Server…');
  let master = await new sql.ConnectionPool(conf(ds, 'master')).connect();
  try {
    prog('Creando la base de datos…');
    await master
      .request()
      .batch(`IF DB_ID('${DB}') IS NULL CREATE DATABASE [${DB}]`);
  } finally {
    await master.close().catch(() => undefined);
  }

  // 2) Ejecutar el esquema + procedimientos sobre la base.
  const pool = await new sql.ConnectionPool(conf(ds, DB)).connect();
  try {
    const rScript = rutaSql('script.sql', [
      join(__dirname, '../../../../../script.sql'), // dev: apps/caja/out/main -> repo root
      join(__dirname, '../../../../script.sql'),
      join(process.cwd(), '../../script.sql'),
      join(process.cwd(), '../script.sql'),
      join(process.cwd(), 'script.sql'),
    ]);
    if (!rScript) throw new Error('No se encontró script.sql para crear el esquema.');
    prog('Creando tablas y procedimientos…');
    const errScript = await ejecutarScript(
      pool,
      leerSql(rScript, true),
      (h, t) => prog('Creando tablas y procedimientos…', h, t),
    );

    // Tabla de configuración del POS moderno (clave/valor).
    const rAppCfg = rutaSql('appconfig.sql', [
      join(__dirname, '../../../db/appconfig.sql'),
      join(process.cwd(), 'db/appconfig.sql'),
    ]);
    if (rAppCfg) await ejecutarScript(pool, leerSql(rAppCfg, false));

    // El script termina con `USE [master]`; volvemos al contexto de la base
    // para que la verificación y los INSERT caigan en BASEADACURSO.
    await pool.request().batch(`USE [${DB}]`);

    // Verificar que los objetos clave existan (si no, el script falló de verdad).
    prog('Verificando esquema…');
    const faltan: string[] = [];
    for (const obj of ['Producto1', 'USUARIO2', 'EMPRESA', 'validar_usuario']) {
      if (!(await existeObjeto(pool, `dbo.${obj}`))) faltan.push(obj);
    }
    if (faltan.length) {
      throw new Error(
        `El esquema no se creó correctamente (faltan: ${faltan.join(', ')}). ` +
          (errScript[0] ? `Primer error: ${errScript[0]}` : ''),
      );
    }

    // 3) Datos base: empresa, caja y usuario administrador (idempotente).
    prog('Registrando empresa y usuario…');
    await pool
      .request()
      .input('nombre', sql.VarChar(50), empresa.nombre)
      .input('pais', sql.VarChar(sql.MAX), empresa.pais)
      .input('moneda', sql.VarChar(50), empresa.moneda)
      .input('conImp', sql.VarChar(50), empresa.conImpuestos ? 'SI' : 'NO')
      .input('pct', sql.Decimal(18, 0), empresa.porcentajeImpuesto ?? 0)
      .input('modo', sql.VarChar(50), empresa.modoBusqueda)
      .input('carpeta', sql.VarChar(sql.MAX), empresa.carpetaCopias ?? '')
      .input('correo', sql.VarChar(50), empresa.correoCierre ?? '')
      .query(
        `IF NOT EXISTS (SELECT 1 FROM EMPRESA)
         INSERT INTO EMPRESA
           (Nombre_Empresa, Impuesto, Porcentaje_impuesto, Moneda,
            Trabajas_con_impuestos, Modo_de_busqueda, Carpeta_para_copias_de_seguridad,
            Correo_para_envio_de_reportes, Estado, Pais)
         VALUES
           (@nombre, 'IVA', @pct, @moneda, @conImp, @modo, @carpeta, @correo, 'ACTIVO', @pais)`,
      );

    await pool
      .request()
      .input('desc', sql.VarChar(50), empresa.nombreCaja)
      .query(
        `IF NOT EXISTS (SELECT 1 FROM Caja)
         INSERT INTO Caja (Descripcion, Estado, Tipo) VALUES (@desc, 'ACTIVO', 'PRINCIPAL')`,
      );

    await pool
      .request()
      .input('nombre', sql.VarChar(50), admin.nombre || 'Administrador')
      .input('pass', sql.VarChar(50), admin.password)
      .query(
        `IF NOT EXISTS (SELECT 1 FROM USUARIO2 WHERE Login='admin')
         INSERT INTO USUARIO2 (Nombres_y_Apellidos, Login, Password, Correo, Rol, Estado)
         VALUES (@nombre, 'admin', @pass, '', 'Administrador', 'ACTIVO')`,
      );
  } finally {
    await pool.close().catch(() => undefined);
  }

  // 4) Guardar configuración local.
  prog('Guardando configuración…');
  const databaseUrl =
    `sqlserver://${ds.host}:${ds.port};database=${DB};user=${ds.user};` +
    `password=${ds.password};encrypt=true;trustServerCertificate=true`;
  return guardarConfig({
    modo: 'local',
    apiUrl: `http://localhost:${puerto}`,
    puerto,
    databaseUrl,
    jwtSecret: randomBytes(24).toString('hex'),
    instalado: true,
  });
}

/** Instalación de equipo Secundario: solo apunta a la API del Principal. */
export function instalarSecundaria(apiUrl: string): AppConfig {
  return guardarConfig({
    modo: 'servidor',
    apiUrl: apiUrl.replace(/\/+$/, ''),
    instalado: true,
  });
}
