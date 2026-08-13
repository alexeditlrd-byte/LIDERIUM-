import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Respuestas rápidas propias del equipo (no son plantillas de Meta, son
// textos guardados para no escribir lo mismo siempre) — mismo patrón que
// ig_quick_replies en Instagram, tabla aparte porque son mensajes libres,
// no exigen aprobación de Meta como sí pasa con las plantillas.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('wa_quick_replies')
    .select('*')
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ replies: [] });
  return NextResponse.json({ replies: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { texto, color } = await req.json();
  if (!texto?.trim()) return NextResponse.json({ error: 'Falta el texto' }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from('wa_quick_replies')
    .insert({ texto: texto.trim(), color: color ?? 'blanco' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, reply: data });
}

export async function PATCH(req: NextRequest) {
  const { id, texto, color } = await req.json();
  if (!id || !texto?.trim()) return NextResponse.json({ error: 'Falta id o texto' }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from('wa_quick_replies')
    .update({ texto: texto.trim(), color: color ?? 'blanco' })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, reply: data });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });
  const { error } = await supabaseAdmin.from('wa_quick_replies').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
