import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Metadatos de organización por conversación (responsable asignado y
// estado: Pendiente/En seguimiento/Resuelto), compartidos entre WhatsApp
// e Instagram — ninguno de los dos guarda las conversaciones como tabla
// propia (WhatsApp las arma de whatsapp_messages, Instagram las trae en
// vivo de Meta), así que esto vive aparte, indexado por canal + clave de
// conversación (teléfono en WhatsApp, participantId en Instagram).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const canal = searchParams.get('canal');
  if (!canal) return NextResponse.json({ error: 'Falta canal' }, { status: 400 });

  const { data, error } = await supabaseAdmin.from('chat_conversaciones_meta').select('*').eq('canal', canal);
  if (error) return NextResponse.json({ meta: {} });

  const meta: Record<string, { responsable: string; estado: string }> = {};
  for (const row of data ?? []) {
    meta[row.conversation_key] = { responsable: row.responsable ?? '', estado: row.estado || 'Pendiente' };
  }
  return NextResponse.json({ meta });
}

export async function PUT(req: NextRequest) {
  const { canal, conversationKey, responsable, estado } = await req.json();
  if (!canal || !conversationKey) return NextResponse.json({ error: 'Falta canal o conversationKey' }, { status: 400 });

  const patch: Record<string, unknown> = { canal, conversation_key: conversationKey, updated_at: new Date().toISOString() };
  if (responsable !== undefined) patch.responsable = responsable;
  if (estado !== undefined) patch.estado = estado;

  const { error } = await supabaseAdmin.from('chat_conversaciones_meta').upsert(patch, { onConflict: 'canal,conversation_key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
