// Hace coincidir una conversación de WhatsApp/Instagram con su lead en
// Comercial — por teléfono (WhatsApp) o por usuario de Instagram. Es solo
// lectura/comparación en el navegador, no toca la base de datos.
import type { Lead } from '@/lib/leads-sheet';

function normalizePhone(numero: string): string {
  return (numero || '').replace(/[^0-9]/g, '');
}
function normalizeHandle(handle: string): string {
  return (handle || '').replace(/^@/, '').trim().toLowerCase();
}

export function matchLeadByPhone(leads: Lead[], phone: string): Lead | null {
  const target = normalizePhone(phone);
  if (!target) return null;
  return leads.find(l => normalizePhone(l.numero) === target) ?? null;
}

export function matchLeadByInstagram(leads: Lead[], username: string): Lead | null {
  const target = normalizeHandle(username);
  if (!target) return null;
  return leads.find(l => normalizeHandle(l.instagram) === target) ?? null;
}
