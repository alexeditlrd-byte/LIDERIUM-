import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('guias')
    .select('*')
    .order('uploaded_at', { ascending: false });

  if (error) return NextResponse.json({ guias: [] });

  const guias = (data ?? []).map((g) => ({
    id: g.id,
    label: g.label,
    fileName: g.file_name,
    link: g.public_url,
    mimeType: g.mime_type,
    uploadedBy: g.uploaded_by,
    uploadedAt: g.uploaded_at,
  }));

  return NextResponse.json({ guias });
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
