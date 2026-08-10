// Tareas internas del equipo (pendientes con responsable y fecha límite
// opcional), guardadas en Supabase — mismo patrón que leads-sheet.ts.

import { supabaseAdmin } from '@/lib/supabase-admin';

export interface Tarea {
  id: string;
  createdAt: string;
  titulo: string;
  responsable: string; // '' | 'Winona' | 'Maryori'
  fechaLimite: string; // 'YYYY-MM-DD' o ''
  completada: boolean;
}

export type TareaInput = Omit<Tarea, 'id' | 'createdAt'>;

interface TareaRow {
  id: string;
  created_at: string;
  titulo: string;
  responsable: string;
  fecha_limite: string | null;
  completada: boolean;
}

function rowToTarea(row: TareaRow): Tarea {
  return {
    id: row.id,
    createdAt: row.created_at,
    titulo: row.titulo ?? '',
    responsable: row.responsable ?? '',
    fechaLimite: row.fecha_limite ?? '',
    completada: !!row.completada,
  };
}

export async function listTareas(): Promise<Tarea[]> {
  const { data, error } = await supabaseAdmin.from('tareas').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToTarea);
}

export async function createTarea(input: TareaInput): Promise<Tarea> {
  const id = String(Date.now());
  const { data, error } = await supabaseAdmin
    .from('tareas')
    .insert({
      id,
      titulo: input.titulo,
      responsable: input.responsable,
      fecha_limite: input.fechaLimite || null,
      completada: input.completada,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToTarea(data);
}

export async function updateTarea(id: string, patch: Partial<TareaInput>): Promise<Tarea> {
  const row: Record<string, unknown> = {};
  if (patch.titulo !== undefined) row.titulo = patch.titulo;
  if (patch.responsable !== undefined) row.responsable = patch.responsable;
  if (patch.fechaLimite !== undefined) row.fecha_limite = patch.fechaLimite || null;
  if (patch.completada !== undefined) row.completada = patch.completada;

  const { data, error } = await supabaseAdmin.from('tareas').update(row).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return rowToTarea(data);
}

export async function deleteTarea(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('tareas').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
