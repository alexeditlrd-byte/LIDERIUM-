'use client';

import type { Lead } from '@/lib/leads-sheet';
import { TIER_META, type Tier } from '@/lib/lead-scoring';

interface ChatLeadCardProps {
  lead: Lead | null;
  score: { score: number; tier: Tier } | null;
  creating: boolean;
  onCreateLead: () => void;
}

const chip = 'text-[11px] font-bold text-[#5A6270] bg-white border border-[#E2E5EA] px-2 py-[2px] rounded-full whitespace-nowrap';

export default function ChatLeadCard({ lead, score, creating, onCreateLead }: ChatLeadCardProps) {
  if (!lead) {
    return (
      <div className="px-6 py-2.5 border-b border-[#F0F2F5] bg-[#FAFBFC] flex items-center justify-between gap-3">
        <span className="text-[12px] text-[#8A929E] font-semibold">Sin lead vinculado en Comercial</span>
        <button onClick={onCreateLead} disabled={creating}
          className="flex-shrink-0 text-[11.5px] font-bold text-white bg-[#15171C] border-none px-3 py-[6px] rounded-[8px] cursor-pointer hover:bg-steel transition disabled:opacity-50 disabled:cursor-not-allowed">
          {creating ? 'Creando…' : '+ Crear lead desde este chat'}
        </button>
      </div>
    );
  }

  const meta = score ? TIER_META[score.tier] : null;

  return (
    <div className="px-6 py-2.5 border-b border-[#F0F2F5] bg-[#FAFBFC] flex items-center gap-1.5 flex-wrap">
      <span className="text-[12.5px] font-bold text-[#15171C] mr-1">{lead.nombre}</span>
      <span className={chip}>{lead.faseVenta || 'Sin fase'}</span>
      <span className={chip}>{lead.plan || 'Sin plan'}</span>
      <span className={chip}>Resp: {lead.responsable || '—'}</span>
      {lead.propietario && <span className={chip}>Prop: {lead.propietario}</span>}
      <span className={chip}>{lead.estado}</span>
      {meta && (
        <span className="text-[11px] font-black px-2 py-[2px] rounded-full whitespace-nowrap" style={{ background: meta.bg, color: meta.color }}>
          {meta.emoji} {meta.label} · {score!.score}/100
        </span>
      )}
    </div>
  );
}
