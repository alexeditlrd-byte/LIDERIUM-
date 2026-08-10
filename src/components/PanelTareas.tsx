'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Tarea } from '@/lib/tareas';
import Dropdown from '@/components/Dropdown';

interface PanelTareasProps {
  showToast: (text: string, ok?: boolean) => void;
}

const RESPONSABLES = ['Winona', 'Maryori'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fechaLabel(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

type Filtro = 'pendientes' | 'completadas' | 'todas';

export default function PanelTareas({ showToast }: PanelTareasProps) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('pendientes');

  const [titulo, setTitulo] = useState('');
  const [responsable, setResponsable] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/tareas')
      .then(r => r.json())
      .then(d => setTareas(d.tareas ?? []))
      .catch(() => showToast('No se pudieron cargar las tareas', false))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const crearTarea = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: titulo.trim(), responsable, fechaLimite }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTareas(prev => [data.tarea, ...prev]);
      setTitulo(''); setResponsable(''); setFechaLimite('');
      showToast('Tarea creada');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo crear la tarea', false);
    }
    setSaving(false);
  };

  const toggleCompletada = async (tarea: Tarea) => {
    const completada = !tarea.completada;
    setTareas(prev => prev.map(t => (t.id === tarea.id ? { ...t, completada } : t)));
    try {
      const res = await fetch('/api/tareas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tarea.id, patch: { completada } }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } catch (e) {
      setTareas(prev => prev.map(t => (t.id === tarea.id ? { ...t, completada: !completada } : t)));
      showToast(e instanceof Error ? e.message : 'No se pudo actualizar la tarea', false);
    }
  };

  const eliminarTarea = async (tarea: Tarea) => {
    if (!confirm(`¿Eliminar la tarea "${tarea.titulo}"?`)) return;
    try {
      const res = await fetch(`/api/tareas?id=${tarea.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setTareas(prev => prev.filter(t => t.id !== tarea.id));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo eliminar la tarea', false);
    }
  };

  const visibles = useMemo(() => {
    const filtradas = tareas.filter(t => {
      if (filtro === 'pendientes') return !t.completada;
      if (filtro === 'completadas') return t.completada;
      return true;
    });
    return [...filtradas].sort((a, b) => {
      if (a.completada !== b.completada) return a.completada ? 1 : -1;
      if (a.fechaLimite && b.fechaLimite) return a.fechaLimite.localeCompare(b.fechaLimite);
      if (a.fechaLimite) return -1;
      if (b.fechaLimite) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [tareas, filtro]);

  const pendientesCount = tareas.filter(t => !t.completada).length;
  const completadasCount = tareas.filter(t => t.completada).length;

  return (
    <div>
      <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-5 py-5 mb-5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') crearTarea(); }}
            placeholder="Nueva tarea…"
            className="flex-1 h-11 px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[13.5px] font-medium outline-none bg-[#FAFBFC] text-[#15171C] focus:border-steel focus:bg-white transition"
          />
          <Dropdown value={responsable} onChange={setResponsable}
            options={[{ value: '', label: 'Sin asignar' }, ...RESPONSABLES.map(r => ({ value: r, label: r }))]}
            className="h-11 bg-[#FAFBFC] border-[1.5px] border-[#E2E5EA] rounded-[12px] px-4 text-[13px] font-bold text-[#3C434F] cursor-pointer outline-none" />
          <input
            type="date"
            value={fechaLimite}
            onChange={e => setFechaLimite(e.target.value)}
            className="h-11 px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[13px] font-medium outline-none bg-[#FAFBFC] text-[#15171C] focus:border-steel focus:bg-white transition"
          />
          <button onClick={crearTarea} disabled={saving || !titulo.trim()}
            className="h-11 px-5 bg-[#15171C] text-white border-none rounded-[12px] cursor-pointer font-bold text-[13px] hover:bg-steel transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
            {saving ? 'Guardando…' : '+ Agregar tarea'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {([
          { key: 'pendientes' as Filtro, label: `Pendientes (${pendientesCount})` },
          { key: 'completadas' as Filtro, label: `Completadas (${completadasCount})` },
          { key: 'todas' as Filtro, label: `Todas (${tareas.length})` },
        ]).map(c => (
          <button key={c.key} onClick={() => setFiltro(c.key)}
            className={`px-3.5 py-[7px] rounded-[8px] text-[12px] font-bold cursor-pointer border transition ${filtro === c.key ? 'bg-[#15171C] text-white border-[#15171C]' : 'bg-white text-[#5A6270] border-[#E2E5EA] hover:border-[#15171C]'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-16 text-center text-[14px] text-[#8A929E] font-semibold">Cargando tareas…</div>
      ) : visibles.length === 0 ? (
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-16 text-center text-[14px] text-[#8A929E] font-semibold">
          {filtro === 'pendientes' ? 'No hay tareas pendientes.' : filtro === 'completadas' ? 'Todavía no hay tareas completadas.' : 'Sin tareas.'}
        </div>
      ) : (
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden divide-y divide-[#F0F2F5]">
          {visibles.map(t => {
            const vencida = !t.completada && !!t.fechaLimite && t.fechaLimite < todayISO();
            return (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3.5">
                <button
                  onClick={() => toggleCompletada(t)}
                  title={t.completada ? 'Marcar como pendiente' : 'Marcar como hecha'}
                  className="w-[22px] h-[22px] flex-shrink-0 rounded-[7px] border-[1.5px] cursor-pointer flex items-center justify-center transition"
                  style={{ background: t.completada ? '#1F9B6E' : '#fff', borderColor: t.completada ? '#1F9B6E' : '#D8DCE3' }}
                >
                  {t.completada && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13.5px] font-semibold truncate ${t.completada ? 'line-through text-[#AEB4BE]' : 'text-[#15171C]'}`}>{t.titulo}</div>
                </div>
                {t.responsable && (
                  <span className="text-[10px] font-black text-[#5A6270] bg-[#F4F6F8] px-2 py-[3px] rounded-full flex-shrink-0">{t.responsable}</span>
                )}
                {t.fechaLimite && (
                  <span className="text-[10.5px] font-bold px-2 py-[3px] rounded-full flex-shrink-0" style={{ background: vencida ? '#FCEDED' : '#F4F6F8', color: vencida ? '#D14343' : '#8A929E' }}>
                    {vencida ? '⚠ ' : ''}{fechaLabel(t.fechaLimite)}
                  </span>
                )}
                <button onClick={() => eliminarTarea(t)} title="Eliminar"
                  className="w-8 h-8 flex-shrink-0 rounded-[8px] bg-transparent border-none cursor-pointer flex items-center justify-center text-[#AEB4BE] hover:text-[#D14343] hover:bg-[#FCEDED] transition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" /></svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
