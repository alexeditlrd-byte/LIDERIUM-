import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  if (!slug) return NextResponse.json({ amount: '', plan: '', status: '' });

  const { data } = await supabaseAdmin
    .from('clients')
    .select('amount, plan, status')
    .eq('slug', slug)
    .single();

  return NextResponse.json({
    amount: data?.amount ?? '',
    plan: data?.plan ?? '',
    status: data?.status ?? '',
  });
}
