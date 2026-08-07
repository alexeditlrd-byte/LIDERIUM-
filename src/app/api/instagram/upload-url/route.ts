import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Genera una URL firmada para subir el archivo directo a Supabase Storage
// desde el navegador (igual que /api/guia-upload-url). Instagram necesita
// una URL pública para poder descargar la foto/video antes de reenviarlo.
export async function POST(req: NextRequest) {
  try {
    const { fileName } = await req.json();
    if (!fileName) return NextResponse.json({ error: 'Falta el nombre del archivo' }, { status: 400 });

    const safeName = String(fileName)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filePath = `${Date.now()}_${safeName}`;

    await supabaseAdmin.storage.createBucket('ig-media', { public: true, fileSizeLimit: '25MB' }).catch(() => {});
    await supabaseAdmin.storage.updateBucket('ig-media', { public: true, fileSizeLimit: '25MB' }).catch(() => {});

    const { data, error } = await supabaseAdmin.storage.from('ig-media').createSignedUploadUrl(filePath);
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'No se pudo preparar la subida' }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from('ig-media').getPublicUrl(filePath);

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      token: data.token,
      filePath,
      publicUrl: urlData.publicUrl,
    });
  } catch (e) {
    return NextResponse.json({ error: `Error: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}
