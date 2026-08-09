'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Lead } from '@/lib/leads-sheet';
import { SAT_PERFIL_DEFAULT, type SatPerfil } from '@/lib/lead-scoring';

export interface SatContext {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  nichosGanados: string[];
  reunionLeadIds: Set<string>;
  pagoLeadIds: Set<string>;
  perfil: SatPerfil;
  loading: boolean;
}

// Junta todo lo que necesita computeLeadScore (leads, reuniones, pagos,
// perfil ICP) — lo usan los paneles de chat para mostrar el score de SAT
// del lead vinculado, igual que en el panel "SAT · Leads prioritarios".
export function useSatContext(): SatContext {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [reuniones, setReuniones] = useState<{ client_slug: string }[]>([]);
  const [pagos, setPagos] = useState<{ leadId: string }[]>([]);
  const [perfil, setPerfil] = useState<SatPerfil>(SAT_PERFIL_DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/leads').then(r => r.json()),
      fetch('/api/reuniones').then(r => r.json()),
      fetch('/api/finanzas/pagos').then(r => r.json()),
      fetch('/api/sat-perfil').then(r => r.json()),
    ])
      .then(([l, r, p, sp]) => {
        setLeads(l.leads ?? []);
        setReuniones(r.meetings ?? []);
        setPagos(p.pagos ?? []);
        setPerfil(sp.perfil ?? SAT_PERFIL_DEFAULT);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const nichosGanados = useMemo(
    () => [...new Set(leads.filter(l => l.estado === 'Ganado' && l.nicho.trim()).map(l => l.nicho))],
    [leads]
  );
  const reunionLeadIds = useMemo(() => new Set(reuniones.map(m => m.client_slug)), [reuniones]);
  const pagoLeadIds = useMemo(() => new Set(pagos.map(p => p.leadId)), [pagos]);

  return { leads, setLeads, nichosGanados, reunionLeadIds, pagoLeadIds, perfil, loading };
}
