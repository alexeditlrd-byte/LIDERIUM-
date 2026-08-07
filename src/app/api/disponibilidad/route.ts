import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { computeAvailability, getHorarioLaboral, PROPIETARIOS_DISPONIBILIDAD } from '@/lib/disponibilidad';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const propietario = searchParams.get('propietario');
  const fecha = searchParams.get('fecha'); // YYYY-MM-DD
  const duracion = Number(searchParams.get('duracion')) || 45;

  if (!propietario || !fecha) return NextResponse.json({ error: 'Falta propietario o fecha' }, { status: 400 });
  if (!PROPIETARIOS_DISPONIBILIDAD.includes(propietario)) return NextResponse.json({ error: 'Propietario inválido' }, { status: 400 });

  try {
    const slots = await computeAvailability(propietario, fecha, duracion);
    const horario = await getHorarioLaboral(propietario);
    return NextResponse.json({ slots, horario });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al calcular disponibilidad' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { propietario, horaInicio, horaFin, dias } = await req.json();
  if (!propietario || !PROPIETARIOS_DISPONIBILIDAD.includes(propietario)) {
    return NextResponse.json({ error: 'Propietario inválido' }, { status: 400 });
  }
  if (!horaInicio || !horaFin) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });

  const { error } = await supabaseAdmin.from('horarios_laborales').upsert({
    propietario,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    dias: Array.isArray(dias) && dias.length > 0 ? dias : [1, 2, 3, 4, 5],
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
