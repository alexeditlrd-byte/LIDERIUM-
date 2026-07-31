import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const { data, error } = await supabaseAdmin.from('finanzas_config').select('*').eq('id', 1).single();
  if (error || !data) {
    const now = new Date();
    const mesInicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return NextResponse.json({ config: { mesInicio, cajaInicial: 0 } });
  }
  return NextResponse.json({ config: { mesInicio: data.mes_inicio, cajaInicial: Number(data.caja_inicial) } });
}

export async function PUT(req: NextRequest) {
  const { mesInicio, cajaInicial } = await req.json();
  if (!mesInicio || cajaInicial === undefined) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  }
  const { error } = await supabaseAdmin
    .from('finanzas_config')
    .upsert({ id: 1, mes_inicio: mesInicio, caja_inicial: cajaInicial });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
