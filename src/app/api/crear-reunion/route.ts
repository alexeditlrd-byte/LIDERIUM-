import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createCalendarEvent } from '@/lib/google-calendar';
import { hasConflict } from '@/lib/disponibilidad';

export async function POST(req: NextRequest) {
  const { clientSlug, clientName, clientEmail, title, mentor, mentorRole, mentorEmail, propietario, scheduledAt, durationMinutes } = await req.json();

  if (!clientSlug || !title || !mentor || !mentorEmail || !scheduledAt) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  }

  if (await hasConflict(mentor, scheduledAt, durationMinutes ?? 45)) {
    return NextResponse.json({ error: `Este horario ya está ocupado para ${mentor}. Selecciona otro horario disponible.` }, { status: 409 });
  }

  if (propietario && await hasConflict(propietario, scheduledAt, durationMinutes ?? 45)) {
    return NextResponse.json({ error: `Este horario ya está ocupado para ${propietario}. Selecciona otro horario disponible.` }, { status: 409 });
  }

  // Crear evento en Google Calendar directo por API → Meet link automático
  let meetLink = '';
  let eventId = '';
  try {
    const guestEmails = [...new Set([mentorEmail, clientEmail].filter(Boolean))];
    const event = await createCalendarEvent({
      title,
      startTime: scheduledAt,
      durationMinutes: durationMinutes ?? 45,
      guestEmails,
      description: `Reunión con ${clientName} — Liderium`,
    });
    meetLink = event.meetLink;
    eventId = event.eventId;
  } catch (e) {
    console.error('[crear-reunion] Google Calendar falló:', e instanceof Error ? e.message : String(e));
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
      propietario: propietario ?? '',
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
