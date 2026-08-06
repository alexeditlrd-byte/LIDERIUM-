import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const [{ data: guiasData, error: guiasError }, { data: foldersData, error: foldersError }] = await Promise.all([
    supabaseAdmin.from('guias').select('*').order('uploaded_at', { ascending: false }),
    supabaseAdmin.from('guia_folders').select('*').order('name', { ascending: true }),
  ]);

  const guias = guiasError ? [] : (guiasData ?? []).map((g) => ({
    id: g.id,
    label: g.label,
    fileName: g.file_name,
    link: g.public_url,
    mimeType: g.mime_type,
    uploadedBy: g.uploaded_by,
    uploadedAt: g.uploaded_at,
    folderId: g.folder_id,
  }));

  const folders = foldersError ? [] : (foldersData ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    createdAt: f.created_at,
  }));

  return NextResponse.json({ guias, folders });
}

// Guarda el registro del documento después de que el navegador ya subió
// el archivo directo a Storage (ver /api/guia-upload-url).
export async function POST(req: NextRequest) {
  const { label, fileName, filePath, publicUrl, mimeType, uploadedBy, folderId } = await req.json();
  if (!label || !fileName || !filePath || !publicUrl) {
    return NextResponse.json({ error: 'Faltan datos del archivo subido' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from('guias').insert({
    label,
    file_name: fileName,
    file_path: filePath,
    public_url: publicUrl,
    mime_type: mimeType || '',
    uploaded_by: uploadedBy || '',
    folder_id: folderId || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    guia: { id: data.id, label, fileName, link: publicUrl, mimeType, uploadedBy, uploadedAt: data.uploaded_at, folderId },
  });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  const { data: existing } = await supabaseAdmin.from('guias').select('file_path').eq('id', id).single();
  if (existing?.file_path) {
    await supabaseAdmin.storage.from('guias').remove([existing.file_path]).catch(() => {});
  }

  const { error } = await supabaseAdmin.from('guias').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
