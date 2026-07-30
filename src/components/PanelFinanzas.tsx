'use client';

import { useEffect, useRef, useState } from 'react';
import type { FinanzasRow, FinanzasSections } from '@/lib/finanzas-sheet';

interface PanelFinanzasProps {
  showToast: (text: string, ok?: boolean) => void;
}

const SECTION_TITLES: { key: keyof FinanzasSections; title: string }[] = [
  { key: 'flujo', title: 'Flujo de caja' },
  { key: 'resultados', title: 'Estado de resultados' },
  { key: 'balance', title: 'Balance general' },
];

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
  const [editing, setEditing] = useState<{ sheet: string; row: number; col: number } | null>(null);
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

  const startEdit = (sheet: string, row: number, col: number, current: string | number) => {
    setEditing({ sheet, row, col });
    setEditValue(current === '' || current === null || current === undefined ? '' : String(current));
  };

  const commitEdit = async () => {
    if (!editing || savingRef.current) return;
    const { sheet, row, col } = editing;
    savingRef.current = true;
    const prevSections = sections;
    setSections(s => s && applyLocalEdit(s, sheet, row, col, editValue));
    setEditing(null);
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
    const patchRows = (rows: FinanzasRow[]) => rows.map(r => (
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
      {SECTION_TITLES.map(({ key, title }) => {
        const rows = sections[key];
        if (!rows.length) return null;
        const months = rows[0].cells.map(c => c.month);
        return (
          <div key={key} className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F0F2F5]">
              <h3 className="font-grotesk font-semibold text-[17px] text-[#15171C]">{title}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="border-collapse" style={{ minWidth: `${220 + months.length * 110}px` }}>
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-[#FAFBFC] text-left px-4 py-2.5 text-[10.5px] font-black uppercase tracking-[0.04em] text-[#9AA0A8] border-b border-[#F0F2F5]" style={{ width: 220 }}>Concepto</th>
                    {months.map((m, i) => (
                      <th key={i} className="bg-[#FAFBFC] text-right px-3 py-2.5 text-[10.5px] font-black uppercase tracking-[0.04em] text-[#9AA0A8] border-b border-[#F0F2F5] whitespace-nowrap" style={{ width: 110 }}>{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.sheet + '-' + r.row} className="hover:bg-[#FAFBFC] transition">
                      <td className="sticky left-0 bg-white text-[13px] font-semibold text-[#15171C] px-4 py-2 border-b border-[#F5F6F8] truncate" style={{ width: 220 }}>{r.label}</td>
                      {r.cells.map(c => {
                        const isEditing = editing?.sheet === r.sheet && editing?.row === r.row && editing?.col === c.col;
                        return (
                          <td key={c.col} className="text-right px-3 py-2 border-b border-[#F5F6F8]" style={{ width: 110 }}>
                            {isEditing ? (
                              <input
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
                                className="w-full text-right text-[12.5px] font-semibold text-[#15171C] border border-steel rounded-[6px] px-1.5 py-1 outline-none"
                              />
                            ) : c.editable ? (
                              <button onClick={() => startEdit(r.sheet, r.row, c.col, c.value)}
                                className="w-full text-right text-[12.5px] font-semibold text-[#3C434F] bg-transparent border-none cursor-pointer hover:text-steel px-1 py-0.5 rounded-[6px] hover:bg-[#F4F6F8] transition">
                                {formatValue(c.value) || '—'}
                              </button>
                            ) : (
                              <span className="text-[12.5px] font-black text-[#15171C]">{formatValue(c.value) || '—'}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
