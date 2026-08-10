import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'Falta phone' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('*')
    .eq('phone', phone)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ messages: [] });

  const messages = (data ?? []).map(m => ({
    id: m.id,
    direction: m.direction as 'in' | 'out',
    text: m.text ?? '',
    mediaUrl: m.media_url,
    mediaType: m.media_type,
    createdTime: m.created_at,
    status: m.status ?? null,
    statusDetail: m.status_detail ?? null,
  }));
  return NextResponse.json({ messages });
}
