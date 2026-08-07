import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const TIPOS = ['pdf', 'drive', 'video', 'link'];

// Configuración del recurso gratuito que se entrega automáticamente al
// terminar el formulario público de registro (/registro). Fila única
// (id=1) porque solo existe un recurso activo a la vez.
export async function GET() {
  const { data } = await supabaseAdmin.from('recurso_gratuito').select('*').eq('id', 1).single();
  return NextResponse.json({
    recurso: data ?? { tipo: 'link', titulo: 'Tu recurso gratuito', url: '' },
  });
}

export async function PUT(req: NextRequest) {
  const { tipo, titulo, url } = await req.json();
  if (!TIPOS.includes(tipo)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  if (!titulo?.trim()) return NextResponse.json({ error: 'Falta el título' }, { status: 400 });

  const { error } = await supabaseAdmin.from('recurso_gratuito').upsert({
    id: 1,
    tipo,
    titulo: titulo.trim(),
    url: (url ?? '').trim(),
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
