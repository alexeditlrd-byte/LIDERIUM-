import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token !== 'liderium-tmp-check') return NextResponse.json({ error: 'no' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('id, phone, direction, media_type, media_url, status, status_detail, created_at')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(5);

  return NextResponse.json({ data, error });
}
