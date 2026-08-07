import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar';
import { hasConflict } from '@/lib/disponibilidad';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientSlug = searchParams.get('clientSlug');

  let query = supabaseAdmin
    .from('meetings')
    .select('*')
    .order('scheduled_at', { ascending: true });

  if (clientSlug) query = query.eq('client_slug', clientSlug);

  const { data, error } = await query;
  if (error) return NextResponse.json({ meetings: [] });
  return NextResponse.json({ meetings: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const { id, scheduledAt, durationMinutes } = await req.json();
  if (!id || !scheduledAt) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });

  const { data: existing } = await supabaseAdmin.from('meetings').select('event_id, mentor, propietario').eq('id', id).single();

  if (existing?.mentor && await hasConflict(existing.mentor, scheduledAt, durationMinutes ?? 45, id)) {
    return NextResponse.json({ error: `Este horario ya está ocupado para ${existing.mentor}. Selecciona otro horario disponible.` }, { status: 409 });
  }

  if (existing?.propietario && await hasConflict(existing.propietario, scheduledAt, durationMinutes ?? 45, id)) {
    return NextResponse.json({ error: `Este horario ya está ocupado para ${existing.propietario}. Selecciona otro horario disponible.` }, { status: 409 });
  }

  if (existing?.event_id) {
    try {
      await updateCalendarEvent(existing.event_id, { startTime: scheduledAt, durationMinutes: durationMinutes ?? 45 });
    } catch (e) {
      console.error('[reuniones update] Google Calendar falló:', e instanceof Error ? e.message : String(e));
    }
  }

  const { data, error } = await supabaseAdmin
    .from('meetings')
    .update({ scheduled_at: scheduledAt, duration_minutes: durationMinutes ?? 45 })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, meeting: data });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  const { data: existing } = await supabaseAdmin.from('meetings').select('event_id').eq('id', id).single();

  if (existing?.event_id) {
    try {
      await deleteCalendarEvent(existing.event_id);
    } catch (e) {
      console.error('[reuniones delete] Google Calendar falló:', e instanceof Error ? e.message : String(e));
    }
  }

  const { error } = await supabaseAdmin.from('meetings').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
