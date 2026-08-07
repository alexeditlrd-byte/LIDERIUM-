'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Lead } from '@/lib/leads-sheet';
import { computeLeadScore, esLeadCuestionario, NICHO_LABEL, TIER_META, type NichoClasificacion, type Tier } from '@/lib/lead-scoring';
import Dropdown from '@/components/Dropdown';

interface PanelLeadsPrioritariosProps {
  showToast: (text: string, ok?: boolean) => void;
}

const RESPONSABLES = ['Winona', 'Maryori'];

function waLink(numero: string) {
  return 'https://wa.me/' + (numero || '').replace(/[^0-9]/g, '');
}

function isToday(iso: string) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function PanelLeadsPrioritarios({ showToast }: PanelLeadsPrioritariosProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [reuniones, setReuniones] = useState<{ client_slug: string }[]>([]);
  const [pagos, setPagos] = useState<{ leadId: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [tierFilter, setTierFilter] = useState<'Todos' | Tier>('Todos');
  const [nichoFilter, setNichoFilter] = useState<'Todos' | NichoClasificacion>('Todos');
  const [responsableFilter, setResponsableFilter] = useState('Todos');
  const [orden, setOrden] = useState<'score' | 'fecha'>('score');
  const [soloHoy, setSoloHoy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/leads').then(r => r.json()),
      fetch('/api/reuniones').then(r => r.json()),
      fetch('/api/finanzas/pagos').then(r => r.json()),
    ])
      .then(([leadsData, reunionesData, pagosData]) => {
        setLeads(leadsData.leads ?? []);
        setReuniones(reunionesData.meetings ?? []);
        setPagos(pagosData.pagos ?? []);
      })
      .catch(() => showToast('No se pudo cargar SAT', false))
      .finally(() => setLoading(false));
  }, [showToast]);

  const nichosGanados = useMemo(
    () => [...new Set(leads.filter(l => l.estado === 'Ganado' && l.nicho.trim()).map(l => l.nicho))],
    [leads]
  );
  const reunionLeadIds = useMemo(() => new Set(reuniones.map(m => m.client_slug)), [reuniones]);
  const pagoLeadIds = useMemo(() => new Set(pagos.map(p => p.leadId)), [pagos]);

  const scored = useMemo(() => {
    return leads.filter(esLeadCuestionario).map(lead => ({
      lead,
      ...computeLeadScore(lead, {
        nichosGanados,
        tieneReunion: reunionLeadIds.has(lead.id),
        tienePago: pagoLeadIds.has(lead.id),
      }),
    }));
  }, [leads, nichosGanados, reunionLeadIds, pagoLeadIds]);

  const filtrados = useMemo(() => {
    let list = scored;
    if (tierFilter !== 'Todos') list = list.filter(s => s.tier === tierFilter);
    if (nichoFilter !== 'Todos') list = list.filter(s => s.nichoClasificacion === nichoFilter);
    if (responsableFilter !== 'Todos') list = list.filter(s => s.lead.responsable === responsableFilter);
    if (soloHoy) list = list.filter(s => isToday(s.lead.createdAt));
    const sorted = [...list].sort((a, b) => {
      if (orden === 'fecha') return new Date(b.lead.createdAt).getTime() - new Date(a.lead.createdAt).getTime();
      return b.score - a.score;
    });
    return sorted;
  }, [scored, tierFilter, nichoFilter, responsableFilter, soloHoy, orden]);

  const conteoPorTier = useMemo(() => {
    const c: Record<Tier, number> = { HOT: 0, WARM: 0, COLD: 0, SIN_CALIFICAR: 0 };
    scored.forEach(s => { c[s.tier]++; });
    return c;
  }, [scored]);

  const hoyCount = useMemo(() => scored.filter(s => isToday(s.lead.createdAt)).length, [scored]);

  return (
    <div>
      <div className="bg-white border border-[#ECEEF2] rounded-[18px] px-6 py-5 mb-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-[#15171C] to-[#2E6CA0] flex items-center justify-center flex-shrink-0 text-[20px]">🎯</div>
        <div>
          <div className="font-grotesk font-bold text-[17px] text-[#15171C]">Agente SAT</div>
          <div className="text-[13px] text-[#8A929E] font-semibold">
            Analiza automáticamente los leads del formulario web, los compara con clientes anteriores y los prioriza — para que no tengan que revisar todos uno por uno.
          </div>
        </div>
      </div>

      {/* KPIs por tier */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {(['HOT', 'WARM', 'COLD', 'SIN_CALIFICAR'] as Tier[]).map(t => (
          <button key={t} onClick={() => setTierFilter(tf => (tf === t ? 'Todos' : t))}
            className="text-left bg-white border rounded-[18px] px-5 py-5 cursor-pointer transition"
            style={{ borderColor: tierFilter === t ? TIER_META[t].color : '#ECEEF2' }}>
            <div className="text-[11px] text-[#8A929E] font-bold uppercase tracking-[0.05em]">{TIER_META[t].emoji} {TIER_META[t].label}</div>
            <div className="font-grotesk font-bold text-[26px] tracking-[-0.02em] mt-1.5" style={{ color: TIER_META[t].color }}>{conteoPorTier[t]}</div>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <button onClick={() => setSoloHoy(s => !s)}
          className={`px-3.5 py-[9px] rounded-[10px] text-[12.5px] font-bold cursor-pointer border transition ${soloHoy ? 'bg-[#15171C] text-white border-[#15171C]' : 'bg-white text-[#5A6270] border-[#E2E5EA] hover:border-[#15171C]'}`}>
          Leads prioritarios de hoy ({hoyCount})
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-[#9AA0A8] uppercase tracking-[0.05em]">Nicho</span>
          <Dropdown value={nichoFilter} onChange={v => setNichoFilter(v as 'Todos' | NichoClasificacion)}
            options={[{ value: 'Todos', label: 'Todos' }, ...(Object.keys(NICHO_LABEL) as NichoClasificacion[]).map(k => ({ value: k, label: NICHO_LABEL[k] }))]}
            className="h-[38px] bg-white border border-[#E2E5EA] rounded-[10px] px-3 text-[12.5px] font-bold text-[#3C434F] cursor-pointer outline-none" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-[#9AA0A8] uppercase tracking-[0.05em]">Comercial</span>
          <Dropdown value={responsableFilter} onChange={setResponsableFilter} options={['Todos', ...RESPONSABLES]}
            className="h-[38px] bg-white border border-[#E2E5EA] rounded-[10px] px-3 text-[12.5px] font-bold text-[#3C434F] cursor-pointer outline-none" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-[#9AA0A8] uppercase tracking-[0.05em]">Ordenar</span>
          <Dropdown value={orden} onChange={v => setOrden(v as 'score' | 'fecha')}
            options={[{ value: 'score', label: 'Por score' }, { value: 'fecha', label: 'Por fecha de ingreso' }]}
            className="h-[38px] bg-white border border-[#E2E5EA] rounded-[10px] px-3 text-[12.5px] font-bold text-[#3C434F] cursor-pointer outline-none" />
        </div>

        {tierFilter !== 'Todos' && (
          <button onClick={() => setTierFilter('Todos')} className="text-[11.5px] font-bold text-steel bg-transparent border-none cursor-pointer hover:underline p-0">
            Quitar filtro {TIER_META[tierFilter].label}
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-16 text-center text-[14px] text-[#8A929E] font-semibold">Analizando leads…</div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-16 flex flex-col items-center text-center">
          <div className="font-grotesk font-bold text-[17px] text-[#15171C] mb-1">Sin leads que mostrar</div>
          <div className="text-[13.5px] text-[#8A929E] font-semibold">SAT solo analiza leads que llegaron por el formulario web (/registro). Ajusta los filtros o espera nuevos registros.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtrados.map((s, i) => {
            const meta = TIER_META[s.tier];
            const expanded = expandedId === s.lead.id;
            return (
              <div key={s.lead.id} className="bg-white border rounded-[18px] overflow-hidden transition" style={{ borderColor: meta.border }}>
                <div className="px-6 py-5 cursor-pointer" onClick={() => setExpandedId(expanded ? null : s.lead.id)}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="flex-shrink-0 text-center w-[64px]">
                        <div className="text-[20px] leading-none">{meta.emoji}</div>
                        <div className="text-[10px] font-black uppercase tracking-[0.05em] mt-1" style={{ color: meta.color }}>Prioridad {i + 1}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-grotesk font-bold text-[16px] text-[#15171C]">{s.lead.nombre}</span>
                          <span className="text-[12.5px] font-black" style={{ color: meta.color }}>{s.score}/100</span>
                          <span className="text-[10.5px] font-black uppercase tracking-[0.03em] px-2 py-[3px] rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                        </div>
                        <div className="text-[12.5px] text-[#5A6270] font-semibold mt-1">
                          Nicho: {s.lead.nicho || '—'} · {NICHO_LABEL[s.nichoClasificacion]}
                        </div>
                        <div className="text-[12.5px] font-bold text-[#15171C] mt-1.5">➜ {s.accionRecomendada}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <a href={waLink(s.lead.numero)} target="_blank" rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-[9px] bg-[#EAF7F1] text-[#1F9B6E] text-[12px] font-bold no-underline">WhatsApp</a>
                      <button onClick={() => setExpandedId(expanded ? null : s.lead.id)}
                        className="px-3.5 py-2 rounded-[9px] bg-[#F4F6F8] text-[#5A6270] text-[12px] font-bold border-none cursor-pointer hover:bg-[#ECEEF2]">
                        {expanded ? 'Ocultar por qué' : 'Ver por qué'}
                      </button>
                    </div>
                  </div>
                </div>
                {expanded && (
                  <div className="px-6 pb-5 pt-1 border-t border-[#F0F2F5] bg-[#FAFBFC]">
                    <div className="text-[11px] font-black text-[#8A929E] uppercase tracking-[0.05em] mb-2 mt-3">Score: {s.score}/100 {meta.emoji} — Razones</div>
                    <ul className="flex flex-col gap-1.5 mb-3">
                      {s.razones.map((r, ri) => (
                        <li key={ri} className="text-[13px] text-[#3C434F] font-medium">{r}</li>
                      ))}
                    </ul>
                    <div className="grid grid-cols-2 gap-2.5 text-[12.5px]">
                      <div className="bg-white border border-[#EDEFF3] rounded-[10px] px-3 py-2.5">
                        <div className="text-[10px] font-black text-[#9AA0A8] uppercase tracking-[0.05em]">Correo</div>
                        <div className="font-bold text-[#15171C] break-all">{s.lead.email || '—'}</div>
                      </div>
                      <div className="bg-white border border-[#EDEFF3] rounded-[10px] px-3 py-2.5">
                        <div className="text-[10px] font-black text-[#9AA0A8] uppercase tracking-[0.05em]">Facturación mensual</div>
                        <div className="font-bold text-[#15171C]">{s.facturacionLabel || '—'}</div>
                      </div>
                      <div className="bg-white border border-[#EDEFF3] rounded-[10px] px-3 py-2.5">
                        <div className="text-[10px] font-black text-[#9AA0A8] uppercase tracking-[0.05em]">Producto/servicio</div>
                        <div className="font-bold text-[#15171C]">{s.lead.tipoInfoproductor || '—'}</div>
                      </div>
                      <div className="bg-white border border-[#EDEFF3] rounded-[10px] px-3 py-2.5">
                        <div className="text-[10px] font-black text-[#9AA0A8] uppercase tracking-[0.05em]">Estado / responsable</div>
                        <div className="font-bold text-[#15171C]">{s.lead.estado} · {s.lead.responsable || 'sin asignar'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
