import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Igual que /api/recurso-upload-url: URL firmada para adjuntar un
// documento a una tarea directo desde el navegador, sin pasar el archivo
// por nuestro servidor.
export async function POST(req: NextRequest) {
  try {
    const { fileName } = await req.json();
    if (!fileName) return NextResponse.json({ error: 'Falta el nombre del archivo' }, { status: 400 });

    const safeName = String(fileName)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filePath = `${Date.now()}_${safeName}`;

    await supabaseAdmin.storage.createBucket('tareas-adjuntos', { public: true, fileSizeLimit: '50MB' }).catch(() => {});
    await supabaseAdmin.storage.updateBucket('tareas-adjuntos', { public: true, fileSizeLimit: '50MB' }).catch(() => {});

    const { data, error } = await supabaseAdmin.storage.from('tareas-adjuntos').createSignedUploadUrl(filePath);
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'No se pudo preparar la subida' }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from('tareas-adjuntos').getPublicUrl(filePath);

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
