# Propuesta de Migración — POS PowSellEver

> Documento técnico de migración del Punto de Venta de **WinForms / .NET Framework 4.8**
> a una arquitectura **moderna, híbrida (escritorio + web)** en **TypeScript**.
>
> Fecha: 2026-10-07 · Estado: Propuesta aprobada para reescritura completa.

---

## 1. Resumen ejecutivo

El sistema actual es un POS de escritorio sólido funcionalmente pero atado tecnológicamente:
solo corre en Windows, usa WinForms (en mantenimiento por Microsoft), un antipatrón de
conexión única estática a SQL Server, y componentes comerciales (Telerik) con licencia.

Se migrará a un **monorepo TypeScript** con:

- **App de caja** (Electron + React): hardware local, operación offline.
- **App web** (Next.js + React): back-office, reportes, multi-sucursal.
- **API** (NestJS + Prisma): lógica de negocio centralizada sobre SQL Server.

Decisión clave de riesgo: **se conserva SQL Server y sus 178 stored procedures** y se
reemplazan de forma gradual; la reescritura aplica a aplicación y UI, no a la base de datos.

---

## 2. Estado actual (análisis)

| Aspecto | Detalle |
|---|---|
| UI | Windows Forms, 29 módulos |
| Framework | .NET Framework 4.8 (`WinExe`, solo Windows) |
| Código | C#, ~63,400 líneas, 176 archivos `.cs` |
| Arquitectura | 3 capas: `Datos` / `Logica` / `Presentacion` + utilidades `CONEXION` |
| Acceso a datos | ADO.NET crudo (`SqlCommand`, ~321 usos) |
| Antipatrón | `SqlConnection` **estática compartida** en `CONEXIONMAESTRA` |
| Base de datos | SQL Server — **24 tablas**, **178 stored procedures** |
| Reportes | Telerik Reporting 13 (WinForms) — comercial |
| Hardware | Balanza electrónica (serial), impresora de tickets, escáner |
| Export | Excel (DocumentFormat.OpenXml / SpreadsheetLight) |
| Seguridad | Cadena de conexión encriptada (`Encryptacion`/`Desencryptacion`) |

### Fortalezas a aprovechar
- La separación en capas facilita el mapeo 1:1 hacia servicios/repositorios en NestJS.
- La lógica compleja ya vive en stored procedures → reutilizable desde el primer día.

### Debilidades a corregir en la migración
- `SqlConnection` estática → *connection pooling* vía Prisma.
- Contraseñas en texto (`USUARIO2.Password varchar(50)`) → **hash bcrypt/argon2**.
- Lógica de negocio mezclada en formularios → mover a la capa `core`/servicios.
- Dependencia de licencias comerciales (Telerik) → generación de PDF open-source.

---

## 3. Arquitectura objetivo

```
pos-moderno/                      ← monorepo (Turborepo)
├─ apps/
│  ├─ caja/     Electron + React  → hardware local, offline (SQLite + cola de sync)
│  ├─ web/      Next.js + React   → back-office, reportes, multi-sucursal
│  └─ api/      NestJS + Prisma   → lógica de negocio + SQL Server
├─ packages/
│  ├─ ui/       componentes React compartidos (caja + web)
│  ├─ core/     reglas de negocio puras (cálculo de totales, IGV, kardex…)
│  └─ types/    contratos/DTOs TypeScript compartidos (API ↔ apps)
└─ db/          esquema + 178 stored procedures + migraciones
```

### Correspondencia de capas (viejo → nuevo)

| Actual (C#) | Nuevo (TypeScript) |
|---|---|
| `Presentacion/*` (WinForms) | `apps/caja` + `apps/web` (React) |
| `Logica/*` | `apps/api/src/<modulo>/*.service.ts` + `packages/core` |
| `Datos/*` (ADO.NET) | `apps/api/src/<modulo>/*.repository.ts` (Prisma) |
| `CONEXION/CONEXIONMAESTRA` | `apps/api/src/prisma/prisma.service.ts` (pooling, DI) |
| `CONEXION/Encryptacion` | Auth JWT + `bcrypt` (secretos vía variables de entorno) |
| Telerik Reporting | PDF con React-pdf / Puppeteer; export con ExcelJS |

---

## 4. Stack tecnológico

| Capa | Tecnología | Alternativa |
|---|---|---|
| UI compartida | React + TypeScript | — |
| App caja (escritorio) | Electron | Tauri (más ligero; serial vía plugin Rust) |
| App web | Next.js | Vite + React Router |
| Backend | NestJS | Fastify |
| ORM | Prisma (connector SQL Server) | Drizzle / Dapper-like con `mssql` |
| Base de datos | SQL Server (se conserva) | — |
| Offline (caja) | SQLite + cola de sincronización | — |
| Hardware | `serialport` (balanza), `node-thermal-printer`/`escpos` (tickets), `node-hid` (escáner) | — |
| Reportes PDF | React-pdf / Puppeteer | — |
| Export Excel | ExcelJS | — |
| Gráficas | Recharts | — |
| Monorepo | Turborepo | Nx / pnpm workspaces |
| Auth | JWT + bcrypt | — |

---

## 5. Base de datos — 24 tablas

| Tabla | PK | Rol | Notas de migración |
|---|---|---|---|
| `Caja` | Id_Caja | Terminal/caja física | Guarda puerto de balanza e impresoras |
| `clientes` | idclientev | Clientes | `Saldo` para crédito |
| `Proveedores` | IdProveedor | Proveedores | `Saldo` por pagar |
| `Producto1` | Id_Producto1 | Catálogo de productos | Columnas **computadas** `Sub_total_pv`, `Sub_total_pm` |
| `Grupo_de_Productos` | Idline | Líneas/categorías | |
| `ventas` | idventa | Cabecera de venta | Efectivo/Tarjeta/Crédito, IGV, vuelto |
| `detalle_venta` | iddetalle_venta | Líneas de venta | Columnas **computadas** `Total_a_pagar`, `Ganancia` |
| `Compras` | Idcompra | Cabecera de compra | |
| `DetalleCompra` | IdDetallecompra | Líneas de compra | Columna **computada** `Total` |
| `KARDEX` | Id_kardex | Movimientos de inventario | Columna **computada** `Total`; entradas/salidas |
| `Caja` / `MOVIMIENTOCAJACIERRE` | idcierrecaja | Cierre/arqueo de caja | |
| `CreditoPorCobrar` | Id_credito | Cuentas por cobrar | |
| `CreditoPorPagar` | Id_credito | Cuentas por pagar | |
| `ControlCobros` | IdcontrolCobro | Cobros a clientes | |
| `Gastos_varios` | Id_gasto | Egresos | FK a `Conceptos` |
| `Ingresos_varios` | Id_ingreso | Ingresos | |
| `Conceptos` | Id_concepto | Catálogo de conceptos | |
| `EMPRESA` | Id_empresa | Configuración de empresa | `Logo image` → mover a almacenamiento de archivos |
| `Ticket` | Id_ticket | Plantilla de ticket | |
| `Serializacion` | Id_serializacion | Series de comprobantes | |
| `USUARIO2` | idUsuario | Usuarios/roles | `Password` texto → **hash**; `Icono image` → archivo |
| `Inicios_de_sesion_por_caja` | Id_inicio_sesion | Sesiones por caja | |
| `CorreoBase` | IdCorreo | Config. de correo saliente | `Password` → secreto |
| `Marcan` | Id_marca | Licencias/activación | |

> **Columnas computadas:** SQL Server las calcula automáticamente. En Prisma se leen pero
> **no se escriben**. Recomendado introspectar con `prisma db pull` contra la BD real.
>
> **Campos `image`** (`EMPRESA.Logo`, `USUARIO2.Icono`): migrar a almacenamiento de archivos
> (disco/objeto) guardando solo la ruta/URL.

### Estrategia para los 178 stored procedures
1. **Fase inicial:** la API los invoca tal cual con `prisma.$queryRaw` / `$executeRaw`.
2. **Gradual:** cada SP se reescribe como servicio TypeScript **solo cuando** su módulo se
   reconstruye, con pruebas que comparan el resultado viejo vs. nuevo.
3. Nunca reescribir los 178 de golpe: es el mayor riesgo del proyecto.

---

## 6. Módulos (29 formularios → nueva app)

| Módulo actual | Destino | App |
|---|---|---|
| LOGIN, USUARIOS_Y_PERMISOS | Auth + gestión de usuarios/roles | caja + web |
| VENTAS_MENU_PRINCIPAL | Punto de venta | **caja** |
| CAJA, Cobros | Apertura/cierre de caja, cobros | caja |
| PRODUCTOS_OK | Catálogo de productos | web + caja |
| INVENTARIOS_KARDEX | Inventario / Kardex | web + caja |
| Compras | Compras a proveedores | web |
| CLIENTES_PROVEEDORES | Clientes y proveedores | web |
| Apertura_de_credito | Créditos por cobrar/pagar | web |
| Gastos_varios, Ingresos_varios | Movimientos de efectivo | caja + web |
| HistorialVentas | Historial / consultas | web |
| REPORTES | Reportes (PDF/Excel) | web |
| EMPRESA_CONFIGURACION, CONFIGURACION | Configuración | web |
| DISEÑADOR_DE_COMPROBANTES, SERIALIZACION_DE_COMPROBANTES | Comprobantes y series | web |
| Impresoras, BalanzaElectronica | Integración de hardware | **caja** |
| CorreoBase, NOTIFICACIONES | Correo / notificaciones | api + web |
| CopiasBd, Conexion_remota | Respaldos / conexión | infraestructura |
| LICENCIAS_MENBRESIAS, PANEL_DE_ADMINISTRACION_DEL_SOFTWARE, Admin_nivel_dios | Licenciamiento / admin | web |
| ASISTENTE_DE_INSTALACION_servidor | Onboarding/instalación | instalador |

---

## 7. Hoja de ruta

| Fase | Contenido | Entregable |
|---|---|---|
| **0 — Fundaciones** | Monorepo, API NestJS + Prisma sobre SQL Server, esquema introspectado, auth JWT | API ejecutable con Productos (slice vertical) |
| **1 — Núcleo POS** | Electron, Ventas, Caja, balanza/impresora, offline | Caja funcional |
| **2 — Inventario y compras** | Kardex, Compras, Clientes/Proveedores | Back-office operativo |
| **3 — Web back-office** | Reportes (PDF/Excel), administración, multi-sucursal | App web completa |
| **4 — Retiro del legado** | Reescritura gradual de SPs, pruebas comparativas, apagado del sistema viejo | Migración concluida |

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Reescritura completa paraliza el negocio | Liberar por módulos; correr en paralelo con el viejo |
| 178 SPs difíciles de replicar | Conservarlos y migrar gradualmente con pruebas |
| Hardware no soportado en web | La caja es Electron (acceso nativo a serial/USB) |
| Pérdida de datos en corte de internet | SQLite local + cola de sincronización en la caja |
| Contraseñas en texto plano | Hash con bcrypt durante la migración de datos |

---

## 9. Primer paso ejecutable

La **Fase 0** ya está iniciada en `pos-moderno/` (ver `pos-moderno/README.md`):
monorepo + API NestJS + esquema Prisma de las 24 tablas + un *slice* vertical de Productos
que demuestra el patrón Controller → Service → Repository → Prisma.

**Requisito:** instalar Node.js 20+ y luego `cd pos-moderno && npm install`.
