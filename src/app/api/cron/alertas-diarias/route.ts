import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Resumen diario del panel interno, mandado por correo (WhatsApp no
// sirve para esto: la cuenta de negocio no puede escribirle primero a un
// número que no le escribió antes, así que un aviso automático por
// WhatsApp se rompería con la misma regla de la ventana de 24h). Vercel
// Cron llama a esta ruta una vez al día — ver vercel.json.

const LEAD_SIN_CONTACTAR_HORAS = 24;

function horasDesde(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function fmtHoras(h: number) {
  if (h < 48) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

async function leadsSinContactar() {
  const cutoff = new Date(Date.now() - LEAD_SIN_CONTACTAR_HORAS * 3_600_000).toISOString();
  const { data } = await supabaseAdmin
    .from('leads')
    .select('nombre, numero, created_at')
    .eq('estado', 'Nuevo')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true });
  return data ?? [];
}

async function chatsSinResponder() {
  // No hay forma barata de traer "el último mensaje de cada conversación"
  // con el cliente de Supabase sin SQL crudo — se trae un lote reciente
  // ordenado por fecha y se queda con el primero que aparece por teléfono.
  const { data } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('phone, direction, created_at, contact_name')
    .order('created_at', { ascending: false })
    .limit(2000);

  const ultimoPorTelefono = new Map<string, { direction: string; created_at: string; contact_name: string }>();
  for (const m of data ?? []) {
    if (!ultimoPorTelefono.has(m.phone)) ultimoPorTelefono.set(m.phone, m);
  }

  return [...ultimoPorTelefono.entries()]
    .filter(([, m]) => m.direction === 'in')
    .map(([phone, m]) => ({ phone, nombre: m.contact_name || phone, horas: horasDesde(m.created_at) }))
    .sort((a, b) => b.horas - a.horas);
}

async function tareasPendientes() {
  const mananaISO = new Date(Date.now() + 24 * 3_600_000).toISOString().slice(0, 10);
  const { data } = await supabaseAdmin
    .from('tareas')
    .select('titulo, responsable, fecha_limite')
    .eq('completada', false)
    .not('fecha_limite', 'is', null)
    .lte('fecha_limite', mananaISO)
    .order('fecha_limite', { ascending: true });

  const hoyISO = new Date().toISOString().slice(0, 10);
  const vencidas = (data ?? []).filter(t => t.fecha_limite < hoyISO);
  const porVencer = (data ?? []).filter(t => t.fecha_limite >= hoyISO);
  return { vencidas, porVencer };
}

function seccionHtml(titulo: string, filas: string[]) {
  if (filas.length === 0) return '';
  return `
    <div style="margin-bottom:24px;">
      <div style="font-weight:700;font-size:15px;color:#15171C;margin-bottom:8px;">${titulo}</div>
      <div style="border:1px solid #ECEEF2;border-radius:12px;overflow:hidden;">
        ${filas.map((f, i) => `<div style="padding:10px 14px;font-size:13.5px;color:#3C434F;${i > 0 ? 'border-top:1px solid #F0F2F5;' : ''}">${f}</div>`).join('')}
      </div>
    </div>`;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const [leadsNuevos, chats, { vencidas, porVencer }] = await Promise.all([
    leadsSinContactar(),
    chatsSinResponder(),
    tareasPendientes(),
  ]);

  const totalPendientes = leadsNuevos.length + chats.length + vencidas.length + porVencer.length;

  const cuerpo = totalPendientes === 0
    ? `<div style="font-size:14px;color:#1F9B6E;font-weight:700;">🎉 Todo al día — no hay leads sin contactar, chats sin responder ni tareas vencidas.</div>`
    : [
        seccionHtml(
          `🆕 Leads nuevos sin contactar (${leadsNuevos.length})`,
          leadsNuevos.map(l => `<b>${l.nombre || l.numero}</b> — ${l.numero} · lleva ${fmtHoras(horasDesde(l.created_at))} sin contactar`)
        ),
        seccionHtml(
          `💬 Chats de WhatsApp sin responder (${chats.length})`,
          chats.slice(0, 10).map(c => `<b>${c.nombre}</b> — esperando respuesta hace ${fmtHoras(c.horas)}`)
        ),
        seccionHtml(
          `⚠️ Tareas vencidas (${vencidas.length})`,
          vencidas.map(t => `<b>${t.titulo}</b>${t.responsable ? ` — ${t.responsable}` : ''} · venció el ${t.fecha_limite}`)
        ),
        seccionHtml(
          `📅 Tareas por vencer hoy o mañana (${porVencer.length})`,
          porVencer.map(t => `<b>${t.titulo}</b>${t.responsable ? ` — ${t.responsable}` : ''} · vence el ${t.fecha_limite}`)
        ),
      ].join('');

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <div style="font-size:19px;font-weight:800;color:#15171C;margin-bottom:4px;">Resumen diario — Liderium</div>
      <div style="font-size:13px;color:#8A929E;margin-bottom:24px;">${new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Lima' })}</div>
      ${cuerpo}
    </div>`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Liderium <onboarding@resend.dev>',
      to: process.env.ALERTAS_EMAIL_TO!,
      subject: totalPendientes === 0 ? '✅ Liderium — todo al día' : `Liderium — ${totalPendientes} pendiente${totalPendientes === 1 ? '' : 's'} hoy`,
      html,
    });
    return NextResponse.json({ success: true, totalPendientes });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al enviar el correo' }, { status: 502 });
  }
}
