import { NextRequest, NextResponse } from 'next/server';
import { financeSheetConfigured, listFinanzas, updateFinanzasCell } from '@/lib/finanzas-sheet';

export async function GET() {
  if (!financeSheetConfigured()) {
    return NextResponse.json({ sections: null, configured: false });
  }
  try {
    const sections = await listFinanzas();
    return NextResponse.json({ sections, configured: true });
  } catch (e: any) {
    return NextResponse.json({ sections: null, configured: true, error: e.message ?? 'Error al leer el Google Sheet' }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!financeSheetConfigured()) {
    return NextResponse.json({ error: 'El Google Sheet de finanzas todavía no está conectado (falta GOOGLE_FINANZAS_WEBHOOK_URL).' }, { status: 503 });
  }
  const { row, col, value } = await req.json();
  if (!row || !col) return NextResponse.json({ error: 'Falta row o col' }, { status: 400 });
  try {
    await updateFinanzasCell(row, col, value);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Error al actualizar la celda en el Google Sheet' }, { status: 502 });
  }
}
