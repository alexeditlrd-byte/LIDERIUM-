'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Lead, LeadInput } from '@/lib/leads-sheet';
import Dropdown from '@/components/Dropdown';

interface PanelComercialProps {
  showToast: (text: string, ok?: boolean) => void;
}

type View = 'tabla' | 'kanban';
type Filter = 'all' | 'alta' | 'nuevo';

const RESPONSABLES = ['Winona', 'Maryori'];
const PROPIETARIOS = ['Terry', 'Santiago'];

const ESTADOS: Lead['estado'][] = ['Nuevo', 'Contactado', 'Ganado', 'Perdido'];
const PRIORIDADES: Lead['prioridad'][] = ['Alta', 'Media', 'Baja'];
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const ESTADO_STYLE: Record<Lead['estado'], { bg: string; color: string }> = {
  Nuevo: { bg: '#EAF7F1', color: '#1F9B6E' },
  Contactado: { bg: '#EAF1F8', color: '#2E6CA0' },
  Ganado: { bg: '#FBF1E2', color: '#B5740F' },
  Perdido: { bg: '#FCEDED', color: '#D14343' },
};

const PRIORIDAD_COLOR: Record<Lead['prioridad'], string> = {
  Alta: '#D14343',
  Media: '#B5740F',
  Baja: '#AEB4BE',
};

const PLAN_PRICES: Record<string, number> = { SKOOL: 750, SERVICIO: 2000 };
const FASE_PROBABILIDAD: Record<string, string> = { 'Prospección': '20', 'Propuesta': '30', 'Negociación': '70', 'Cierre': '100' };

function emptyDraft(): LeadInput {
  const today = new Date();
  const fechaInicio = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  return {
    nombre: '', instagram: '', numero: '', tipoInfoproductor: '', nicho: '', plataformas: '', linkAds: '',
    nps: '', plan: 'SKOOL', faseVenta: 'Prospección', probabilidad: '', responsable: '', propietario: '',
    fechaInicio, fechaRenovacion: '', precio: PLAN_PRICES.SKOOL, abono: 0, estado: 'Nuevo', prioridad: 'Media', observacion: '',
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
function money(n: number) {
  const v = Number(n) || 0;
  const sign = v < 0 ? '-' : '';
  return sign + '$' + Math.abs(v).toLocaleString('en-US');
}
function leadInMonth(lead: Lead, ym: string) {
  const parts = String(lead.fechaInicio || '').split('/');
  if (parts.length !== 3) return false;
  const [, m, y] = parts;
  return `${y.padStart(4, '0')}-${m.padStart(2, '0')}` === ym;
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
    if (monto > saldoPendiente) { showToast(`El abono no puede superar el saldo pendiente (${money(saldoPendiente)}).`, false); return; }
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
    if (!confirm(`¿Eliminar el abono de ${money(pago.monto)}?`)) return;
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
      return true;
    });
  }, [monthLeads, search, filter, responsableFilter]);

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
  const kpiIngresos = money(pagosDelMes.reduce((s, p) => s + p.monto, 0));

  const columns = ESTADOS.map(estado => ({
    estado, leads: visible.filter(l => l.estado === estado),
  }));

  const selectedLead = selectedId ? leads.find(l => l.id === selectedId) ?? null : null;

  const patchLead = async (id: string, patch: Partial<LeadInput>) => {
    const prev = leads;
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

        <Dropdown value={selectedMonth} onChange={setSelectedMonth} options={monthOptions}
          className="h-[42px] bg-white border border-[#E2E5EA] rounded-[10px] px-3 text-[12.5px] font-bold text-[#3C434F] cursor-pointer outline-none" />

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-[#9AA0A8] uppercase tracking-[0.05em]">Responsable</span>
          <Dropdown value={responsableFilter} onChange={setResponsableFilter} options={['Todos', ...RESPONSABLES]}
            className="h-[42px] bg-white border border-[#E2E5EA] rounded-[10px] px-3 text-[12.5px] font-bold text-[#3C434F] cursor-pointer outline-none" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Leads activos', value: kpiActivos, color: '#15171C' },
          { label: 'Nuevos sin contactar', value: newCount, color: '#1F9B6E' },
          { label: 'Ganados este mes', value: ganadosMesCount, color: '#15171C' },
          { label: 'Ingresos cerrados', value: kpiIngresos, color: '#15171C' },
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
        <button onClick={openAddForm} disabled={!configured}
          className="ml-auto flex items-center gap-2 bg-[#15171C] text-white border-none font-bold text-[13px] px-4 py-[9px] rounded-[10px] cursor-pointer hover:bg-steel transition disabled:opacity-50 disabled:cursor-not-allowed">
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
            {visible.map(lead => {
              const ec = ESTADO_STYLE[lead.estado];
              return (
                <div key={lead.id} onClick={() => setSelectedId(lead.id)}
                  className="grid px-6 py-[13px] items-center border-b border-[#F2F4F7] last:border-b-0 cursor-pointer hover:bg-[#FAFBFC] transition"
                  style={{ gridTemplateColumns: '1.6fr 1.1fr 1fr 1fr .9fr 1fr 1.1fr', minWidth: '900px', background: lead.estado === 'Nuevo' ? 'rgba(31,155,110,.04)' : undefined }}>
                  <div className="flex items-center gap-[10px] min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORIDAD_COLOR[lead.prioridad] }} />
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-bold text-[#15171C] truncate">{lead.nombre}</div>
                      <div className="text-[11.5px] text-[#9AA0A8] font-semibold">{lead.instagram}</div>
                    </div>
                  </div>
                  <div className="text-[12.5px] text-[#5A6270] font-semibold">{lead.nicho}</div>
                  <div className="text-[12px] text-[#8A929E] font-semibold">{lead.faseVenta}</div>
                  <div>
                    <div className="text-[12.5px] font-bold text-[#15171C]">{lead.plan}</div>
                    <div className="text-[11.5px] text-[#9AA0A8] font-semibold">{money(lead.precio)}</div>
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
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
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
              <div className="flex flex-col gap-[10px] p-3">
                {col.leads.map(lead => (
                  <div key={lead.id} draggable
                    onDragStart={e => { e.dataTransfer.setData('text/plain', lead.id); e.dataTransfer.effectAllowed = 'move'; setDraggedLeadId(lead.id); }}
                    onDragEnd={() => { setDraggedLeadId(null); setDragOverEstado(null); }}
                    onClick={() => setSelectedId(lead.id)}
                    className={`bg-[#FAFBFC] border border-[#F0F2F5] rounded-[12px] p-3 cursor-grab active:cursor-grabbing hover:border-steel transition ${draggedLeadId === lead.id ? 'opacity-40' : ''}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="text-[13px] font-bold text-[#15171C]">{lead.nombre}</div>
                      <span className="w-[7px] h-[7px] rounded-full flex-shrink-0 mt-1" style={{ background: PRIORIDAD_COLOR[lead.prioridad] }} />
                    </div>
                    <div className="text-[11px] text-[#8A929E] font-semibold mt-0.5">{lead.nicho}</div>
                    <div className="flex justify-between items-center mt-2.5">
                      <div className="text-[11px] text-[#9AA0A8] font-semibold">{lead.faseVenta}</div>
                      <div className="text-[11.5px] font-bold text-[#1F9B6E]">{money(lead.precio)}</div>
                    </div>
                    <div onClick={e => e.stopPropagation()} className="flex gap-[6px] mt-2.5">
                      <a href={waLink(lead.numero)} target="_blank" rel="noopener noreferrer"
                        className="flex-1 text-center py-[6px] rounded-[7px] bg-[#EAF7F1] text-[#1F9B6E] text-[10.5px] font-bold no-underline">WhatsApp</a>
                      <Dropdown value={lead.estado} onChange={v => patchLead(lead.id, { estado: v as Lead['estado'] })} options={ESTADOS}
                        className="bg-[#F4F6F8] border border-[#E2E5EA] text-[#15171C] rounded-[7px] text-[10.5px] font-semibold px-1 outline-none cursor-pointer" />
                    </div>
                  </div>
                ))}
                {col.leads.length === 0 && <div className="text-[11.5px] text-[#C2C8D2] font-semibold text-center py-4">Sin leads</div>}
              </div>
            </div>
          ))}
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
                }} options={['SKOOL', 'SERVICIO', 'INFOPRODUCTO TERRY']} />
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
                <label className={labelClass}>Precio (USD) *</label>
                <input className={inputClass} value={draft.precio || ''} onChange={e => setDraft(d => ({ ...d, precio: Number(e.target.value) || 0 }))} placeholder="5000" />
              </div>
              {draft.faseVenta === 'Cierre' && (
                <div>
                  <label className={labelClass}>Abono inicial (USD)</label>
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
                <div className="flex gap-2 mt-2">
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
                }} options={['SKOOL', 'SERVICIO', 'INFOPRODUCTO TERRY']}
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
                  <div className="text-[14px] font-bold mt-0.5 text-[#15171C]">{money(selectedLead.abono)}</div>
                </div>
                <div>
                  <div className={labelClass}>Saldo pendiente</div>
                  {selectedLead.precio - selectedLead.abono <= 0 && selectedLead.precio > 0 ? (
                    <div className="text-[12px] font-bold mt-1 text-[#1F9B6E]">✓ Pagado completo</div>
                  ) : (
                    <div className="text-[14px] font-bold mt-0.5 text-[#D14343]">{money(selectedLead.precio - selectedLead.abono)}</div>
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
                      <input value={pagoMonto} onChange={e => setPagoMonto(e.target.value)} placeholder="Monto (USD)"
                        className="h-9 px-2.5 border border-[#E2E5EA] rounded-[8px] text-[12.5px] font-medium outline-none bg-white text-[#15171C] focus:border-steel" />
                      <input type="date" value={pagoFecha} onChange={e => setPagoFecha(e.target.value)}
                        className="h-9 px-2.5 border border-[#E2E5EA] rounded-[8px] text-[12.5px] font-medium outline-none bg-white text-[#15171C] focus:border-steel" style={{ colorScheme: 'light' }} />
                    </div>
                    <input value={pagoNota} onChange={e => setPagoNota(e.target.value)} placeholder="Nota (opcional)"
                      className="h-9 px-2.5 border border-[#E2E5EA] rounded-[8px] text-[12.5px] font-medium outline-none bg-white text-[#15171C] focus:border-steel" />
                    <div className="text-[11px] text-[#9AA0A8] font-semibold">Saldo pendiente actual: {money(selectedLead.precio - selectedLead.abono)}</div>
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
                          <div className="text-[13px] font-bold text-[#15171C]">{money(p.monto)}</div>
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
          </div>
        </div>
      )}
    </div>
  );
}
