import { NextRequest, NextResponse } from 'next/server';
import { sheetConfigured, listLeads, createLead, updateLead, deleteLead } from '@/lib/leads-sheet';

export async function GET() {
  if (!sheetConfigured()) {
    return NextResponse.json({ leads: [], configured: false });
  }
  try {
    const leads = await listLeads();
    return NextResponse.json({ leads, configured: true });
  } catch (e: any) {
    return NextResponse.json({ leads: [], configured: true, error: e.message ?? 'Error al leer el Google Sheet' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!sheetConfigured()) {
    return NextResponse.json({ error: 'El Google Sheet de leads todavía no está conectado (falta GOOGLE_LEADS_WEBHOOK_URL).' }, { status: 503 });
  }
  const body = await req.json();
  if (!body?.nombre?.trim() || !body?.numero?.trim() || !body?.precio) {
    return NextResponse.json({ error: 'Nombre, WhatsApp y precio son obligatorios.' }, { status: 400 });
  }
  try {
    const { lead, duplicate } = await createLead(body);
    return NextResponse.json({ lead, duplicate });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Error al guardar el lead en el Google Sheet' }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!sheetConfigured()) {
    return NextResponse.json({ error: 'El Google Sheet de leads todavía no está conectado (falta GOOGLE_LEADS_WEBHOOK_URL).' }, { status: 503 });
  }
  const { id, patch } = await req.json();
  if (!id || !patch) return NextResponse.json({ error: 'Falta id o patch' }, { status: 400 });
  try {
    const lead = await updateLead(id, patch);
    return NextResponse.json({ lead });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Error al actualizar el lead en el Google Sheet' }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!sheetConfigured()) {
    return NextResponse.json({ error: 'El Google Sheet de leads todavía no está conectado (falta GOOGLE_LEADS_WEBHOOK_URL).' }, { status: 503 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });
  try {
    await deleteLead(id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Error al eliminar el lead del Google Sheet' }, { status: 502 });
  }
}
