import { NextRequest, NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { resolveFfmpegPath } from '@/lib/ffmpeg';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Igual que el de WhatsApp (mismo problema: el navegador graba con códec
// Opus adentro, sea cual sea el contenedor) — Instagram acepta audio en
// AAC/M4A/WAV, así que acá se convierte a AAC dentro de un contenedor m4a.
export async function POST(req: NextRequest) {
  const inputBuffer = Buffer.from(await req.arrayBuffer());
  if (inputBuffer.length === 0) return NextResponse.json({ error: 'Audio vacío' }, { status: 400 });

  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `ig-voice-in-${Date.now()}`);
  const outputPath = path.join(tmpDir, `ig-voice-out-${Date.now()}.m4a`);

  try {
    ffmpeg.setFfmpegPath(resolveFfmpegPath());
    await fs.writeFile(inputPath, inputBuffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('aac')
        .audioBitrate('64k')
        .audioChannels(1)
        .format('mp4')
        .on('end', () => resolve())
        .on('error', err => reject(err))
        .save(outputPath);
    });

    const outputBuffer = await fs.readFile(outputPath);

    const filePath = `voz_${Date.now()}.m4a`;
    await supabaseAdmin.storage.createBucket('ig-media', { public: true, fileSizeLimit: '50MB' }).catch(() => {});
    const { error } = await supabaseAdmin.storage.from('ig-media').upload(filePath, outputBuffer, { contentType: 'audio/mp4', upsert: true });
    if (error) throw new Error(error.message);

    const { data } = supabaseAdmin.storage.from('ig-media').getPublicUrl(filePath);
    return NextResponse.json({ publicUrl: data.publicUrl });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No se pudo convertir el audio' }, { status: 500 });
  } finally {
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}
