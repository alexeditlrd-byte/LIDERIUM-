import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Falta el nombre de la carpeta' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('guia_folders')
    .insert({ name: name.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ folder: { id: data.id, name: data.name, createdAt: data.created_at } });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  const { data: files } = await supabaseAdmin.from('guias').select('id, file_path').eq('folder_id', id);
  if (files?.length) {
    const paths = files.map((f) => f.file_path).filter(Boolean);
    if (paths.length) await supabaseAdmin.storage.from('guias').remove(paths).catch(() => {});
    await supabaseAdmin.from('guias').delete().eq('folder_id', id);
  }

  const { error } = await supabaseAdmin.from('guia_folders').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
