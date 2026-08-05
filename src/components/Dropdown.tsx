'use client';

import { useEffect, useRef, useState } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: (DropdownOption | string)[];
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  align?: 'left' | 'right';
}

export default function Dropdown({ value, onChange, options, className, style, placeholder, align = 'left' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const normalized = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o));
  const selected = normalized.find(o => o.value === value);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between gap-2 ${className ?? ''}`}
        style={style}
      >
        <span className="truncate">{selected?.label ?? placeholder ?? ''}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
          className={`flex-shrink-0 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          className={`absolute z-50 mt-1.5 min-w-full w-max max-w-[280px] max-h-[280px] overflow-y-auto bg-white border border-[#E2E5EA] rounded-[12px] shadow-[0_8px_24px_rgba(0,0,0,.12)] py-1.5 ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {normalized.map(o => (
            <div
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition ${o.value === value ? 'text-steel bg-[#F6F8FA]' : 'text-[#15171C] hover:bg-[#F4F6F8]'}`}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
