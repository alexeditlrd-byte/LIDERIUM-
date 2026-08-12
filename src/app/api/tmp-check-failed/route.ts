import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token !== 'liderium-tmp-check') return NextResponse.json({ error: 'no' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('id, phone, direction, text, status, status_detail, created_at')
    .eq('phone', '51955813360')
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({ data, error });
}
