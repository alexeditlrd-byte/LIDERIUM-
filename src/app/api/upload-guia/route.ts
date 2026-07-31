import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    const label = (fd.get('label') as string) || file?.name || 'Documento';
    const uploadedBy = (fd.get('uploadedBy') as string) || '';
    const folderId = (fd.get('folderId') as string) || null;

    if (!file) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const safeName = file.name
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filePath = `${Date.now()}_${safeName}`;

    await supabaseAdmin.storage.createBucket('guias', { public: true }).catch(() => {});

    const { error: uploadError } = await supabaseAdmin.storage
      .from('guias')
      .upload(filePath, bytes, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from('guias').getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    const { data, error: dbError } = await supabaseAdmin.from('guias').insert({
      label,
      file_name: file.name,
      file_path: filePath,
      public_url: publicUrl,
      mime_type: file.type || '',
      uploaded_by: uploadedBy,
      folder_id: folderId,
    }).select().single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, guia: { id: data.id, label, fileName: file.name, link: publicUrl, mimeType: file.type, uploadedBy, uploadedAt: data.uploaded_at, folderId } });
  } catch (e) {
    return NextResponse.json({ error: `Error: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}
