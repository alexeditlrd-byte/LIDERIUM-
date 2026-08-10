import { NextRequest, NextResponse } from 'next/server';
import ffmpegStaticPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import os from 'os';
import path from 'path';
import fsSync from 'fs';
import { promises as fs } from 'fs';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ffmpeg-static calcula su ruta al binario usando el directorio donde se
// instaló el paquete — en Vercel eso pasa durante el build (ej.
// /ROOT/node_modules/...), pero la función corre después desde otra
// carpeta (/var/task/...), así que hay que recalcularla contra el
// directorio real. Además esa carpeta es de solo lectura en producción,
// así que el binario hay que copiarlo a /tmp (lo único con permiso de
// escritura) y darle ahí el permiso de ejecución antes de poder correrlo.
function resolveFfmpegPath(): string {
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

// Chrome/Brave graban notas de voz en un contenedor mp4 o webm, pero con
// códec Opus adentro — WhatsApp exige AAC real dentro del mp4 (o alguno
// de los otros formatos de su lista), así que aunque el archivo se suba
// con el Content-Type correcto, Meta lo rechaza al procesarlo. No hay
// forma de grabar directo en un formato que el navegador soporte Y que
// WhatsApp acepte, así que se convierte acá, del lado del servidor, a
// mp3 (audio/mpeg — sí está en la lista de Meta).
export async function POST(req: NextRequest) {
  const inputBuffer = Buffer.from(await req.arrayBuffer());
  if (inputBuffer.length === 0) return NextResponse.json({ error: 'Audio vacío' }, { status: 400 });

  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `wa-voice-in-${Date.now()}`);
  const outputPath = path.join(tmpDir, `wa-voice-out-${Date.now()}.mp3`);

  try {
    ffmpeg.setFfmpegPath(resolveFfmpegPath());
    await fs.writeFile(inputPath, inputBuffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('libmp3lame')
        .audioBitrate('64k')
        .audioChannels(1)
        .format('mp3')
        .on('end', () => resolve())
        .on('error', err => reject(err))
        .save(outputPath);
    });

    const outputBuffer = await fs.readFile(outputPath);

    const filePath = `voz_${Date.now()}.mp3`;
    await supabaseAdmin.storage.createBucket('wa-media', { public: true, fileSizeLimit: '50MB' }).catch(() => {});
    const { error } = await supabaseAdmin.storage.from('wa-media').upload(filePath, outputBuffer, { contentType: 'audio/mpeg', upsert: true });
    if (error) throw new Error(error.message);

    const { data } = supabaseAdmin.storage.from('wa-media').getPublicUrl(filePath);
    return NextResponse.json({ publicUrl: data.publicUrl });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No se pudo convertir el audio' }, { status: 500 });
  } finally {
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}
