/**
 * Utilidades para la foto del usuario (columna USUARIO2.Icono, tipo IMAGE).
 * El frontend envía/recibe la imagen como data URL (base64); en la BD se guarda
 * el binario en `Icono` y el mime en `Nombre_de_icono`.
 */

/** Convierte un data URL (`data:image/png;base64,...`) a binario + mime. */
export function fotoABuffer(
  dataUrl?: string | null,
): { buffer: Buffer; mime: string } | null {
  if (!dataUrl) return null;
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) return null;
  return { buffer: Buffer.from(m[2], 'base64'), mime: m[1] };
}

/** Convierte el binario de la BD a un data URL que el navegador pueda mostrar. */
export function bufferAFoto(
  icono: unknown,
  mime?: string | null,
): string | null {
  if (!icono) return null;
  const buf = Buffer.isBuffer(icono)
    ? icono
    : Buffer.from(icono as Uint8Array);
  if (buf.length === 0) return null;
  // Si lo guardado en Nombre_de_icono no es un mime válido, usamos jpeg por defecto.
  const tipo = mime && mime.startsWith('image/') ? mime : 'image/jpeg';
  return `data:${tipo};base64,${buf.toString('base64')}`;
}
