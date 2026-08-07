// Disponibilidad de horarios por propietario (Terry, Santiago, Winona,
// Maryori), calculada en vivo cruzando las reuniones que ya existen en la
// tabla "meetings" (mismo campo "mentor" que ya usa el formulario de
// reuniones) — no se guarda ningún calendario aparte.

import { supabaseAdmin } from '@/lib/supabase-admin';

const LIMA_OFFSET_MIN = -5 * 60; // America/Lima, sin horario de verano
const SLOT_STEP_MIN = 30;

export const PROPIETARIOS_DISPONIBILIDAD = ['Terry', 'Santiago', 'Winona', 'Maryori'];

interface HorarioLaboral {
  horaInicio: string; // 'HH:MM'
  horaFin: string; // 'HH:MM'
  dias: number[]; // 0=domingo ... 6=sábado
}

const HORARIO_DEFAULT: HorarioLaboral = { horaInicio: '09:00', horaFin: '18:00', dias: [1, 2, 3, 4, 5] };

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

function limaParts(iso: string) {
  const d = new Date(new Date(iso).getTime() + LIMA_OFFSET_MIN * 60000);
  return {
    dateKey: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}

// Convierte una fecha+hora en horario de Lima (elegida por el usuario) a un ISO UTC real.
export function limaToISO(fechaYMD: string, horaHHMM: string): string {
  const [y, m, d] = fechaYMD.split('-').map(Number);
  const [hh, mm] = horaHHMM.split(':').map(Number);
  const utcMs = Date.UTC(y, m - 1, d, hh, mm) - LIMA_OFFSET_MIN * 60000;
  return new Date(utcMs).toISOString();
}

export async function getHorarioLaboral(propietario: string): Promise<HorarioLaboral> {
  const { data } = await supabaseAdmin.from('horarios_laborales').select('*').eq('propietario', propietario).single();
  if (!data) return HORARIO_DEFAULT;
  return { horaInicio: data.hora_inicio, horaFin: data.hora_fin, dias: data.dias ?? HORARIO_DEFAULT.dias };
}

interface BusyRange { start: number; end: number; }

async function getBusyRanges(propietario: string, fechaYMD: string, excludeMeetingId?: string): Promise<BusyRange[]> {
  const { data } = await supabaseAdmin.from('meetings').select('id, scheduled_at, duration_minutes').eq('mentor', propietario);
  return (data ?? [])
    .filter((m) => m.id !== excludeMeetingId)
    .map((m) => {
      const { dateKey, minutes } = limaParts(m.scheduled_at);
      return { dateKey, start: minutes, end: minutes + (Number(m.duration_minutes) || 45) };
    })
    .filter((r) => r.dateKey === fechaYMD)
    .map((r) => ({ start: r.start, end: r.end }));
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

export interface SlotAvailability { time: string; available: boolean; }

export async function computeAvailability(
  propietario: string,
  fechaYMD: string,
  durationMinutes: number
): Promise<SlotAvailability[]> {
  const horario = await getHorarioLaboral(propietario);
  const [y, m, d] = fechaYMD.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (!horario.dias.includes(weekday)) return [];

  const busy = await getBusyRanges(propietario, fechaYMD);
  const inicio = toMinutes(horario.horaInicio);
  const fin = toMinutes(horario.horaFin);

  const slots: SlotAvailability[] = [];
  for (let t = inicio; t + durationMinutes <= fin; t += SLOT_STEP_MIN) {
    const isBusy = busy.some((r) => overlaps(t, t + durationMinutes, r.start, r.end));
    const hh = String(Math.floor(t / 60)).padStart(2, '0');
    const mm = String(t % 60).padStart(2, '0');
    slots.push({ time: `${hh}:${mm}`, available: !isBusy });
  }
  return slots;
}

// Para validar en el servidor antes de crear/reprogramar una reunión.
export async function hasConflict(
  propietario: string,
  scheduledAtISO: string,
  durationMinutes: number,
  excludeMeetingId?: string
): Promise<boolean> {
  const { dateKey, minutes } = limaParts(scheduledAtISO);
  const busy = await getBusyRanges(propietario, dateKey, excludeMeetingId);
  return busy.some((r) => overlaps(minutes, minutes + durationMinutes, r.start, r.end));
}
