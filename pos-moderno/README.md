# POS Moderno — Monorepo

Reescritura del POS **PowSellEver** (antes WinForms / .NET Framework 4.8) a un stack
moderno, híbrido escritorio + web, en TypeScript. Ver `../MIGRACION.md` para el plan completo.

## Requisitos

- **Node.js 20+** y npm 10+
  (en este equipo está instalado vía Homebrew como *keg-only*; añade al PATH:
  `export PATH="/opt/homebrew/opt/node@20/bin:$PATH"`)
- Acceso a una instancia de **SQL Server** con la base de datos del POS
  (el esquema actual está en `../script.sql`).

## Estructura

```
apps/
  api/     NestJS + Prisma        → lógica de negocio sobre SQL Server
  caja/    Electron + React       → TODOS los módulos (ventas offline, inventario, compras,
                                     productos, proveedores, clientes, cobros, movimientos,
                                     usuarios, reportes, empresa, comprobantes, ticket, correo)
                                     + balanza/impresora. Pantalla de venta estilo POS con
                                     búsqueda por LECTORA de código de barras y por TECLADO,
                                     teclado numérico (cantidad/precio/descuento) y COBRAR.
  web/     Next.js + React        → back-office: dashboard, productos, inventario, compras,
                                     proveedores, clientes, movimientos, usuarios, reportes, empresa
packages/
  types/   contratos TypeScript compartidos (API ↔ apps)
  core/    (pendiente) reglas de negocio puras
  ui/      (pendiente) componentes React compartidos
```

## Puesta en marcha (Fase 0)

```bash
cd pos-moderno
npm install

# API
cd apps/api
cp .env.example .env            # edita DATABASE_URL con tu SQL Server
npx prisma db pull              # introspecta tu BD real (recomendado)
npx prisma generate
npm run start:dev               # http://localhost:3000
```

Endpoints:

- `GET  /health`
- `POST /auth/login` — login (SP `validar_usuario`) + JWT
- `POST /caja/apertura` · `GET /caja/:idCaja/turno-abierto` · `POST /caja/cierre`
- `GET|POST /productos`, `GET|PATCH|DELETE /productos/:id`
- `POST /ventas` — **registro transaccional de una venta completa**
- `GET|POST /proveedores`
- `GET|POST /compras` — **registro transaccional de una compra** (entrada de inventario)
- `GET /inventario` · `GET /inventario/bajo-minimo` · `GET /inventario/:idProducto/kardex`
- `POST /inventario/ajuste` — ajuste manual de stock (entrada/salida con kardex)
- `GET /reportes/ventas` (JSON) · `GET /reportes/ventas.xlsx` (Excel/ExcelJS) · `GET /reportes/ventas.pdf` (PDF/pdfkit)
- **Todos los endpoints requieren `Authorization: Bearer <JWT>`** salvo `/health` y `/auth/login`.
- `GET|POST /usuarios`, `PATCH|DELETE /usuarios/:id` — gestión de usuarios (baja lógica)
- `GET /empresa` · `PUT /empresa/:id` — configuración de la empresa
- `GET|POST /clientes`, `PATCH|DELETE /clientes/:id` — clientes (baja lógica, GENERICO protegido)
- `GET|POST /conceptos` · `GET|POST /gastos` · `GET|POST /ingresos` — movimientos de caja
- `GET|POST /cobros` — abonos de clientes a crédito (descuenta saldo, transaccional)
- `GET /caja/:idCaja/arqueo` — efectivo esperado del turno (inicial + ventas + ingresos − gastos)
- `GET|POST|PATCH|DELETE /serializacion` — series de comprobantes
- `GET|PUT /ticket` — plantilla del comprobante impreso
- `GET|PUT /correo` + `POST /correo/enviar-reporte` — config y envío de reportes por email (nodemailer)

### Proceso SQL de una venta (Fase 1)

`POST /ventas` reutiliza los stored procedures existentes dentro de UNA transacción
(si algo falla, no se registra nada):

```
insertar_venta  →  (SELECT MAX idventa)  →  insertar_detalle_venta  (por línea)
                →  insertar_KARDEX_SALIDA + disminuir_stock  (si usa inventario)
                →  Confirmar_venta
```

En la **caja** el proceso es offline-first:

1. La venta se guarda primero en SQLite local (`venta_pendiente`) — nunca se bloquea
   por falta de internet.
2. Un servicio de sincronización hace `POST /ventas` cuando hay conexión y marca cada
   venta como `sincronizada` (con su id remoto) o `error` (reintentable).
3. Corre automáticamente al arrancar y cada 30 s, o manualmente con "Sincronizar ahora".

### App de caja (Electron + React)

```bash
cd apps/caja
npm run dev      # abre la ventana del POS (requiere la API corriendo)
npm run build    # compila main + preload + renderer

# serialport y better-sqlite3 son módulos nativos: reconstruye los bindings
# para Electron una sola vez antes de usar balanza/offline reales.
# Prerrequisito (macOS): el toolchain activo debe ser el Command Line Tools
# (clang moderno), si no la compilación falla con '__builtin_ctzg undeclared':
sudo xcode-select --switch /Library/Developer/CommandLineTools
# OJO: un solo -w con módulos separados por COMA (no dos flags -w):
npx electron-rebuild -f -w serialport,better-sqlite3
```

La pantalla de Ventas consume `GET /productos` de la API, calcula el total, lee el
peso desde la balanza (IPC → puerto serial) e imprime el ticket ESC/POS (IPC → red/serial).

### App web de back-office (Next.js)

```bash
cd apps/web
npm run dev      # http://localhost:3001  (requiere la API en :3000)
npm run build    # compila las 4 rutas
```

Páginas: **Dashboard**, **Productos** (alta/baja), **Inventario** (tabla + ajuste de stock),
**Compras** (registrar + historial), **Proveedores** (alta), **Usuarios** (alta/baja),
**Reportes** (Excel/PDF) y **Empresa** (configuración). Login con JWT. Consume la misma API
que la caja (CORS habilitado).

## Cómo probar el avance

### Nivel 1 — Smoke test SIN base de datos (rápido)
Verifica que la API levanta y que validación/ruteo funcionan (la BD dará error, es lo esperado).
```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
cd apps/api && node dist/main.js          # o: npm run start:dev
# en otra terminal:
curl -s localhost:3000/health                                   # {"status":"ok","db":"error"}
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/auth/login \
  -H "Content-Type: application/json" -d '{}'                   # 400 (validación)
```

### Nivel 2 — Prueba END-TO-END con SQL Server (receta verificada)

> La BD del `script.sql` se llama **`BASEADACURSO`** y su preámbulo (CREATE DATABASE con
> rutas de Windows + full-text) NO corre en Linux: por eso se crea la BD a mano y se carga
> el script a partir de la línea 78. El contenedor `azure-sql-edge` usa un certificado cuyo
> serial rompe a `sqlcmd` (Go): se conecta con `-N disable`. La API (Prisma/openssl) sí
> conecta, con `trustServerCertificate=true`.

**1. Levantar SQL Server** (Docker, Apple Silicon):
```bash
docker run -e 'ACCEPT_EULA=1' -e 'MSSQL_SA_PASSWORD=Ksks575dc26#' \
  -p 1433:1433 -d --name pos-sql mcr.microsoft.com/azure-sql-edge
brew install sqlcmd     # cliente para cargar el esquema
```

**2. Crear la BD y cargar el esquema** (sin el preámbulo incompatible):
```bash
iconv -f UTF-16 -t UTF-8 ../../script.sql > /tmp/script_utf8.sql
tail -n +78 /tmp/script_utf8.sql > /tmp/pos_clean.sql          # desde USE [BASEADACURSO]
SQL="sqlcmd -S localhost,1433 -U sa -P Ksks575dc26# -N disable"
$SQL -Q "IF DB_ID('BASEADACURSO') IS NULL CREATE DATABASE [BASEADACURSO];"
$SQL -d BASEADACURSO -i /tmp/pos_clean.sql     # 24 tablas + 179 SPs (ignora 2 avisos de 'pruebas2020')
```

**3. Datos de prueba** (usuario, caja, cliente genérico y productos):
```sql
SET IDENTITY_INSERT Caja ON;
INSERT INTO Caja (Id_Caja,Descripcion,Estado,Tipo) VALUES (1,'Caja Principal','ACTIVO','PRINCIPAL');
SET IDENTITY_INSERT Caja OFF;
INSERT INTO USUARIO2 (Nombres_y_Apellidos,Login,Password,Rol,Estado) VALUES ('Admin','admin','1234','Admin','ACTIVO');
INSERT INTO clientes (Nombre,Estado,Saldo) VALUES ('GENERICO','ACTIVO',0);   -- ventas al público
INSERT INTO Grupo_de_Productos (Linea,Por_defecto) VALUES ('GENERAL','SI');
INSERT INTO Producto1 (Descripcion,Codigo,Id_grupo,Usa_inventarios,Stock,Precio_de_compra,Precio_de_venta,Impuesto,Stock_minimo,Se_vende_a)
  VALUES ('Coca Cola 600ml','7501',1,'SI','100',10,15,'0',5,'UNIDAD');
```

**4. Configurar y arrancar la API:**
```bash
cd apps/api      # apps/api/.env ya tiene DATABASE_URL -> database=BASEADACURSO;...;trustServerCertificate=true
npx prisma generate && npm run start:dev
curl -s localhost:3000/health    # {"status":"ok","db":"ok"}
```

**5. Probar el flujo por API (curl)** — resultado real verificado entre paréntesis:
```bash
curl -s -X POST localhost:3000/auth/login -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"1234"}'                       # (usuario + JWT)
curl -s -X POST localhost:3000/caja/apertura -H "Content-Type: application/json" \
  -d '{"idCaja":1,"idUsuario":1,"saldoInicial":100}'             # ({"abierto":true})
curl -s localhost:3000/caja/1/turno-abierto                      # (saldoInicial:100)
curl -s -X POST localhost:3000/ventas -H "Content-Type: application/json" -d '{
  "idCaja":1,"idUsuario":1,"tipoPago":"Efectivo","numeroDeDoc":"T-1001",
  "montoTotal":30,"efectivo":30,"pagoCon":50,"vuelto":20,
  "lineas":[{"idProducto":1,"descripcion":"Coca Cola 600ml","codigo":"7501",
             "cantidad":2,"precioUnitario":15,"costo":10,"usaInventarios":"SI"}]}'  # ({"idVenta":n})
curl -s -X POST localhost:3000/caja/cierre -H "Content-Type: application/json" \
  -d '{"idCaja":1,"idUsuario":1,"ingresos":30,"egresos":0,"saldoQuedaEnCaja":130,"totalCalculado":130,"totalReal":130,"diferencia":0}'
```
Tras la venta, en SQL: `Producto1.Stock` 100→98, fila en `ventas` (estado PAGADO), `detalle_venta`
(computadas `Total_a_pagar`/`Ganancia`), `KARDEX` SALIDA; y tras el cierre `MOVIMIENTOCAJACIERRE` = `CAJA CERRADA`.
Si no mandas `idCliente`, la API usa automáticamente el cliente `GENERICO`.

**6. Probar la app de caja (UI):**
```bash
cd apps/caja
sudo xcode-select --switch /Library/Developer/CommandLineTools   # toolchain correcto
npx electron-rebuild -f -w serialport,better-sqlite3             # una sola vez
npm run dev
```
Login (`admin`/`1234`) → Abrir caja → Agregar producto → **Cobrar e imprimir** → se registra la venta y baja a 0 el contador de pendientes.

**7. Probar OFFLINE (lo más importante del POS):**
Con la app abierta, **detén la API** (Ctrl-C) y haz una venta: queda guardada y el contador "Pendientes" sube. Vuelve a levantar la API y pulsa **Sincronizar ahora** (o espera 30 s): el contador baja a 0 y la venta aparece en SQL Server.

## Instalación en Windows (instalador .exe)

La caja se distribuye como un instalador **NSIS** (`PSE-Caja-Setup-<version>.exe`).
Un mismo ejecutable funciona en dos modos (editable en `config.json`, ver abajo):

- **local** (por defecto): la app **lleva la API NestJS embebida** y la levanta
  sola usando el Node que trae Electron (no hace falta instalar Node). Ideal para
  el equipo que tiene al lado el SQL Server.
- **servidor**: la app no levanta nada; solo consume una API ya desplegada en la
  red (`apiUrl`). Ideal para cajas secundarias que apuntan al servidor central.

### 1. Base de datos — SQL Server Express

Los datos viven en **SQL Server** (igual que el sistema WinForms original). En el
equipo servidor:

1. Instala **SQL Server 2022 Express** (gratis) y, opcional, **SSMS** (SQL Server
   Management Studio) para administrarlo.
2. Durante la instalación habilita **autenticación mixta** (SQL + Windows) y define
   la contraseña del usuario `sa`. En *SQL Server Configuration Manager* habilita
   **TCP/IP** y deja el puerto **1433** (reinicia el servicio al terminar).
3. Crea la base y carga el esquema + procedimientos almacenados y la tabla nueva de
   configuración. Desde `cmd` (ajusta `-S` al nombre de tu instancia, p. ej.
   `localhost\SQLEXPRESS`):

   ```bat
   sqlcmd -S localhost\SQLEXPRESS -U sa -P TU_PASSWORD -Q "CREATE DATABASE BASEADACURSO"
   sqlcmd -S localhost\SQLEXPRESS -U sa -P TU_PASSWORD -d BASEADACURSO -i script.sql
   sqlcmd -S localhost\SQLEXPRESS -U sa -P TU_PASSWORD -d BASEADACURSO -i pos-moderno\db\appconfig.sql
   ```

   - `script.sql` (raíz del repo) = tablas + los 178 procedimientos almacenados.
   - `appconfig.sql` = tabla `AppConfig` (clave/valor) que usa el POS moderno.
   - Si ya tienes datos, restaura tu `.bak` en su lugar y solo corre `appconfig.sql`.

### 2. Generar el instalador (.exe)

> El `.exe` **debe compilarse en Windows**: incluye módulos nativos
> (`better-sqlite3`, `serialport`) y el *query engine* de Prisma, específicos del SO.
> No se puede generar desde macOS/Linux.

- **Automático (recomendado):** el workflow `.github/workflows/build-caja-win.yml`
  compila en `windows-latest` y publica el instalador como artefacto. Dispáralo
  manualmente (*Actions → Build instalador PSE Caja (Windows) → Run workflow*) o
  empujando un tag `vX.Y.Z`. Descarga el `.exe` desde *Artifacts*.
- **Manual en un Windows:**

  ```bat
  cd pos-moderno
  npm ci
  npm run build -w @pos/types
  npm run build -w @pos/api
  npm run prisma:generate -w @pos/api
  cd apps\caja
  npm run dist:win
  ```

  El instalador queda en `pos-moderno\apps\caja\release\`. El paso `dist:win`
  ejecuta `scripts/empaquetar-api.mjs`, que arma una copia **autónoma** de la API
  (con su propio `node_modules` de producción y el cliente de Prisma) y la empaqueta
  en `resources\api\` dentro de la app.

### 3. Instalar y configurar en el equipo

1. Ejecuta `PSE-Caja-Setup-<version>.exe` y sigue el asistente (crea acceso directo
   "PSE Caja").
2. Abre la app una vez; se crea el archivo de configuración en:

   ```
   %APPDATA%\PSE Caja\config.json
   ```

3. Edita ese `config.json` según el modo del equipo y reinicia la app:

   ```jsonc
   // Equipo con la API embebida + SQL local
   {
     "modo": "local",
     "apiUrl": "http://localhost:3000",
     "puerto": 3000,
     "databaseUrl": "sqlserver://localhost:1433;database=BASEADACURSO;user=sa;password=TU_PASSWORD;encrypt=true;trustServerCertificate=true",
     "jwtSecret": "pon-un-secreto-largo-y-unico"
   }
   ```

   ```jsonc
   // Caja secundaria que apunta al servidor central
   {
     "modo": "servidor",
     "apiUrl": "http://IP-DEL-SERVIDOR:3000"
   }
   ```

   > `jwtSecret` debe ser **el mismo** en todos los equipos que comparten la API.
   > No subas contraseñas reales al repositorio.

## Estado

- [x] Fase 0: monorepo + API + esquema Prisma (24 tablas) + slice Productos
- [x] Fase 1 COMPLETA: login/usuarios (JWT), apertura/cierre de caja, ventas +
      balanza/impresora + **proceso SQL de venta** (API transaccional sobre SPs) +
      **offline** (SQLite + cola de sincronización)
- [x] Fase 2 COMPLETA: proveedores, **compra transaccional** (cabecera + detalle +
      kardex entrada + stock sobre SPs), inventario, inventario bajo mínimo,
      consulta de kardex por producto y **ajuste manual** de stock (entrada/salida)
- [x] UI de caja ampliada: pestañas Ventas / Inventario / Compras
- [x] Fase 3 COMPLETA: **app web Next.js** con **login (JWT)**, dashboard,
      inventario (+ajuste), compras (+alta), proveedores (+alta) y **reportes**
      (tabla + resumen, **exportación Excel real** e impresión/PDF)
- [~] Fase 4 (en curso): migración gradual de SPs a lógica nativa TypeScript/Prisma,
      cada flujo conmutable por flag y con **paridad verificada** en BD real:
      - `INVENTARIO_NATIVO` — movimientos de inventario (kardex + stock)
      - `VENTAS_NATIVO` — flujo de venta completo (cabecera + detalle + inventario)
      - `COMPRAS_NATIVO` — flujo de compra completo (+ numeración de comprobante serie 'TC')
      - `AUTH_NATIVO` — login (`validar_usuario`)
      - `CAJA_NATIVO` — apertura/cierre de turno (MOVIMIENTOCAJACIERRE)
      Cubre ~14 SPs. La lógica de inventario vive en `src/common/movimientos-inventario.ts`.
- [x] Módulos adicionales: clientes, conceptos, gastos/ingresos, **cobros** (abono con
      descuento de saldo) y **arqueo de caja** (efectivo esperado del turno).
- [x] Seguridad: **guard JWT global** (API) + envío de token en web y caja (incl. sync offline)
- [x] Reportes **PDF server-side** (pdfkit) además de Excel
- [x] Comprobantes (series), **Ticket** (plantilla impresa) y **Correo** (config + envío
      de reportes PDF por email con nodemailer). Disponibles en web y en la caja.
- [x] **Instalador Windows**: `.exe` NSIS con **API embebida** (modo local/servidor
      por `config.json`), empaquetado autónomo de la API (`scripts/empaquetar-api.mjs`)
      y **CI en Windows** (`.github/workflows/build-caja-win.yml`). Datos en SQL Server
      Express (ver "Instalación en Windows").
- [ ] Fase 4 (resto): migrar SPs restantes, pruebas automatizadas
