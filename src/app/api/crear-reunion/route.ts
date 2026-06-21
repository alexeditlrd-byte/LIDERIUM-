import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { clientSlug, clientName, clientEmail, title, mentor, mentorRole, scheduledAt, durationMinutes } = await req.json();

  if (!clientSlug || !title || !mentor || !scheduledAt) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  }

  // Crear evento en Google Calendar vía Apps Script → Meet link automático
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  let meetLink = '';
  if (scriptUrl) {
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
          guestEmail: clientEmail ?? '',
          description: `Reunión con ${clientName} — Liderium`,
        }),
      });
      const data = await res.json();
      meetLink = data.meetLink ?? '';
    } catch {}
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
      status: 'Agendada',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, meeting: data, meetLink });
}
