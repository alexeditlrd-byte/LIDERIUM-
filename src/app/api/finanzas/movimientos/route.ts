import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('finanzas_movimientos')
    .select('*')
    .order('fecha', { ascending: false });
  if (error) return NextResponse.json({ movimientos: [] });

  const movimientos = (data ?? []).map(m => ({
    id: m.id,
    tipo: m.tipo as 'ingreso' | 'egreso',
    concepto: m.concepto,
    categoria: m.categoria,
    monto: Number(m.monto),
    fecha: m.fecha,
    nota: m.nota ?? '',
    createdBy: m.created_by ?? '',
    createdAt: m.created_at,
  }));
  return NextResponse.json({ movimientos });
}

export async function POST(req: NextRequest) {
  const { tipo, concepto, categoria, monto, fecha, nota, createdBy } = await req.json();
  if (!tipo || !concepto || !categoria || !monto || !fecha) {
    return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
  }
  if (tipo !== 'ingreso' && tipo !== 'egreso') {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from('finanzas_movimientos')
    .insert({ tipo, concepto, categoria, monto, fecha, nota: nota || '', created_by: createdBy || '' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    movimiento: { id: data.id, tipo: data.tipo, concepto: data.concepto, categoria: data.categoria, monto: Number(data.monto), fecha: data.fecha, nota: data.nota ?? '', createdBy: data.created_by ?? '', createdAt: data.created_at },
  });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });
  const { error } = await supabaseAdmin.from('finanzas_movimientos').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
