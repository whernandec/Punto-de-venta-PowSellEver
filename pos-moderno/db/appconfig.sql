-- Tabla de configuración genérica clave/valor (usada por Terminal Mercado Pago, etc.)
-- Ejecutar una vez contra la base del POS.
IF OBJECT_ID('dbo.AppConfig','U') IS NULL
CREATE TABLE dbo.AppConfig (
  clave varchar(100) NOT NULL PRIMARY KEY,
  valor varchar(max) NULL
);
