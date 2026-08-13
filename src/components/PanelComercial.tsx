'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Lead, LeadInput } from '@/lib/leads-sheet';
import Dropdown from '@/components/Dropdown';
import { supabase } from '@/lib/supabase';

interface PanelComercialProps {
  showToast: (text: string, ok?: boolean) => void;
}

type View = 'tabla' | 'kanban';
type Filter = 'all' | 'alta' | 'nuevo';

const RESPONSABLES = ['Winona', 'Maryori'];
const PROPIETARIOS = ['Terry', 'Santiago'];

const ESTADOS: Lead['estado'][] = ['Nuevo', 'No calificado', 'Contactado', 'Ganado', 'Perdido'];
const PRIORIDADES: Lead['prioridad'][] = ['Alta', 'Media', 'Baja'];
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const ESTADO_STYLE: Record<Lead['estado'], { bg: string; color: string }> = {
  Nuevo: { bg: '#EAF7F1', color: '#1F9B6E' },
  'No calificado': { bg: '#F1F2F5', color: '#6B7280' },
  Contactado: { bg: '#EAF1F8', color: '#2E6CA0' },
  Ganado: { bg: '#FBF1E2', color: '#B5740F' },
  Perdido: { bg: '#FCEDED', color: '#D14343' },
};

const PRIORIDAD_COLOR: Record<Lead['prioridad'], string> = {
  Alta: '#D14343',
  Media: '#B5740F',
  Baja: '#AEB4BE',
};

const PLAN_PRICES: Record<string, number> = { SKOOL: 750, SERVICIO: 2000, WORKSHOP: 200 };
// WORKSHOP es el único plan cuyo precio ya está en soles (no dólares) — se
// usa para no aplicar el tipo de cambio en Finanzas, ver PanelFinanzas.tsx.
const PLANES_EN_SOLES = ['WORKSHOP'];
const FASE_PROBABILIDAD: Record<string, string> = { 'Prospección': '20', 'Propuesta': '30', 'Negociación': '70', 'Cierre': '100' };

function emptyDraft(): LeadInput {
  const today = new Date();
  const fechaInicio = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  return {
    nombre: '', instagram: '', numero: '', tipoInfoproductor: '', nicho: '', plataformas: '', linkAds: '',
    email: '', origenCanal: '', cuestionario: null,
    nps: '', plan: 'SKOOL', faseVenta: 'Prospección', probabilidad: '', responsable: '', propietario: '',
    fechaInicio, fechaRenovacion: '', precio: PLAN_PRICES.SKOOL, abono: 0, estado: 'Nuevo', prioridad: 'Media', observacion: '',
    satTierOverride: '', satFeedback: '',
  };
}

function dmyToISO(str: string) {
  const parts = String(str || '').split('/');
  if (parts.length !== 3) return '';
  const [d, m, y] = parts;
  return y.padStart(4, '0') + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0');
}
function isoToDMY(iso: string) {
  const parts = (iso || '').split('-');
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  return `${Number(d)}/${Number(m)}/${y}`;
}
function money(n: number, plan?: string) {
  const v = Number(n) || 0;
  const sign = v < 0 ? '-' : '';
  const symbol = plan && PLANES_EN_SOLES.includes(plan) ? 'S/ ' : '$';
  return sign + symbol + Math.abs(v).toLocaleString('en-US');
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function dayGroupLabel(dayStart: number, today: number) {
  const d = new Date(dayStart);
  const fecha = `${String(d.getDate()).padStart(2, '0')} de ${MONTH_NAMES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
  const diffDias = Math.round((today - dayStart) / 86400000);
  if (diffDias === 0) return `Hoy (${fecha})`;
  if (diffDias === 1) return `Ayer (${fecha})`;
  return fecha;
}
// Agrupa los leads por día de creación real (createdAt), del más reciente
// al más antiguo — solo visual, no cambia estado ni orden de la lista.
function groupLeadsByDay(leadsList: Lead[]) {
  const today = startOfDay(new Date());
  const map = new Map<number, Lead[]>();
  for (const lead of leadsList) {
    const raw = lead.createdAt ? new Date(lead.createdAt) : new Date();
    const key = startOfDay(raw);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(lead);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([dayStart, dayLeads]) => ({ key: dayStart, label: dayGroupLabel(dayStart, today), leads: dayLeads }));
}
function leadInMonth(lead: Lead, ym: string) {
  const parts = String(lead.fechaInicio || '').split('/');
  if (parts.length !== 3) return false;
  const [, m, y] = parts;
  return `${y.padStart(4, '0')}-${m.padStart(2, '0')}` === ym;
}
// Un lead "vino del formulario web" (/registro) si tiene correo o
// respuestas de cuestionario guardadas — nada de eso existe en un lead
// creado a mano desde "Añadir lead".
function esLeadWeb(lead: Lead) {
  return !!(lead.email || (lead.cuestionario && Object.keys(lead.cuestionario).length > 0));
}
function waLink(numero: string) {
  return 'https://wa.me/' + (numero || '').replace(/[^0-9]/g, '');
}
function mailLink(nombre: string) {
  return 'mailto:' + (nombre || '').toLowerCase().replace(/[^a-z]+/g, '.') + '@cliente.com';
}
function monthKeyOf(dateStr: string) {
  return (dateStr || '').slice(0, 7); // 'YYYY-MM-DD' -> 'YYYY-MM'
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Pago { id: string; leadId: string; clienteNombre: string; monto: number; fecha: string; nota: string; }

export default function PanelComercial({ showToast }: PanelComercialProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);

  const [view, setView] = useState<View>('tabla');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [responsableFilter, setResponsableFilter] = useState('Todos');
  const [dayFilter, setDayFilter] = useState(''); // '' = todos los días; 'YYYY-MM-DD' filtra un día puntual
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverEstado, setDragOverEstado] = useState<Lead['estado'] | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState<LeadInput>(emptyDraft());
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadLeads = () => {
    fetch('/api/leads')
      .then(r => r.json())
      .then(d => { setLeads(d.leads ?? []); setConfigured(d.configured !== false); if (d.error) showToast(d.error, false); })
      .catch(() => showToast('No se pudo cargar el panel comercial', false))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLeads(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [allPagos, setAllPagos] = useState<Pago[]>([]);
  useEffect(() => {
    fetch('/api/finanzas/pagos').then(r => r.json()).then(d => setAllPagos(d.pagos ?? [])).catch(() => {});
  }, []);

  const [reuniones, setReuniones] = useState<{ client_slug: string }[]>([]);
  useEffect(() => {
    fetch('/api/reuniones').then(r => r.json()).then(d => setReuniones(d.meetings ?? [])).catch(() => {});
  }, []);

  // Recurso gratuito (PDF, link de Drive, video o enlace propio) que se
  // entrega automáticamente al terminar el formulario público /registro.
  const [showRecursoModal, setShowRecursoModal] = useState(false);
  const [recursoDraft, setRecursoDraft] = useState({ tipo: 'link', titulo: '', url: '' });
  const [recursoFileName, setRecursoFileName] = useState('');
  const [savingRecurso, setSavingRecurso] = useState(false);
  const [uploadingRecurso, setUploadingRecurso] = useState(false);

  const loadRecurso = () => {
    fetch('/api/recurso-gratuito').then(r => r.json()).then(d => {
      if (d.recurso) setRecursoDraft({ tipo: d.recurso.tipo, titulo: d.recurso.titulo, url: d.recurso.url });
    }).catch(() => {});
  };
  useEffect(() => { loadRecurso(); }, []);

  const openRecursoModal = () => { loadRecurso(); setRecursoFileName(''); setShowRecursoModal(true); };

  const uploadRecursoPDF = async (file: File | null) => {
    if (!file) return;
    setUploadingRecurso(true);
    try {
      const urlRes = await fetch('/api/recurso-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error ?? 'No se pudo preparar la subida');
      const { error: uploadError } = await supabase.storage.from('recursos').uploadToSignedUrl(urlData.filePath, urlData.token, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      setRecursoDraft(d => ({ ...d, url: urlData.publicUrl }));
      setRecursoFileName(file.name);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo subir el PDF', false);
    }
    setUploadingRecurso(false);
  };

  const [removingRecurso, setRemovingRecurso] = useState(false);

  const removeRecurso = async () => {
    setRemovingRecurso(true);
    try {
      const body = { tipo: recursoDraft.tipo, titulo: recursoDraft.titulo.trim() || 'Tu recurso gratuito', url: '' };
      const res = await fetch('/api/recurso-gratuito', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecursoDraft(d => ({ ...d, url: '' }));
      setRecursoFileName('');
      showToast('Recurso gratuito desactivado — el formulario ya no entrega nada al enviarse');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo quitar el recurso', false);
    }
    setRemovingRecurso(false);
  };

  const saveRecurso = async () => {
    if (!recursoDraft.titulo.trim()) { showToast('Ponle un título al recurso', false); return; }
    if (!recursoDraft.url.trim()) { showToast('Falta el archivo o el enlace del recurso', false); return; }
    setSavingRecurso(true);
    try {
      const res = await fetch('/api/recurso-gratuito', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recursoDraft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Recurso gratuito actualizado');
      setShowRecursoModal(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo guardar', false);
    }
    setSavingRecurso(false);
  };

  const comercialStats = useMemo(() => {
    const leadIdsConReunion = new Set(reuniones.map(m => m.client_slug));
    return RESPONSABLES.map(nombre => {
      const propios = leads.filter(l => l.responsable === nombre);
      const asignados = propios.length;
      const nuevos = propios.filter(l => l.estado === 'Nuevo').length;
      const contactados = propios.filter(l => l.estado === 'Contactado').length;
      const ganados = propios.filter(l => l.estado === 'Ganado').length;
      const perdidos = propios.filter(l => l.estado === 'Perdido').length;
      const reunionesAgendadas = propios.filter(l => leadIdsConReunion.has(l.id)).length;
      const tasaConversion = asignados > 0 ? Math.round((ganados / asignados) * 100) : 0;
      return { nombre, asignados, nuevos, contactados, reunionesAgendadas, ganados, perdidos, tasaConversion };
    });
  }, [leads, reuniones]);

  const [leadPagos, setLeadPagos] = useState<Pago[]>([]);
  const [showPagoForm, setShowPagoForm] = useState(false);
  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoFecha, setPagoFecha] = useState(todayISO());
  const [pagoNota, setPagoNota] = useState('');
  const [savingPago, setSavingPago] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/finanzas/pagos?leadId=${selectedId}`)
      .then(r => r.json())
      .then(d => { setLeadPagos(d.pagos ?? []); setShowPagoForm(false); })
      .catch(() => {});
  }, [selectedId]);

  const submitPago = async (lead: Lead) => {
    if (!pagoMonto || !pagoFecha) { showToast('Completa el monto y la fecha del abono.', false); return; }
    const monto = Number(pagoMonto);
    if (!(monto > 0)) { showToast('El monto del abono debe ser mayor a 0.', false); return; }
    const saldoPendiente = lead.precio - lead.abono;
    if (monto > saldoPendiente) { showToast(`El abono no puede superar el saldo pendiente (${money(saldoPendiente, lead.plan)}).`, false); return; }
    setSavingPago(true);
    try {
      const res = await fetch('/api/finanzas/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, clienteNombre: lead.nombre, monto, fecha: pagoFecha, nota: pagoNota, precio: lead.precio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLeadPagos(p => [data.pago, ...p]);
      setAllPagos(p => [data.pago, ...p]);
      setLeads(ls => ls.map(l => (l.id === lead.id ? { ...l, abono: data.abonoTotal, deuda: l.precio - data.abonoTotal } : l)));
      setShowPagoForm(false);
      setPagoMonto(''); setPagoFecha(todayISO()); setPagoNota('');
      showToast('Abono registrado');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo registrar el abono', false);
    }
    setSavingPago(false);
  };

  const deletePago = async (pago: Pago, lead: Lead) => {
    if (!confirm(`¿Eliminar el abono de ${money(pago.monto, lead.plan)}?`)) return;
    try {
      const res = await fetch(`/api/finanzas/pagos?id=${pago.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLeadPagos(p => p.filter(x => x.id !== pago.id));
      setAllPagos(p => p.filter(x => x.id !== pago.id));
      const newAbono = data.abonoTotal ?? 0;
      setLeads(ls => ls.map(l => (l.id === lead.id ? { ...l, abono: newAbono, deuda: l.precio - newAbono } : l)));
      showToast('Abono eliminado');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo eliminar el abono', false);
    }
  };

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const y0 = now.getFullYear();
    for (let y = y0 - 1; y <= y0 + 1; y++) {
      for (let m = 1; m <= 12; m++) {
        opts.push({ value: `${y}-${String(m).padStart(2, '0')}`, label: `${MONTH_NAMES[m - 1]} ${y}` });
      }
    }
    return opts;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const monthLeads = useMemo(() => leads.filter(l => leadInMonth(l, selectedMonth)), [leads, selectedMonth]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monthLeads.filter(l => {
      if (q && !(l.nombre.toLowerCase().includes(q) || l.nicho.toLowerCase().includes(q) || l.instagram.toLowerCase().includes(q))) return false;
      if (filter === 'alta' && l.prioridad !== 'Alta') return false;
      if (filter === 'nuevo' && l.estado !== 'Nuevo') return false;
      if (responsableFilter !== 'Todos' && l.responsable.trim().toLowerCase() !== responsableFilter.toLowerCase()) return false;
      if (dayFilter) {
        const raw = l.createdAt ? new Date(l.createdAt) : new Date();
        const key = `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`;
        if (key !== dayFilter) return false;
      }
      return true;
    });
  }, [monthLeads, search, filter, responsableFilter, dayFilter]);

  const visibleGroups = useMemo(() => groupLeadsByDay(visible), [visible]);

  const newCount = monthLeads.filter(l => l.estado === 'Nuevo').length;
  const altaCount = monthLeads.filter(l => l.prioridad === 'Alta').length;
  const kpiActivos = monthLeads.filter(l => l.estado !== 'Perdido').length;

  // "Ganados" e "Ingresos cerrados" se calculan con pagos reales del mes
  // seleccionado (por fecha de pago), no por el precio del contrato — un
  // cliente cuenta solo lo que efectivamente abonó ese mes. El pipeline
  // garantiza que todo lead en estado "Ganado" ya pasó por fase Cierre,
  // así que "Ganado" es la señal correcta de que el ingreso es real.
  const cerradoIds = useMemo(() => new Set(leads.filter(l => l.estado === 'Ganado').map(l => l.id)), [leads]);
  const pagosDelMes = useMemo(
    () => allPagos.filter(p => monthKeyOf(p.fecha) === selectedMonth && cerradoIds.has(p.leadId)),
    [allPagos, cerradoIds, selectedMonth]
  );
  const ganadosMesCount = new Set(pagosDelMes.map(p => p.leadId)).size;
  const planPorLead = useMemo(() => new Map(leads.map(l => [l.id, l.plan])), [leads]);
  // Este KPI es en dólares — los pagos de planes en soles (Workshop) se
  // excluyen para no sumar monedas distintas; sí se cuentan en Finanzas.
  const kpiIngresos = money(
    pagosDelMes
      .filter(p => !PLANES_EN_SOLES.includes(planPorLead.get(p.leadId) || ''))
      .reduce((s, p) => s + p.monto, 0)
  );
  // Aparte, porque está en soles y no se puede sumar junto al de arriba (USD).
  const kpiIngresosSoles = pagosDelMes
    .filter(p => PLANES_EN_SOLES.includes(planPorLead.get(p.leadId) || ''))
    .reduce((s, p) => s + p.monto, 0);

  const columns = ESTADOS.map(estado => ({
    estado, leads: visible.filter(l => l.estado === estado),
  }));

  const selectedLead = selectedId ? leads.find(l => l.id === selectedId) ?? null : null;

  const patchLead = async (id: string, patch: Partial<LeadInput>) => {
    const prev = leads;
    const leadAntes = leads.find(l => l.id === id);
    setLeads(ls => ls.map(l => (l.id === id ? { ...l, ...patch } : l)));
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLeads(ls => ls.map(l => (l.id === id ? data.lead : l)));

      // Se acaba de ganar un cliente — le pedimos al comercial una nota
      // corta de por qué (opcional). Queda como feedback para que SAT
      // vaya afinando sus criterios con resultados reales.
      if (patch.estado === 'Ganado' && leadAntes && leadAntes.estado !== 'Ganado') {
        const nota = window.prompt(`¿Por qué se ganó a ${leadAntes.nombre}? (opcional — ayuda a SAT a aprender)`);
        if (nota && nota.trim()) {
          fetch('/api/sat-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId: id, clienteNombre: leadAntes.nombre, nicho: leadAntes.nicho, nota: nota.trim() }),
          }).catch(() => {});
        }
      }
    } catch (e) {
      setLeads(prev);
      showToast(e instanceof Error ? e.message : 'No se pudo actualizar el lead', false);
    }
  };

  const submitAddForm = async () => {
    if (!draft.nombre.trim() || !draft.numero.trim() || !draft.precio) {
      setFormError('Nombre, WhatsApp y precio son obligatorios.');
      return;
    }
    if (!draft.propietario) {
      setFormError('Selecciona un propietario.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.duplicate) {
        setShowAddForm(false);
        showToast(`Ya existe un lead con este WhatsApp: ${data.lead.nombre} (responsable: ${data.lead.responsable || 'sin asignar'}). No se creó uno nuevo.`, false);
        setSubmitting(false);
        return;
      }

      setLeads(ls => [data.lead, ...ls]);
      setShowAddForm(false);
      showToast(`Lead ${draft.nombre} guardado — asignado a ${data.lead.responsable || 'sin responsable'}`);

      // Si ya viene con abono y está en fase Cierre, lo registramos de una
      // vez como pago con fecha (para que aparezca automático en Finanzas).
      if (draft.abono > 0 && draft.faseVenta === 'Cierre') {
        const fecha = dmyToISO(draft.fechaInicio) || todayISO();
        try {
          const pagoRes = await fetch('/api/finanzas/pagos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId: data.lead.id, clienteNombre: draft.nombre, monto: draft.abono, fecha, nota: 'Abono inicial', precio: draft.precio }),
          });
          const pagoData = await pagoRes.json();
          if (pagoRes.ok) setAllPagos(p => [pagoData.pago, ...p]);
        } catch {
          showToast('El lead se creó, pero no se pudo registrar el abono inicial en Finanzas.', false);
        }
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar el lead.');
    }
    setSubmitting(false);
  };

  const openAddForm = () => { setDraft(emptyDraft()); setFormError(''); setShowAddForm(true); };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteLead = async (lead: Lead) => {
    if (!confirm(`¿Eliminar el lead "${lead.nombre}"? Esto lo borra también del Google Sheet.`)) return;
    setDeletingId(lead.id);
    try {
      const res = await fetch(`/api/leads?id=${lead.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLeads(ls => ls.filter(l => l.id !== lead.id));
      if (selectedId === lead.id) setSelectedId(null);
      showToast(`Lead ${lead.nombre} eliminado`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo eliminar el lead', false);
    }
    setDeletingId(null);
  };

  const inputClass = 'w-full h-[42px] px-3 border-[1.5px] border-[#E2E5EA] rounded-[10px] text-[13.5px] font-medium outline-none text-[#15171C] focus:border-steel transition bg-white';
  const labelClass = 'block text-[10.5px] font-black text-[#9AA0A8] uppercase tracking-[0.05em] mb-[5px]';

  return (
    <div>
      {!configured && (
        <div className="flex items-center gap-3 bg-[#FBF1E2] border border-[#F0D9A8] rounded-[14px] px-5 py-4 mb-5 text-[13.5px] text-[#8A6020] font-semibold">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A6020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M12 9v4M12 17h.01" /><circle cx="12" cy="12" r="10" /></svg>
          El panel comercial todavía no está conectado a tu Google Sheet de leads. Los datos no se guardarán hasta terminar esa configuración.
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-[360px]">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, nicho, Instagram..."
            className="w-full h-[42px] bg-white border border-[#E2E5EA] rounded-[10px] pl-9 pr-3 text-[13.5px] font-medium outline-none text-[#15171C] focus:border-steel transition"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA0A8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
        </div>

        <div className="flex gap-[3px] bg-[#F4F6F8] border border-[#E2E5EA] rounded-[11px] p-[3px]">
          {(['tabla', 'kanban'] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-[7px] rounded-[8px] text-[12.5px] font-bold cursor-pointer border-none transition ${view === v ? 'bg-[#15171C] text-white' : 'bg-transparent text-[#5A6270] hover:text-[#15171C]'}`}>
              {v === 'tabla' ? 'Tabla' : 'Kanban'}
            </button>
          ))}
        </div>

        <Dropdown value={selectedMonth} onChange={v => { setSelectedMonth(v); setDayFilter(''); }} options={monthOptions}
          className="h-[42px] bg-white border border-[#E2E5EA] rounded-[10px] px-3 text-[12.5px] font-bold text-[#3C434F] cursor-pointer outline-none" />

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-[#9AA0A8] uppercase tracking-[0.05em]">Responsable</span>
          <Dropdown value={responsableFilter} onChange={setResponsableFilter} options={['Todos', ...RESPONSABLES]}
            className="h-[42px] bg-white border border-[#E2E5EA] rounded-[10px] px-3 text-[12.5px] font-bold text-[#3C434F] cursor-pointer outline-none" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-[#9AA0A8] uppercase tracking-[0.05em]">Día</span>
          <input type="date" value={dayFilter}
            onChange={e => {
              const v = e.target.value;
              setDayFilter(v);
              if (v) setSelectedMonth(v.slice(0, 7));
            }}
            className="h-[42px] bg-white border border-[#E2E5EA] rounded-[10px] px-3 text-[12.5px] font-bold text-[#3C434F] cursor-pointer outline-none" />
          {dayFilter && (
            <button onClick={() => setDayFilter('')} className="text-[11.5px] font-bold text-steel bg-transparent border-none cursor-pointer hover:underline p-0">Todos</button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        {[
          { label: 'Leads activos', value: kpiActivos, color: '#15171C' },
          { label: 'Nuevos sin contactar', value: newCount, color: '#1F9B6E' },
          { label: 'Ganados este mes', value: ganadosMesCount, color: '#15171C' },
          { label: 'Ingresos cerrados (USD)', value: kpiIngresos, color: '#15171C' },
          { label: 'Ingresos Workshop (Soles)', value: money(kpiIngresosSoles, 'WORKSHOP'), color: '#15171C' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-[#ECEEF2] rounded-[18px] px-5 py-5">
            <div className="text-[11px] text-[#8A929E] font-bold uppercase tracking-[0.05em]">{kpi.label}</div>
            <div className="font-grotesk font-bold text-[26px] tracking-[-0.02em] mt-1.5" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Carga por comercial */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {comercialStats.map(s => (
          <div key={s.nombre} className="bg-white border border-[#ECEEF2] rounded-[18px] px-5 py-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-grotesk font-bold text-[16px] text-[#15171C]">{s.nombre}</div>
              <div className="text-[11px] font-black text-[#9AA0A8] uppercase tracking-[0.05em]">{s.asignados} asignados</div>
            </div>
            <div className="grid grid-cols-3 gap-2.5 text-center">
              {[
                { label: 'Nuevos', value: s.nuevos, color: '#1F9B6E' },
                { label: 'Contactados', value: s.contactados, color: '#2E6CA0' },
                { label: 'Reuniones', value: s.reunionesAgendadas, color: '#7C5CBF' },
                { label: 'Ganados', value: s.ganados, color: '#B5740F' },
                { label: 'Perdidos', value: s.perdidos, color: '#D14343' },
                { label: 'Conversión', value: `${s.tasaConversion}%`, color: '#15171C' },
              ].map(m => (
                <div key={m.label} className="bg-[#F6F8FA] border border-[#EDEFF3] rounded-[10px] py-2.5">
                  <div className="font-grotesk font-bold text-[16px]" style={{ color: m.color }}>{m.value}</div>
                  <div className="text-[9.5px] font-bold text-[#9AA0A8] uppercase tracking-[0.03em] mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {[
          { key: 'all' as Filter, label: `Todos (${monthLeads.length})` },
          { key: 'alta' as Filter, label: `Prioridad alta (${altaCount})` },
          { key: 'nuevo' as Filter, label: `Nuevos (${newCount})` },
        ].map(c => (
          <button key={c.key} onClick={() => setFilter(c.key)}
            className={`px-3.5 py-[7px] rounded-[8px] text-[12px] font-bold cursor-pointer border transition ${filter === c.key ? 'bg-[#15171C] text-white border-[#15171C]' : 'bg-white text-[#5A6270] border-[#E2E5EA] hover:border-[#15171C]'}`}>
            {c.label}
          </button>
        ))}
        <button onClick={openRecursoModal} className="ml-auto flex items-center gap-2 bg-white text-[#15171C] border border-[#E2E5EA] font-bold text-[13px] px-4 py-[9px] rounded-[10px] cursor-pointer hover:border-steel transition">
          🎁 Recurso gratuito
        </button>
        <button onClick={openAddForm} disabled={!configured}
          className="flex items-center gap-2 bg-[#15171C] text-white border-none font-bold text-[13px] px-4 py-[9px] rounded-[10px] cursor-pointer hover:bg-steel transition disabled:opacity-50 disabled:cursor-not-allowed">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Nuevo lead
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-16 text-center text-[14px] text-[#8A929E] font-semibold">Cargando leads…</div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-16 flex flex-col items-center text-center">
          <div className="font-grotesk font-bold text-[17px] text-[#15171C] mb-1">Sin leads para este mes</div>
          <div className="text-[13.5px] text-[#8A929E] font-semibold">{configured ? 'Agrega el primer lead o cambia de mes / filtro.' : 'Conecta el Google Sheet para empezar a registrar leads.'}</div>
        </div>
      ) : view === 'tabla' ? (
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden">
          <div className="overflow-x-auto">
            <div className="grid px-6 py-[13px] bg-[#FAFBFC] border-b border-[#F0F2F5] text-[10.5px] font-black uppercase tracking-[0.05em] text-[#9AA0A8]"
              style={{ gridTemplateColumns: '1.6fr 1.1fr 1fr 1fr .9fr 1fr 1.1fr', minWidth: '900px' }}>
              <span>Cliente</span><span>Nicho</span><span>Fase de venta</span><span>Plan / Precio</span><span>Responsable</span><span>Estado</span><span className="text-right">Acciones</span>
            </div>
            {visibleGroups.map(group => (
              <div key={group.key}>
                <div className="px-6 py-2 bg-[#FAFBFC] border-b border-[#F0F2F5] flex items-center gap-2 sticky top-0 z-10">
                  <span className="text-[11px] font-black text-[#5A6270] uppercase tracking-[0.05em]">{group.label}</span>
                  <span className="text-[10.5px] font-bold text-[#AEB4BE]">({group.leads.length})</span>
                </div>
                {group.leads.map(lead => {
                  const ec = ESTADO_STYLE[lead.estado];
                  return (
                    <div key={lead.id} onClick={() => setSelectedId(lead.id)}
                      className="grid px-6 py-[13px] items-center border-b border-[#F2F4F7] last:border-b-0 cursor-pointer hover:bg-[#FAFBFC] transition"
                      style={{ gridTemplateColumns: '1.6fr 1.1fr 1fr 1fr .9fr 1fr 1.1fr', minWidth: '900px', background: lead.estado === 'Nuevo' ? 'rgba(31,155,110,.04)' : undefined }}>
                      <div className="flex items-center gap-[10px] min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORIDAD_COLOR[lead.prioridad] }} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className="text-[13.5px] font-bold text-[#15171C] truncate">{lead.nombre}</div>
                            {esLeadWeb(lead) && (
                              <span title="Vino del formulario web (/registro)" className="flex-shrink-0 text-[9.5px] font-black text-[#2E6CA0] bg-[#EAF1F8] border border-[#CFE0F0] px-[6px] py-[1px] rounded-full uppercase tracking-[0.03em]">Web</span>
                            )}
                          </div>
                          <div className="text-[11.5px] text-[#9AA0A8] font-semibold">{lead.instagram}</div>
                        </div>
                      </div>
                      <div className="text-[12.5px] text-[#5A6270] font-semibold">{lead.nicho}</div>
                      <div className="text-[12px] text-[#8A929E] font-semibold">{lead.faseVenta}</div>
                      <div>
                        <div className="text-[12.5px] font-bold text-[#15171C]">{lead.plan}</div>
                        <div className="text-[11.5px] text-[#9AA0A8] font-semibold">{money(lead.precio, lead.plan)}</div>
                      </div>
                      <div className="text-[12.5px] text-[#5A6270] font-semibold">{lead.responsable}</div>
                      <div onClick={e => e.stopPropagation()}>
                        <Dropdown value={lead.estado} onChange={v => patchLead(lead.id, { estado: v as Lead['estado'] })} options={ESTADOS}
                          style={{ background: ec.bg, color: ec.color }}
                          className="w-full border-none rounded-[7px] px-2.5 py-[6px] text-[11.5px] font-black cursor-pointer outline-none" />
                      </div>
                      <div onClick={e => e.stopPropagation()} className="flex gap-[6px] justify-end">
                        <a href={waLink(lead.numero)} target="_blank" rel="noopener noreferrer" title="WhatsApp"
                          className="w-8 h-8 rounded-[8px] bg-[#EAF7F1] flex items-center justify-center text-[#1F9B6E] no-underline">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14L21 3" /></svg>
                        </a>
                        <a href={mailLink(lead.nombre)} title="Correo"
                          className="w-8 h-8 rounded-[8px] bg-[#F4F6F8] flex items-center justify-center text-[#5A6270] no-underline">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2.5" /><path d="M22 6l-10 7L2 6" /></svg>
                        </a>
                        <button onClick={() => deleteLead(lead)} disabled={deletingId === lead.id} title="Eliminar lead"
                          className="w-8 h-8 rounded-[8px] bg-[#F4F6F8] border-none flex items-center justify-center text-[#5A6270] cursor-pointer hover:bg-[#FCEDED] hover:text-[#D14343] transition disabled:opacity-50 disabled:cursor-not-allowed">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
          {columns.map(col => (
            <div key={col.estado}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverEstado !== col.estado) setDragOverEstado(col.estado); }}
              onDragLeave={() => setDragOverEstado(prev => (prev === col.estado ? null : prev))}
              onDrop={e => {
                e.preventDefault();
                setDragOverEstado(null);
                const leadId = e.dataTransfer.getData('text/plain');
                const lead = leads.find(l => l.id === leadId);
                if (lead && lead.estado !== col.estado) patchLead(lead.id, { estado: col.estado });
              }}
              className={`bg-white border rounded-[18px] min-h-[160px] transition ${dragOverEstado === col.estado ? 'border-steel bg-[#F3F8FC]' : 'border-[#ECEEF2]'}`}>
              <div className="flex items-center justify-between px-4 py-[13px] border-b border-[#F0F2F5]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: ESTADO_STYLE[col.estado].color }} />
                  <span className="text-[12.5px] font-black text-[#15171C]">{col.estado}</span>
                </div>
                <span className="text-[11px] font-bold text-[#9AA0A8]">{col.leads.length}</span>
              </div>
              <div className="flex flex-col gap-[7px] p-2.5 max-h-[560px] overflow-y-auto">
                {col.leads.map(lead => (
                  <div key={lead.id} draggable
                    onDragStart={e => { e.dataTransfer.setData('text/plain', lead.id); e.dataTransfer.effectAllowed = 'move'; setDraggedLeadId(lead.id); }}
                    onDragEnd={() => { setDraggedLeadId(null); setDragOverEstado(null); }}
                    onClick={() => setSelectedId(lead.id)}
                    className={`bg-[#FAFBFC] border border-[#F0F2F5] rounded-[10px] px-2.5 py-2 cursor-grab active:cursor-grabbing hover:border-steel transition ${draggedLeadId === lead.id ? 'opacity-40' : ''}`}>
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: PRIORIDAD_COLOR[lead.prioridad] }} />
                        <div className="text-[12.5px] font-bold text-[#15171C] truncate">{lead.nombre}</div>
                        {esLeadWeb(lead) && (
                          <span title="Vino del formulario web (/registro)" className="flex-shrink-0 text-[8.5px] font-black text-[#2E6CA0] bg-[#EAF1F8] border border-[#CFE0F0] px-[4px] py-[0.5px] rounded-full uppercase tracking-[0.03em]">Web</span>
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-[#1F9B6E] flex-shrink-0">{money(lead.precio, lead.plan)}</div>
                    </div>
                    <div className="flex justify-between items-center gap-2 mt-1">
                      <div className="text-[10.5px] text-[#9AA0A8] font-semibold truncate">{lead.nicho ? `${lead.nicho} · ` : ''}{lead.faseVenta}</div>
                      <div onClick={e => e.stopPropagation()} className="flex items-center gap-1 flex-shrink-0">
                        <a href={waLink(lead.numero)} target="_blank" rel="noopener noreferrer" title="WhatsApp"
                          className="w-[22px] h-[22px] flex items-center justify-center rounded-[6px] bg-[#EAF7F1] text-[#1F9B6E] no-underline">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.82.48 3.53 1.32 5.01L2 22l5.14-1.28A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18a7.9 7.9 0 0 1-4.03-1.1l-.29-.17-3 .75.76-2.93-.19-.3A7.93 7.93 0 1 1 12 20zm4.36-5.96c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.19-1.41-1.33-1.65-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.46-.39-.4-.54-.4-.14 0-.3-.02-.46-.02s-.42.06-.64.3c-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" /></svg>
                        </a>
                        <Dropdown value={lead.estado} onChange={v => patchLead(lead.id, { estado: v as Lead['estado'] })} options={ESTADOS}
                          className="h-[22px] bg-[#F4F6F8] border border-[#E2E5EA] text-[#15171C] rounded-[6px] text-[9.5px] font-semibold px-1 outline-none cursor-pointer" />
                      </div>
                    </div>
                  </div>
                ))}
                {col.leads.length === 0 && <div className="text-[11.5px] text-[#C2C8D2] font-semibold text-center py-4">Sin leads</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recurso gratuito modal */}
      {showRecursoModal && (
        <div className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,.55)] flex items-center justify-center p-6" onClick={() => { if (!savingRecurso) setShowRecursoModal(false); }}>
          <div className="bg-white rounded-[22px] w-full max-w-[500px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 py-5 border-b border-[#F0F2F5]">
              <div>
                <div className="font-grotesk font-bold text-[19px] text-[#15171C]">Recurso gratuito</div>
                <div className="text-[13px] text-[#8A929E] font-semibold mt-0.5">Se entrega automático al terminar el formulario público de registro</div>
              </div>
              <button onClick={() => setShowRecursoModal(false)} className="w-9 h-9 rounded-[10px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-7 py-6 flex flex-col gap-4">
              <div>
                <label className={labelClass}>Tipo de recurso</label>
                <Dropdown className={inputClass} value={recursoDraft.tipo}
                  onChange={tipo => setRecursoDraft(d => ({ ...d, tipo, url: tipo === 'pdf' ? d.url : d.url }))}
                  options={[
                    { value: 'pdf', label: 'Archivo PDF' },
                    { value: 'drive', label: 'Enlace de Google Drive' },
                    { value: 'video', label: 'Enlace de video' },
                    { value: 'link', label: 'Enlace personalizado' },
                  ]} />
              </div>
              <div>
                <label className={labelClass}>Título (lo ve el lead)</label>
                <input className={inputClass} value={recursoDraft.titulo} onChange={e => setRecursoDraft(d => ({ ...d, titulo: e.target.value }))}
                  placeholder="Ej. Descarga tu guía gratuita" />
              </div>
              {recursoDraft.tipo === 'pdf' ? (
                <div>
                  <label className={labelClass}>Archivo PDF</label>
                  <input type="file" accept="application/pdf" disabled={uploadingRecurso}
                    onChange={e => uploadRecursoPDF(e.target.files?.[0] ?? null)}
                    className="w-full text-[13px] font-medium text-[#5A6270]" />
                  {uploadingRecurso && <div className="text-[12px] text-[#8A929E] font-semibold mt-1.5">Subiendo…</div>}
                  {!uploadingRecurso && recursoDraft.url && (
                    <div className="text-[12px] text-[#1F9B6E] font-semibold mt-1.5 truncate">✓ {recursoFileName || 'Archivo cargado'}</div>
                  )}
                </div>
              ) : (
                <div>
                  <label className={labelClass}>Enlace</label>
                  <input className={inputClass} value={recursoDraft.url} onChange={e => setRecursoDraft(d => ({ ...d, url: e.target.value }))}
                    placeholder="https://..." />
                </div>
              )}
            </div>
            {recursoDraft.url && (
              <div className="px-7 pb-4">
                <button onClick={removeRecurso} disabled={removingRecurso}
                  className="text-[12.5px] font-bold text-[#D14343] bg-transparent border-none cursor-pointer hover:underline p-0 disabled:opacity-50 disabled:cursor-not-allowed">
                  {removingRecurso ? 'Quitando…' : 'Quitar recurso gratuito (no entregar nada)'}
                </button>
              </div>
            )}
            <div className="flex gap-3 px-7 pb-7">
              <button onClick={() => setShowRecursoModal(false)} className="flex-1 h-11 bg-[#F4F6F8] text-[#15171C] border border-[#E2E5EA] rounded-[12px] font-bold text-[14px] cursor-pointer hover:bg-[#ECEEF2] transition">Cancelar</button>
              <button onClick={saveRecurso} disabled={savingRecurso || uploadingRecurso}
                className="flex-1 h-11 bg-[#15171C] text-white border-none rounded-[12px] font-bold text-[14px] cursor-pointer hover:bg-steel transition disabled:opacity-60 disabled:cursor-not-allowed">
                {savingRecurso ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,.55)] flex items-center justify-center p-6" onClick={() => { if (!submitting) setShowAddForm(false); }}>
          <div className="bg-white rounded-[22px] w-full max-w-[560px] max-h-[88vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 py-5 border-b border-[#F0F2F5] sticky top-0 bg-white">
              <div className="font-grotesk font-bold text-[19px] text-[#15171C]">Añadir lead</div>
              <button onClick={() => setShowAddForm(false)} className="w-9 h-9 rounded-[10px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-7 py-6 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelClass}>Nombre *</label>
                <input className={inputClass} value={draft.nombre} onChange={e => setDraft(d => ({ ...d, nombre: e.target.value }))} placeholder="Nombre del lead" />
              </div>
              <div>
                <label className={labelClass}>Instagram</label>
                <input className={inputClass} value={draft.instagram} onChange={e => setDraft(d => ({ ...d, instagram: e.target.value }))} placeholder="@usuario" />
              </div>
              <div>
                <label className={labelClass}>WhatsApp *</label>
                <input className={inputClass} value={draft.numero} onChange={e => setDraft(d => ({ ...d, numero: e.target.value }))} placeholder="51987654321" />
              </div>
              <div>
                <label className={labelClass}>Tipo infoproductor</label>
                <input className={inputClass} value={draft.tipoInfoproductor} onChange={e => setDraft(d => ({ ...d, tipoInfoproductor: e.target.value }))} placeholder="Ej. Coach fitness" />
              </div>
              <div>
                <label className={labelClass}>Nicho</label>
                <input className={inputClass} value={draft.nicho} onChange={e => setDraft(d => ({ ...d, nicho: e.target.value }))} placeholder="Ej. Fitness & nutrición" />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Plataformas activas</label>
                <input className={inputClass} value={draft.plataformas} onChange={e => setDraft(d => ({ ...d, plataformas: e.target.value }))} placeholder="Instagram, TikTok" />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Link de Ads</label>
                <input className={inputClass} value={draft.linkAds} onChange={e => setDraft(d => ({ ...d, linkAds: e.target.value }))} placeholder="Link del anuncio del que vino el lead" />
              </div>
              <div>
                <label className={labelClass}>Plan</label>
                <Dropdown className={inputClass} value={draft.plan} onChange={plan => {
                  setDraft(d => ({ ...d, plan, precio: PLAN_PRICES[plan] ?? d.precio }));
                }} options={['SKOOL', 'SERVICIO', 'INFOPRODUCTO TERRY', 'WORKSHOP']} />
              </div>
              <div>
                <label className={labelClass}>Responsable</label>
                <Dropdown className={inputClass} value={draft.responsable} onChange={v => setDraft(d => ({ ...d, responsable: v }))}
                  options={[{ value: '', label: 'Selecciona…' }, ...RESPONSABLES.map(r => ({ value: r, label: r }))]} />
              </div>
              <div>
                <label className={labelClass}>Propietario *</label>
                <Dropdown className={inputClass} value={draft.propietario} onChange={v => setDraft(d => ({ ...d, propietario: v }))}
                  options={[{ value: '', label: 'Selecciona…' }, ...PROPIETARIOS.map(p => ({ value: p, label: p }))]} />
              </div>
              <div>
                <label className={labelClass}>Fase de venta</label>
                <Dropdown className={inputClass} value={draft.faseVenta} onChange={faseVenta => {
                  setDraft(d => ({ ...d, faseVenta, probabilidad: FASE_PROBABILIDAD[faseVenta] ?? d.probabilidad }));
                }} options={['Prospección', 'Propuesta', 'Negociación', 'Cierre']} />
              </div>
              <div>
                <label className={labelClass}>Probabilidad (%)</label>
                <input className={inputClass} value={draft.probabilidad} onChange={e => setDraft(d => ({ ...d, probabilidad: e.target.value }))} placeholder="40" />
              </div>
              <div>
                <label className={labelClass}>Estado</label>
                <Dropdown className={inputClass} value={draft.estado} onChange={v => setDraft(d => ({ ...d, estado: v as Lead['estado'] }))} options={ESTADOS} />
              </div>
              <div>
                <label className={labelClass}>Fecha de inicio</label>
                <input type="date" className={inputClass} value={dmyToISO(draft.fechaInicio)} onChange={e => setDraft(d => ({ ...d, fechaInicio: isoToDMY(e.target.value) }))} />
              </div>
              <div>
                <label className={labelClass}>Fecha de renovación</label>
                <input type="date" className={inputClass} value={dmyToISO(draft.fechaRenovacion)} onChange={e => setDraft(d => ({ ...d, fechaRenovacion: isoToDMY(e.target.value) }))} />
              </div>
              <div>
                <label className={labelClass}>Precio ({PLANES_EN_SOLES.includes(draft.plan) ? 'S/' : 'USD'}) *</label>
                <input className={inputClass} value={draft.precio || ''} onChange={e => setDraft(d => ({ ...d, precio: Number(e.target.value) || 0 }))} placeholder="5000" />
              </div>
              {draft.faseVenta === 'Cierre' && (
                <div>
                  <label className={labelClass}>Abono inicial ({PLANES_EN_SOLES.includes(draft.plan) ? 'S/' : 'USD'})</label>
                  <input className={inputClass} value={draft.abono || ''} onChange={e => setDraft(d => ({ ...d, abono: Number(e.target.value) || 0 }))} placeholder="0" />
                </div>
              )}
              <div>
                <label className={labelClass}>Prioridad</label>
                <Dropdown className={inputClass} value={draft.prioridad} onChange={v => setDraft(d => ({ ...d, prioridad: v as Lead['prioridad'] }))} options={PRIORIDADES} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Observación</label>
                <textarea className={`${inputClass} min-h-[64px] resize-y`} value={draft.observacion} onChange={e => setDraft(d => ({ ...d, observacion: e.target.value }))} placeholder="Notas del primer contacto..." />
              </div>
            </div>

            {formError && <div className="px-7 -mt-2 mb-2 text-[12.5px] text-[#D14343] font-semibold">{formError}</div>}

            <div className="flex gap-3 px-7 pb-7">
              <button onClick={() => setShowAddForm(false)} className="flex-1 h-11 bg-[#F4F6F8] text-[#15171C] border border-[#E2E5EA] rounded-[12px] font-bold text-[14px] cursor-pointer hover:bg-[#ECEEF2] transition">Cancelar</button>
              <button onClick={submitAddForm} disabled={submitting}
                className="flex-1 h-11 bg-[#15171C] text-white border-none rounded-[12px] font-bold text-[14px] cursor-pointer hover:bg-steel transition disabled:opacity-60 disabled:cursor-not-allowed">
                {submitting ? 'Guardando…' : 'Guardar lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-[9998] bg-[rgba(0,0,0,.5)] flex justify-end" onClick={() => setSelectedId(null)}>
          <div className="w-[440px] max-w-[92vw] h-full bg-white overflow-y-auto px-7 py-7" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <input
                  key={selectedLead.id}
                  defaultValue={selectedLead.nombre}
                  onBlur={e => {
                    const value = e.target.value.trim();
                    if (value && value !== selectedLead.nombre) patchLead(selectedLead.id, { nombre: value });
                  }}
                  className="w-full font-grotesk font-bold text-[19px] text-[#15171C] bg-transparent border-none outline-none p-0 focus:underline"
                />
                <div className="flex gap-2 mt-2 flex-wrap">
                  {esLeadWeb(selectedLead) && (
                    <span title="Vino del formulario web (/registro)" className="text-[10.5px] font-black text-[#2E6CA0] bg-[#EAF1F8] border border-[#CFE0F0] rounded-[7px] px-2.5 py-1 uppercase tracking-[0.03em]">Web</span>
                  )}
                  <span className="text-[12px] text-[#8A929E] font-semibold bg-[#F4F6F8] rounded-[7px] px-2.5 py-1">{selectedLead.instagram || '—'}</span>
                  <span className="text-[12px] text-[#8A929E] font-semibold bg-[#F4F6F8] rounded-[7px] px-2.5 py-1">{selectedLead.numero}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => deleteLead(selectedLead)} disabled={deletingId === selectedLead.id} title="Eliminar lead"
                  className="w-9 h-9 rounded-[10px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#FCEDED] hover:text-[#D14343] transition disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                </button>
                <button onClick={() => setSelectedId(null)} className="w-9 h-9 rounded-[10px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <a href={waLink(selectedLead.numero)} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-[10px] rounded-[10px] bg-[#EAF7F1] text-[#1F9B6E] font-bold text-[12.5px] no-underline">Contactar por WhatsApp</a>
              <a href={mailLink(selectedLead.nombre)} className="flex-1 text-center py-[10px] rounded-[10px] bg-[#F4F6F8] text-[#15171C] font-bold text-[12.5px] no-underline">Enviar correo</a>
            </div>

            <div className="mt-5">
              <label className={labelClass}>Estado del lead</label>
              <Dropdown value={selectedLead.estado} onChange={v => patchLead(selectedLead.id, { estado: v as Lead['estado'] })} options={ESTADOS}
                style={{ background: ESTADO_STYLE[selectedLead.estado].bg, color: ESTADO_STYLE[selectedLead.estado].color }}
                className="w-full rounded-[10px] px-3 py-[10px] text-[13px] font-black border-none outline-none cursor-pointer" />
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-4">
              {(
                [
                  ['tipoInfoproductor', 'Tipo infoproductor'], ['nicho', 'Nicho'], ['plataformas', 'Plataformas activas'], ['linkAds', 'Link de Ads'],
                ] as [keyof Pick<Lead, 'tipoInfoproductor' | 'nicho' | 'plataformas' | 'linkAds'>, string][]
              ).map(([field, label]) => (
                <div key={field} className="bg-[#F6F8FA] border border-[#EDEFF3] rounded-[10px] px-3 py-2.5">
                  <div className={labelClass}>{label}</div>
                  <input defaultValue={selectedLead[field]} onBlur={e => e.target.value !== selectedLead[field] && patchLead(selectedLead.id, { [field]: e.target.value })}
                    className="w-full bg-transparent border-none text-[13px] font-semibold text-[#15171C] outline-none p-0" />
                </div>
              ))}
              <div className="bg-[#F6F8FA] border border-[#EDEFF3] rounded-[10px] px-3 py-2.5">
                <div className={labelClass}>Responsable</div>
                <Dropdown value={selectedLead.responsable} onChange={v => patchLead(selectedLead.id, { responsable: v })}
                  options={[{ value: '', label: 'Selecciona…' }, ...RESPONSABLES.map(r => ({ value: r, label: r }))]}
                  className="w-full bg-transparent border-none text-[13px] font-semibold text-[#15171C] outline-none p-0" />
              </div>
              <div className="bg-[#F6F8FA] border border-[#EDEFF3] rounded-[10px] px-3 py-2.5">
                <div className={labelClass}>Propietario</div>
                <Dropdown value={selectedLead.propietario} onChange={v => patchLead(selectedLead.id, { propietario: v })}
                  options={[{ value: '', label: 'Selecciona…' }, ...PROPIETARIOS.map(p => ({ value: p, label: p }))]}
                  className="w-full bg-transparent border-none text-[13px] font-semibold text-[#15171C] outline-none p-0" />
              </div>
              <div className="bg-[#F6F8FA] border border-[#EDEFF3] rounded-[10px] px-3 py-2.5">
                <div className={labelClass}>Plan</div>
                <Dropdown value={selectedLead.plan} onChange={plan => {
                  patchLead(selectedLead.id, { plan, precio: PLAN_PRICES[plan] ?? selectedLead.precio });
                }} options={['SKOOL', 'SERVICIO', 'INFOPRODUCTO TERRY', 'WORKSHOP']}
                  className="w-full bg-transparent border-none text-[13px] font-semibold text-[#15171C] outline-none p-0" />
              </div>
              <div className="bg-[#F6F8FA] border border-[#EDEFF3] rounded-[10px] px-3 py-2.5">
                <div className={labelClass}>Fase de venta</div>
                <Dropdown value={selectedLead.faseVenta} onChange={faseVenta => {
                  patchLead(selectedLead.id, { faseVenta, probabilidad: FASE_PROBABILIDAD[faseVenta] ?? selectedLead.probabilidad });
                }} options={['Prospección', 'Propuesta', 'Negociación', 'Cierre']}
                  className="w-full bg-transparent border-none text-[13px] font-semibold text-[#15171C] outline-none p-0" />
              </div>
              <div className="bg-[#F6F8FA] border border-[#EDEFF3] rounded-[10px] px-3 py-2.5">
                <div className={labelClass}>Probabilidad</div>
                <input key={selectedLead.probabilidad} defaultValue={selectedLead.probabilidad} onBlur={e => e.target.value !== selectedLead.probabilidad && patchLead(selectedLead.id, { probabilidad: e.target.value })}
                  className="w-full bg-transparent border-none text-[13px] font-semibold text-[#15171C] outline-none p-0" />
              </div>
              <div className="bg-[#F6F8FA] border border-[#EDEFF3] rounded-[10px] px-3 py-2.5">
                <div className={labelClass}>Fecha inicio</div>
                <input type="date" defaultValue={dmyToISO(selectedLead.fechaInicio)} onChange={e => patchLead(selectedLead.id, { fechaInicio: isoToDMY(e.target.value) })}
                  className="w-full bg-transparent border-none text-[13px] font-semibold text-[#15171C] outline-none p-0" />
              </div>
              <div className="bg-[#F6F8FA] border border-[#EDEFF3] rounded-[10px] px-3 py-2.5">
                <div className={labelClass}>Renovación</div>
                <input type="date" defaultValue={dmyToISO(selectedLead.fechaRenovacion)} onChange={e => patchLead(selectedLead.id, { fechaRenovacion: isoToDMY(e.target.value) })}
                  className="w-full bg-transparent border-none text-[13px] font-semibold text-[#15171C] outline-none p-0" />
              </div>
            </div>

            {selectedLead.faseVenta === 'Cierre' ? (
              <div className="mt-3 bg-[#F6F8FA] border border-[#EDEFF3] rounded-[12px] p-3.5 grid grid-cols-3 gap-2.5">
                <div>
                  <div className={labelClass}>Precio</div>
                  <input defaultValue={selectedLead.precio} onBlur={e => patchLead(selectedLead.id, { precio: Number(e.target.value) || 0 })}
                    className="w-full bg-transparent border-none text-[14px] font-bold text-[#15171C] outline-none p-0" />
                </div>
                <div>
                  <div className={labelClass}>Abonado</div>
                  <div className="text-[14px] font-bold mt-0.5 text-[#15171C]">{money(selectedLead.abono, selectedLead.plan)}</div>
                </div>
                <div>
                  <div className={labelClass}>Saldo pendiente</div>
                  {selectedLead.precio - selectedLead.abono <= 0 && selectedLead.precio > 0 ? (
                    <div className="text-[12px] font-bold mt-1 text-[#1F9B6E]">✓ Pagado completo</div>
                  ) : (
                    <div className="text-[14px] font-bold mt-0.5 text-[#D14343]">{money(selectedLead.precio - selectedLead.abono, selectedLead.plan)}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-3 bg-[#F6F8FA] border border-[#EDEFF3] rounded-[12px] p-3.5">
                <div className={labelClass}>Precio (estimado)</div>
                <input defaultValue={selectedLead.precio} onBlur={e => patchLead(selectedLead.id, { precio: Number(e.target.value) || 0 })}
                  className="w-full bg-transparent border-none text-[14px] font-bold text-[#15171C] outline-none p-0" />
              </div>
            )}

            {selectedLead.faseVenta === 'Cierre' && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClass}>Historial de abonos</label>
                  {selectedLead.precio > 0 ? (
                    <button onClick={() => setShowPagoForm(s => !s)} className="text-[11.5px] font-bold text-steel bg-transparent border-none cursor-pointer hover:underline p-0">
                      {showPagoForm ? 'Cancelar' : '+ Registrar abono'}
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#AEB4BE] font-semibold">Define el precio primero</span>
                  )}
                </div>
                {showPagoForm && (
                  <div className="bg-[#F6F8FA] border border-[#EDEFF3] rounded-[10px] p-3 mb-2 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={pagoMonto} onChange={e => setPagoMonto(e.target.value)} placeholder={`Monto (${PLANES_EN_SOLES.includes(selectedLead.plan) ? 'S/' : 'USD'})`}
                        className="h-9 px-2.5 border border-[#E2E5EA] rounded-[8px] text-[12.5px] font-medium outline-none bg-white text-[#15171C] focus:border-steel" />
                      <input type="date" value={pagoFecha} onChange={e => setPagoFecha(e.target.value)}
                        className="h-9 px-2.5 border border-[#E2E5EA] rounded-[8px] text-[12.5px] font-medium outline-none bg-white text-[#15171C] focus:border-steel" style={{ colorScheme: 'light' }} />
                    </div>
                    <input value={pagoNota} onChange={e => setPagoNota(e.target.value)} placeholder="Nota (opcional)"
                      className="h-9 px-2.5 border border-[#E2E5EA] rounded-[8px] text-[12.5px] font-medium outline-none bg-white text-[#15171C] focus:border-steel" />
                    <div className="text-[11px] text-[#9AA0A8] font-semibold">Saldo pendiente actual: {money(selectedLead.precio - selectedLead.abono, selectedLead.plan)}</div>
                    <button onClick={() => submitPago(selectedLead)} disabled={savingPago}
                      className="h-9 bg-[#1F9B6E] text-white border-none rounded-[8px] font-bold text-[12.5px] cursor-pointer hover:bg-[#188058] transition disabled:opacity-60">
                      {savingPago ? 'Guardando…' : 'Guardar abono'}
                    </button>
                  </div>
                )}
                {leadPagos.length === 0 ? (
                  <div className="text-[12px] text-[#C2C8D2] font-semibold py-2">Sin abonos registrados.</div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {leadPagos.map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-2 bg-white border border-[#F0F2F5] rounded-[8px] px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold text-[#15171C]">{money(p.monto, selectedLead.plan)}</div>
                          <div className="text-[11px] text-[#9AA0A8] font-semibold">{p.fecha.split('-').reverse().join('/')}{p.nota ? ` · ${p.nota}` : ''}</div>
                        </div>
                        <button onClick={() => deletePago(p, selectedLead)} title="Eliminar" className="text-[#C2C8D2] hover:text-[#D14343] bg-transparent border-none cursor-pointer text-[12px] font-bold flex-shrink-0">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-5">
              <label className={labelClass}>Prioridad</label>
              <div className="flex gap-2">
                {PRIORIDADES.map(p => (
                  <button key={p} onClick={() => patchLead(selectedLead.id, { prioridad: p })}
                    style={{
                      color: selectedLead.prioridad === p ? '#fff' : PRIORIDAD_COLOR[p],
                      background: selectedLead.prioridad === p ? PRIORIDAD_COLOR[p] : 'transparent',
                      borderColor: PRIORIDAD_COLOR[p],
                    }}
                    className="px-3.5 py-[7px] rounded-[8px] text-[12px] font-bold cursor-pointer border">
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label className={labelClass}>Observación</label>
              <textarea defaultValue={selectedLead.observacion} onBlur={e => e.target.value !== selectedLead.observacion && patchLead(selectedLead.id, { observacion: e.target.value })}
                className="w-full min-h-[80px] bg-[#F6F8FA] border border-[#EDEFF3] rounded-[10px] p-3 text-[13px] text-[#3C434F] leading-[1.5] outline-none resize-y" />
            </div>

            {(selectedLead.email || (selectedLead.cuestionario && Object.keys(selectedLead.cuestionario).length > 0)) && (
              <div className="mt-5">
                <label className={labelClass}>Datos del cuestionario</label>
                <div className="bg-[#F6F8FA] border border-[#EDEFF3] rounded-[12px] p-3 flex flex-col gap-2.5 mt-1.5">
                  {selectedLead.email && (
                    <div className="flex justify-between gap-3 text-[12.5px]">
                      <span className="text-[#8A929E] font-semibold flex-shrink-0">Correo</span>
                      <span className="font-bold text-[#15171C] text-right break-all">{selectedLead.email}</span>
                    </div>
                  )}
                  {selectedLead.cuestionario && Object.entries(selectedLead.cuestionario).map(([pregunta, respuesta]) => (
                    <div key={pregunta} className="flex justify-between gap-3 text-[12.5px]">
                      <span className="text-[#8A929E] font-semibold flex-shrink-0">{pregunta}</span>
                      <span className="font-bold text-[#15171C] text-right">{respuesta}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
