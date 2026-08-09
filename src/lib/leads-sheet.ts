// Leads del panel Comercial, guardados en Supabase (tabla "leads").
// Antes esto pasaba por un Google Apps Script que leía/escribía un Sheet;
// se migró a una tabla real porque el Sheet no soportaba bien dos personas
// editando a la vez (se corrompía el índice de fila) y era lento.

import { supabaseAdmin } from '@/lib/supabase-admin';

export interface Lead {
  id: string;
  createdAt: string; // ISO — cuándo se creó el lead de verdad, para agrupar por día (no confundir con fechaInicio, que es editable)
  nombre: string;
  instagram: string;
  numero: string;
  tipoInfoproductor: string;
  nicho: string;
  plataformas: string;
  linkAds: string;
  email: string;
  // Canal por el que entró el lead: 'web' (formulario /registro),
  // 'whatsapp'/'instagram' (creado desde un chat) o '' (manual, o leads
  // de antes de que existiera este campo). Se etiqueta al crear el lead,
  // no se intenta reconstruir después.
  origenCanal: string;
  // Respuestas del formulario público de captación que no tienen columna
  // propia (ej. facturación mensual) — { pregunta: respuesta }.
  cuestionario: Record<string, string> | null;
  nps: string;
  plan: string;
  faseVenta: string;
  probabilidad: string;
  responsable: string;
  propietario: string;
  fechaInicio: string; // dd/mm/yyyy
  fechaRenovacion: string; // dd/mm/yyyy
  precio: number;
  abono: number;
  estado: 'Nuevo' | 'No calificado' | 'Contactado' | 'Ganado' | 'Perdido';
  prioridad: 'Alta' | 'Media' | 'Baja';
  observacion: string;
  // Si el equipo arrastra el lead a otra columna en el panel SAT, esto
  // manda sobre el tier que calcula el algoritmo ('' = sin ajustar).
  satTierOverride: string;
  // Nota libre que queda de feedback (ej. al ganar un cliente) para que
  // el equipo entienda después por qué se cerró — insumo para ir
  // afinando los criterios de SAT con resultados reales.
  satFeedback: string;
}

export type LeadInput = Omit<Lead, 'id' | 'createdAt'>;

export function sheetConfigured() {
  return true;
}

interface LeadRow {
  id: string;
  created_at: string;
  nombre: string;
  instagram: string;
  numero: string;
  tipo_infoproductor: string;
  nicho: string;
  plataformas: string;
  link_ads: string;
  email: string;
  origen_canal: string;
  cuestionario: Record<string, string> | null;
  nps: string;
  plan: string;
  fase_venta: string;
  probabilidad: string;
  responsable: string;
  propietario: string;
  fecha_inicio: string;
  fecha_renovacion: string;
  precio: number;
  abono: number;
  estado: string;
  prioridad: string;
  observacion: string;
  sat_tier_override: string;
  sat_feedback: string;
}

const FIELD_TO_COLUMN: Record<keyof LeadInput, string> = {
  nombre: 'nombre',
  instagram: 'instagram',
  numero: 'numero',
  tipoInfoproductor: 'tipo_infoproductor',
  nicho: 'nicho',
  plataformas: 'plataformas',
  linkAds: 'link_ads',
  email: 'email',
  origenCanal: 'origen_canal',
  cuestionario: 'cuestionario',
  nps: 'nps',
  plan: 'plan',
  faseVenta: 'fase_venta',
  probabilidad: 'probabilidad',
  responsable: 'responsable',
  propietario: 'propietario',
  fechaInicio: 'fecha_inicio',
  fechaRenovacion: 'fecha_renovacion',
  precio: 'precio',
  abono: 'abono',
  estado: 'estado',
  prioridad: 'prioridad',
  observacion: 'observacion',
  satTierOverride: 'sat_tier_override',
  satFeedback: 'sat_feedback',
};

function rowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    createdAt: row.created_at,
    nombre: row.nombre ?? '',
    instagram: row.instagram ?? '',
    numero: row.numero ?? '',
    tipoInfoproductor: row.tipo_infoproductor ?? '',
    nicho: row.nicho ?? '',
    plataformas: row.plataformas ?? '',
    linkAds: row.link_ads ?? '',
    email: row.email ?? '',
    origenCanal: row.origen_canal ?? '',
    cuestionario: row.cuestionario ?? null,
    nps: row.nps ?? '',
    plan: row.plan ?? '',
    faseVenta: row.fase_venta ?? '',
    probabilidad: row.probabilidad ?? '',
    responsable: row.responsable ?? '',
    propietario: row.propietario ?? '',
    fechaInicio: row.fecha_inicio ?? '',
    fechaRenovacion: row.fecha_renovacion ?? '',
    precio: Number(row.precio) || 0,
    abono: Number(row.abono) || 0,
    estado: row.estado as Lead['estado'],
    prioridad: row.prioridad as Lead['prioridad'],
    observacion: row.observacion ?? '',
    satTierOverride: row.sat_tier_override ?? '',
    satFeedback: row.sat_feedback ?? '',
  };
}

function patchToColumns(patch: Partial<LeadInput>) {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    const column = FIELD_TO_COLUMN[key as keyof LeadInput];
    if (column) row[column] = value;
  }
  return row;
}

// Orden de desempate cuando dos comerciales tienen la misma carga —
// también es el orden por defecto si la tabla "comerciales" no existe/está vacía.
const COMERCIALES_ORDEN = ['Maryori', 'Winona'];

function normalizePhone(numero: string) {
  return (numero || '').replace(/[^0-9]/g, '');
}

// Asigna el lead nuevo al comercial disponible con menos leads en este
// momento (empate se rompe con COMERCIALES_ORDEN). Con dos comerciales
// arrancando parejo esto da el mismo resultado que un Round Robin
// clásico, pero además se autobalancea solo y respeta disponibilidad
// sin tocar los leads ya asignados.
async function assignResponsable(): Promise<string> {
  const { data: comerciales } = await supabaseAdmin.from('comerciales').select('nombre, disponible');
  const disponibles = (comerciales && comerciales.length > 0)
    ? comerciales.filter(c => c.disponible).map(c => c.nombre)
    : COMERCIALES_ORDEN;
  if (disponibles.length === 0) return '';
  if (disponibles.length === 1) return disponibles[0];

  const { data: rows } = await supabaseAdmin.from('leads').select('responsable');
  const counts: Record<string, number> = {};
  for (const nombre of disponibles) counts[nombre] = 0;
  for (const r of rows ?? []) {
    if (r.responsable && counts[r.responsable] !== undefined) counts[r.responsable]++;
  }

  const ordenados = [...disponibles].sort((a, b) => COMERCIALES_ORDEN.indexOf(a) - COMERCIALES_ORDEN.indexOf(b));
  return ordenados.reduce((min, actual) => (counts[actual] < counts[min] ? actual : min), ordenados[0]);
}

export async function listLeads(): Promise<Lead[]> {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToLead);
}

export async function createLead(input: LeadInput): Promise<{ lead: Lead; duplicate: boolean }> {
  const phone = normalizePhone(input.numero);
  if (phone) {
    const { data: existing } = await supabaseAdmin.from('leads').select('*');
    const match = (existing ?? []).find((r) => normalizePhone(r.numero) === phone);
    if (match) return { lead: rowToLead(match as LeadRow), duplicate: true };
  }

  const responsable = input.responsable || await assignResponsable();

  const id = String(Date.now());
  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({ id, ...patchToColumns(input), responsable })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { lead: rowToLead(data), duplicate: false };
}

export async function updateLead(id: string, patch: Partial<LeadInput>): Promise<Lead> {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .update(patchToColumns(patch))
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToLead(data);
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('leads').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
