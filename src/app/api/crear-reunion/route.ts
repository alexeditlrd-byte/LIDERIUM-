import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { clientSlug, clientName, clientEmail, title, mentor, mentorRole, mentorEmail, scheduledAt, durationMinutes } = await req.json();

  if (!clientSlug || !title || !mentor || !mentorEmail || !scheduledAt) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  }

  // Crear evento en Google Calendar vía Apps Script → Meet link automático
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  let meetLink = '';
  let eventId = '';
  if (!scriptUrl) {
    console.error('[crear-reunion] GOOGLE_SCRIPT_URL no está configurado');
  } else {
    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createMeeting',
          title,
          startTime: scheduledAt,
          durationMinutes: durationMinutes ?? 45,
          guestEmail: mentorEmail || clientEmail || '',
          description: `Reunión con ${clientName} — Liderium`,
        }),
      });
      const text = await res.text();
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(text); } catch {
        console.error('[crear-reunion] respuesta no-JSON del Apps Script:', text.slice(0, 500));
      }
      if (data.error) console.error('[crear-reunion] el Apps Script devolvió error:', data.error);
      meetLink = (data.meetLink as string) ?? '';
      eventId = (data.eventId as string) ?? '';
      if (!meetLink) console.error('[crear-reunion] sin meetLink en la respuesta. status:', res.status, 'body:', text.slice(0, 500));
    } catch (e) {
      console.error('[crear-reunion] fetch al Apps Script falló:', e instanceof Error ? e.message : String(e));
    }
  }

  const mentorIni = mentor.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const { data, error } = await supabaseAdmin
    .from('meetings')
    .insert({
      client_slug: clientSlug,
      client_name: clientName,
      title,
      mentor,
      mentor_role: mentorRole ?? '',
      mentor_ini: mentorIni,
      scheduled_at: scheduledAt,
      duration_minutes: durationMinutes ?? 45,
      meet_link: meetLink,
      event_id: eventId,
      status: 'Agendada',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, meeting: data, meetLink });
}
