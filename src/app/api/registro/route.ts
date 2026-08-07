import { NextRequest, NextResponse } from 'next/server';
import { createLead } from '@/lib/leads-sheet';

// Endpoint público del formulario de captación (/registro), pensado para
// recibir tráfico de campañas de Ads. Reutiliza createLead — misma
// asignación automática de responsable y el mismo anti-duplicado por
// número que ya usa el formulario interno "Añadir lead".
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nombre, email, instagram, numero, producto, nicho, facturacionLabel, linkAds } = body;

  if (!nombre?.trim() || !email?.trim() || !numero?.trim() || !producto?.trim() || !nicho?.trim()) {
    return NextResponse.json({ error: 'Completa todos los campos requeridos.' }, { status: 400 });
  }

  const today = new Date();
  const fechaInicio = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  try {
    const { lead, duplicate } = await createLead({
      nombre: nombre.trim(),
      instagram: instagram?.trim() ?? '',
      numero: numero.trim(),
      tipoInfoproductor: producto.trim(),
      nicho: nicho.trim(),
      plataformas: '',
      linkAds: linkAds ?? '',
      email: email.trim(),
      cuestionario: facturacionLabel ? { 'Facturación mensual': facturacionLabel } : null,
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
    });
    return NextResponse.json({ success: true, duplicate, leadId: lead.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al registrar tus datos' }, { status: 502 });
  }
}
