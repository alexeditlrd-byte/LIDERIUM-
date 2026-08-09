import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Arma la lista de conversaciones agrupando por número de teléfono todos
// los mensajes guardados (entrantes y salientes) — no hay endpoint de
// Meta para esto, se calcula de lo que ya tenemos en whatsapp_messages.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('phone, contact_name, text, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ conversations: [], error: error.message });

  const byPhone = new Map<string, { phone: string; contactName: string; lastText: string; updatedTime: string }>();
  for (const row of data ?? []) {
    if (!byPhone.has(row.phone)) {
      byPhone.set(row.phone, {
        phone: row.phone,
        contactName: row.contact_name || row.phone,
        lastText: row.text || '',
        updatedTime: row.created_at,
      });
    }
  }

  const conversations = [...byPhone.values()].sort(
    (a, b) => new Date(b.updatedTime).getTime() - new Date(a.updatedTime).getTime()
  );
  return NextResponse.json({ conversations });
}
