import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ clients: [] });
  return NextResponse.json({ clients: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const { slug, amount, status } = await req.json();
  if (!slug) return NextResponse.json({ error: 'Falta slug' }, { status: 400 });

  const updates: Record<string, string> = {};
  if (amount !== undefined) updates.amount = amount;
  if (status !== undefined) updates.status = status;
  if (!Object.keys(updates).length) return NextResponse.json({ error: 'Sin cambios' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('clients')
    .update(updates)
    .eq('slug', slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
