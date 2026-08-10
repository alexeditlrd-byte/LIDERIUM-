import { NextRequest, NextResponse } from 'next/server';
import { listTareas, createTarea, updateTarea, deleteTarea } from '@/lib/tareas';

export async function GET() {
  try {
    const tareas = await listTareas();
    return NextResponse.json({ tareas });
  } catch (e) {
    return NextResponse.json({ tareas: [], error: e instanceof Error ? e.message : 'Error al leer las tareas' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.titulo?.trim()) return NextResponse.json({ error: 'Falta el título de la tarea' }, { status: 400 });
  try {
    const tarea = await createTarea({
      titulo: body.titulo.trim(),
      responsable: body.responsable ?? '',
      fechaLimite: body.fechaLimite ?? '',
      completada: false,
      archivoUrl: body.archivoUrl ?? '',
      archivoNombre: body.archivoNombre ?? '',
    });
    return NextResponse.json({ tarea });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al crear la tarea' }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest) {
  const { id, patch } = await req.json();
  if (!id || !patch) return NextResponse.json({ error: 'Falta id o patch' }, { status: 400 });
  try {
    const tarea = await updateTarea(id, patch);
    return NextResponse.json({ tarea });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al actualizar la tarea' }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });
  try {
    await deleteTarea(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al eliminar la tarea' }, { status: 502 });
  }
}
