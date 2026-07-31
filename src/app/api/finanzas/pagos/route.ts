import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { updateLead } from '@/lib/leads-sheet';

async function syncLeadAbono(leadId: string) {
  const { data } = await supabaseAdmin.from('finanzas_pagos').select('monto').eq('lead_id', leadId);
  const total = (data ?? []).reduce((sum, p) => sum + Number(p.monto || 0), 0);
  try {
    await updateLead(leadId, { abono: total });
  } catch (e) {
    console.error('[finanzas/pagos] no se pudo sincronizar el abono en el Sheet:', e instanceof Error ? e.message : String(e));
  }
  return total;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get('leadId');

  let query = supabaseAdmin.from('finanzas_pagos').select('*').order('fecha', { ascending: false });
  if (leadId) query = query.eq('lead_id', leadId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ pagos: [] });

  const pagos = (data ?? []).map(p => ({
    id: p.id,
    leadId: p.lead_id,
    clienteNombre: p.cliente_nombre,
    monto: Number(p.monto),
    fecha: p.fecha,
    nota: p.nota ?? '',
    createdAt: p.created_at,
  }));
  return NextResponse.json({ pagos });
}

export async function POST(req: NextRequest) {
  const { leadId, clienteNombre, monto, fecha, nota, precio } = await req.json();
  if (!leadId || !clienteNombre || !monto || !fecha) {
    return NextResponse.json({ error: 'Faltan campos: cliente, monto y fecha son obligatorios.' }, { status: 400 });
  }
  if (!(Number(monto) > 0)) {
    return NextResponse.json({ error: 'El monto del abono debe ser mayor a 0.' }, { status: 400 });
  }
  if (typeof precio === 'number' && precio >= 0) {
    const { data: existing } = await supabaseAdmin.from('finanzas_pagos').select('monto').eq('lead_id', leadId);
    const yaAbonado = (existing ?? []).reduce((s, p) => s + Number(p.monto || 0), 0);
    if (yaAbonado + Number(monto) > precio) {
      return NextResponse.json({ error: `El abono no puede superar el saldo pendiente (${precio - yaAbonado}).` }, { status: 400 });
    }
  }
  const { data, error } = await supabaseAdmin
    .from('finanzas_pagos')
    .insert({ lead_id: leadId, cliente_nombre: clienteNombre, monto, fecha, nota: nota || '' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const abonoTotal = await syncLeadAbono(leadId);

  return NextResponse.json({
    pago: { id: data.id, leadId: data.lead_id, clienteNombre: data.cliente_nombre, monto: Number(data.monto), fecha: data.fecha, nota: data.nota ?? '', createdAt: data.created_at },
    abonoTotal,
  });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  const { data: existing } = await supabaseAdmin.from('finanzas_pagos').select('lead_id').eq('id', id).single();
  const { error } = await supabaseAdmin.from('finanzas_pagos').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let abonoTotal: number | null = null;
  if (existing?.lead_id) abonoTotal = await syncLeadAbono(existing.lead_id);

  return NextResponse.json({ success: true, abonoTotal });
}
