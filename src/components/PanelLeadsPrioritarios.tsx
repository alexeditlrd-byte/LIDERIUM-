'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Lead } from '@/lib/leads-sheet';
import {
  computeLeadScore, esLeadCuestionario, tierEfectivo,
  NICHO_LABEL, TIER_META, TIER_ORDEN, SAT_PERFIL_DEFAULT,
  type NichoClasificacion, type Tier, type SatPerfil,
} from '@/lib/lead-scoring';
import Dropdown from '@/components/Dropdown';

interface PanelLeadsPrioritariosProps {
  showToast: (text: string, ok?: boolean) => void;
}

interface FeedbackEntry { id: string; clienteNombre: string; nicho: string; nota: string; createdAt: string; }

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

function listaATexto(lista: string[]) {
  return lista.join(', ');
}
function textoALista(texto: string) {
  return texto.split(',').map(s => s.trim()).filter(Boolean);
}

export default function PanelLeadsPrioritarios({ showToast }: PanelLeadsPrioritariosProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [reuniones, setReuniones] = useState<{ client_slug: string }[]>([]);
  const [pagos, setPagos] = useState<{ leadId: string }[]>([]);
  const [perfil, setPerfil] = useState<SatPerfil>(SAT_PERFIL_DEFAULT);
  const [feedbackLog, setFeedbackLog] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [nichoFilter, setNichoFilter] = useState<'Todos' | NichoClasificacion>('Todos');
  const [responsableFilter, setResponsableFilter] = useState('Todos');
  const [soloHoy, setSoloHoy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverTier, setDragOverTier] = useState<Tier | null>(null);

  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [perfilDraft, setPerfilDraft] = useState({ icp: '', mapaEmpatia: '', calientes: '', medios: '' });
  const [savingPerfil, setSavingPerfil] = useState(false);

  const loadAll = () => {
    Promise.all([
      fetch('/api/leads').then(r => r.json()),
      fetch('/api/reuniones').then(r => r.json()),
      fetch('/api/finanzas/pagos').then(r => r.json()),
      fetch('/api/sat-perfil').then(r => r.json()),
      fetch('/api/sat-feedback').then(r => r.json()),
    ])
      .then(([leadsData, reunionesData, pagosData, perfilData, feedbackData]) => {
        setLeads(leadsData.leads ?? []);
        setReuniones(reunionesData.meetings ?? []);
        setPagos(pagosData.pagos ?? []);
        setPerfil(perfilData.perfil ?? SAT_PERFIL_DEFAULT);
        setFeedbackLog(feedbackData.entradas ?? []);
      })
      .catch(() => showToast('No se pudo cargar SAT', false))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openPerfilModal = () => {
    setPerfilDraft({
      icp: perfil.icp,
      mapaEmpatia: perfil.mapaEmpatia,
      calientes: listaATexto(perfil.nichosCalientes),
      medios: listaATexto(perfil.nichosMedios),
    });
    setShowPerfilModal(true);
  };

  const savePerfil = async () => {
    setSavingPerfil(true);
    try {
      const body = {
        icp: perfilDraft.icp,
        mapaEmpatia: perfilDraft.mapaEmpatia,
        nichosCalientes: textoALista(perfilDraft.calientes),
        nichosMedios: textoALista(perfilDraft.medios),
      };
      const res = await fetch('/api/sat-perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPerfil(body);
      showToast('Perfil de SAT actualizado');
      setShowPerfilModal(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo guardar', false);
    }
    setSavingPerfil(false);
  };

  const nichosGanados = useMemo(
    () => [...new Set(leads.filter(l => l.estado === 'Ganado' && l.nicho.trim()).map(l => l.nicho))],
    [leads]
  );
  const reunionLeadIds = useMemo(() => new Set(reuniones.map(m => m.client_slug)), [reuniones]);
  const pagoLeadIds = useMemo(() => new Set(pagos.map(p => p.leadId)), [pagos]);

  const scored = useMemo(() => {
    return leads.filter(esLeadCuestionario).map(lead => {
      const resultado = computeLeadScore(lead, {
        nichosGanados,
        tieneReunion: reunionLeadIds.has(lead.id),
        tienePago: pagoLeadIds.has(lead.id),
        perfil,
      });
      const { tier, ajustadoAMano } = tierEfectivo(resultado.tierCalculado, lead.satTierOverride);
      return { lead, ...resultado, tier, ajustadoAMano };
    });
  }, [leads, nichosGanados, reunionLeadIds, pagoLeadIds, perfil]);

  const filtrados = useMemo(() => {
    let list = scored;
    if (nichoFilter !== 'Todos') list = list.filter(s => s.nichoClasificacion === nichoFilter);
    if (responsableFilter !== 'Todos') list = list.filter(s => s.lead.responsable === responsableFilter);
    if (soloHoy) list = list.filter(s => isToday(s.lead.createdAt));
    return list;
  }, [scored, nichoFilter, responsableFilter, soloHoy]);

  const columnas = useMemo(() => {
    return TIER_ORDEN.map(tier => ({
      tier,
      items: filtrados.filter(s => s.tier === tier).sort((a, b) => b.score - a.score),
    }));
  }, [filtrados]);

  const hoyCount = useMemo(() => scored.filter(s => isToday(s.lead.createdAt)).length, [scored]);

  const moverATier = async (leadId: string, nuevoTier: Tier) => {
    setLeads(ls => ls.map(l => (l.id === leadId ? { ...l, satTierOverride: nuevoTier } : l)));
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, patch: { satTierOverride: nuevoTier } }),
      });
      if (!res.ok) throw new Error('No se pudo mover el lead');
    } catch {
      showToast('No se pudo ajustar la prioridad', false);
      loadAll();
    }
  };

  const restaurarAutomatico = async (leadId: string) => {
    setLeads(ls => ls.map(l => (l.id === leadId ? { ...l, satTierOverride: '' } : l)));
    fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: leadId, patch: { satTierOverride: '' } }),
    }).catch(() => {});
  };

  return (
    <div>
      <div className="bg-white border border-[#ECEEF2] rounded-[18px] px-6 py-5 mb-5 flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-[#15171C] to-[#2E6CA0] flex items-center justify-center flex-shrink-0 text-[20px]">🎯</div>
        <div className="flex-1 min-w-[240px]">
          <div className="font-grotesk font-bold text-[17px] text-[#15171C]">Agente SAT</div>
          <div className="text-[13px] text-[#8A929E] font-semibold">
            Analiza los leads del formulario web, los compara con tu ICP y con clientes anteriores, y los prioriza. Arrastra una tarjeta a otra columna si no estás de acuerdo con su clasificación.
          </div>
        </div>
        <button onClick={openPerfilModal} className="flex-shrink-0 flex items-center gap-2 bg-[#F4F6F8] text-[#15171C] border border-[#E2E5EA] font-bold text-[13px] px-4 py-[10px] rounded-[10px] cursor-pointer hover:border-steel transition">
          ⚙️ Configurar perfil SAT
        </button>
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
      </div>

      {loading ? (
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-16 text-center text-[14px] text-[#8A929E] font-semibold">Analizando leads…</div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-16 flex flex-col items-center text-center">
          <div className="font-grotesk font-bold text-[17px] text-[#15171C] mb-1">Sin leads que mostrar</div>
          <div className="text-[13.5px] text-[#8A929E] font-semibold">SAT solo analiza leads que llegaron por el formulario web (/registro). Ajusta los filtros o espera nuevos registros.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {columnas.map(col => {
            const meta = TIER_META[col.tier];
            return (
              <div key={col.tier}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverTier !== col.tier) setDragOverTier(col.tier); }}
                onDragLeave={() => setDragOverTier(prev => (prev === col.tier ? null : prev))}
                onDrop={e => {
                  e.preventDefault();
                  setDragOverTier(null);
                  const leadId = e.dataTransfer.getData('text/plain');
                  const item = scored.find(s => s.lead.id === leadId);
                  if (item && item.tier !== col.tier) moverATier(leadId, col.tier);
                }}
                className="bg-white border rounded-[18px] min-h-[160px] transition"
                style={{ borderColor: dragOverTier === col.tier ? meta.color : '#ECEEF2', background: dragOverTier === col.tier ? meta.bg : undefined }}>
                <div className="flex items-center justify-between px-4 py-[13px] border-b border-[#F0F2F5]">
                  <span className="text-[13px] font-black" style={{ color: meta.color }}>{meta.emoji} {meta.label}</span>
                  <span className="text-[11px] font-bold text-[#9AA0A8]">{col.items.length}</span>
                </div>
                <div className="flex flex-col gap-2.5 p-3">
                  {col.items.length === 0 && <div className="text-[11.5px] text-[#C2C8D2] font-semibold text-center py-4">Sin leads</div>}
                  {col.items.map((s, i) => {
                    const expanded = expandedId === s.lead.id;
                    return (
                      <div key={s.lead.id} draggable
                        onDragStart={e => { e.dataTransfer.setData('text/plain', s.lead.id); e.dataTransfer.effectAllowed = 'move'; setDraggedId(s.lead.id); }}
                        onDragEnd={() => setDraggedId(null)}
                        className={`bg-[#FAFBFC] border rounded-[12px] p-3 cursor-grab active:cursor-grabbing transition ${draggedId === s.lead.id ? 'opacity-40' : ''}`}
                        style={{ borderColor: meta.border }}>
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="text-[10px] font-black text-[#9AA0A8] uppercase tracking-[0.03em]">Prioridad {i + 1}</div>
                            <div className="text-[13px] font-bold text-[#15171C] truncate">{s.lead.nombre}</div>
                          </div>
                          <span className="text-[12px] font-black flex-shrink-0" style={{ color: meta.color }}>{s.score}/100</span>
                        </div>
                        <div className="text-[11px] text-[#8A929E] font-semibold mt-1">{s.lead.nicho || '—'} · {NICHO_LABEL[s.nichoClasificacion]}</div>
                        <div className="text-[11.5px] font-bold text-[#15171C] mt-1.5">➜ {s.accionRecomendada}</div>
                        {s.ajustadoAMano && (
                          <div className="text-[10px] font-bold text-[#7C5CBF] mt-1.5 flex items-center gap-1.5">
                            Ajustado por el equipo
                            <button onClick={() => restaurarAutomatico(s.lead.id)} className="underline bg-transparent border-none cursor-pointer text-[#7C5CBF] p-0 font-bold">restaurar</button>
                          </div>
                        )}
                        <div className="flex gap-[6px] mt-2.5">
                          <a href={waLink(s.lead.numero)} target="_blank" rel="noopener noreferrer"
                            className="flex-1 text-center py-[6px] rounded-[7px] bg-[#EAF7F1] text-[#1F9B6E] text-[10.5px] font-bold no-underline">WhatsApp</a>
                          <button onClick={() => setExpandedId(expanded ? null : s.lead.id)}
                            className="flex-1 py-[6px] rounded-[7px] bg-[#F4F6F8] text-[#5A6270] text-[10.5px] font-bold border-none cursor-pointer hover:bg-[#ECEEF2]">
                            {expanded ? 'Ocultar' : 'Ver por qué'}
                          </button>
                        </div>
                        {expanded && (
                          <div className="mt-2.5 pt-2.5 border-t border-[#F0F2F5]">
                            <ul className="flex flex-col gap-1">
                              {s.razones.map((r, ri) => (
                                <li key={ri} className="text-[11px] text-[#3C434F] font-medium leading-[1.4]">{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Aprendizajes de SAT */}
      {feedbackLog.length > 0 && (
        <div className="bg-white border border-[#ECEEF2] rounded-[18px] px-6 py-5 mt-5">
          <div className="font-grotesk font-bold text-[15px] text-[#15171C] mb-1">📚 Aprendizajes de SAT</div>
          <div className="text-[12.5px] text-[#8A929E] font-semibold mb-4">Notas que dejó el equipo al ganar clientes — contexto real para seguir afinando los criterios.</div>
          <div className="flex flex-col gap-2.5">
            {feedbackLog.map(f => (
              <div key={f.id} className="bg-[#F6F8FA] border border-[#EDEFF3] rounded-[10px] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-bold text-[#15171C]">{f.clienteNombre}{f.nicho ? ` · ${f.nicho}` : ''}</span>
                  <span className="text-[10.5px] text-[#9AA0A8] font-semibold flex-shrink-0">{new Date(f.createdAt).toLocaleDateString('es-PE')}</span>
                </div>
                <div className="text-[12.5px] text-[#3C434F] font-medium mt-1">{f.nota}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal configurar perfil */}
      {showPerfilModal && (
        <div className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,.55)] flex items-center justify-center p-6" onClick={() => { if (!savingPerfil) setShowPerfilModal(false); }}>
          <div className="bg-white rounded-[22px] w-full max-w-[560px] max-h-[88vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 py-5 border-b border-[#F0F2F5] sticky top-0 bg-white">
              <div>
                <div className="font-grotesk font-bold text-[19px] text-[#15171C]">Perfil de SAT</div>
                <div className="text-[13px] text-[#8A929E] font-semibold mt-0.5">ICP, mapa de empatía y los nichos que más le acomoda trabajar al equipo</div>
              </div>
              <button onClick={() => setShowPerfilModal(false)} className="w-9 h-9 rounded-[10px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2] flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-7 py-6 flex flex-col gap-4">
              <div className="bg-[#FBF1E2] border border-[#F0D9A8] rounded-[12px] px-4 py-3 text-[12.5px] text-[#8A6020] font-semibold">
                El ICP y el mapa de empatía se muestran como referencia para el equipo. Lo que SAT usa para calcular el score son las listas de nichos de abajo — son las que sí puede comparar de forma confiable.
              </div>
              <div>
                <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">ICP — perfil de cliente ideal</label>
                <textarea value={perfilDraft.icp} onChange={e => setPerfilDraft(d => ({ ...d, icp: e.target.value }))}
                  placeholder="Ej: Emprendedores con marca personal, facturando +$3,000/mes, que ya venden pero no tienen sistema de contenido..."
                  className="w-full min-h-[80px] px-4 py-3 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[13.5px] font-medium outline-none text-[#15171C] focus:border-steel transition resize-y" />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Mapa de empatía — dolores y necesidades</label>
                <textarea value={perfilDraft.mapaEmpatia} onChange={e => setPerfilDraft(d => ({ ...d, mapaEmpatia: e.target.value }))}
                  placeholder="Ej: Les cuesta mantener consistencia publicando, no saben qué contenido convierte, sienten que están perdiendo oportunidades frente a la competencia..."
                  className="w-full min-h-[80px] px-4 py-3 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[13.5px] font-medium outline-none text-[#15171C] focus:border-steel transition resize-y" />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Nichos &ldquo;en caliente&rdquo; (los que más nos acomoda)</label>
                <input value={perfilDraft.calientes} onChange={e => setPerfilDraft(d => ({ ...d, calientes: e.target.value }))}
                  placeholder="Ej: fitness, inmobiliario, consultoría"
                  className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                <p className="text-[11.5px] text-[#8A929E] font-semibold mt-1.5">Separados por coma.</p>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Nichos &ldquo;medio&rdquo; (buen resultado, no prioritarios)</label>
                <input value={perfilDraft.medios} onChange={e => setPerfilDraft(d => ({ ...d, medios: e.target.value }))}
                  placeholder="Ej: educación, salud, moda"
                  className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                <p className="text-[11.5px] text-[#8A929E] font-semibold mt-1.5">Separados por coma.</p>
              </div>
            </div>
            <div className="flex gap-3 px-7 pb-7">
              <button onClick={() => setShowPerfilModal(false)} className="flex-1 h-11 bg-[#F4F6F8] text-[#15171C] border border-[#E2E5EA] rounded-[12px] font-bold text-[14px] cursor-pointer hover:bg-[#ECEEF2] transition">Cancelar</button>
              <button onClick={savePerfil} disabled={savingPerfil}
                className="flex-1 h-11 bg-[#15171C] text-white border-none rounded-[12px] font-bold text-[14px] cursor-pointer hover:bg-steel transition disabled:opacity-60 disabled:cursor-not-allowed">
                {savingPerfil ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
