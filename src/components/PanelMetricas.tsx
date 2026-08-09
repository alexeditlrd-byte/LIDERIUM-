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

function Barra({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-[#F0F2F5] overflow-hidden mt-2">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

function TablaFilas({ filas, colorOf, verIngresos }: { filas: Fila[]; colorOf: (key: string) => string; verIngresos?: boolean }) {
  if (filas.length === 0) {
    return <div className="px-6 py-10 text-center text-[13.5px] text-[#8A929E] font-semibold">Todavía no hay datos suficientes.</div>;
  }
  return (
    <div className="divide-y divide-[#F0F2F5]">
      {filas.map(f => (
        <div key={f.key} className="px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="font-grotesk font-bold text-[14px] text-[#15171C] truncate">{f.label}</div>
            <div className="flex items-center gap-4 shrink-0 text-right">
              <div>
                <div className="text-[13px] font-bold text-[#15171C]">{f.total}</div>
                <div className="text-[9.5px] font-bold text-[#9AA0A8] uppercase tracking-[0.03em]">leads</div>
              </div>
              <div>
                <div className="text-[13px] font-bold text-[#1F9B6E]">{f.ganados}</div>
                <div className="text-[9.5px] font-bold text-[#9AA0A8] uppercase tracking-[0.03em]">ganados</div>
              </div>
              <div>
                <div className="text-[13px] font-bold" style={{ color: colorOf(f.key) }}>{f.tasa}%</div>
                <div className="text-[9.5px] font-bold text-[#9AA0A8] uppercase tracking-[0.03em]">conversión</div>
              </div>
              {verIngresos && (
                <div>
                  <div className="text-[13px] font-bold text-[#B5740F]">{money(f.ingresos)}</div>
                  <div className="text-[9.5px] font-bold text-[#9AA0A8] uppercase tracking-[0.03em]">ingresos</div>
                </div>
              )}
            </div>
          </div>
          <Barra pct={f.tasa} color={colorOf(f.key)} />
        </div>
      ))}
    </div>
  );
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

  const porNicho = useMemo(
    () => agrupar(leads, ingresosPorLead, l => l.nicho.trim() || '—', key => (key === '—' ? 'Sin nicho' : key)),
    [leads, ingresosPorLead]
  );

  const porCanal = useMemo(
    () => agrupar(leads, ingresosPorLead, l => (l.origenCanal || ''), key => CANAL_LABEL[key] ?? key),
    [leads, ingresosPorLead]
  );

  const porAds = useMemo(
    () => agrupar(leads.filter(l => l.linkAds.trim()), ingresosPorLead, l => l.linkAds.trim(), key => key),
    [leads, ingresosPorLead]
  );

  const totalIngresosAds = useMemo(() => porAds.reduce((sum, f) => sum + f.ingresos, 0), [porAds]);

  if (loading) {
    return <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-16 text-center text-[14px] text-[#8A929E] font-semibold">Cargando métricas…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="font-grotesk font-bold text-[17px] text-[#15171C] mb-1">Conversión por nicho</div>
        <div className="text-[13px] text-[#8A929E] font-semibold mb-3">De todos los leads registrados, cuáles nichos cierran más.</div>
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden">
          <TablaFilas filas={porNicho} colorOf={() => '#7C5CBF'} />
        </div>
      </div>

      <div>
        <div className="font-grotesk font-bold text-[17px] text-[#15171C] mb-1">Conversión por canal de origen</div>
        <div className="text-[13px] text-[#8A929E] font-semibold mb-3">
          Web = vino del formulario de campañas (/registro). WhatsApp/Instagram = se creó desde un chat. Manual = lo cargó el equipo a mano
          (incluye los leads de antes de que existiera este dato).
        </div>
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden">
          <TablaFilas filas={porCanal} colorOf={key => CANAL_COLOR[key] ?? '#5A6270'} />
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <div className="font-grotesk font-bold text-[17px] text-[#15171C]">ROI por campaña (Link de Ads)</div>
          {porAds.length > 0 && <div className="text-[12.5px] font-bold text-[#B5740F]">{money(totalIngresosAds)} en ingresos rastreados</div>}
        </div>
        <div className="text-[13px] text-[#8A929E] font-semibold mb-3">Agrupado por el link exacto que trajo al lead (campo &ldquo;Link de Ads&rdquo;). Solo leads que llegaron con ese dato.</div>
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden">
          <TablaFilas filas={porAds} colorOf={() => '#B5740F'} verIngresos />
        </div>
      </div>
    </div>
  );
}
