import ffmpegStaticPath from 'ffmpeg-static';
import os from 'os';
import path from 'path';
import fsSync from 'fs';

// ffmpeg-static calcula su ruta al binario usando el directorio donde se
// instaló el paquete — en Vercel eso pasa durante el build (ej.
// /ROOT/node_modules/...), pero la función corre después desde otra
// carpeta (/var/task/...), así que hay que recalcularla contra el
// directorio real. Además esa carpeta es de solo lectura en producción,
// así que el binario hay que copiarlo a /tmp (lo único con permiso de
// escritura) y darle ahí el permiso de ejecución antes de poder correrlo.
// Compartido entre las rutas de conversión de audio de WhatsApp e Instagram.
export function resolveFfmpegPath(): string {
  const source = ffmpegStaticPath && fsSync.existsSync(ffmpegStaticPath)
    ? ffmpegStaticPath
    : path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
  if (!fsSync.existsSync(source)) throw new Error('No se encontró el binario de ffmpeg en el paquete');

  const runnablePath = path.join(os.tmpdir(), 'ffmpeg-liderium');
  if (!fsSync.existsSync(runnablePath)) {
    fsSync.copyFileSync(source, runnablePath);
  }
  fsSync.chmodSync(runnablePath, 0o755);
  return runnablePath;
}
