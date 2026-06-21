'use client';

import { useState, useRef, useEffect } from 'react';

interface StaffProps {
  onLogout: () => void;
}

type StaffTab = 'clientes' | 'finanzas' | 'pagos' | 'calendario' | 'chatia';

const ICONS: Record<string, React.ReactNode> = {
  clientes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  finanzas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M3 3v18h18" /><path d="M19 9l-5 5-3-3-4 4" />
    </svg>
  ),
  pagos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" />
    </svg>
  ),
  calendario: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="3" y="4" width="18" height="17" rx="2.5" /><path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  ),
  chatia: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" />
    </svg>
  ),
};

const navItems: { id: StaffTab; label: string }[] = [
  { id: 'clientes', label: 'Clientes' },
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'pagos', label: 'Pagos' },
  { id: 'calendario', label: 'Calendario' },
  { id: 'chatia', label: 'Chat IA · Claude' },
];

const titles: Record<StaffTab, string> = {
  clientes: 'Gestión de clientes',
  finanzas: 'Finanzas',
  pagos: 'Pagos de clientes',
  calendario: 'Calendario de reuniones',
  chatia: 'Asistente IA · Claude',
};

const finKpis = [
  { label: 'Ingresos del mes', value: 'S/ 48.2K', delta: '+5.7%', up: true },
  { label: 'Gastos del mes', value: 'S/ 35.6K', delta: '+2.1%', up: false },
  { label: 'Utilidad neta', value: 'S/ 12.6K', delta: '+18%', up: true },
  { label: 'Margen neto', value: '26.1%', delta: '+3.4 pts', up: true },
];

const incomeRows = [
  { label: 'Ingresos por servicios', value: 'S/ 48,200', kind: 'in' },
  { label: 'Edición y freelance', value: '— S/ 9,400', kind: 'cost' },
  { label: 'Software y herramientas', value: '— S/ 2,100', kind: 'cost' },
  { label: 'Utilidad bruta', value: 'S/ 36,700', kind: 'subtotal' },
  { label: 'Sueldos del equipo', value: '— S/ 18,500', kind: 'cost' },
  { label: 'Oficina y servicios', value: '— S/ 3,200', kind: 'cost' },
  { label: 'Marketing y captación', value: '— S/ 2,400', kind: 'cost' },
  { label: 'Utilidad neta', value: 'S/ 12,600', kind: 'total' },
];

const clients = [
  { ini: 'AC', slug: 'aurora-cafe', name: 'Aurora Café', plan: 'Crecimiento', amount: 'S/ 2,400', status: 'Al día', next: '01 jul' },
  { ini: 'SN', slug: 'studio-norte', name: 'Studio Norte', plan: 'Pro', amount: 'S/ 3,800', status: 'Al día', next: '03 jul' },
  { ini: 'VM', slug: 'verde-market', name: 'Verde Market', plan: 'Crecimiento', amount: 'S/ 2,400', status: 'Pendiente', next: '18 jun' },
  { ini: 'CS', slug: 'clinica-sonrie', name: 'Clínica Sonríe', plan: 'Esencial', amount: 'S/ 1,600', status: 'Vencido', next: '10 jun' },
  { ini: 'FL', slug: 'fit-lima', name: 'Fit Lima', plan: 'Pro', amount: 'S/ 3,800', status: 'Al día', next: '05 jul' },
  { ini: 'PO', slug: 'pan-de-oro', name: 'Pan de Oro', plan: 'Esencial', amount: 'S/ 1,600', status: 'Pendiente', next: '20 jun' },
];

const meetings = [
  { day: 'Hoy · Mar 17', time: '10:00', client: 'Aurora Café', type: 'Revisión de contenido', who: 'Mateo', c: '#2E6CA0' },
  { day: 'Hoy · Mar 17', time: '15:30', client: 'Studio Norte', type: 'Estrategia mensual', who: 'Lucía', c: '#2FB389' },
  { day: 'Mañana · Mié 18', time: '09:00', client: 'Fit Lima', type: 'Onboarding', who: 'Diego', c: '#15171C' },
  { day: 'Jue 19', time: '17:00', client: 'Aurora Café', type: 'Reunión de estrategia', who: 'Mateo', c: '#2E6CA0' },
  { day: 'Vie 20', time: '11:00', client: 'Verde Market', type: 'Kickoff de campaña', who: 'Lucía', c: '#C9821F' },
];

const quickPrompts = [
  'Escríbeme un guion de reel de 30s para una cafetería de especialidad',
  'Dame 5 ideas de contenido viral para esta semana',
  'Sugiere un calendario de contenido semanal para una marca de fitness',
  'Dame feedback para mejorar la retención de un reel de producto',
];

type AiMsg = { role: 'user' | 'assistant'; text: string };

function statusPill(status: string) {
  if (status === 'Al día') return { bg: '#EAF7F1', color: '#1F9B6E' };
  if (status === 'Pendiente') return { bg: '#FBF1E2', color: '#B5740F' };
  return { bg: '#FCEDED', color: '#D14343' };
}

function formatMeetDate(iso: string) {
  const d = new Date(iso);
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return {
    day: `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`,
    time: `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`,
  };
}

export default function Staff({ onLogout }: StaffProps) {
  const [tab, setTab] = useState<StaffTab>('clientes');
  const [dbClients, setDbClients] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', plan: 'Crecimiento' });
  const [genPass, setGenPass] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ email: string; pass: string } | null>(null);
  const [formErr, setFormErr] = useState('');

  const [editingAmountSlug, setEditingAmountSlug] = useState<string | null>(null);
  const [editAmountVal, setEditAmountVal] = useState('');
  const [savingAmount, setSavingAmount] = useState(false);
  const [savingStatusSlug, setSavingStatusSlug] = useState<string | null>(null);

  const formatAmount = (val: string) => {
    const num = parseFloat(val.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return val;
    return 'S/ ' + num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  const handleSaveAmount = async (slug: string) => {
    setSavingAmount(true);
    const formatted = formatAmount(editAmountVal);
    setEditAmountVal(formatted);
    const res = await fetch('/api/clientes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, amount: formatted }),
    });
    if (res.ok) {
      setDbClients(prev => prev.map(c => c.slug === slug ? { ...c, amount: formatted } : c));
      showToast('Monto actualizado correctamente');
    } else {
      showToast('Error al actualizar el monto', false);
    }
    setEditingAmountSlug(null);
    setSavingAmount(false);
  };

  const [showEntregableModal, setShowEntregableModal] = useState(false);
  const [entregableClient, setEntregableClient] = useState<{ slug: string; name: string } | null>(null);
  const [entregableLabel, setEntregableLabel] = useState('');
  const [entregableFile, setEntregableFile] = useState<File | null>(null);
  const [uploadingEntregable, setUploadingEntregable] = useState(false);
  const [entregableSuccess, setEntregableSuccess] = useState(false);
  const entregableInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const showToast = (text: string, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const openEntregableModal = (c: { slug: string; name: string }) => {
    setEntregableClient(c);
    setEntregableLabel('');
    setEntregableFile(null);
    setEntregableSuccess(false);
    setShowEntregableModal(true);
  };

  const handleUploadEntregable = async () => {
    if (!entregableFile || !entregableClient) return;
    setUploadingEntregable(true);
    const fd = new FormData();
    fd.append('file', entregableFile);
    fd.append('clientSlug', entregableClient.slug);
    fd.append('clientName', entregableClient.name);
    fd.append('label', entregableLabel || entregableFile.name);
    try {
      const res = await fetch('/api/upload-entregable-staff', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setEntregableSuccess(true);
        showToast(`Archivo entregado a ${entregableClient?.name}`);
      } else {
        showToast(data.error ?? 'Error al subir el archivo', false);
      }
    } catch (e: any) {
      showToast('Error de conexión al subir el archivo', false);
    }
    setUploadingEntregable(false);
  };

  const [reuniones, setReuniones] = useState<any[]>([]);
  const [showReunionModal, setShowReunionModal] = useState(false);
  const [reunionForm, setReunionForm] = useState({ clientSlug: '', clientName: '', clientEmail: '', title: '', mentor: '', mentorRole: '', fecha: '', hora: '', duracion: 45 });
  const [creatingReunion, setCreatingReunion] = useState(false);
  const [reunionCreated, setReunionCreated] = useState<{ meetLink: string } | null>(null);
  const [reunionErr, setReunionErr] = useState('');

  useEffect(() => {
    fetch('/api/clientes').then(r => r.json()).then(d => setDbClients(d.clients ?? [])).catch(() => {});
  }, []);

  const loadReuniones = () => {
    fetch('/api/reuniones').then(r => r.json()).then(d => setReuniones(d.meetings ?? [])).catch(() => {});
  };

  useEffect(() => {
    if (tab === 'calendario') loadReuniones();
  }, [tab]);

  const generatePassword = () => Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase() + '!';

  const openModal = () => {
    const p = generatePassword();
    setGenPass(p);
    setForm({ name: '', email: '', plan: 'Crecimiento' });
    setCreated(null);
    setFormErr('');
    setShowModal(true);
  };

  const handleCrearCliente = async () => {
    if (!form.name.trim() || !form.email.trim()) { setFormErr('Nombre y email son obligatorios.'); return; }
    setCreating(true); setFormErr('');
    const res = await fetch('/api/crear-cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, password: genPass, plan: form.plan }),
    });
    const data = await res.json();
    if (!res.ok) { setFormErr(data.error ?? 'Error al crear cliente.'); setCreating(false); return; }
    setCreated({ email: form.email, pass: genPass });
    showToast(`Cliente ${form.name} creado correctamente`);
    fetch('/api/clientes').then(r => r.json()).then(d => setDbClients(d.clients ?? [])).catch(() => {});
    setCreating(false);
  };

  const openReunionModal = () => {
    setReunionForm({ clientSlug: '', clientName: '', clientEmail: '', title: '', mentor: '', mentorRole: '', fecha: '', hora: '', duracion: 45 });
    setReunionCreated(null);
    setReunionErr('');
    setShowReunionModal(true);
  };

  const handleCrearReunion = async () => {
    const { clientSlug, title, mentor, fecha, hora } = reunionForm;
    if (!clientSlug || !title || !mentor || !fecha || !hora) { setReunionErr('Completa todos los campos.'); return; }
    setCreatingReunion(true); setReunionErr('');
    const scheduledAt = new Date(`${fecha}T${hora}:00`).toISOString();
    const res = await fetch('/api/crear-reunion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...reunionForm, scheduledAt, durationMinutes: reunionForm.duracion }),
    });
    const data = await res.json();
    if (!res.ok) { setReunionErr(data.error ?? 'Error al crear reunión.'); setCreatingReunion(false); return; }
    setReunionCreated({ meetLink: data.meetLink ?? '' });
    showToast('Reunión creada y link de Meet generado');
    loadReuniones();
    setCreatingReunion(false);
  };
  const [comprobantes, setComprobantes] = useState<Record<string, { link: string; fileName: string; uploadedAt: string }>>({});

  useEffect(() => {
    const load = () => {
      fetch('/api/comprobantes')
        .then(r => r.json())
        .then(data => {
          const map: Record<string, { link: string; fileName: string; uploadedAt: string }> = {};
          for (const c of (data.comprobantes ?? [])) {
            map[`${c.clientSlug}-${c.mes}`] = { link: c.link, fileName: c.fileName, uploadedAt: c.uploadedAt };
          }
          setComprobantes(map);
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsgs, setAiMsgs] = useState<AiMsg[]>([
    { role: 'assistant', text: '¡Hola equipo! Soy el asistente de Liderium conectado a Claude. Pídeme un guion de reel, una idea de estrategia, un calendario semanal o feedback de un video y lo preparo al instante.' },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMsgs, aiLoading]);

  const sendMsg = async (text?: string) => {
    const q = (text ?? aiInput).trim();
    if (!q || aiLoading) return;
    setAiMsgs((m) => [...m, { role: 'user', text: q }]);
    setAiInput('');
    setAiLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });
      const data = await res.json();
      setAiMsgs((m) => [...m, { role: 'assistant', text: data.reply || 'Sin respuesta.' }]);
    } catch {
      setAiMsgs((m) => [...m, { role: 'assistant', text: 'No pude conectar con Claude en este momento. Verifica la configuración del servidor.' }]);
    }
    setAiLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  };

  return (
    <div className="relative min-h-screen grid bg-[#F5F6F8] overflow-hidden" style={{ gridTemplateColumns: '256px 1fr' }}>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '28px', right: '28px', zIndex: 99999,
          animation: 'toastSlide 0.38s cubic-bezier(0.16,1,0.3,1) forwards',
        }}>
          <div style={{
            background: '#15171C', color: 'white', borderRadius: '18px',
            padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.28)', minWidth: '280px', maxWidth: '380px',
          }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '50%',
              background: toast.ok ? 'rgba(47,179,137,0.15)' : 'rgba(209,67,67,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              animation: 'checkPop 0.4s 0.1s cubic-bezier(0.16,1,0.3,1) both',
            }}>
              {toast.ok ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#2FB389" strokeWidth="2" />
                  <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#2FB389" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray="22" strokeDashoffset="22"
                    style={{ animation: 'drawCheck 0.45s 0.25s ease forwards' }} />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#D14343" strokeWidth="2" />
                  <path d="M15 9l-6 6M9 9l6 6" stroke="#D14343" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>{toast.ok ? '¡Completado!' : 'Hubo un error'}</div>
              <div style={{ fontSize: '12.5px', opacity: 0.65, marginTop: '2px', fontWeight: 600 }}>{toast.text}</div>
            </div>
          </div>
        </div>
      )}
      {/* SIDEBAR */}
      <aside className="z-20 bg-[#15171C] text-white flex flex-col px-4 py-[22px] sticky top-0 h-screen">
        <div className="px-2.5 pb-2 mb-2">
          <img src="/assets/liderium-white.png" alt="Liderium" className="h-[26px] w-auto" />
        </div>
        <div className="px-2.5 pb-[18px]">
          <span className="text-[11px] font-black tracking-[0.1em] uppercase text-mint">Panel interno</span>
        </div>

        <nav className="flex flex-col gap-[2px] flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-3 w-full text-left border-none px-3 py-[11px] rounded-[11px] cursor-pointer transition-all duration-150 text-[14px] font-semibold ${
                tab === item.id
                  ? 'bg-[#262B35] text-white'
                  : 'bg-transparent text-[#9097A2] hover:text-white hover:bg-[rgba(255,255,255,.04)]'
              }`}
            >
              {ICONS[item.id]}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="pt-[18px] border-t border-[#262A33]">
          <div className="flex items-center gap-3 px-2.5 py-2 mb-2">
            <div className="w-[38px] h-[38px] rounded-[11px] bg-gradient-to-br from-[#15171C] to-[#2E6CA0] border border-[#333944] flex items-center justify-center font-black text-sm text-white flex-shrink-0">ML</div>
            <div className="text-[13.5px] leading-tight">
              <div className="font-bold">Mateo · Liderium</div>
              <div className="text-[#7E8693] text-xs">Administrador</div>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-2 bg-transparent border-none text-[#9097A2] font-bold text-[13.5px] px-2.5 py-2 rounded-[10px] cursor-pointer hover:bg-[#21242C] hover:text-white transition">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="relative z-10 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-[rgba(238,240,244,.82)] backdrop-blur-[12px] border-b border-[rgba(0,0,0,.06)] px-[38px] py-5 flex items-center justify-between sticky top-0 z-20">
          <div>
            <div className="text-[12.5px] font-bold text-[#8A929E] tracking-[0.04em]">Equipo Liderium</div>
            <h1 className="font-grotesk font-bold text-[25px] tracking-[-0.02em] mt-0.5 text-[#15171C]">{titles[tab]}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white border border-[#E2E5EA] text-[#3C434F] font-bold text-[13px] px-[14px] py-2.5 rounded-[11px]">
              <span className="w-2 h-2 rounded-full bg-mint animate-pulseDot" />
              Google Calendar conectado
            </div>
            <div className="w-[42px] h-[42px] rounded-[12px] bg-gradient-to-br from-[#15171C] to-[#2E6CA0] flex items-center justify-center font-bold text-sm text-white">ML</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-[38px] py-[34px] overflow-auto">

          {/* ── CLIENTES ── */}
          {tab === 'clientes' && (
            <div>
              {/* Modal entregable */}
              {showEntregableModal && (
                <div className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,.55)] flex items-center justify-center p-6" onClick={() => { if (!uploadingEntregable) setShowEntregableModal(false); }}>
                  <div className="bg-white rounded-[22px] w-full max-w-[440px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-7 py-5 border-b border-[#F0F2F5]">
                      <div>
                        <div className="font-grotesk font-bold text-[19px] text-[#15171C]">Subir entregable</div>
                        <div className="text-[13px] text-[#8A929E] font-semibold mt-0.5">Para {entregableClient?.name}</div>
                      </div>
                      <button onClick={() => setShowEntregableModal(false)} className="w-9 h-9 rounded-[10px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>

                    {entregableSuccess ? (
                      <div className="px-7 py-8 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-[#EAF7F1] flex items-center justify-center mb-4">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F9B6E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                        </div>
                        <div className="font-bold text-[16px] text-[#15171C] mb-1">¡Archivo entregado!</div>
                        <div className="text-[13.5px] text-[#8A929E] font-semibold mb-5">El cliente puede verlo en su portal → Entregables</div>
                        <div className="flex gap-3 w-full">
                          <button onClick={() => { setEntregableFile(null); setEntregableLabel(''); setEntregableSuccess(false); }}
                            className="flex-1 h-11 bg-[#F4F6F8] border border-[#E2E5EA] text-[#15171C] rounded-[12px] font-bold text-[14px] cursor-pointer hover:bg-[#ECEEF2] transition">
                            Subir otro
                          </button>
                          <button onClick={() => setShowEntregableModal(false)}
                            className="flex-1 h-11 bg-[#15171C] text-white border-none rounded-[12px] font-bold text-[14px] cursor-pointer hover:bg-steel transition">
                            Cerrar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-7 py-6 flex flex-col gap-4">
                        <div>
                          <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Nombre / etiqueta del archivo</label>
                          <input type="text" placeholder="Ej: Pack Reels - Junio 2026" value={entregableLabel} onChange={e => setEntregableLabel(e.target.value)}
                            className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                        </div>
                        <div>
                          <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Archivo</label>
                          <input ref={entregableInputRef} type="file" className="hidden" onChange={e => setEntregableFile(e.target.files?.[0] ?? null)} />
                          {entregableFile ? (
                            <div className="flex items-center gap-3 bg-[#F6F8FA] border border-[#E7E9EE] rounded-[12px] px-4 py-3">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E6CA0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                              <span className="flex-1 text-[13.5px] font-semibold text-[#15171C] truncate">{entregableFile.name}</span>
                              <button onClick={() => setEntregableFile(null)} className="text-[#C2C8D2] hover:text-[#D14343] border-none bg-transparent cursor-pointer text-[11px] font-bold">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => entregableInputRef.current?.click()}
                              className="w-full h-[80px] border-2 border-dashed border-[#D0D5DD] rounded-[12px] flex flex-col items-center justify-center gap-1 cursor-pointer bg-[#FAFBFC] hover:border-steel hover:bg-white transition">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A929E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3" /><path d="M7 8l5-5 5 5" /><path d="M5 21h14" /></svg>
                              <span className="text-[13px] font-semibold text-[#8A929E]">Seleccionar archivo</span>
                            </button>
                          )}
                        </div>
                        <button onClick={handleUploadEntregable} disabled={!entregableFile || uploadingEntregable}
                          className="w-full h-12 bg-[#15171C] text-white border-none rounded-[12px] font-bold text-[15px] cursor-pointer hover:bg-steel transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                          {uploadingEntregable ? (
                            <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>Subiendo…</>
                          ) : (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3" /><path d="M7 8l5-5 5 5" /><path d="M5 21h14" /></svg>
                              Subir al portal del cliente
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal nuevo cliente */}
              {showModal && (
                <div className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,.55)] flex items-center justify-center p-6" onClick={() => { if (!creating) setShowModal(false); }}>
                  <div className="bg-white rounded-[22px] w-full max-w-[460px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-7 py-5 border-b border-[#F0F2F5]">
                      <div>
                        <div className="font-grotesk font-bold text-[19px] text-[#15171C]">Nuevo cliente</div>
                        <div className="text-[13px] text-[#8A929E] font-semibold mt-0.5">Se crea su acceso y carpeta en Drive automáticamente</div>
                      </div>
                      <button onClick={() => setShowModal(false)} className="w-9 h-9 rounded-[10px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>

                    {created ? (
                      <div className="px-7 py-7">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-10 h-10 rounded-full bg-[#EAF7F1] flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F9B6E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                          </div>
                          <div>
                            <div className="font-bold text-[15px] text-[#15171C]">¡Cliente creado!</div>
                            <div className="text-[13px] text-[#8A929E] font-semibold">Carpeta creada en Drive · acceso activo</div>
                          </div>
                        </div>
                        <div className="bg-[#F6F8FA] border border-[#E7E9EE] rounded-[14px] px-5 py-4 mb-5">
                          <div className="text-[12px] font-black text-[#8A929E] uppercase tracking-[0.05em] mb-3">Credenciales para compartir</div>
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center"><span className="text-[13.5px] font-semibold text-[#6A7280]">Email</span><span className="font-bold text-[14px] text-[#15171C]">{created.email}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[13.5px] font-semibold text-[#6A7280]">Contraseña</span><span className="font-black text-[14px] text-mint tracking-[0.08em]">{created.pass}</span></div>
                          </div>
                        </div>
                        <button onClick={() => setShowModal(false)} className="w-full h-11 bg-[#15171C] text-white border-none rounded-[12px] font-bold text-[14px] cursor-pointer hover:bg-steel transition">Cerrar</button>
                      </div>
                    ) : (
                      <div className="px-7 py-6 flex flex-col gap-4">
                        <div>
                          <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Nombre del negocio</label>
                          <input type="text" placeholder="Ej: Aurora Café" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                        </div>
                        <div>
                          <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Email del cliente</label>
                          <input type="email" placeholder="cliente@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                        </div>
                        <div>
                          <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Plan</label>
                          <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                            className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition bg-white">
                            <option>Esencial</option>
                            <option>Crecimiento</option>
                            <option>Pro</option>
                          </select>
                        </div>
                        <div className="bg-[#F6F8FA] border border-[#E7E9EE] rounded-[12px] px-4 py-3 flex items-center justify-between">
                          <div><div className="text-[12px] font-black text-[#8A929E] uppercase tracking-[0.04em]">Contraseña generada</div><div className="font-black text-[15px] text-[#15171C] tracking-[0.06em] mt-0.5">{genPass}</div></div>
                          <button type="button" onClick={() => setGenPass(generatePassword())} className="text-[12px] font-bold text-steel border-none bg-transparent cursor-pointer hover:underline">Nueva</button>
                        </div>
                        {formErr && <div className="text-[#D14343] text-[13px] font-semibold">{formErr}</div>}
                        <button onClick={handleCrearCliente} disabled={creating}
                          className="w-full h-12 bg-[#15171C] text-white border-none rounded-[12px] font-bold text-[15px] cursor-pointer hover:bg-steel transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                          {creating ? (
                            <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>Creando…</>
                          ) : 'Crear cliente'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[14px] text-[#8A929E] font-semibold">{dbClients.length} cliente{dbClients.length !== 1 ? 's' : ''} activo{dbClients.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={openModal} className="flex items-center gap-2 bg-[#15171C] text-white border-none font-bold text-[14px] px-5 py-[11px] rounded-[12px] cursor-pointer hover:bg-steel transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                  Nuevo cliente
                </button>
              </div>

              {/* Clients grid */}
              {dbClients.length === 0 ? (
                <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-16 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-[16px] bg-[#F4F6F8] flex items-center justify-center mb-4">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#AEB4BE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div className="font-grotesk font-bold text-[18px] text-[#15171C] mb-1">Sin clientes aún</div>
                  <div className="text-[14px] text-[#8A929E] font-semibold mb-5">Crea el primer cliente para que pueda acceder a su portal</div>
                  <button onClick={openModal} className="flex items-center gap-2 bg-[#15171C] text-white border-none font-bold text-[14px] px-5 py-[11px] rounded-[12px] cursor-pointer hover:bg-steel transition">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                    Crear primer cliente
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {dbClients.map((c: any, i: number) => {
                    const ini = c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                    const pill = statusPill(c.status ?? 'Al día');
                    const comp = comprobantes[`${c.slug}-junio-2026`];
                    return (
                      <div key={i} className="bg-white border border-[#ECEEF2] rounded-[20px] px-6 py-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-[44px] h-[44px] rounded-[13px] bg-gradient-to-br from-[#2E6CA0] to-[#2FB389] flex items-center justify-center font-black text-[14px] text-white flex-shrink-0">{ini}</div>
                          <div className="min-w-0">
                            <div className="font-bold text-[15px] text-[#15171C] truncate">{c.name}</div>
                            <div className="text-[12.5px] text-[#8A929E] font-semibold truncate">{c.email ?? ''}</div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-[9px]">
                          <div className="flex justify-between items-center">
                            <span className="text-[13px] text-[#8A929E] font-semibold">Plan</span>
                            <span className="font-bold text-[13.5px] text-[#15171C]">{c.plan}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[13px] text-[#8A929E] font-semibold">Monto</span>
                            {editingAmountSlug === c.slug ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editAmountVal}
                                  onChange={e => setEditAmountVal(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleSaveAmount(c.slug); if (e.key === 'Escape') setEditingAmountSlug(null); }}
                                  className="w-[88px] h-7 px-2 text-[13px] border border-[#E2E5EA] rounded-[8px] outline-none font-semibold text-[#15171C] focus:border-steel"
                                  autoFocus
                                />
                                <button onClick={() => handleSaveAmount(c.slug)} disabled={savingAmount}
                                  className="text-[11px] font-bold text-white bg-[#15171C] border-none rounded-[7px] px-2 py-1 cursor-pointer hover:bg-steel transition disabled:opacity-50">
                                  {savingAmount ? '…' : 'OK'}
                                </button>
                                <button onClick={() => setEditingAmountSlug(null)}
                                  className="text-[12px] font-bold text-[#AEB4BE] bg-transparent border-none cursor-pointer hover:text-[#D14343]">✕</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingAmountSlug(c.slug); setEditAmountVal(c.amount ?? ''); }}
                                className="group flex items-center gap-1 font-black text-[13.5px] text-[#15171C] bg-transparent border-none cursor-pointer hover:text-steel transition p-0">
                                {c.amount}
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                  className="opacity-0 group-hover:opacity-60 transition">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
                                </svg>
                              </button>
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[13px] text-[#8A929E] font-semibold">Estado</span>
                            <span className="text-[11.5px] font-black px-3 py-1 rounded-full" style={{ background: pill.bg, color: pill.color }}>{c.status ?? 'Al día'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[13px] text-[#8A929E] font-semibold">Comprobante</span>
                            {comp ? (
                              <a href={comp.link} target="_blank" rel="noopener noreferrer" className="text-[11.5px] font-black text-[#1F9B6E] bg-[#EAF7F1] px-2.5 py-1 rounded-full no-underline hover:bg-[#D4F4E8] transition">Ver en Drive</a>
                            ) : (
                              <span className="text-[11.5px] font-semibold text-[#C2C8D2]">Sin subir</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-[#F0F2F5]">
                          <button onClick={() => openEntregableModal({ slug: c.slug, name: c.name })}
                            className="w-full flex items-center justify-center gap-2 bg-[#F4F6F8] border border-[#E2E5EA] text-[#3C434F] font-bold text-[13px] px-3 py-[10px] rounded-[11px] cursor-pointer hover:border-steel hover:bg-white transition">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3" /><path d="M7 8l5-5 5 5" /><path d="M5 21h14" /></svg>
                            Subir entregable
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── FINANZAS ── */}
          {tab === 'finanzas' && (
            <div>
              <div className="grid grid-cols-4 gap-4 mb-4">
                {finKpis.map((kpi, i) => (
                  <div key={i} className="bg-white border border-[#ECEEF2] rounded-[18px] px-5 py-5">
                    <div className="text-[13px] text-[#8A929E] font-bold mb-[10px]">{kpi.label}</div>
                    <div className="flex items-baseline gap-[9px]">
                      <div className="font-grotesk font-bold text-[27px] tracking-[-0.02em] text-[#15171C]">{kpi.value}</div>
                      <div className="font-black text-[13px]" style={{ color: kpi.up ? '#2FB389' : '#D14343' }}>
                        {kpi.up ? '▲' : '▼'} {kpi.delta}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.15fr' }}>
                {/* Estado de resultados */}
                <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-6 py-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-grotesk font-semibold text-[18px] text-[#15171C]">Estado de resultados</h3>
                    <span className="text-[12.5px] font-bold text-[#8A929E]">Junio 2026</span>
                  </div>
                  <div className="flex flex-col">
                    {incomeRows.map((row, i) => {
                      const isTotal = row.kind === 'total';
                      const isSubtotal = row.kind === 'subtotal';
                      const isIn = row.kind === 'in';
                      return (
                        <div
                          key={i}
                          className="flex justify-between items-center py-[11px]"
                          style={{
                            borderTop: (isTotal || isSubtotal) ? `${isTotal ? 2 : 1}px solid ${isTotal ? '#15171C' : '#E7E9EE'}` : 'none',
                            marginTop: (isTotal || isSubtotal) ? '4px' : 0,
                          }}
                        >
                          <span
                            className="font-semibold text-[14px]"
                            style={{ color: isTotal || isSubtotal ? '#15171C' : '#6A7280', fontWeight: isTotal || isSubtotal ? 700 : 600 }}
                          >
                            {row.label}
                          </span>
                          <span
                            style={{
                              color: isTotal ? '#15171C' : isIn ? '#1F9B6E' : '#6A7280',
                              fontWeight: isTotal ? 700 : isSubtotal ? 800 : 600,
                              fontSize: isTotal ? '20px' : isSubtotal ? '15px' : '14px',
                              fontFamily: isTotal ? 'var(--font-grotesk, Space Grotesk)' : 'inherit',
                            }}
                          >
                            {row.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <button className="w-full mt-[18px] flex items-center justify-center gap-2 bg-[#F4F6F8] border border-[#E7E9EE] text-[#3C434F] font-bold text-[13.5px] px-3 py-[11px] rounded-[11px] cursor-pointer hover:border-[#15171C] transition">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" />
                    </svg>
                    Exportar reporte (PDF)
                  </button>
                </div>

                {/* Revenue chart */}
                <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-6 py-6">
                  <h3 className="font-grotesk font-semibold text-[18px] mb-1 text-[#15171C]">Ingresos mensuales</h3>
                  <p className="text-[#9AA0A8] text-[12.5px] font-semibold mb-[14px]">Últimos 8 meses (miles de S/)</p>
                  <svg viewBox="0 0 560 200" className="w-full h-auto mb-4">
                    <defs>
                      <linearGradient id="rvg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#2FB389" stopOpacity="0.24" />
                        <stop offset="1" stopColor="#2FB389" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points="18,185 18,162 88,148 158,133 228,117 298,97 368,74 438,46 542,22 542,185" fill="url(#rvg)" />
                    <polyline points="18,162 88,148 158,133 228,117 298,97 368,74 438,46 542,22" fill="none" stroke="#2FB389" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="542" cy="22" r="5" fill="white" stroke="#2FB389" strokeWidth="2.8" />
                  </svg>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#F6F8FA] rounded-[14px] px-4 py-[15px]">
                      <div className="text-[12px] text-[#8A929E] font-bold">Ticket promedio</div>
                      <div className="font-grotesk font-bold text-[20px] mt-0.5 text-[#15171C]">S/ 2,680</div>
                    </div>
                    <div className="bg-[#F6F8FA] rounded-[14px] px-4 py-[15px]">
                      <div className="text-[12px] text-[#8A929E] font-bold">Clientes activos</div>
                      <div className="font-grotesk font-bold text-[20px] mt-0.5 text-[#15171C]">6</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PAGOS ── */}
          {tab === 'pagos' && (
            <div>
              {(() => {
                const parseAmt = (a: string) => { const n = parseFloat((a || '0').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
                const cobrado = dbClients.filter((c: any) => c.status === 'Al día').reduce((s: number, c: any) => s + parseAmt(c.amount), 0);
                const porCobrar = dbClients.filter((c: any) => c.status === 'Pendiente').reduce((s: number, c: any) => s + parseAmt(c.amount), 0);
                const vencido = dbClients.filter((c: any) => c.status === 'Vencido').reduce((s: number, c: any) => s + parseAmt(c.amount), 0);
                const fmt = (n: number) => n >= 1000 ? `S/ ${(n / 1000).toFixed(1)}K` : `S/ ${n.toLocaleString('en-US')}`;
                return (
                  <div className="grid grid-cols-3 gap-4 mb-[18px]">
                    {[
                      { label: 'Cobrado este mes', value: fmt(cobrado), c: '#2FB389', bg: '#EAF7F1' },
                      { label: 'Por cobrar', value: fmt(porCobrar), c: '#C9821F', bg: '#FBF1E2' },
                      { label: 'Vencido', value: fmt(vencido), c: '#D14343', bg: '#FCEDED' },
                    ].map((pay, i) => (
                      <div key={i} className="bg-white border border-[#ECEEF2] rounded-[18px] px-6 py-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[13px] flex items-center justify-center flex-shrink-0" style={{ background: pay.bg }}>
                          <span className="w-4 h-4 rounded-sm" style={{ background: pay.c }} />
                        </div>
                        <div>
                          <div className="text-[13px] text-[#8A929E] font-bold">{pay.label}</div>
                          <div className="font-grotesk font-bold text-[22px] tracking-[-0.02em]" style={{ color: pay.c }}>{pay.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}


              <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden">
                <div className="grid px-6 py-[14px] bg-[#FAFBFC] border-b border-[#F0F2F5] text-[11.5px] font-black uppercase tracking-[0.04em] text-[#9AA0A8]"
                  style={{ gridTemplateColumns: '1.6fr 1fr 0.9fr 1fr 1fr 1fr' }}>
                  <span>Cliente</span><span>Plan</span><span>Monto</span><span>Estado</span><span>Próximo cobro</span><span>Comprobante</span>
                </div>
                {dbClients.length === 0 ? (
                  <div className="px-6 py-10 text-center text-[14px] text-[#8A929E] font-semibold">Sin clientes registrados</div>
                ) : dbClients.map((c: any, i: number) => {
                  const ini = c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                  const pill = statusPill(c.status ?? 'Al día');
                  const comp = comprobantes[`${c.slug}-junio-2026`];
                  return (
                    <div key={i}
                      className="grid px-6 py-4 border-b border-[#F2F4F7] last:border-b-0 items-center hover:bg-[#FAFBFC] transition"
                      style={{ gridTemplateColumns: '1.6fr 1fr 0.9fr 1fr 1fr 1fr' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[10px] bg-[#F2F4F7] flex items-center justify-center font-black text-[12.5px] text-[#5A6270] flex-shrink-0">{ini}</div>
                        <span className="font-bold text-[14.5px] text-[#15171C]">{c.name}</span>
                      </div>
                      <span className="text-[14px] text-[#5A6270] font-semibold">{c.plan}</span>
                      <span className="font-black text-[14px] text-[#15171C]">{c.amount}</span>
                      <div className="relative w-max">
                        <select
                          value={c.status ?? 'Al día'}
                          disabled={savingStatusSlug === c.slug}
                          onChange={async e => {
                            const newStatus = e.target.value;
                            setSavingStatusSlug(c.slug);
                            const res = await fetch('/api/clientes', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ slug: c.slug, status: newStatus }),
                            });
                            if (res.ok) {
                              setDbClients((prev: any[]) => prev.map(x => x.slug === c.slug ? { ...x, status: newStatus } : x));
                              showToast('Estado actualizado');
                            } else {
                              showToast('Error al actualizar estado', false);
                            }
                            setSavingStatusSlug(null);
                          }}
                          style={{ background: pill.bg, color: pill.color }}
                          className="text-[12px] font-black pl-3 pr-6 py-1 rounded-full border-none cursor-pointer outline-none appearance-none disabled:opacity-60"
                        >
                          <option value="Al día">Al día</option>
                          <option value="Pendiente">Pendiente</option>
                          <option value="Vencido">Vencido</option>
                        </select>
                        <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: pill.color }}>
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </div>
                      <span className="text-[14px] text-[#5A6270] font-semibold">—</span>
                      <div>
                        {comp ? (
                          <a
                            href={comp.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`${comp.fileName} · ${comp.uploadedAt}`}
                            className="flex items-center gap-[5px] text-[11.5px] font-black text-[#1F9B6E] bg-[#EAF7F1] border border-[#C0EAD8] px-2.5 py-1 rounded-full cursor-pointer hover:bg-[#D4F4E8] transition no-underline w-max"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                            Ver
                          </a>
                        ) : (
                          <span className="text-[11.5px] font-semibold text-[#C2C8D2]">Sin subir</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── CALENDARIO ── */}
          {tab === 'calendario' && (
            <div>
              {/* Modal nueva reunión */}
              {showReunionModal && (
                <div className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,.55)] flex items-center justify-center p-6" onClick={() => { if (!creatingReunion) setShowReunionModal(false); }}>
                  <div className="bg-white rounded-[22px] w-full max-w-[500px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-7 py-5 border-b border-[#F0F2F5]">
                      <div>
                        <div className="font-grotesk font-bold text-[19px] text-[#15171C]">Nueva reunión</div>
                        <div className="text-[13px] text-[#8A929E] font-semibold mt-0.5">Se crea en Google Calendar con link de Meet automático</div>
                      </div>
                      <button onClick={() => setShowReunionModal(false)} className="w-9 h-9 rounded-[10px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>

                    {reunionCreated ? (
                      <div className="px-7 py-7">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-10 h-10 rounded-full bg-[#EAF7F1] flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F9B6E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                          </div>
                          <div>
                            <div className="font-bold text-[15px] text-[#15171C]">¡Reunión creada!</div>
                            <div className="text-[13px] text-[#8A929E] font-semibold">Evento agregado en Google Calendar</div>
                          </div>
                        </div>
                        {reunionCreated.meetLink ? (
                          <div className="bg-[#F6F8FA] border border-[#E7E9EE] rounded-[14px] px-5 py-4 mb-5">
                            <div className="text-[12px] font-black text-[#8A929E] uppercase tracking-[0.05em] mb-2">Link de Google Meet</div>
                            <a href={reunionCreated.meetLink} target="_blank" rel="noopener noreferrer" className="font-bold text-[14px] text-[#2E6CA0] break-all no-underline hover:underline">{reunionCreated.meetLink}</a>
                          </div>
                        ) : (
                          <div className="bg-[#FBF1E2] border border-[#F0D9A8] rounded-[14px] px-5 py-4 mb-5 text-[13.5px] text-[#8A6020] font-semibold">
                            Reunión guardada. El link de Meet se generará cuando el Apps Script procese el evento de Calendar.
                          </div>
                        )}
                        <div className="flex gap-3">
                          {reunionCreated.meetLink && (
                            <a href={reunionCreated.meetLink} target="_blank" rel="noopener noreferrer" className="flex-1 h-11 bg-[#15171C] text-white rounded-[12px] font-bold text-[14px] no-underline flex items-center justify-center gap-2 hover:bg-steel transition">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l4.5-2.5v9L15 14" /><rect x="3" y="6" width="12" height="12" rx="2" /></svg>
                              Abrir Meet
                            </a>
                          )}
                          <button onClick={() => setShowReunionModal(false)} className="flex-1 h-11 bg-[#F4F6F8] text-[#15171C] border border-[#E2E5EA] rounded-[12px] font-bold text-[14px] cursor-pointer hover:bg-[#ECEEF2] transition">Cerrar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-7 py-6 flex flex-col gap-4">
                        <div>
                          <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Título de la reunión</label>
                          <input type="text" placeholder="Ej: Estrategia mensual · Aurora Café" value={reunionForm.title} onChange={e => setReunionForm(f => ({ ...f, title: e.target.value }))}
                            className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                        </div>
                        <div>
                          <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Cliente</label>
                          <select value={reunionForm.clientSlug} onChange={e => {
                            const all = dbClients.length > 0 ? dbClients : clients;
                            const c = all.find((x: any) => x.slug === e.target.value) as any;
                            setReunionForm(f => ({ ...f, clientSlug: e.target.value, clientName: c?.name ?? '', clientEmail: c?.email ?? '' }));
                          }} className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition bg-white">
                            <option value="">Selecciona cliente…</option>
                            {(dbClients.length > 0 ? dbClients : clients).map((c: any) => (
                              <option key={c.slug} value={c.slug}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Responsable</label>
                            <input type="text" placeholder="Ej: Mateo Salas" value={reunionForm.mentor} onChange={e => setReunionForm(f => ({ ...f, mentor: e.target.value }))}
                              className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                          </div>
                          <div>
                            <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Cargo</label>
                            <input type="text" placeholder="Ej: Estratega de contenido" value={reunionForm.mentorRole} onChange={e => setReunionForm(f => ({ ...f, mentorRole: e.target.value }))}
                              className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Fecha</label>
                            <input type="date" value={reunionForm.fecha} onChange={e => setReunionForm(f => ({ ...f, fecha: e.target.value }))}
                              className="w-full h-[46px] px-3 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                          </div>
                          <div>
                            <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Hora</label>
                            <input type="time" value={reunionForm.hora} onChange={e => setReunionForm(f => ({ ...f, hora: e.target.value }))}
                              className="w-full h-[46px] px-3 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                          </div>
                          <div>
                            <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Duración</label>
                            <select value={reunionForm.duracion} onChange={e => setReunionForm(f => ({ ...f, duracion: +e.target.value }))}
                              className="w-full h-[46px] px-3 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14px] font-medium outline-none text-[#15171C] focus:border-steel transition bg-white">
                              <option value={30}>30 min</option>
                              <option value={45}>45 min</option>
                              <option value={60}>1 hora</option>
                              <option value={90}>1.5 horas</option>
                            </select>
                          </div>
                        </div>
                        {reunionErr && <div className="text-[#D14343] text-[13px] font-semibold">{reunionErr}</div>}
                        <button onClick={handleCrearReunion} disabled={creatingReunion}
                          className="w-full h-12 bg-[#15171C] text-white border-none rounded-[12px] font-bold text-[15px] cursor-pointer hover:bg-steel transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                          {creatingReunion ? (
                            <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>Creando reunión…</>
                          ) : (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2.5" /><path d="M3 9h18M8 2v4M16 2v4" /><path d="M12 13v4M10 15h4" /></svg>
                              Crear reunión + Meet
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 bg-white border border-[#ECEEF2] rounded-[18px] px-6 py-[18px] mb-[18px]">
                <div className="flex items-center gap-[14px]">
                  <div className="w-11 h-11 rounded-[12px] bg-[#EAF1F8] flex items-center justify-center flex-shrink-0">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E6CA0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="17" rx="2.5" /><path d="M3 9h18M8 2v4M16 2v4" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-[15px] text-[#15171C]">Sincronizado con Google Calendar</div>
                    <div className="text-[13px] text-[#8A929E] font-semibold">Los links de Meet se generan automáticamente al crear cada reunión</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-[12.5px] font-black text-[#1F9B6E] bg-[#EAF7F1] px-[14px] py-2 rounded-full flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-mint animate-pulseDot" />
                    Conectado
                  </span>
                  <button onClick={openReunionModal} className="flex items-center gap-2 bg-[#15171C] text-white border-none font-bold text-[14px] px-5 py-[11px] rounded-[12px] cursor-pointer hover:bg-steel transition flex-shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                    Nueva reunión
                  </button>
                </div>
              </div>

              <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden px-2 py-3.5">
                <div className="px-4 pb-1.5">
                  <h3 className="font-grotesk font-semibold text-[18px] text-[#15171C]">Próximas reuniones</h3>
                </div>
                {reuniones.length === 0 ? (
                  <div className="flex flex-col items-center py-14 text-center px-8">
                    <div className="w-12 h-12 rounded-[14px] bg-[#F4F6F8] flex items-center justify-center mb-3">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#AEB4BE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="17" rx="2.5" /><path d="M3 9h18M8 2v4M16 2v4" />
                      </svg>
                    </div>
                    <div className="font-bold text-[16px] text-[#15171C] mb-1">Sin reuniones agendadas</div>
                    <div className="text-[13.5px] text-[#8A929E] font-semibold">Crea la primera reunión y el link de Meet se genera automáticamente</div>
                  </div>
                ) : (
                  reuniones.map((m: any, i: number) => {
                    const fmt = formatMeetDate(m.scheduled_at);
                    const colors = ['#2E6CA0','#2FB389','#15171C','#C9821F','#7C5CBF','#D14343'];
                    return (
                      <div key={i} className="flex items-center gap-4 px-4 py-[14px] rounded-[14px] hover:bg-[#FAFBFC] transition">
                        <div className="w-1 h-[46px] rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
                        <div className="w-[140px] flex-shrink-0">
                          <div className="font-black text-[14px] text-[#15171C]">{fmt.time}</div>
                          <div className="text-[12.5px] text-[#9AA0A8] font-bold">{fmt.day}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[15px] text-[#15171C]">{m.title}</div>
                          <div className="text-[13px] text-[#8A929E] font-semibold">{m.client_name} · {m.mentor}</div>
                        </div>
                        {m.meet_link ? (
                          <a href={m.meet_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#15171C] text-white font-bold text-[12.5px] px-[15px] py-[9px] rounded-[10px] cursor-pointer hover:bg-steel transition flex-shrink-0 no-underline">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 10l4.5-2.5v9L15 14" /><rect x="3" y="6" width="12" height="12" rx="2" />
                            </svg>
                            Unirse
                          </a>
                        ) : (
                          <span className="text-[12px] font-semibold text-[#C2C8D2] flex-shrink-0">Sin link</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── CHAT IA ── */}
          {tab === 'chatia' && (
            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 280px' }}>
              {/* Chat window */}
              <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden flex flex-col" style={{ height: '620px' }}>
                <div className="flex items-center gap-3 px-6 py-[18px] border-b border-[#F0F2F5]">
                  <div className="w-[42px] h-[42px] rounded-[12px] bg-gradient-to-br from-[#15171C] to-[#2E6CA0] flex items-center justify-center flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-[15px] text-[#15171C]">Asistente Liderium</div>
                    <div className="text-[12.5px] text-[#8A929E] font-semibold">Conectado a Claude · guiones, estrategia y feedback</div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4 bg-[#FAFBFC]">
                  {aiMsgs.map((m, i) => {
                    const isUser = m.role === 'user';
                    return (
                      <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className="max-w-[80%] px-4 py-3 whitespace-pre-wrap text-[14.5px] leading-[1.55]"
                          style={{
                            background: isUser ? '#15171C' : '#fff',
                            color: isUser ? '#fff' : '#15171C',
                            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            border: isUser ? 'none' : '1px solid #ECEEF2',
                          }}
                        >
                          <div className="text-[11px] font-black mb-1 opacity-60">{isUser ? 'Tú' : 'Asistente Liderium'}</div>
                          {m.text}
                        </div>
                      </div>
                    );
                  })}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-[#ECEEF2] text-[#15171C] px-4 py-3 rounded-[16px] rounded-bl-[4px] text-[14.5px] text-[#9AA0A8]">
                        <div className="text-[11px] font-black mb-1 opacity-60">Asistente Liderium</div>
                        Escribiendo…
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="flex gap-[10px] px-6 py-4 border-t border-[#F0F2F5]">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pídele un guion, una estrategia, feedback…"
                    className="flex-1 h-12 px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none bg-[#FAFBFC] text-[#15171C] focus:border-steel focus:bg-white transition"
                  />
                  <button
                    onClick={() => sendMsg()}
                    disabled={aiLoading || !aiInput.trim()}
                    className="h-12 px-5 bg-[#15171C] text-white border-none rounded-[12px] cursor-pointer flex items-center gap-2 font-bold text-[14px] hover:bg-steel transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Enviar
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Sidebar */}
              <div className="flex flex-col gap-3">
                <div className="bg-white border border-[#ECEEF2] rounded-[18px] px-[18px] py-[18px]">
                  <div className="text-[12px] font-black tracking-[0.05em] uppercase text-[#2E6CA0] mb-3">Prompts rápidos</div>
                  <div className="flex flex-col gap-[9px]">
                    {quickPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMsg(prompt)}
                        className="text-left bg-[#F6F8FA] border border-[#EDEFF3] text-[#3C434F] font-semibold text-[13px] leading-[1.4] px-[13px] py-[11px] rounded-[11px] cursor-pointer hover:border-steel hover:bg-white transition"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#15171C] to-[#2E6CA0] rounded-[18px] px-[18px] py-[18px] text-white">
                  <div className="text-[12px] font-black uppercase tracking-[0.05em] text-[#9fc3e3] mb-2">Configurado con Claude</div>
                  <p className="text-[13.5px] leading-[1.55] text-[#cfd4db] m-0">
                    El equipo promea desde aquí mismo, sin salir de la plataforma.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
