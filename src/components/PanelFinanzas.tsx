'use client';

import { useEffect, useMemo, useState } from 'react';

interface PanelFinanzasProps {
  showToast: (text: string, ok?: boolean) => void;
}

interface LeadLite { id: string; nombre: string; faseVenta: string; }
interface Pago { id: string; leadId: string; clienteNombre: string; monto: number; fecha: string; nota: string; }
interface Movimiento { id: string; tipo: 'ingreso' | 'egreso'; concepto: string; categoria: string; monto: number; fecha: string; nota: string; }
interface Config { mesInicio: string; cajaInicial: number; }

type MovRow = {
  id: string;
  fecha: string;
  tipo: 'Ingreso' | 'Egreso';
  concepto: string;
  cliente: string;
  categoria: string;
  monto: number;
  origen: 'Comercial' | 'Manual';
};

const CATEGORIA_SUGERENCIAS_INGRESO = ['Cliente', 'Otros ingresos', 'Venta extraordinaria'];
const CATEGORIA_SUGERENCIAS_EGRESO = ['Operación', 'Personal', 'Software', 'Emergencia', 'Marketing'];

function money(n: number) {
  const v = Number(n) || 0;
  const sign = v < 0 ? '-' : '';
  return sign + 'S/ ' + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function monthKeyOf(dateStr: string) {
  return (dateStr || '').slice(0, 7); // 'YYYY-MM-DD' -> 'YYYY-MM'
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  const names = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${names[m - 1]} ${y}`;
}

function addMonths(key: string, n: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PanelFinanzas({ showToast }: PanelFinanzasProps) {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadLite[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [config, setConfig] = useState<Config>({ mesInicio: todayISO().slice(0, 7), cajaInicial: 0 });

  const [selectedMonth, setSelectedMonth] = useState(todayISO().slice(0, 7));

  const [showConfig, setShowConfig] = useState(false);
  const [configForm, setConfigForm] = useState<Config>(config);
  const [savingConfig, setSavingConfig] = useState(false);

  const [showMovModal, setShowMovModal] = useState<'ingreso' | 'egreso' | null>(null);
  const [movForm, setMovForm] = useState({ concepto: '', categoria: '', monto: '', fecha: todayISO(), nota: '' });
  const [savingMov, setSavingMov] = useState(false);

  const load = () => {
    Promise.all([
      fetch('/api/leads').then(r => r.json()),
      fetch('/api/finanzas/pagos').then(r => r.json()),
      fetch('/api/finanzas/movimientos').then(r => r.json()),
      fetch('/api/finanzas/config').then(r => r.json()),
    ]).then(([leadsRes, pagosRes, movRes, cfgRes]) => {
      const rawLeads: { id: string; nombre: string; faseVenta: string }[] = leadsRes.leads ?? [];
      setLeads(rawLeads.map(l => ({ id: l.id, nombre: l.nombre, faseVenta: l.faseVenta })));
      setPagos(pagosRes.pagos ?? []);
      setMovimientos(movRes.movimientos ?? []);
      setConfig(cfgRes.config);
      setConfigForm(cfgRes.config);
    }).catch(() => {
      showToast('No se pudo cargar Finanzas', false);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cerradoIds = useMemo(() => new Set(leads.filter(l => l.faseVenta === 'Cierre').map(l => l.id)), [leads]);

  // Meses disponibles en el selector: desde el mes de inicio configurado hasta
  // 12 meses después del más reciente que tenga datos (o el actual, lo que sea mayor).
  const monthOptions = useMemo(() => {
    const keys = new Set<string>([config.mesInicio, selectedMonth, todayISO().slice(0, 7)]);
    pagos.forEach(p => keys.add(monthKeyOf(p.fecha)));
    movimientos.forEach(m => keys.add(monthKeyOf(m.fecha)));
    const sorted = Array.from(keys).sort();
    const min = sorted[0] || config.mesInicio;
    const max = sorted[sorted.length - 1] || config.mesInicio;
    const out: string[] = [];
    let cur = min;
    while (cur <= max) { out.push(cur); cur = addMonths(cur, 1); }
    return out;
  }, [config.mesInicio, pagos, movimientos, selectedMonth]);

  // Rollup mes a mes desde mesInicio hasta selectedMonth, para que la caja
  // final de un mes sea la caja inicial del siguiente.
  const rollup = useMemo(() => {
    const map = new Map<string, { ingresos: number; egresos: number; cajaInicial: number; cajaFinal: number }>();
    let cur = config.mesInicio;
    let cajaInicial = config.cajaInicial;
    const last = selectedMonth > config.mesInicio ? selectedMonth : config.mesInicio;
    let guard = 0;
    while (cur <= last && guard < 600) {
      guard++;
      const ingresosComercial = pagos
        .filter(p => monthKeyOf(p.fecha) === cur && cerradoIds.has(p.leadId))
        .reduce((s, p) => s + p.monto, 0);
      const ingresosManual = movimientos
        .filter(m => m.tipo === 'ingreso' && monthKeyOf(m.fecha) === cur)
        .reduce((s, m) => s + m.monto, 0);
      const egresos = movimientos
        .filter(m => m.tipo === 'egreso' && monthKeyOf(m.fecha) === cur)
        .reduce((s, m) => s + m.monto, 0);
      const ingresos = ingresosComercial + ingresosManual;
      const cajaFinal = cajaInicial + ingresos - egresos;
      map.set(cur, { ingresos, egresos, cajaInicial, cajaFinal });
      cajaInicial = cajaFinal;
      cur = addMonths(cur, 1);
    }
    return map;
  }, [config, pagos, movimientos, cerradoIds, selectedMonth]);

  const resumen = rollup.get(selectedMonth) ?? { ingresos: 0, egresos: 0, cajaInicial: config.cajaInicial, cajaFinal: config.cajaInicial };

  const movRows: MovRow[] = useMemo(() => {
    const rows: MovRow[] = [];
    pagos.filter(p => monthKeyOf(p.fecha) === selectedMonth && cerradoIds.has(p.leadId)).forEach(p => {
      rows.push({ id: 'pago-' + p.id, fecha: p.fecha, tipo: 'Ingreso', concepto: 'Abono cliente', cliente: p.clienteNombre, categoria: 'Cliente', monto: p.monto, origen: 'Comercial' });
    });
    movimientos.filter(m => monthKeyOf(m.fecha) === selectedMonth).forEach(m => {
      rows.push({ id: 'mov-' + m.id, fecha: m.fecha, tipo: m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso', concepto: m.concepto, cliente: '—', categoria: m.categoria, monto: m.monto, origen: 'Manual' });
    });
    return rows.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [pagos, movimientos, cerradoIds, selectedMonth]);

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/finanzas/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfig(configForm);
      setShowConfig(false);
      showToast('Caja inicial actualizada');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error al guardar', false);
    }
    setSavingConfig(false);
  };

  const openMovModal = (tipo: 'ingreso' | 'egreso') => {
    setMovForm({ concepto: '', categoria: '', monto: '', fecha: todayISO(), nota: '' });
    setShowMovModal(tipo);
  };

  const submitMov = async () => {
    if (!showMovModal) return;
    if (!movForm.concepto.trim() || !movForm.categoria.trim() || !movForm.monto || !movForm.fecha) {
      showToast('Completa concepto, categoría, monto y fecha.', false);
      return;
    }
    setSavingMov(true);
    try {
      const res = await fetch('/api/finanzas/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: showMovModal, concepto: movForm.concepto, categoria: movForm.categoria, monto: Number(movForm.monto), fecha: movForm.fecha, nota: movForm.nota }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMovimientos(m => [data.movimiento, ...m]);
      setShowMovModal(null);
      showToast(showMovModal === 'ingreso' ? 'Ingreso registrado' : 'Egreso registrado');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error al guardar', false);
    }
    setSavingMov(false);
  };

  const deleteRow = async (row: MovRow) => {
    if (!confirm(`¿Eliminar "${row.concepto}" (${money(row.monto)})?`)) return;
    try {
      if (row.origen === 'Comercial') {
        const pagoId = row.id.replace('pago-', '');
        const res = await fetch(`/api/finanzas/pagos?id=${pagoId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setPagos(p => p.filter(x => x.id !== pagoId));
      } else {
        const movId = row.id.replace('mov-', '');
        const res = await fetch(`/api/finanzas/movimientos?id=${movId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMovimientos(m => m.filter(x => x.id !== movId));
      }
      showToast('Movimiento eliminado');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo eliminar', false);
    }
  };

  const inputClass = 'w-full h-[44px] px-3 border-[1.5px] border-[#E2E5EA] rounded-[10px] text-[13.5px] font-medium outline-none text-[#15171C] focus:border-steel transition';
  const labelClass = 'block text-[10.5px] font-black text-[#9AA0A8] uppercase tracking-[0.05em] mb-[5px]';

  if (loading) {
    return <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-16 text-center text-[14px] text-[#8A929E] font-semibold">Cargando finanzas…</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          className="h-[42px] bg-white border border-[#E2E5EA] rounded-[10px] px-3 text-[13px] font-bold text-[#3C434F] cursor-pointer outline-none">
          {monthOptions.map(k => <option key={k} value={k}>{monthLabel(k)}</option>)}
        </select>
        <button onClick={() => { setConfigForm(config); setShowConfig(true); }}
          className="text-[12.5px] font-bold text-[#5A6270] bg-white border border-[#E2E5EA] rounded-[10px] px-3 h-[42px] cursor-pointer hover:border-steel transition">
          Configurar caja inicial
        </button>
        <div className="ml-auto flex gap-2">
          <button onClick={() => openMovModal('ingreso')} className="flex items-center gap-2 bg-[#EAF7F1] text-[#1F9B6E] border-none font-bold text-[13px] px-4 py-[10px] rounded-[10px] cursor-pointer hover:bg-[#D4F4E8] transition">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Añadir ingreso
          </button>
          <button onClick={() => openMovModal('egreso')} className="flex items-center gap-2 bg-[#FCEDED] text-[#D14343] border-none font-bold text-[13px] px-4 py-[10px] rounded-[10px] cursor-pointer hover:bg-[#F9DADA] transition">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Añadir egreso
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Caja inicial', value: resumen.cajaInicial, color: '#15171C' },
          { label: 'Ingresos', value: resumen.ingresos, color: '#1F9B6E' },
          { label: 'Egresos', value: -resumen.egresos, color: '#D14343' },
          { label: 'Caja final', value: resumen.cajaFinal, color: '#2E6CA0' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-[#ECEEF2] rounded-[18px] px-5 py-5">
            <div className="text-[11px] text-[#8A929E] font-bold uppercase tracking-[0.05em]">{kpi.label}</div>
            <div className="font-grotesk font-bold text-[24px] tracking-[-0.02em] mt-1.5" style={{ color: kpi.color }}>{money(kpi.value)}</div>
          </div>
        ))}
      </div>

      {/* Tabla de movimientos */}
      <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F0F2F5] flex items-center justify-between">
          <h3 className="font-grotesk font-semibold text-[17px] text-[#15171C]">Movimientos — {monthLabel(selectedMonth)}</h3>
          <span className="text-[12.5px] font-bold text-[#8A929E]">{movRows.length} movimiento{movRows.length !== 1 ? 's' : ''}</span>
        </div>
        {movRows.length === 0 ? (
          <div className="px-8 py-14 text-center text-[14px] text-[#8A929E] font-semibold">Sin movimientos en este mes.</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid px-6 py-[10px] bg-[#FAFBFC] border-b border-[#F0F2F5] text-[10.5px] font-black uppercase tracking-[0.04em] text-[#9AA0A8]"
              style={{ gridTemplateColumns: '0.9fr 0.8fr 1.4fr 1.1fr 1fr 1fr 0.9fr 0.6fr', minWidth: '860px' }}>
              <span>Fecha</span><span>Tipo</span><span>Concepto</span><span>Cliente</span><span>Categoría</span><span className="text-right">Monto</span><span>Origen</span><span></span>
            </div>
            {movRows.map(row => (
              <div key={row.id} className="grid px-6 py-[11px] items-center border-b border-[#F5F6F8] last:border-b-0 hover:bg-[#FAFBFC] transition"
                style={{ gridTemplateColumns: '0.9fr 0.8fr 1.4fr 1.1fr 1fr 1fr 0.9fr 0.6fr', minWidth: '860px' }}>
                <span className="text-[12.5px] text-[#5A6270] font-semibold">{row.fecha.split('-').reverse().join('/')}</span>
                <span className="text-[12px] font-black" style={{ color: row.tipo === 'Ingreso' ? '#1F9B6E' : '#D14343' }}>{row.tipo}</span>
                <span className="text-[13px] font-semibold text-[#15171C] truncate">{row.concepto}</span>
                <span className="text-[12.5px] text-[#5A6270] truncate">{row.cliente}</span>
                <span className="text-[12.5px] text-[#5A6270]">{row.categoria}</span>
                <span className="text-[13px] font-bold text-right" style={{ color: row.tipo === 'Ingreso' ? '#1F9B6E' : '#D14343' }}>{money(row.monto)}</span>
                <span className="text-[11px] font-bold px-2 py-1 rounded-full w-max" style={{ background: row.origen === 'Comercial' ? '#EAF1F8' : '#F4F6F8', color: row.origen === 'Comercial' ? '#2E6CA0' : '#5A6270' }}>{row.origen}</span>
                <button onClick={() => deleteRow(row)} title="Eliminar" className="w-8 h-8 flex items-center justify-center rounded-[8px] bg-transparent border-none text-[#C2C8D2] cursor-pointer hover:text-[#D14343] hover:bg-[#FCEDED] transition justify-self-end">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal configurar caja inicial */}
      {showConfig && (
        <div className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,.55)] flex items-center justify-center p-6" onClick={() => { if (!savingConfig) setShowConfig(false); }}>
          <div className="bg-white rounded-[22px] w-full max-w-[400px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 py-5 border-b border-[#F0F2F5]">
              <div className="font-grotesk font-bold text-[19px] text-[#15171C]">Caja inicial</div>
              <button onClick={() => setShowConfig(false)} className="w-9 h-9 rounded-[10px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-7 py-6 flex flex-col gap-4">
              <p className="text-[12.5px] text-[#8A929E] font-semibold -mt-1">A partir de este mes y monto, el sistema calcula solo los meses siguientes.</p>
              <div>
                <label className={labelClass}>Mes de inicio</label>
                <input type="month" value={configForm.mesInicio} onChange={e => setConfigForm(f => ({ ...f, mesInicio: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Caja inicial (S/)</label>
                <input value={configForm.cajaInicial} onChange={e => setConfigForm(f => ({ ...f, cajaInicial: Number(e.target.value) || 0 }))} className={inputClass} placeholder="5000" />
              </div>
              <button onClick={saveConfig} disabled={savingConfig}
                className="w-full h-12 bg-[#15171C] text-white border-none rounded-[12px] font-bold text-[15px] cursor-pointer hover:bg-steel transition disabled:opacity-60 disabled:cursor-not-allowed">
                {savingConfig ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal añadir ingreso/egreso */}
      {showMovModal && (
        <div className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,.55)] flex items-center justify-center p-6" onClick={() => { if (!savingMov) setShowMovModal(null); }}>
          <div className="bg-white rounded-[22px] w-full max-w-[440px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 py-5 border-b border-[#F0F2F5]">
              <div className="font-grotesk font-bold text-[19px] text-[#15171C]">{showMovModal === 'ingreso' ? 'Añadir ingreso' : 'Añadir egreso'}</div>
              <button onClick={() => setShowMovModal(null)} className="w-9 h-9 rounded-[10px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-7 py-6 flex flex-col gap-4">
              <div>
                <label className={labelClass}>Concepto</label>
                <input value={movForm.concepto} onChange={e => setMovForm(f => ({ ...f, concepto: e.target.value }))} placeholder={showMovModal === 'ingreso' ? 'Ej: Venta extraordinaria' : 'Ej: Reparación de laptop'} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Categoría</label>
                <input value={movForm.categoria} onChange={e => setMovForm(f => ({ ...f, categoria: e.target.value }))} placeholder="Escribe o elige una sugerencia" list="categoria-sugerencias" className={inputClass} />
                <datalist id="categoria-sugerencias">
                  {(showMovModal === 'ingreso' ? CATEGORIA_SUGERENCIAS_INGRESO : CATEGORIA_SUGERENCIAS_EGRESO).map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Monto (S/)</label>
                  <input value={movForm.monto} onChange={e => setMovForm(f => ({ ...f, monto: e.target.value }))} placeholder="200" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Fecha</label>
                  <input type="date" value={movForm.fecha} onChange={e => setMovForm(f => ({ ...f, fecha: e.target.value }))} className={inputClass} style={{ colorScheme: 'light' }} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Nota (opcional)</label>
                <textarea value={movForm.nota} onChange={e => setMovForm(f => ({ ...f, nota: e.target.value }))} className={`${inputClass} min-h-[64px] resize-y`} placeholder="Detalle adicional..." />
              </div>
              <button onClick={submitMov} disabled={savingMov}
                className={`w-full h-12 text-white border-none rounded-[12px] font-bold text-[15px] cursor-pointer transition disabled:opacity-60 disabled:cursor-not-allowed ${showMovModal === 'ingreso' ? 'bg-[#1F9B6E] hover:bg-[#188058]' : 'bg-[#D14343] hover:bg-[#B93636]'}`}>
                {savingMov ? 'Guardando…' : showMovModal === 'ingreso' ? 'Guardar ingreso' : 'Guardar egreso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
