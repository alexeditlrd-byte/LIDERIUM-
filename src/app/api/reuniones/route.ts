import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

async function syncCalendarEvent(action: 'updateMeeting' | 'deleteMeeting', eventId: string | null, extra?: Record<string, unknown>) {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl || !eventId) return;
  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, eventId, ...extra }),
    });
    const data = await res.json();
    if (data.error) console.error(`[reuniones ${action}] el Apps Script devolvió error:`, data.error);
  } catch (e) {
    console.error(`[reuniones ${action}] fetch al Apps Script falló:`, e instanceof Error ? e.message : String(e));
  }
}

export async function PATCH(req: NextRequest) {
  const { id, fecha, hora, durationMinutes } = await req.json();
  if (!id || !fecha || !hora) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  const scheduledAt = new Date(`${fecha}T${hora}:00`).toISOString();

  const { data: existing } = await supabaseAdmin.from('meetings').select('event_id').eq('id', id).single();

  await syncCalendarEvent('updateMeeting', existing?.event_id ?? null, {
    startTime: scheduledAt,
    durationMinutes: durationMinutes ?? 45,
  });

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

  await syncCalendarEvent('deleteMeeting', existing?.event_id ?? null);

  const { error } = await supabaseAdmin.from('meetings').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
