import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    const clientSlug = fd.get('clientSlug') as string;
    const clientName = fd.get('clientName') as string;
    const label = (fd.get('label') as string) || file?.name || 'Archivo';

    if (!file || !clientSlug) {
      return NextResponse.json({ error: 'Faltan datos: archivo o cliente' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const filePath = `${clientSlug}/${Date.now()}_${file.name}`;

    // Intentar crear el bucket si no existe (ignora si ya existe)
    await supabaseAdmin.storage.createBucket('entregables', { public: true }).catch(() => {});

    const { error: uploadError } = await supabaseAdmin.storage
      .from('entregables')
      .upload(filePath, bytes, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from('entregables').getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    const { error: dbError } = await supabaseAdmin.from('entregables').insert({
      client_slug: clientSlug,
      client_name: clientName,
      label,
      file_name: file.name,
      file_path: filePath,
      public_url: publicUrl,
      mime_type: file.type || '',
    });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, link: publicUrl, downloadLink: publicUrl, fileName: file.name, label });
  } catch (e: any) {
    return NextResponse.json({ error: `Error: ${e.message}` }, { status: 500 });
  }
}
