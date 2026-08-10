// Tareas internas del equipo (pendientes con responsable, fecha límite y
// un documento adjunto opcional), guardadas en Supabase — mismo patrón
// que leads-sheet.ts.

import { supabaseAdmin } from '@/lib/supabase-admin';

export interface Tarea {
  id: string;
  createdAt: string;
  titulo: string;
  responsable: string; // '' | 'Terry' | 'Santiago' | 'Winona' | 'Maryori'
  fechaLimite: string; // 'YYYY-MM-DD' o ''
  completada: boolean;
  archivoUrl: string;
  archivoNombre: string;
}

export type TareaInput = Omit<Tarea, 'id' | 'createdAt'>;

interface TareaRow {
  id: string;
  created_at: string;
  titulo: string;
  responsable: string;
  fecha_limite: string | null;
  completada: boolean;
  archivo_url: string | null;
  archivo_nombre: string | null;
}

function rowToTarea(row: TareaRow): Tarea {
  return {
    id: row.id,
    createdAt: row.created_at,
    titulo: row.titulo ?? '',
    responsable: row.responsable ?? '',
    fechaLimite: row.fecha_limite ?? '',
    completada: !!row.completada,
    archivoUrl: row.archivo_url ?? '',
    archivoNombre: row.archivo_nombre ?? '',
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
      archivo_url: input.archivoUrl || null,
      archivo_nombre: input.archivoNombre || null,
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
  if (patch.archivoUrl !== undefined) row.archivo_url = patch.archivoUrl || null;
  if (patch.archivoNombre !== undefined) row.archivo_nombre = patch.archivoNombre || null;

  const { data, error } = await supabaseAdmin.from('tareas').update(row).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return rowToTarea(data);
}

export async function deleteTarea(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('tareas').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
