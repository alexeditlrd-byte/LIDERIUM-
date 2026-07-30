// Puente hacia el Google Sheet "CRM" del equipo comercial.
// La app no habla con la API de Sheets directamente: llama a un Google Apps Script
// publicado como Web App (ver docs/panel-comercial-apps-script.md) que lee/escribe
// una pestaña dedicada del spreadsheet. Así el equipo puede seguir usando su Excel
// de Drive como fuente de verdad sin exponer credenciales de servicio en Vercel.

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

const WEBHOOK_URL = process.env.GOOGLE_LEADS_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.GOOGLE_LEADS_WEBHOOK_SECRET;

export function sheetConfigured() {
  return Boolean(WEBHOOK_URL);
}

async function callWebhook(body: Record<string, unknown>) {
  if (!WEBHOOK_URL) throw new Error('GOOGLE_LEADS_WEBHOOK_URL no está configurado');
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

export async function listLeads(): Promise<Lead[]> {
  const data = await callWebhook({ action: 'list' });
  return Array.isArray(data.leads) ? data.leads : [];
}

export async function createLead(input: LeadInput): Promise<Lead> {
  const data = await callWebhook({ action: 'create', lead: input });
  return data.lead as Lead;
}

export async function updateLead(id: string, patch: Partial<LeadInput>): Promise<Lead> {
  const data = await callWebhook({ action: 'update', id, patch });
  return data.lead as Lead;
}

export async function deleteLead(id: string): Promise<void> {
  await callWebhook({ action: 'delete', id });
}
