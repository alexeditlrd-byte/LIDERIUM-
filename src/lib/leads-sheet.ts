// Leads del panel Comercial, guardados en Supabase (tabla "leads").
// Antes esto pasaba por un Google Apps Script que leía/escribía un Sheet;
// se migró a una tabla real porque el Sheet no soportaba bien dos personas
// editando a la vez (se corrompía el índice de fila) y era lento.

import { supabaseAdmin } from '@/lib/supabase-admin';

export interface Lead {
  id: string;
  nombre: string;
  instagram: string;
  numero: string;
  tipoInfoproductor: string;
  nicho: string;
  plataformas: string;
  nps: string;
  plan: string;
  faseVenta: string;
  probabilidad: string;
  responsable: string;
  fechaInicio: string; // dd/mm/yyyy
  fechaRenovacion: string; // dd/mm/yyyy
  precio: number;
  abono: number;
  estado: 'Nuevo' | 'Contactado' | 'Ganado' | 'Perdido';
  prioridad: 'Alta' | 'Media' | 'Baja';
  observacion: string;
}

export type LeadInput = Omit<Lead, 'id'>;

export function sheetConfigured() {
  return true;
}

interface LeadRow {
  id: string;
  nombre: string;
  instagram: string;
  numero: string;
  tipo_infoproductor: string;
  nicho: string;
  plataformas: string;
  nps: string;
  plan: string;
  fase_venta: string;
  probabilidad: string;
  responsable: string;
  fecha_inicio: string;
  fecha_renovacion: string;
  precio: number;
  abono: number;
  estado: string;
  prioridad: string;
  observacion: string;
}

const FIELD_TO_COLUMN: Record<keyof LeadInput, string> = {
  nombre: 'nombre',
  instagram: 'instagram',
  numero: 'numero',
  tipoInfoproductor: 'tipo_infoproductor',
  nicho: 'nicho',
  plataformas: 'plataformas',
  nps: 'nps',
  plan: 'plan',
  faseVenta: 'fase_venta',
  probabilidad: 'probabilidad',
  responsable: 'responsable',
  fechaInicio: 'fecha_inicio',
  fechaRenovacion: 'fecha_renovacion',
  precio: 'precio',
  abono: 'abono',
  estado: 'estado',
  prioridad: 'prioridad',
  observacion: 'observacion',
};

function rowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    nombre: row.nombre,
    instagram: row.instagram,
    numero: row.numero,
    tipoInfoproductor: row.tipo_infoproductor,
    nicho: row.nicho,
    plataformas: row.plataformas,
    nps: row.nps,
    plan: row.plan,
    faseVenta: row.fase_venta,
    probabilidad: row.probabilidad,
    responsable: row.responsable,
    fechaInicio: row.fecha_inicio,
    fechaRenovacion: row.fecha_renovacion,
    precio: Number(row.precio) || 0,
    abono: Number(row.abono) || 0,
    estado: row.estado as Lead['estado'],
    prioridad: row.prioridad as Lead['prioridad'],
    observacion: row.observacion,
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

export async function listLeads(): Promise<Lead[]> {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToLead);
}

export async function createLead(input: LeadInput): Promise<Lead> {
  const id = String(Date.now());
  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({ id, ...patchToColumns(input) })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToLead(data);
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
