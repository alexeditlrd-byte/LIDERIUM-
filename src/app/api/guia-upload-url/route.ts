import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Genera una URL firmada para que el navegador suba el archivo directo a
// Supabase Storage, sin pasar por esta función — así documentos grandes
// (videos, PDFs pesados) no chocan con el límite de 4.5MB del cuerpo de
// una función serverless de Vercel.
export async function POST(req: NextRequest) {
  try {
    const { fileName } = await req.json();
    if (!fileName) return NextResponse.json({ error: 'Falta el nombre del archivo' }, { status: 400 });

    const safeName = String(fileName)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filePath = `${Date.now()}_${safeName}`;

    await supabaseAdmin.storage.createBucket('guias', { public: true, fileSizeLimit: '200MB' }).catch(() => {});
    await supabaseAdmin.storage.updateBucket('guias', { public: true, fileSizeLimit: '200MB' }).catch(() => {});

    const { data, error } = await supabaseAdmin.storage.from('guias').createSignedUploadUrl(filePath);
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'No se pudo preparar la subida' }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from('guias').getPublicUrl(filePath);

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
