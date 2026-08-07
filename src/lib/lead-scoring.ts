// Agente "SAT" — puntuación y priorización de leads que vienen del
// formulario/cuestionario público (/registro).
//
// Es un cálculo puro y en vivo (no se guarda ningún score en la base de
// datos): cada vez que se pinta el panel "SAT — Leads Prioritarios" se
// recalcula con el estado actual del lead (fase, si ya tiene reunión, si
// ya abonó, etc.), así que la clasificación se actualiza sola en cuanto
// cambia algo — sin necesidad de un job ni de sincronizar un valor viejo.
//
// El score es 100% explicable: sale de sumar puntos por criterio
// (nicho, facturación, completitud del cuestionario, señales de
// intención, canal de llegada), nunca es un número inventado.

import type { Lead } from '@/lib/leads-sheet';

export function esLeadCuestionario(lead: Lead): boolean {
  return !!(lead.email || (lead.cuestionario && Object.keys(lead.cuestionario).length > 0));
}

export type NichoClasificacion = 'validado' | 'potencial' | 'no_validado' | 'baja_compatibilidad';
export type Tier = 'HOT' | 'WARM' | 'COLD' | 'SIN_CALIFICAR';

export const NICHO_LABEL: Record<NichoClasificacion, string> = {
  validado: 'Nicho validado',
  potencial: 'Nicho con potencial',
  no_validado: 'Nicho no validado',
  baja_compatibilidad: 'Baja compatibilidad',
};

export const TIER_META: Record<Tier, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  HOT: { emoji: '🔥', label: 'HOT', color: '#B4232F', bg: '#FCEDED', border: '#F3C9C9' },
  WARM: { emoji: '🟡', label: 'WARM', color: '#B5740F', bg: '#FBF1E2', border: '#F0D9A8' },
  COLD: { emoji: '🔵', label: 'COLD', color: '#2E6CA0', bg: '#EAF1F8', border: '#CFE0F0' },
  SIN_CALIFICAR: { emoji: '⚪', label: 'SIN CALIFICAR', color: '#6B7280', bg: '#F1F2F5', border: '#E2E5EA' },
};

const ACCION: Record<Tier, string> = {
  HOT: 'Contactar de inmediato y buscar agendar reunión.',
  WARM: 'Contactar hoy y validar información antes de agendar.',
  COLD: 'Contacto normal — recopilar más información antes de priorizar.',
  SIN_CALIFICAR: 'Completar información del cuestionario antes de priorizar.',
};

function normalizar(s: string): string {
  const acentos: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n' };
  return s.toLowerCase().trim().split('').map(c => acentos[c] ?? c).join('');
}

function clasificarNicho(nicho: string, nichosGanados: string[]): NichoClasificacion {
  const n = normalizar(nicho);
  if (!n) return 'no_validado';

  const exacto = nichosGanados.some(g => normalizar(g) === n);
  if (exacto) return 'validado';

  const palabras = n.split(/\s+/).filter(w => w.length > 3);
  const parcial = nichosGanados.some(g => {
    const gn = normalizar(g);
    return palabras.some(w => gn.includes(w)) || (gn.length > 3 && n.includes(gn));
  });
  if (parcial) return 'potencial';

  // Sin coincidencia: si todavía no hay suficiente historial de clientes
  // Ganado como para comparar en serio, no es justo decir "no compatible".
  if (nichosGanados.length < 3) return 'no_validado';
  return 'baja_compatibilidad';
}

const FACTURACION_PUNTOS: { match: string; puntos: number }[] = [
  { match: 'mas de $20,000', puntos: 25 },
  { match: '$5,000 - $20,000', puntos: 20 },
  { match: '$1,000 - $5,000', puntos: 12 },
  { match: 'menos de $1,000', puntos: 5 },
];

function puntosFacturacion(label: string): number {
  const n = normalizar(label);
  const hit = FACTURACION_PUNTOS.find(f => n.includes(normalizar(f.match)));
  return hit?.puntos ?? 0;
}

export interface LeadScoreContext {
  nichosGanados: string[];
  tieneReunion: boolean;
  tienePago: boolean;
}

export interface LeadScore {
  score: number;
  tier: Tier;
  nichoClasificacion: NichoClasificacion;
  razones: string[];
  accionRecomendada: string;
  facturacionLabel: string;
}

export function computeLeadScore(lead: Lead, ctx: LeadScoreContext): LeadScore {
  const facturacionLabel = lead.cuestionario?.['Facturación mensual'] ?? '';
  const nichoClasificacion = clasificarNicho(lead.nicho, ctx.nichosGanados);

  const NICHO_PUNTOS: Record<NichoClasificacion, number> = { validado: 35, potencial: 20, no_validado: 8, baja_compatibilidad: 0 };
  const nichoPts = NICHO_PUNTOS[nichoClasificacion];
  const facturacionPts = puntosFacturacion(facturacionLabel);

  const camposClave = [lead.nombre, lead.email, lead.instagram, lead.numero, lead.tipoInfoproductor, lead.nicho, facturacionLabel];
  const camposLlenos = camposClave.filter(c => c && c.trim()).length;
  const completitudPts = Math.round((camposLlenos / camposClave.length) * 15);

  const estadoAvanzado = !['Nuevo', 'No calificado'].includes(lead.estado);
  const intencionPts = Math.min(15, (ctx.tieneReunion ? 8 : 0) + (estadoAvanzado ? 4 : 0) + (ctx.tienePago ? 3 : 0));

  const canalPts = 5 + (lead.linkAds?.trim() ? 5 : 0);

  const score = Math.min(100, nichoPts + facturacionPts + completitudPts + intencionPts + canalPts);

  const sinInfoSuficiente = !lead.nicho.trim() && !lead.tipoInfoproductor.trim() && !facturacionLabel.trim();
  let tier: Tier;
  if (sinInfoSuficiente) tier = 'SIN_CALIFICAR';
  else if (score >= 80) tier = 'HOT';
  else if (score >= 55) tier = 'WARM';
  else tier = 'COLD';

  const razones: string[] = [];
  if (nichoClasificacion === 'validado') razones.push('✓ Nicho ya trabajado antes con éxito (coincide con clientes Ganado).');
  else if (nichoClasificacion === 'potencial') razones.push('✓ Nicho con buen potencial, aunque todavía sin historial fuerte.');
  else if (nichoClasificacion === 'no_validado') razones.push('− Todavía no hay suficiente historial para validar este nicho.');
  else razones.push('✗ Nicho sin coincidencias con clientes anteriores exitosos.');

  if (facturacionPts >= 20) razones.push(`✓ Alta capacidad de inversión declarada (${facturacionLabel}).`);
  else if (facturacionPts >= 12) razones.push(`✓ Capacidad de inversión media (${facturacionLabel}).`);
  else if (facturacionPts > 0) razones.push(`− Capacidad de inversión declarada es baja (${facturacionLabel}).`);
  else razones.push('− No proporcionó su facturación mensual.');

  if (completitudPts >= 12) razones.push('✓ Cuestionario completo, buena cantidad de información.');
  else if (completitudPts < 6) razones.push('− Información incompleta en el cuestionario.');

  if (ctx.tieneReunion) razones.push('✓ Ya tiene una reunión agendada.');
  if (estadoAvanzado) razones.push(`✓ Avanzó de etapa (estado actual: ${lead.estado}).`);
  if (ctx.tienePago) razones.push('✓ Ya realizó un abono — intención de compra confirmada.');
  if (lead.linkAds?.trim()) razones.push('✓ Llegó por una campaña de Ads rastreada.');

  return { score, tier, nichoClasificacion, razones, accionRecomendada: ACCION[tier], facturacionLabel };
}
