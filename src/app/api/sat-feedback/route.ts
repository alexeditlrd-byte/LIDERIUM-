import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Bitácora de feedback del equipo (ej. por qué se ganó un cliente) —
// queda como aprendizaje visible para ir afinando los criterios de SAT
// con resultados reales, sin que eso sea un modelo de IA que "aprende
// solo": es el equipo dejando contexto explícito.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('sat_feedback_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ entradas: [] });
  return NextResponse.json({
    entradas: (data ?? []).map(r => ({
      id: r.id,
      leadId: r.lead_id,
      clienteNombre: r.cliente_nombre,
      nicho: r.nicho,
      nota: r.nota,
      createdAt: r.created_at,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { leadId, clienteNombre, nicho, nota } = await req.json();
  if (!leadId || !clienteNombre || !nota?.trim()) {
    return NextResponse.json({ error: 'Falta el lead o la nota' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from('sat_feedback_log')
    .insert({ lead_id: leadId, cliente_nombre: clienteNombre, nicho: nicho ?? '', nota: nota.trim() })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, entrada: data });
}
