'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FinanzasSections } from '@/lib/finanzas-sheet';

interface PanelFinanzasProps {
  showToast: (text: string, ok?: boolean) => void;
}

const SECTION_TABS: { key: keyof FinanzasSections; title: string }[] = [
  { key: 'flujo', title: 'Flujo de caja' },
  { key: 'resultados', title: 'Estado de resultados' },
  { key: 'balance', title: 'Balance general' },
];

const MONTH_ORDER = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

// El Sheet no manda el año por columna, solo el nombre del mes (que se repite
// entre 2026 y 2027) — lo inferimos asumiendo que empieza en 2026 y sumamos un
// año cada vez que la secuencia de meses "da la vuelta" (de Diciembre a Enero).
function niceMonthLabels(months: string[], baseYear = 2026) {
  let year = baseYear;
  let prevIdx = -1;
  return months.map(m => {
    const idx = MONTH_ORDER.indexOf(m.toUpperCase());
    if (prevIdx !== -1 && idx < prevIdx) year++;
    prevIdx = idx;
    const nice = m.charAt(0) + m.slice(1).toLowerCase();
    return `${nice} ${year}`;
  });
}

function formatValue(v: string | number) {
  if (v === '' || v === null || v === undefined) return '';
  if (typeof v === 'number') return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const n = Number(v);
  return !isNaN(n) && v.trim() !== '' ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : v;
}

export default function PanelFinanzas({ showToast }: PanelFinanzasProps) {
  const [sections, setSections] = useState<FinanzasSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [activeTab, setActiveTab] = useState<keyof FinanzasSections>('flujo');
  const [monthIndex, setMonthIndex] = useState(0);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const savingRef = useRef(false);

  const load = () => {
    fetch('/api/finanzas')
      .then(r => r.json())
      .then(d => { setSections(d.sections); setConfigured(d.configured !== false); if (d.error) showToast(d.error, false); })
      .catch(() => showToast('No se pudo cargar Finanzas', false))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => sections?.[activeTab] ?? [], [sections, activeTab]);
  const monthLabels = useMemo(() => niceMonthLabels(rows[0]?.cells.map(c => c.month) ?? []), [rows]);

  const commitEdit = async (sheet: string, row: number, col: number) => {
    if (savingRef.current) return;
    savingRef.current = true;
    const prevSections = sections;
    setSections(s => s && applyLocalEdit(s, sheet, row, col, editValue));
    setEditingRow(null);
    try {
      const res = await fetch('/api/finanzas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet, row, col, value: editValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (e) {
      setSections(prevSections);
      showToast(e instanceof Error ? e.message : 'No se pudo guardar el cambio', false);
    }
    savingRef.current = false;
  };

  function applyLocalEdit(s: FinanzasSections, sheet: string, row: number, col: number, value: string): FinanzasSections {
    const patchRows = (list: FinanzasSections[keyof FinanzasSections]) => list.map(r => (
      r.sheet === sheet && r.row === row ? { ...r, cells: r.cells.map(c => (c.col === col ? { ...c, value } : c)) } : r
    ));
    return { flujo: patchRows(s.flujo), resultados: patchRows(s.resultados), balance: patchRows(s.balance) };
  }

  if (loading) {
    return <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-16 text-center text-[14px] text-[#8A929E] font-semibold">Cargando finanzas…</div>;
  }

  if (!configured || !sections) {
    return (
      <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-16 flex flex-col items-center text-center">
        <div className="font-grotesk font-bold text-[17px] text-[#15171C] mb-1">Finanzas no conectado</div>
        <div className="text-[13.5px] text-[#8A929E] font-semibold">Falta conectar el Google Sheet &quot;FINANZAS LIDERIUM&quot; — ver docs/finanzas-apps-script.md.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-[3px] bg-[#F4F6F8] border border-[#E2E5EA] rounded-[11px] p-[3px]">
          {SECTION_TABS.map(t => (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setMonthIndex(0); }}
              className={`px-4 py-[9px] rounded-[8px] text-[13px] font-bold cursor-pointer border-none transition ${activeTab === t.key ? 'bg-[#15171C] text-white' : 'bg-transparent text-[#5A6270] hover:text-[#15171C]'}`}>
              {t.title}
            </button>
          ))}
        </div>
        {monthLabels.length > 0 && (
          <select value={monthIndex} onChange={e => setMonthIndex(Number(e.target.value))}
            className="h-[42px] bg-white border border-[#E2E5EA] rounded-[10px] px-3 text-[12.5px] font-bold text-[#3C434F] cursor-pointer outline-none">
            {monthLabels.map((label, i) => <option key={i} value={i}>{label}</option>)}
          </select>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-16 text-center text-[14px] text-[#8A929E] font-semibold">
          No se encontraron filas para esta sección.
        </div>
      ) : (
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F0F2F5] flex items-center justify-between">
            <h3 className="font-grotesk font-semibold text-[17px] text-[#15171C]">{SECTION_TABS.find(t => t.key === activeTab)?.title}</h3>
            <span className="text-[12.5px] font-bold text-[#8A929E]">{monthLabels[monthIndex]}</span>
          </div>
          <div>
            {rows.map(r => {
              const cell = r.cells[monthIndex];
              if (!cell) return null;
              const rowKey = r.sheet + '-' + r.row;
              const isEditing = editingRow === rowKey;
              return (
                <div key={rowKey} className="flex items-center justify-between gap-4 px-6 py-[11px] border-b border-[#F5F6F8] last:border-b-0 hover:bg-[#FAFBFC] transition">
                  <span className="text-[14px] font-semibold text-[#3C434F]">{r.label}</span>
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(r.sheet, r.row, cell.col)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(r.sheet, r.row, cell.col); if (e.key === 'Escape') setEditingRow(null); }}
                      className="w-[140px] text-right text-[14px] font-bold text-[#15171C] border border-steel rounded-[7px] px-2 py-1 outline-none"
                    />
                  ) : cell.editable ? (
                    <button
                      onClick={() => { setEditingRow(rowKey); setEditValue(cell.value === '' || cell.value === null ? '' : String(cell.value)); }}
                      className="text-right text-[14px] font-bold text-[#3C434F] bg-transparent border-none cursor-pointer hover:text-steel px-2 py-1 rounded-[7px] hover:bg-[#F4F6F8] transition min-w-[80px]">
                      {formatValue(cell.value) || '—'}
                    </button>
                  ) : (
                    <span className="text-[14px] font-black text-[#15171C] px-2 py-1 min-w-[80px] text-right">{formatValue(cell.value) || '—'}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
