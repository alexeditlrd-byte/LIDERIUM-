import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SAT_PERFIL_DEFAULT } from '@/lib/lead-scoring';

// Perfil de cliente ideal (ICP), mapa de empatía y nichos preferidos que
// carga el equipo para que SAT los use al calificar leads nuevos. Fila
// única (id=1).
export async function GET() {
  const { data } = await supabaseAdmin.from('sat_perfil').select('*').eq('id', 1).single();
  if (!data) return NextResponse.json({ perfil: SAT_PERFIL_DEFAULT });
  return NextResponse.json({
    perfil: {
      icp: data.icp ?? '',
      mapaEmpatia: data.mapa_empatia ?? '',
      nichosCalientes: data.nichos_calientes ?? [],
      nichosMedios: data.nichos_medios ?? [],
    },
  });
}

export async function PUT(req: NextRequest) {
  const { icp, mapaEmpatia, nichosCalientes, nichosMedios } = await req.json();
  const { error } = await supabaseAdmin.from('sat_perfil').upsert({
    id: 1,
    icp: icp ?? '',
    mapa_empatia: mapaEmpatia ?? '',
    nichos_calientes: Array.isArray(nichosCalientes) ? nichosCalientes : [],
    nichos_medios: Array.isArray(nichosMedios) ? nichosMedios : [],
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
