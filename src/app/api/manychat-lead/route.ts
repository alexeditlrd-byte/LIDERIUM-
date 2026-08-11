import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createLead, updateLead } from '@/lib/leads-sheet';
import { normalizeHandle } from '@/lib/lead-match';

// Webhook público para que el bot de ManyChat (cuestionario de Instagram)
// cree o complete un lead con las respuestas que recolectó — sin esto,
// SAT nunca los ve, porque solo califica leads con datos de cuestionario
// (ver esLeadCuestionario en lead-scoring.ts). Se protege con un secreto
// compartido en vez de login, ya que lo llama ManyChat, no una persona.
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('secret') !== process.env.MANYCHAT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const instagram = String(body.instagram ?? '').trim();
  if (!instagram) return NextResponse.json({ error: 'Falta el usuario de Instagram' }, { status: 400 });

  const nombre = String(body.nombre ?? '').trim() || instagram;
  const nicho = String(body.nicho ?? '').trim();
  const producto = String(body.producto ?? '').trim();
  const facturacionLabel = String(body.facturacion ?? '').trim();

  const cuestionario: Record<string, string> = {};
  if (producto) cuestionario['¿Vende producto o servicio digital?'] = producto;
  if (facturacionLabel) cuestionario['Facturación mensual'] = facturacionLabel;
  // Sin esto el lead no queda marcado como "de cuestionario" y SAT lo ignora.
  if (Object.keys(cuestionario).length === 0) cuestionario['Origen'] = 'Cuestionario de Instagram (ManyChat)';

  try {
    // Los leads de Instagram normalmente no traen teléfono, así que el
    // anti-duplicado por número de createLead() no sirve acá — hay que
    // buscar por usuario de Instagram a mano.
    const target = normalizeHandle(instagram);
    const { data: existentes } = await supabaseAdmin.from('leads').select('*');
    const match = (existentes ?? []).find(r => normalizeHandle(r.instagram) === target);

    if (match) {
      const lead = await updateLead(match.id, {
        nicho: nicho || match.nicho,
        tipoInfoproductor: producto || match.tipo_infoproductor,
        cuestionario: { ...(match.cuestionario ?? {}), ...cuestionario },
        origenCanal: match.origen_canal || 'instagram',
      });
      return NextResponse.json({ success: true, duplicate: true, leadId: lead.id });
    }

    const today = new Date();
    const fechaInicio = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    const { lead, duplicate } = await createLead({
      nombre,
      instagram,
      numero: '',
      tipoInfoproductor: producto,
      nicho,
      plataformas: '',
      linkAds: '',
      email: '',
      origenCanal: 'instagram',
      cuestionario,
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
    return NextResponse.json({ success: true, duplicate, leadId: lead.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al registrar el lead' }, { status: 502 });
  }
}
