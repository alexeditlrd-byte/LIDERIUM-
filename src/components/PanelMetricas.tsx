'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Lead } from '@/lib/leads-sheet';

interface Pago { id: string; leadId: string; monto: number; fecha: string; }

const CANAL_LABEL: Record<string, string> = {
  web: 'Web · Formulario',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  '': 'Manual',
};
const CANAL_COLOR: Record<string, string> = {
  web: '#1F9B6E',
  whatsapp: '#1F9B6E',
  instagram: '#B5740F',
  '': '#5A6270',
};
const PALETA = ['#7C5CBF', '#2E6CA0', '#1F9B6E', '#B5740F', '#D14343', '#5A6270', '#0EA5A5', '#C2578A'];

function money(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`;
}

interface Fila {
  key: string;
  label: string;
  total: number;
  ganados: number;
  tasa: number;
  ingresos: number;
}

function agrupar(leads: Lead[], ingresosPorLead: Map<string, number>, keyOf: (l: Lead) => string, labelOf: (key: string) => string): Fila[] {
  const grupos = new Map<string, Lead[]>();
  for (const l of leads) {
    const key = keyOf(l);
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(l);
  }
  return [...grupos.entries()]
    .map(([key, propios]) => {
      const total = propios.length;
      const ganados = propios.filter(l => l.estado === 'Ganado').length;
      const ingresos = propios.reduce((sum, l) => sum + (ingresosPorLead.get(l.id) ?? 0), 0);
      return { key, label: labelOf(key), total, ganados, tasa: total > 0 ? Math.round((ganados / total) * 100) : 0, ingresos };
    })
    .sort((a, b) => b.total - a.total);
}

// Barra horizontal — el largo lo define "value" contra "max" del grupo, no
// la tasa de conversión sola (con pocos leads casi todo da 0-100% parejo,
// así que la barra quedaba plana; el volumen sí se distingue a simple vista).
function BarRow({ label, value, max, color, numeros }: { label: string; value: number; max: number; color: string; numeros: React.ReactNode }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 4) : 4;
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-[13px] font-bold text-[#15171C] truncate">{label}</span>
        <div className="shrink-0">{numeros}</div>
      </div>
      <div className="h-[10px] rounded-full bg-[#F0F2F5] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function NumBadge({ children, color }: { children: React.ReactNode; color?: string }) {
  return <span className="text-[11.5px] font-black" style={{ color: color ?? '#8A929E' }}>{children}</span>;
}

function Donut({ segments, size = 132 }: { segments: { color: string; pct: number }[]; size?: number }) {
  const { partes } = segments.filter(s => s.pct > 0).reduce(
    (state, s) => {
      const start = state.acc;
      const end = state.acc + s.pct;
      return { acc: end, partes: [...state.partes, `${s.color} ${start}% ${end}%`] };
    },
    { acc: 0, partes: [] as string[] }
  );
  const stops = partes.join(', ');
  const hole = size * 0.32;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full" style={{ background: stops ? `conic-gradient(${stops})` : '#F0F2F5' }} />
      <div className="absolute rounded-full bg-white flex items-center justify-center" style={{ inset: (size - hole) / 2 }}>
        <span className="text-[10px] font-black text-[#9AA0A8] uppercase tracking-[0.03em]">Leads</span>
      </div>
    </div>
  );
}

function SeccionVacia() {
  return <div className="px-6 py-10 text-center text-[13.5px] text-[#8A929E] font-semibold">Todavía no hay datos suficientes.</div>;
}

export default function PanelMetricas() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/leads').then(r => r.json()),
      fetch('/api/finanzas/pagos').then(r => r.json()),
    ])
      .then(([l, p]) => { setLeads(l.leads ?? []); setPagos(p.pagos ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ingresosPorLead = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of pagos) m.set(p.leadId, (m.get(p.leadId) ?? 0) + Number(p.monto || 0));
    return m;
  }, [pagos]);

  const porNichoAll = useMemo(
    () => agrupar(leads, ingresosPorLead, l => l.nicho.trim() || '—', key => (key === '—' ? 'Sin nicho' : key)),
    [leads, ingresosPorLead]
  );
  const porNicho = useMemo(() => porNichoAll.slice(0, 8), [porNichoAll]);
  const maxNicho = useMemo(() => Math.max(1, ...porNicho.map(f => f.total)), [porNicho]);

  const porCanal = useMemo(
    () => agrupar(leads, ingresosPorLead, l => (l.origenCanal || ''), key => CANAL_LABEL[key] ?? key),
    [leads, ingresosPorLead]
  );
  const totalCanalLeads = useMemo(() => porCanal.reduce((s, f) => s + f.total, 0), [porCanal]);
  const donutSegments = useMemo(
    () => porCanal.map(f => ({ color: CANAL_COLOR[f.key] ?? '#5A6270', pct: totalCanalLeads > 0 ? (f.total / totalCanalLeads) * 100 : 0 })),
    [porCanal, totalCanalLeads]
  );

  const porAdsAll = useMemo(
    () => agrupar(leads.filter(l => l.linkAds.trim()), ingresosPorLead, l => l.linkAds.trim(), key => key),
    [leads, ingresosPorLead]
  );
  const porAds = useMemo(() => porAdsAll.slice(0, 8), [porAdsAll]);
  const totalIngresosAds = useMemo(() => porAdsAll.reduce((sum, f) => sum + f.ingresos, 0), [porAdsAll]);
  const hayIngresosAds = totalIngresosAds > 0;
  const maxAds = useMemo(
    () => Math.max(1, ...porAds.map(f => (hayIngresosAds ? f.ingresos : f.total))),
    [porAds, hayIngresosAds]
  );

  if (loading) {
    return <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-16 text-center text-[14px] text-[#8A929E] font-semibold">Cargando métricas…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="font-grotesk font-bold text-[17px] text-[#15171C] mb-1">Conversión por nicho</div>
        <div className="text-[13px] text-[#8A929E] font-semibold mb-3">Barra = volumen de leads del nicho. Top {porNicho.length} nichos con más leads.</div>
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-6 py-6">
          {porNicho.length === 0 ? <SeccionVacia /> : porNicho.map(f => (
            <BarRow key={f.key} label={f.label} value={f.total} max={maxNicho} color={PALETA[porNicho.indexOf(f) % PALETA.length]}
              numeros={
                <>
                  <NumBadge color="#15171C">{f.total} leads</NumBadge>{' · '}
                  <NumBadge color="#1F9B6E">{f.ganados} ganados</NumBadge>{' · '}
                  <NumBadge color="#7C5CBF">{f.tasa}%</NumBadge>
                </>
              } />
          ))}
        </div>
      </div>

      <div>
        <div className="font-grotesk font-bold text-[17px] text-[#15171C] mb-1">Conversión por canal de origen</div>
        <div className="text-[13px] text-[#8A929E] font-semibold mb-3">
          Web = vino del formulario de campañas (/registro). WhatsApp/Instagram = se creó desde un chat. Manual = lo cargó el equipo a mano
          (incluye los leads de antes de que existiera este dato).
        </div>
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-6 py-6">
          {porCanal.every(f => f.total === 0) || porCanal.length === 0 ? <SeccionVacia /> : (
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <Donut segments={donutSegments} />
              <div className="flex-1 w-full min-w-0">
                {porCanal.map(f => (
                  <div key={f.key} className="flex items-center gap-3 py-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CANAL_COLOR[f.key] ?? '#5A6270' }} />
                    <span className="text-[13px] font-bold text-[#15171C] flex-1 min-w-0 truncate">{f.label}</span>
                    <NumBadge color="#15171C">{f.total} leads</NumBadge>
                    <span className="text-[11.5px] font-bold text-[#AEB4BE] w-10 text-right">{totalCanalLeads > 0 ? Math.round((f.total / totalCanalLeads) * 100) : 0}%</span>
                    <NumBadge color="#1F9B6E">{f.tasa}% conv.</NumBadge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <div className="font-grotesk font-bold text-[17px] text-[#15171C]">ROI por campaña (Link de Ads)</div>
          {porAdsAll.length > 0 && <div className="text-[12.5px] font-bold text-[#B5740F]">{money(totalIngresosAds)} en ingresos rastreados</div>}
        </div>
        <div className="text-[13px] text-[#8A929E] font-semibold mb-3">
          Agrupado por el link exacto que trajo al lead. Barra = {hayIngresosAds ? 'ingresos generados' : 'cantidad de leads (todavía sin pagos registrados)'}.
        </div>
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-6 py-6">
          {porAds.length === 0 ? <SeccionVacia /> : porAds.map(f => (
            <BarRow key={f.key} label={f.label} value={hayIngresosAds ? f.ingresos : f.total} max={maxAds} color="#B5740F"
              numeros={
                <>
                  <NumBadge color="#15171C">{f.total} leads</NumBadge>{' · '}
                  <NumBadge color="#1F9B6E">{f.ganados} ganados</NumBadge>{' · '}
                  <NumBadge color="#B5740F">{money(f.ingresos)}</NumBadge>
                </>
              } />
          ))}
        </div>
      </div>
    </div>
  );
}
