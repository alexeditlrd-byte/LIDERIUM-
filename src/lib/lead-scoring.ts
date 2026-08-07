// Agente "SAT" — puntuación y priorización de leads que vienen del
// formulario/cuestionario público (/registro).
//
// Es un cálculo puro y en vivo (no se guarda ningún score en la base de
// datos): cada vez que se pinta el panel "SAT — Leads Prioritarios" se
// recalcula con el estado actual del lead (fase, si ya tiene reunión, si
// ya abonó, si el equipo ajustó su prioridad a mano, etc.), así que la
// clasificación se actualiza sola en cuanto cambia algo.
//
// El score es 100% explicable: sale de sumar puntos por criterio (nicho
// histórico + nicho preferido por el equipo, facturación, completitud,
// señales de intención, canal de llegada), nunca es un número inventado.

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

export const TIER_ORDEN: Tier[] = ['HOT', 'WARM', 'COLD', 'SIN_CALIFICAR'];

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

// Coincidencia difusa: exacta, o alguna palabra de más de 3 letras en
// común con el término de referencia — misma lógica para comparar contra
// clientes Ganado y contra la lista de nichos preferidos del equipo.
function coincideDifuso(nicho: string, referencia: string): boolean {
  const n = normalizar(nicho);
  const r = normalizar(referencia);
  if (!n || !r) return false;
  if (n === r) return true;
  const palabrasN = n.split(/\s+/).filter(w => w.length > 3);
  const palabrasR = r.split(/\s+/).filter(w => w.length > 3);
  return palabrasN.some(w => r.includes(w)) || palabrasR.some(w => n.includes(w));
}

function clasificarNicho(nicho: string, nichosGanados: string[]): NichoClasificacion {
  const n = normalizar(nicho);
  if (!n) return 'no_validado';

  if (nichosGanados.some(g => normalizar(g) === n)) return 'validado';
  if (nichosGanados.some(g => coincideDifuso(nicho, g))) return 'potencial';

  // Sin coincidencia: si todavía no hay suficiente historial de clientes
  // Ganado como para comparar en serio, no es justo decir "no compatible".
  if (nichosGanados.length < 3) return 'no_validado';
  return 'baja_compatibilidad';
}

const FACTURACION_PUNTOS: { match: string; puntos: number }[] = [
  { match: 'mas de $20,000', puntos: 20 },
  { match: '$5,000 - $20,000', puntos: 15 },
  { match: '$1,000 - $5,000', puntos: 8 },
  { match: 'menos de $1,000', puntos: 3 },
];

function puntosFacturacion(label: string): number {
  const n = normalizar(label);
  const hit = FACTURACION_PUNTOS.find(f => n.includes(normalizar(f.match)));
  return hit?.puntos ?? 0;
}

// Perfil de cliente ideal que carga el equipo desde SAT (ICP, mapa de
// empatía y las listas de nichos que más/menos les acomoda trabajar). El
// ICP y el mapa de empatía son texto libre — se muestran como referencia
// para el equipo, pero lo que el algoritmo puede comparar de forma
// confiable son las listas de nichos, que sí son datos estructurados.
export interface SatPerfil {
  icp: string;
  mapaEmpatia: string;
  nichosCalientes: string[];
  nichosMedios: string[];
}

export const SAT_PERFIL_DEFAULT: SatPerfil = { icp: '', mapaEmpatia: '', nichosCalientes: [], nichosMedios: [] };

function puntosNichoPreferido(nicho: string, perfil: SatPerfil): { pts: number; razon: string | null } {
  if (!nicho.trim()) return { pts: 0, razon: null };
  if (perfil.nichosCalientes.some(c => coincideDifuso(nicho, c))) {
    return { pts: 15, razon: '✓ Rubro "en caliente" — de los que más le acomoda trabajar al equipo.' };
  }
  if (perfil.nichosMedios.some(c => coincideDifuso(nicho, c))) {
    return { pts: 8, razon: '✓ Rubro dentro de los nichos que el equipo maneja con buen resultado.' };
  }
  return { pts: 0, razon: null };
}

export interface LeadScoreContext {
  nichosGanados: string[];
  tieneReunion: boolean;
  tienePago: boolean;
  perfil: SatPerfil;
}

export interface LeadScore {
  score: number;
  tierCalculado: Tier;
  nichoClasificacion: NichoClasificacion;
  razones: string[];
  accionRecomendada: string;
  facturacionLabel: string;
}

export function computeLeadScore(lead: Lead, ctx: LeadScoreContext): LeadScore {
  const facturacionLabel = lead.cuestionario?.['Facturación mensual'] ?? '';
  const nichoClasificacion = clasificarNicho(lead.nicho, ctx.nichosGanados);

  const NICHO_PUNTOS: Record<NichoClasificacion, number> = { validado: 25, potencial: 14, no_validado: 6, baja_compatibilidad: 0 };
  const nichoPts = NICHO_PUNTOS[nichoClasificacion];
  const { pts: nichoPreferidoPts, razon: nichoPreferidoRazon } = puntosNichoPreferido(lead.nicho, ctx.perfil);
  const facturacionPts = puntosFacturacion(facturacionLabel);

  const camposClave = [lead.nombre, lead.email, lead.instagram, lead.numero, lead.tipoInfoproductor, lead.nicho, facturacionLabel];
  const camposLlenos = camposClave.filter(c => c && c.trim()).length;
  const completitudPts = Math.round((camposLlenos / camposClave.length) * 10);

  const estadoAvanzado = !['Nuevo', 'No calificado'].includes(lead.estado);
  const intencionPts = Math.min(20, (ctx.tieneReunion ? 10 : 0) + (estadoAvanzado ? 6 : 0) + (ctx.tienePago ? 4 : 0));

  const canalPts = 5 + (lead.linkAds?.trim() ? 5 : 0);

  const score = Math.min(100, nichoPts + nichoPreferidoPts + facturacionPts + completitudPts + intencionPts + canalPts);

  const sinInfoSuficiente = !lead.nicho.trim() && !lead.tipoInfoproductor.trim() && !facturacionLabel.trim();
  let tierCalculado: Tier;
  if (sinInfoSuficiente) tierCalculado = 'SIN_CALIFICAR';
  else if (score >= 80) tierCalculado = 'HOT';
  else if (score >= 55) tierCalculado = 'WARM';
  else tierCalculado = 'COLD';

  const razones: string[] = [];
  if (nichoClasificacion === 'validado') razones.push('✓ Nicho ya trabajado antes con éxito (coincide con clientes Ganado).');
  else if (nichoClasificacion === 'potencial') razones.push('✓ Nicho con buen potencial, aunque todavía sin historial fuerte.');
  else if (nichoClasificacion === 'no_validado') razones.push('− Todavía no hay suficiente historial para validar este nicho.');
  else razones.push('✗ Nicho sin coincidencias con clientes anteriores exitosos.');

  if (nichoPreferidoRazon) razones.push(nichoPreferidoRazon);

  if (facturacionPts >= 15) razones.push(`✓ Alta capacidad de inversión declarada (${facturacionLabel}).`);
  else if (facturacionPts >= 8) razones.push(`✓ Capacidad de inversión media (${facturacionLabel}).`);
  else if (facturacionPts > 0) razones.push(`− Capacidad de inversión declarada es baja (${facturacionLabel}).`);
  else razones.push('− No proporcionó su facturación mensual.');

  if (completitudPts >= 8) razones.push('✓ Cuestionario completo, buena cantidad de información.');
  else if (completitudPts < 4) razones.push('− Información incompleta en el cuestionario.');

  if (ctx.tieneReunion) razones.push('✓ Ya tiene una reunión agendada.');
  if (estadoAvanzado) razones.push(`✓ Avanzó de etapa (estado actual: ${lead.estado}).`);
  if (ctx.tienePago) razones.push('✓ Ya realizó un abono — intención de compra confirmada.');
  if (lead.linkAds?.trim()) razones.push('✓ Llegó por una campaña de Ads rastreada.');

  return { score, tierCalculado, nichoClasificacion, razones, accionRecomendada: ACCION[tierCalculado], facturacionLabel };
}

// El equipo puede arrastrar un lead a otra columna en el panel de SAT si
// no está de acuerdo con la clasificación automática — eso se guarda en
// leads.sat_tier_override y manda sobre el tier calculado.
export function tierEfectivo(tierCalculado: Tier, override: string): { tier: Tier; ajustadoAMano: boolean } {
  if (override && TIER_ORDEN.includes(override as Tier)) {
    return { tier: override as Tier, ajustadoAMano: override !== tierCalculado };
  }
  return { tier: tierCalculado, ajustadoAMano: false };
}
