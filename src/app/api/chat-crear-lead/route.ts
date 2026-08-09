import { NextRequest, NextResponse } from 'next/server';
import { createLead } from '@/lib/leads-sheet';

// Crea un lead desde el panel de WhatsApp/Instagram cuando quien escribe
// todavía no está en Comercial — autocompleta lo que ya se sabe del chat
// (nombre, teléfono o usuario) y deja el resto para completar después.
// Reutiliza createLead directo (misma asignación automática de
// responsable y anti-duplicado por teléfono que ya usa /registro).
export async function POST(req: NextRequest) {
  const { nombre, numero, instagram, canal } = await req.json();
  if (!nombre?.trim() || !(numero?.trim() || instagram?.trim())) {
    return NextResponse.json({ error: 'Falta el nombre y un teléfono o usuario de Instagram' }, { status: 400 });
  }
  const origenCanal = canal === 'whatsapp' || canal === 'instagram' ? canal : '';

  const today = new Date();
  const fechaInicio = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  try {
    const { lead, duplicate } = await createLead({
      nombre: nombre.trim(),
      instagram: instagram?.trim() ?? '',
      numero: numero?.trim() ?? '',
      tipoInfoproductor: '',
      nicho: '',
      plataformas: '',
      linkAds: '',
      email: '',
      origenCanal,
      cuestionario: null,
      nps: '',
      plan: '',
      faseVenta: 'Prospección',
      probabilidad: '20',
      responsable: '',
      propietario: '',
      fechaInicio,
      fechaRenovacion: '',
      precio: 0,
      abono: 0,
      estado: 'Nuevo',
      prioridad: 'Media',
      observacion: '',
      satTierOverride: '',
      satFeedback: '',
    });
    return NextResponse.json({ success: true, lead, duplicate });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al crear el lead' }, { status: 502 });
  }
}
