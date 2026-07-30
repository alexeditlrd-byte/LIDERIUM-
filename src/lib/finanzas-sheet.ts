// Puente hacia el Google Sheet "FINANZAS LIDERIUM", mismo patrón que leads-sheet.ts:
// un Google Apps Script publicado como Web App (ver docs/finanzas-apps-script.md).

export interface FinanzasCell {
  col: number;
  month: string;
  value: string | number;
  editable: boolean;
}

export interface FinanzasRow {
  sheet: string;
  row: number;
  label: string;
  cells: FinanzasCell[];
}

export interface FinanzasSections {
  flujo: FinanzasRow[];
  resultados: FinanzasRow[];
  balance: FinanzasRow[];
}

const WEBHOOK_URL = process.env.GOOGLE_FINANZAS_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.GOOGLE_FINANZAS_WEBHOOK_SECRET;

export function financeSheetConfigured() {
  return Boolean(WEBHOOK_URL);
}

async function callWebhook(body: Record<string, unknown>) {
  if (!WEBHOOK_URL) throw new Error('GOOGLE_FINANZAS_WEBHOOK_URL no está configurado');
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: WEBHOOK_SECRET, ...body }),
    cache: 'no-store',
  });
  const text = await res.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { throw new Error(`Respuesta inválida del Apps Script: ${text.slice(0, 200)}`); }
  if (!res.ok || data.error) throw new Error((data.error as string) || `Apps Script devolvió ${res.status}`);
  return data;
}

export async function listFinanzas(): Promise<FinanzasSections> {
  const data = await callWebhook({ action: 'list' });
  return {
    flujo: (data.flujo as FinanzasRow[]) ?? [],
    resultados: (data.resultados as FinanzasRow[]) ?? [],
    balance: (data.balance as FinanzasRow[]) ?? [],
  };
}

export async function updateFinanzasCell(sheet: string, row: number, col: number, value: string | number): Promise<void> {
  await callWebhook({ action: 'updateCell', sheet, row, col, value });
}
