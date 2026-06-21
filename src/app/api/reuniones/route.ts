import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientSlug = searchParams.get('clientSlug');

  let query = supabaseAdmin
    .from('meetings')
    .select('*')
    .order('scheduled_at', { ascending: true });

  if (clientSlug) query = query.eq('client_slug', clientSlug);

  const { data, error } = await query;
  if (error) return NextResponse.json({ meetings: [] });
  return NextResponse.json({ meetings: data ?? [] });
}
