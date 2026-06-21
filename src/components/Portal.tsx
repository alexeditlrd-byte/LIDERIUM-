'use client';

import { useState, useRef, useEffect } from 'react';

interface PortalProps {
  onLogout: () => void;
  clientData?: { name: string; slug: string; plan: string; email: string } | null;
  role?: string;
}

type Tab = 'resumen' | 'estrategia' | 'metricas' | 'mentoria' | 'entregables' | 'mejoras' | 'mensajes' | 'deuda';

const ICONS: Record<string, React.ReactNode> = {
  resumen: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  videos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="2" y="4" width="20" height="16" rx="3" /><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
    </svg>
  ),
  estrategia: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="3" y="4" width="18" height="17" rx="2.5" /><path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  ),
  metricas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M3 3v18h18" /><path d="M7 14l4-5 3 3 5-7" />
    </svg>
  ),
  mentoria: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M15 10l4.5-2.5v9L15 14" /><rect x="3" y="6" width="12" height="12" rx="2" />
    </svg>
  ),
  entregables: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M4 5a2 2 0 0 1 2-2h4l2 3h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    </svg>
  ),
  mejoras: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M9 18h6M10 21h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" />
    </svg>
  ),
  mensajes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.6L3 21l1.9-5.8A8.5 8.5 0 1 1 21 11.5z" />
    </svg>
  ),
  deuda: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h4" />
    </svg>
  ),
};

const navItems: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'estrategia', label: 'Estrategia' },
  { id: 'metricas', label: 'Métricas' },
  { id: 'mentoria', label: 'Mentoría' },
  { id: 'entregables', label: 'Entregables' },
  { id: 'mejoras', label: 'Mejoras y consejos' },
  { id: 'mensajes', label: 'Mensajes' },
  { id: 'deuda', label: 'Pago' },
];

const titles: Record<Tab, string> = {
  resumen: 'Resumen general',
  estrategia: 'Estrategia de contenido',
  metricas: 'Métricas de crecimiento',
  mentoria: 'Mentoría',
  entregables: 'Entregables',
  mejoras: 'Mejoras y consejos',
  mensajes: 'Mensajes',
  deuda: 'Pago',
};

const kpis = [
  { label: 'Seguidores totales', value: '16.1K', delta: '+262%', sub: 'últimos 8 meses' },
  { label: 'Alcance mensual', value: '418K', delta: '+38%', sub: 'vs. mes anterior' },
  { label: 'Reproducciones', value: '1.24M', delta: '+54%', sub: 'video orgánico' },
  { label: 'Videos publicados', value: '37', delta: '+9', sub: 'este trimestre' },
];

const files = [
  { name: 'Pack Reels — Junio (8 videos).zip', type: 'ZIP', size: '1.4 GB', date: '10 jun', c: '#2E6CA0' },
  { name: 'Calendario de contenido — Julio.pdf', type: 'PDF', size: '2.1 MB', date: '08 jun', c: '#D14343' },
  { name: 'Guion + storyboard — Semana 24.docx', type: 'DOC', size: '680 KB', date: '05 jun', c: '#2E6CA0' },
  { name: 'Plantillas de historias.psd', type: 'PSD', size: '94 MB', date: '02 jun', c: '#2FB389' },
  { name: 'Reporte de métricas — Mayo.pdf', type: 'PDF', size: '3.4 MB', date: '31 may', c: '#D14343' },
  { name: 'Logos y recursos de marca.zip', type: 'ZIP', size: '48 MB', date: '20 may', c: '#2E6CA0' },
];

const tips = [
  { ini: 'MS', author: 'Mateo Salas', role: 'Estratega de contenido', date: 'Hoy', tag: 'Prioridad alta', tc: '#D14343', tbg: '#FCEDED', text: 'Los reels que abren con una pregunta directa están reteniendo 2× más. Probemos ese gancho en los 3 próximos videos de producto.' },
  { ini: 'LR', author: 'Lucía Ramos', role: 'Editora de video', date: 'Ayer', tag: 'Formato', tc: '#2E6CA0', tbg: '#EAF1F8', text: 'Subtítulos más grandes y al centro mejoraron la retención móvil. Ya lo aplicamos al pack de junio.' },
  { ini: 'DT', author: 'Diego Torres', role: 'Performance', date: '2 días', tag: 'Oportunidad', tc: '#2FB389', tbg: '#EAF7F1', text: 'El horario 7–9pm está rindiendo mejor para tu audiencia. Movamos las publicaciones clave a esa franja.' },
];

const mentorias = [
  {
    title: 'Sesión de estrategia mensual',
    date: 'Jueves 19 jun · 5:00 pm',
    dur: '45 min',
    mentor: 'Mateo Salas',
    role: 'Estratega de contenido',
    ini: 'MS',
    platform: 'Google Meet',
    link: 'https://meet.google.com/lid-erium-mtg',
    status: 'Próxima',
    live: true,
    pc: '#2E6CA0',
    pbg: 'rgba(46,108,160,.12)',
  },
  {
    title: 'Revisión de guiones — Julio',
    date: 'Martes 24 jun · 11:00 am',
    dur: '30 min',
    mentor: 'Lucía Ramos',
    role: 'Editora de video',
    ini: 'LR',
    platform: 'Zoom',
    link: 'https://zoom.us/j/0000000000',
    status: 'Agendada',
    live: false,
    pc: '#2E6CA0',
    pbg: 'rgba(46,108,160,.12)',
  },
  {
    title: 'Mentoría de crecimiento',
    date: 'Viernes 27 jun · 4:00 pm',
    dur: '60 min',
    mentor: 'Diego Torres',
    role: 'Performance',
    ini: 'DT',
    platform: 'Google Meet',
    link: 'https://meet.google.com/lid-erium-grw',
    status: 'Agendada',
    live: false,
    pc: '#2FB389',
    pbg: 'rgba(47,179,137,.12)',
  },
];

const platforms = [
  { name: 'Instagram', v: 46, c: '#2E6CA0' },
  { name: 'TikTok', v: 34, c: '#15171C' },
  { name: 'YouTube', v: 14, c: '#2FB389' },
  { name: 'Otros', v: 6, c: '#AEB4BE' },
];

const messages = [
  { from: 'agency', name: 'Mateo · Liderium', text: '¡Hola Valentina! Ya subimos el pack de reels de junio al portal. ¿Lo revisas y nos dices?', time: '09:24' },
  { from: 'client', name: 'Tú', text: '¡Genial! El del ritual de la mañana quedó increíble 🙌', time: '09:40' },
  { from: 'agency', name: 'Mateo · Liderium', text: 'Nos encanta. Para julio queremos reforzar contenido educativo, ¿te parece?', time: '09:42' },
  { from: 'client', name: 'Tú', text: 'Sí, total. ¿Cuándo agendamos la reunión de estrategia?', time: '09:51' },
  { from: 'agency', name: 'Mateo · Liderium', text: 'El jueves a las 5pm te queda bien? Te paso la invitación.', time: '09:53' },
];

type Comprobante = { link: string; fileName: string; uploadedAt: string; fileId: string };

export default function Portal({ onLogout, clientData }: PortalProps) {
  const clientName = clientData?.name ?? 'Aurora Café';
  const clientPlan = clientData?.plan ?? 'Crecimiento';
  const clientSlugReal = clientData?.slug ?? 'aurora-cafe';
  const clientInitials = clientName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const [tab, setTab] = useState<Tab>('resumen');
  const [comprobantes, setComprobantes] = useState<Record<string, Comprobante>>({});
  const [pendingMes, setPendingMes] = useState('');
  const [uploading, setUploading] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reunionesData, setReunionesData] = useState<any[]>([]);
  const [entregablesData, setEntregablesData] = useState<any[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [clientAmount, setClientAmount] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showToast = (text: string) => {
    setSuccessToast(text);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  useEffect(() => {
    fetch('/api/comprobantes')
      .then(r => r.json())
      .then(data => {
        const map: Record<string, Comprobante> = {};
        for (const c of (data.comprobantes ?? [])) {
          if (c.clientSlug === clientSlugReal) {
            map[`${clientSlugReal}-${c.mes}`] = { link: c.link, fileName: c.fileName, uploadedAt: c.uploadedAt, fileId: c.fileId };
          }
        }
        setComprobantes(map);
      })
      .catch(() => {});
  }, [clientSlugReal]);

  useEffect(() => {
    if (tab === 'mentoria') {
      fetch(`/api/reuniones?clientSlug=${clientSlugReal}`)
        .then(r => r.json())
        .then(d => setReunionesData(d.meetings ?? []))
        .catch(() => {});
    }
    if (tab === 'entregables') {
      fetch(`/api/entregables?clientSlug=${clientSlugReal}`)
        .then(r => r.json())
        .then(d => setEntregablesData(d.entregables ?? []))
        .catch(() => {});
    }
    if (tab === 'deuda') {
      fetch(`/api/mi-cuenta?slug=${clientSlugReal}`)
        .then(r => r.json())
        .then(d => { if (d.amount) setClientAmount(d.amount); })
        .catch(() => {});
    }
  }, [tab, clientSlugReal]);

  const triggerUpload = (mesKey: string) => {
    setPendingMes(mesKey);
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingMes) return;
    e.target.value = '';
    setUploading(pendingMes);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('clientSlug', clientSlugReal);
      fd.append('mes', pendingMes);
      const res = await fetch('/api/upload-comprobante', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.link) {
        setComprobantes(prev => ({
          ...prev,
          [`${clientSlugReal}-${pendingMes}`]: { link: data.link, fileName: data.fileName, uploadedAt: data.uploadedAt, fileId: data.fileId },
        }));
        showToast('Comprobante subido correctamente');
      }
    } catch {}
    setUploading('');
  };

  return (
    <div className="relative min-h-screen bg-[#F5F6F8] md:grid md:overflow-hidden" style={{ gridTemplateColumns: '256px 1fr' }}>

      {/* ── SUCCESS TOAST ── */}
      {successToast && (
        <div style={{
          position: 'fixed', bottom: '28px', right: '28px', zIndex: 99999,
          animation: 'toastSlide 0.38s cubic-bezier(0.16,1,0.3,1) forwards',
        }}>
          <div style={{
            background: '#15171C', color: 'white', borderRadius: '18px',
            padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.28)', minWidth: '260px',
          }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '50%',
              background: 'rgba(47,179,137,0.15)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
              animation: 'checkPop 0.4s 0.1s cubic-bezier(0.16,1,0.3,1) both',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#2FB389" strokeWidth="2" />
                <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#2FB389" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="22" strokeDashoffset="22"
                  style={{ animation: 'drawCheck 0.45s 0.25s ease forwards' }} />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>¡Completado!</div>
              <div style={{ fontSize: '12.5px', opacity: 0.6, marginTop: '2px', fontWeight: 600 }}>{successToast}</div>
            </div>
          </div>
        </div>
      )}
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-[9997] md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 w-[256px] z-[9998] bg-[#15171C] text-white flex flex-col px-4 py-[22px] transition-transform duration-300 md:relative md:translate-x-0 md:z-20 md:sticky md:top-0 md:h-screen ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-2.5 pb-[22px]">
          <img src="/assets/liderium-white.png" alt="Liderium" className="h-[26px] w-auto" />
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
            <div className="w-[38px] h-[38px] rounded-[11px] bg-gradient-to-br from-[#2E6CA0] to-[#2FB389] flex items-center justify-center font-black text-sm text-white flex-shrink-0">
              {clientInitials}
            </div>
            <div className="text-[13.5px] leading-tight">
              <div className="font-bold">{clientName}</div>
              <div className="text-[#7E8693] text-xs">Plan {clientPlan}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 bg-transparent border-none text-[#9097A2] font-bold text-[13.5px] px-2.5 py-2 rounded-[10px] cursor-pointer hover:bg-[#21242C] hover:text-white transition"
          >
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
        <header className="bg-[rgba(238,240,244,.82)] backdrop-blur-[12px] border-b border-[rgba(0,0,0,.06)] px-4 md:px-[38px] py-4 md:py-5 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden w-9 h-9 flex items-center justify-center rounded-[10px] bg-white border border-[#E2E5EA] text-[#3C434F]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
            <div>
              <div className="text-[12.5px] font-bold text-[#8A929E] tracking-[0.04em] hidden md:block">Hola, {clientName} 👋</div>
              <h1 className="font-grotesk font-bold text-[18px] md:text-[25px] tracking-[-0.02em] text-[#15171C]">{titles[tab]}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-[14px]">
            <a href="https://wa.me/51991403038" target="_blank" rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 bg-white border border-[#E2E5EA] text-[#15171C] font-bold text-[13.5px] px-4 py-2.5 rounded-[11px] no-underline hover:border-[#15171C] transition">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366">
                <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2z" />
              </svg>
              Soporte
            </a>
            <div className="w-[38px] h-[38px] md:w-[42px] md:h-[42px] rounded-[12px] bg-gradient-to-br from-[#2E6CA0] to-[#2FB389] flex items-center justify-center font-bold text-sm text-white">{clientInitials}</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 md:px-[38px] py-5 md:py-[34px] overflow-auto">
          {/* ── RESUMEN ── */}
          {tab === 'resumen' && (
            <div>
              <div className="grid grid-cols-4 gap-4 mb-4">
                {kpis.map((kpi, i) => (
                  <div key={i} className="bg-white border border-[#ECEEF2] rounded-[18px] px-5 py-5">
                    <div className="text-[13px] text-[#8A929E] font-bold mb-[10px]">{kpi.label}</div>
                    <div className="flex items-baseline gap-[9px]">
                      <div className="font-grotesk font-bold text-[30px] tracking-[-0.02em] text-[#15171C]">{kpi.value}</div>
                      <div className="text-mint font-black text-[13.5px]">▲ {kpi.delta}</div>
                    </div>
                    <div className="text-[12.5px] text-[#9AA0A8] font-semibold mt-1">{kpi.sub}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
                {/* Growth chart */}
                <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-6 py-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-grotesk font-semibold text-[18px] text-[#15171C]">Crecimiento de seguidores</h3>
                    <span className="text-[12.5px] font-bold text-mint bg-[#EAF7F1] px-3 py-1 rounded-full">Nov → Jun</span>
                  </div>
                  <p className="text-[#9AA0A8] text-[13.5px] font-semibold mb-[14px]">De 3.2K a 16.1K en 8 meses</p>
                  <svg viewBox="0 0 560 210" className="w-full h-auto">
                    <defs>
                      <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#2E6CA0" stopOpacity="0.22" />
                        <stop offset="1" stopColor="#2E6CA0" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points="18,192 18,168 88,155 158,140 228,118 298,90 368,60 438,30 542,14 542,192" fill="url(#fg)" />
                    <polyline points="18,168 88,155 158,140 228,118 298,90 368,60 438,30 542,14" fill="none" stroke="#2E6CA0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="542" cy="14" r="5.5" fill="white" stroke="#2E6CA0" strokeWidth="3" />
                  </svg>
                </div>

                {/* Próximas entregas + consejo */}
                <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-6 py-6">
                  <h3 className="font-grotesk font-semibold text-[18px] mb-4 text-[#15171C]">Próximas entregas</h3>
                  <div className="flex flex-col gap-[14px] mb-5">
                    {[
                      { dot: '#2FB389', title: 'Pack de reels — Julio', sub: 'Entrega 28 jun · en edición' },
                      { dot: '#2E6CA0', title: 'Calendario de contenido', sub: 'Listo para revisión' },
                      { dot: '#AEB4BE', title: 'Reunión de estrategia', sub: 'Jueves 5:00 pm' },
                    ].map((d, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-[9px] h-[9px] rounded-full mt-[5px] flex-shrink-0" style={{ background: d.dot }} />
                        <div>
                          <div className="font-bold text-sm text-[#15171C]">{d.title}</div>
                          <div className="text-[12.5px] text-[#9AA0A8] font-semibold">{d.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-gradient-to-br from-[#15171C] to-[#2E6CA0] rounded-[14px] text-white">
                    <div className="text-[11.5px] font-bold text-[#9fc3e3] uppercase tracking-[0.06em] mb-[6px]">Consejo de la semana</div>
                    <div className="text-[14px] leading-[1.5] font-semibold">Abre tus reels con una pregunta directa: está reteniendo 2× más.</div>
                  </div>
                </div>
              </div>

              {/* Estrategia summary */}
              <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-6 py-6">
                <h3 className="font-grotesk font-semibold text-[18px] mb-[18px] text-[#15171C]">Resumen de la estrategia</h3>
                <div className="grid grid-cols-3 gap-[14px]">
                  {[
                    { label: 'Concepto del mes', value: 'Estrategias virales efectivas' },
                    { label: 'Pilar principal', value: 'Educativo · Tendencias' },
                    { label: 'Publicaciones / semana', value: '5 piezas planeadas' },
                  ].map((c, i) => (
                    <div key={i} className="border border-[#F0F2F5] rounded-[14px] px-[18px] py-[18px]">
                      <div className="text-[12.5px] text-[#8A929E] font-bold mb-[6px]">{c.label}</div>
                      <div className="font-bold text-[15px] leading-[1.4] text-[#15171C]">{c.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── ESTRATEGIA ── */}
          {tab === 'estrategia' && (
            <div className="flex flex-col gap-4">
              {/* Pilares */}
              <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-6 py-6">
                <h3 className="font-grotesk font-semibold text-[18px] mb-[18px] text-[#15171C]">Pilares de contenido</h3>
                <div className="flex flex-col gap-[14px]">
                  {[
                    { name: 'Detrás de cámaras', pct: 30, c: '#2E6CA0' },
                    { name: 'Educativo', pct: 30, c: '#2FB389' },
                    { name: 'Producto / venta', pct: 25, c: '#15171C' },
                    { name: 'Tendencias', pct: 15, c: '#AEB4BE' },
                  ].map((p, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[13.5px] font-bold text-[#15171C] mb-[6px]">
                        <span>{p.name}</span><span style={{ color: p.c }}>{p.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#F0F2F5]">
                        <div className="h-2 rounded-full" style={{ width: `${p.pct}%`, background: p.c }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calendario */}
              <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-6 py-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-grotesk font-semibold text-[18px] text-[#15171C]">Calendario semanal</h3>
                  <span className="text-[12.5px] font-bold text-[#8A929E] bg-[#F6F8FA] px-3 py-1.5 rounded-full">Semana 16–22 jun</span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {[
                    { d: 'Lun', n: '16', post: { t: 'Reel educativo', c: '#2FB389' } },
                    { d: 'Mar', n: '17', post: null },
                    { d: 'Mié', n: '18', post: { t: 'BTS tostado', c: '#2E6CA0' } },
                    { d: 'Jue', n: '19', post: { t: 'Trend audio', c: '#AEB4BE' } },
                    { d: 'Vie', n: '20', post: { t: 'Producto frío', c: '#15171C' } },
                    { d: 'Sáb', n: '21', post: null },
                    { d: 'Dom', n: '22', post: { t: 'Testimonio', c: '#2FB389' } },
                  ].map((d, i) => (
                    <div key={i} className="border border-[#F0F2F5] rounded-[13px] px-2 py-3 min-h-[110px] flex flex-col gap-2">
                      <div className="text-center mb-1">
                        <div className="text-[10.5px] font-black text-[#9AA0A8] uppercase">{d.d}</div>
                        <div className="font-grotesk font-bold text-[17px] text-[#15171C]">{d.n}</div>
                      </div>
                      {d.post && (
                        <div className="text-white text-[10px] font-bold px-2 py-1 rounded-[7px] text-center leading-tight" style={{ background: d.post.c }}>
                          {d.post.t}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-[14px] flex-wrap mt-4">
                  {[
                    { c: '#2FB389', label: 'Educativo' },
                    { c: '#2E6CA0', label: 'BTS' },
                    { c: '#AEB4BE', label: 'Tendencias' },
                    { c: '#15171C', label: 'Producto' },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-[6px] text-[12.5px] font-semibold text-[#6A7280]">
                      <span className="w-[10px] h-[10px] rounded-[3px]" style={{ background: l.c }} />{l.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Concepto */}
              <div className="bg-gradient-to-br from-[#15171C] to-[#1e3a5f] border border-[#2A3A52] rounded-[20px] px-6 py-6 text-white">
                <div className="text-[11.5px] font-black uppercase tracking-[0.07em] text-[#6FB7F0] mb-2">Concepto del mes</div>
                <div className="font-grotesk font-bold text-[22px] mb-2">Estrategias virales efectivas para Aurora Café</div>
                <p className="text-[14.5px] text-[#AEB4BE] leading-[1.6] max-w-[680px] m-0">
                  Este mes enfocamos el contenido en mostrar el proceso detrás de cada bebida. Los reels que abren con una pregunta o dato sorprendente están reteniendo 2× más en tu audiencia objetivo.
                </p>
              </div>
            </div>
          )}

          {/* ── MÉTRICAS ── */}
          {tab === 'metricas' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                  <div key={i} className="bg-white border border-[#ECEEF2] rounded-[18px] px-5 py-5">
                    <div className="text-[13px] text-[#8A929E] font-bold mb-[10px]">{kpi.label}</div>
                    <div className="flex items-baseline gap-[9px]">
                      <div className="font-grotesk font-bold text-[28px] tracking-[-0.02em] text-[#15171C]">{kpi.value}</div>
                      <div className="text-mint font-black text-[13px]">▲ {kpi.delta}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Seguidores chart */}
                <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-6 py-6">
                  <h3 className="font-grotesk font-semibold text-[17px] mb-1 text-[#15171C]">Seguidores</h3>
                  <p className="text-[#9AA0A8] text-[12.5px] font-semibold mb-4">Crecimiento histórico — Nov a Jun</p>
                  <svg viewBox="0 0 560 200" className="w-full h-auto">
                    <defs>
                      <linearGradient id="mg1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#2E6CA0" stopOpacity="0.22" />
                        <stop offset="1" stopColor="#2E6CA0" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points="18,185 18,165 88,152 158,138 228,115 298,86 368,56 438,26 542,12 542,185" fill="url(#mg1)" />
                    <polyline points="18,165 88,152 158,138 228,115 298,86 368,56 438,26 542,12" fill="none" stroke="#2E6CA0" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="542" cy="12" r="5" fill="white" stroke="#2E6CA0" strokeWidth="2.8" />
                  </svg>
                </div>

                {/* Alcance chart */}
                <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-6 py-6">
                  <h3 className="font-grotesk font-semibold text-[17px] mb-1 text-[#15171C]">Alcance mensual</h3>
                  <p className="text-[#9AA0A8] text-[12.5px] font-semibold mb-4">Personas únicas alcanzadas</p>
                  <svg viewBox="0 0 560 200" className="w-full h-auto">
                    <defs>
                      <linearGradient id="mg2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#2FB389" stopOpacity="0.24" />
                        <stop offset="1" stopColor="#2FB389" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points="18,185 18,170 88,155 158,140 228,120 298,95 368,65 438,36 542,14 542,185" fill="url(#mg2)" />
                    <polyline points="18,170 88,155 158,140 228,120 298,95 368,65 438,36 542,14" fill="none" stroke="#2FB389" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="542" cy="14" r="5" fill="white" stroke="#2FB389" strokeWidth="2.8" />
                  </svg>
                </div>
              </div>

              {/* Platform breakdown */}
              <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-6 py-6">
                <h3 className="font-grotesk font-semibold text-[18px] mb-[18px] text-[#15171C]">Alcance por plataforma</h3>
                <div className="flex flex-col gap-[14px]">
                  {platforms.map((p, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="text-[14px] font-bold text-[#15171C] w-[90px] flex-shrink-0">{p.name}</div>
                      <div className="flex-1 h-[10px] rounded-full bg-[#F0F2F5]">
                        <div className="h-[10px] rounded-full transition-all duration-500" style={{ width: `${p.v}%`, background: p.c }} />
                      </div>
                      <div className="text-[13px] font-black text-[#15171C] w-[40px] text-right">{p.v}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── MENTORÍA ── */}
          {tab === 'mentoria' && (
            <div className="flex flex-col gap-4">
              <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-6 py-5 flex items-center justify-between">
                <div>
                  <h3 className="font-grotesk font-semibold text-[18px] text-[#15171C] mb-1">Sesiones con tu equipo</h3>
                  <p className="text-[14px] text-[#8A929E] font-semibold m-0">Reuniones de estrategia, revisión y mentoría con los especialistas de Liderium.</p>
                </div>
                <span className="flex items-center gap-[6px] text-[12.5px] font-black text-[#1F9B6E] bg-[#EAF7F1] px-[14px] py-[7px] rounded-full flex-shrink-0">
                  <span className="w-[7px] h-[7px] rounded-full bg-mint animate-pulseDot" />
                  Google Meet conectado
                </span>
              </div>

              {reunionesData.length === 0 ? (
                <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-14 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-[14px] bg-[#F4F6F8] flex items-center justify-center mb-3">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#AEB4BE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 10l4.5-2.5v9L15 14" /><rect x="3" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </div>
                  <div className="font-bold text-[16px] text-[#15171C] mb-1">Sin sesiones agendadas</div>
                  <div className="text-[13.5px] text-[#8A929E] font-semibold">Tu equipo en Liderium agendará tus próximas sesiones aquí</div>
                </div>
              ) : (
                reunionesData.map((m: any, i: number) => {
                  const d = new Date(m.scheduled_at);
                  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
                  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
                  const h = d.getHours();
                  const min = d.getMinutes().toString().padStart(2,'0');
                  const ampm = h >= 12 ? 'pm' : 'am';
                  const h12 = h > 12 ? h - 12 : h || 12;
                  const dateStr = `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${h12}:${min} ${ampm}`;
                  const durStr = m.duration_minutes >= 60 ? `${m.duration_minutes / 60}h` : `${m.duration_minutes} min`;
                  const ini = m.mentor_ini || m.mentor.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
                  const now = new Date();
                  const isLive = Math.abs(d.getTime() - now.getTime()) < 30 * 60 * 1000 && d > now;
                  const isPast = d < now;
                  const colors = ['#2E6CA0','#2FB389','#15171C','#C9821F'];
                  const pc = colors[i % colors.length];
                  return (
                    <div key={i} className="bg-white border border-[#ECEEF2] rounded-[20px] px-6 py-6">
                      <div className="flex items-start gap-4 flex-wrap">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="w-1 min-h-[60px] rounded-full flex-shrink-0" style={{ background: pc }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              <h4 className="font-grotesk font-semibold text-[17px] text-[#15171C] m-0">{m.title}</h4>
                              <span className="text-[11.5px] font-black px-[10px] py-[4px] rounded-full" style={{ background: `${pc}1a`, color: pc }}>
                                {isPast ? 'Realizada' : m.status}
                              </span>
                              {isLive && (
                                <span className="flex items-center gap-[5px] text-[11.5px] font-black text-[#1F9B6E] bg-[#EAF7F1] px-[10px] py-[4px] rounded-full">
                                  <span className="w-[6px] h-[6px] rounded-full bg-mint animate-pulseDot" />En vivo
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-[20px] flex-wrap text-[13.5px] text-[#6A7280] font-semibold mb-3">
                              <span className="flex items-center gap-[6px]">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2.5" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
                                {dateStr}
                              </span>
                              <span className="flex items-center gap-[6px]">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                {durStr}
                              </span>
                              <span>Google Meet</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-[34px] h-[34px] rounded-[9px] bg-gradient-to-br from-[#2E6CA0] to-[#2FB389] flex items-center justify-center font-black text-[12px] text-white flex-shrink-0">{ini}</div>
                              <div>
                                <div className="font-bold text-[13.5px] text-[#15171C]">{m.mentor}</div>
                                <div className="text-[12px] text-[#8A929E] font-semibold">{m.mentor_role || 'Especialista'} · Liderium</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {m.meet_link ? (
                          <a href={m.meet_link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-[#15171C] text-white border-none font-bold text-[13.5px] px-5 py-[11px] rounded-[12px] no-underline hover:bg-steel transition flex-shrink-0 self-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l4.5-2.5v9L15 14" /><rect x="3" y="6" width="12" height="12" rx="2" /></svg>
                            Unirse
                          </a>
                        ) : (
                          <span className="text-[13px] font-semibold text-[#C2C8D2] self-center flex-shrink-0">Link pendiente</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── ENTREGABLES ── */}
          {tab === 'entregables' && (
            <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden">
              {entregablesData.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center px-8">
                  <div className="w-14 h-14 rounded-[16px] bg-[#F4F6F8] flex items-center justify-center mb-4">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#AEB4BE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 5a2 2 0 0 1 2-2h4l2 3h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                    </svg>
                  </div>
                  <div className="font-grotesk font-bold text-[18px] text-[#15171C] mb-1">Sin entregables aún</div>
                  <div className="text-[14px] text-[#8A929E] font-semibold">Tu equipo de Liderium subirá aquí tus archivos: reels, calendarios, guiones y más.</div>
                </div>
              ) : (
                entregablesData.map((file: any, i: number) => {
                  const ext = file.fileName?.split('.').pop()?.toLowerCase() ?? '';
                  const mime = file.mimeType ?? '';
                  let fileLabel = 'FILE'; let fileColor = '#AEB4BE';
                  if (mime.includes('pdf') || ext === 'pdf') { fileLabel = 'PDF'; fileColor = '#D14343'; }
                  else if (mime.includes('zip') || ext === 'zip' || ext === 'rar') { fileLabel = 'ZIP'; fileColor = '#2E6CA0'; }
                  else if (mime.includes('word') || ext === 'doc' || ext === 'docx') { fileLabel = 'DOC'; fileColor = '#2E6CA0'; }
                  else if (mime.includes('image') || ['jpg','jpeg','png','gif','webp'].includes(ext)) { fileLabel = 'IMG'; fileColor = '#2FB389'; }
                  else if (mime.includes('video') || ['mp4','mov','avi','mkv'].includes(ext)) { fileLabel = 'VID'; fileColor = '#7C5CBF'; }
                  const uploadDate = new Date(file.uploadedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
                  return (
                    <div key={i} className="flex items-center gap-4 px-6 py-[17px] border-b border-[#F2F4F7] last:border-b-0 hover:bg-[#FAFBFC] transition">
                      <div className="w-[44px] h-[44px] rounded-[12px] flex items-center justify-center flex-shrink-0 font-black text-[11px] text-white" style={{ background: fileColor }}>
                        {fileLabel}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[14.5px] text-[#15171C] truncate">{file.fileName}</div>
                        <div className="text-[12.5px] text-[#9AA0A8] font-semibold mt-0.5">{fileLabel} · {uploadDate}</div>
                      </div>
                      <a href={file.downloadLink || file.link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-[#15171C] text-white border-none font-bold text-[13px] px-4 py-2 rounded-[10px] cursor-pointer hover:bg-steel transition flex-shrink-0 no-underline">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" />
                        </svg>
                        Descargar
                      </a>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── MEJORAS ── */}
          {tab === 'mejoras' && (
            <div className="flex flex-col gap-[14px]">
              {tips.map((tip, i) => (
                <div key={i} className="bg-white border border-[#ECEEF2] rounded-[18px] px-6 py-6 flex gap-4">
                  <div className="w-[46px] h-[46px] rounded-[13px] bg-gradient-to-br from-[#2E6CA0] to-[#2FB389] flex items-center justify-center font-black text-sm text-white flex-shrink-0">
                    {tip.ini}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                      <div>
                        <span className="font-bold text-[14.5px] text-[#15171C]">{tip.author}</span>
                        <span className="text-[#9AA0A8] text-[13px] font-semibold"> · {tip.role}</span>
                      </div>
                      <span className="text-[11.5px] font-black px-3 py-1 rounded-full" style={{ background: tip.tbg, color: tip.tc }}>
                        {tip.tag}
                      </span>
                    </div>
                    <p className="text-[15px] leading-[1.6] text-[#3C434F] mb-2 m-0">{tip.text}</p>
                    <div className="text-[12px] text-[#AEB4BE] font-bold">{tip.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── MENSAJES ── */}
          {tab === 'mensajes' && (
            <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden flex flex-col max-w-[760px]" style={{ height: '620px' }}>
              <div className="flex items-center gap-3 px-6 py-[18px] border-b border-[#F0F2F5]">
                <div className="w-[42px] h-[42px] rounded-[12px] bg-gradient-to-br from-[#15171C] to-[#2E6CA0] flex items-center justify-center text-white font-bold flex-shrink-0">L</div>
                <div>
                  <div className="font-bold text-[15px] text-[#15171C]">Equipo Liderium</div>
                  <div className="text-[12.5px] text-mint font-bold flex items-center gap-[6px]">
                    <span className="w-[7px] h-[7px] rounded-full bg-mint animate-pulseDot" />
                    En línea
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4 bg-[#FAFBFC]">
                {messages.map((m, i) => {
                  const isClient = m.from === 'client';
                  return (
                    <div key={i} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="max-w-[78%] px-4 py-3"
                        style={{
                          background: isClient ? '#15171C' : '#fff',
                          color: isClient ? '#fff' : '#15171C',
                          borderRadius: isClient ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          border: isClient ? 'none' : '1px solid #ECEEF2',
                        }}
                      >
                        <div className="text-[11.5px] font-black mb-1 opacity-70">{m.name}</div>
                        <div className="text-[14.5px] leading-[1.5]">{m.text}</div>
                        <div className="text-[10.5px] font-bold mt-1 opacity-55 text-right">{m.time}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-[10px] px-6 py-4 border-t border-[#F0F2F5]">
                <input
                  type="text"
                  placeholder="Escribe un mensaje…"
                  className="flex-1 h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none bg-[#FAFBFC] text-[#15171C] focus:border-steel focus:bg-white transition"
                />
                <button className="w-[46px] h-[46px] bg-[#15171C] text-white border-none rounded-[12px] cursor-pointer flex items-center justify-center hover:bg-steel transition flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          {/* ── DEUDA ── */}
          {tab === 'deuda' && (
            <div className="flex flex-col gap-4 max-w-[820px]">
              {/* Estado principal */}
              <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-7 flex items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-[56px] h-[56px] rounded-[16px] bg-[#EAF7F1] flex items-center justify-center flex-shrink-0">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1F9B6E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-grotesk font-bold text-[22px] text-[#15171C] leading-tight">Estás al día</div>
                    <div className="text-[14px] text-[#8A929E] font-semibold mt-0.5">No tienes deuda pendiente con Liderium</div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[13px] text-[#8A929E] font-bold">Saldo pendiente</div>
                  <div className="font-grotesk font-bold text-[32px] tracking-[-0.02em] text-[#1F9B6E]">S/ 0</div>
                </div>
              </div>

              {/* Resumen del plan */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Plan activo', value: 'Crecimiento', sub: 'Activo desde ene 2026' },
                  { label: 'Monto mensual', value: 'S/ 2,400', sub: 'Pago el 1 de cada mes' },
                  { label: 'Próximo cobro', value: '01 jul 2026', sub: 'En 11 días' },
                ].map((c, i) => (
                  <div key={i} className="bg-white border border-[#ECEEF2] rounded-[18px] px-5 py-5">
                    <div className="text-[12.5px] text-[#8A929E] font-bold mb-1.5">{c.label}</div>
                    <div className="font-grotesk font-bold text-[19px] text-[#15171C] leading-tight">{c.value}</div>
                    <div className="text-[12px] text-[#AEB4BE] font-semibold mt-1">{c.sub}</div>
                  </div>
                ))}
              </div>

              {/* Historial de pagos */}
              <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden">
                <div className="px-6 py-5 border-b border-[#F0F2F5]">
                  <h3 className="font-grotesk font-semibold text-[18px] text-[#15171C]">Historial de pagos</h3>
                </div>
                {/* hidden file input */}
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />

                {[
                  { mes: 'Junio 2026', mesKey: 'junio-2026', fecha: '01 jun 2026', estado: 'Pagado', estadoC: '#1F9B6E', estadoBg: '#EAF7F1' },
                  { mes: 'Mayo 2026', mesKey: 'mayo-2026', fecha: '01 may 2026', estado: 'Pagado', estadoC: '#1F9B6E', estadoBg: '#EAF7F1' },
                  { mes: 'Abril 2026', mesKey: 'abril-2026', fecha: '01 abr 2026', estado: 'Pagado', estadoC: '#1F9B6E', estadoBg: '#EAF7F1' },
                  { mes: 'Marzo 2026', mesKey: 'marzo-2026', fecha: '01 mar 2026', estado: 'Pagado', estadoC: '#1F9B6E', estadoBg: '#EAF7F1' },
                  { mes: 'Febrero 2026', mesKey: 'febrero-2026', fecha: '01 feb 2026', estado: 'Pagado', estadoC: '#1F9B6E', estadoBg: '#EAF7F1' },
                  { mes: 'Enero 2026', mesKey: 'enero-2026', fecha: '01 ene 2026', estado: 'Pagado', estadoC: '#1F9B6E', estadoBg: '#EAF7F1' },
                ].map((row, i) => {
                  const key = `${clientSlugReal}-${row.mesKey}`;
                  const comp = comprobantes[key];
                  return (
                    <div key={i} className="flex items-center px-6 py-[15px] border-b border-[#F2F4F7] last:border-b-0 hover:bg-[#FAFBFC] transition">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-[38px] h-[38px] rounded-[11px] bg-[#F4F6F8] flex items-center justify-center flex-shrink-0">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A929E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-bold text-[14.5px] text-[#15171C]">{row.mes}</div>
                          <div className="text-[12.5px] text-[#9AA0A8] font-semibold">{row.fecha} · Plan Crecimiento</div>
                        </div>
                      </div>
                      <div className="font-grotesk font-bold text-[16px] text-[#15171C] mr-5">{clientAmount || '—'}</div>

                      {/* Comprobante */}
                      {comp ? (
                        <a
                          href={comp.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-[6px] text-[12px] font-black text-[#1F9B6E] bg-[#EAF7F1] border border-[#C0EAD8] px-3 py-1.5 rounded-full mr-3 cursor-pointer hover:bg-[#D4F4E8] transition flex-shrink-0 no-underline"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          Ver en Drive
                        </a>
                      ) : uploading === row.mesKey ? (
                        <span className="flex items-center gap-[6px] text-[12px] font-bold text-[#2E6CA0] bg-[#EAF1F8] px-3 py-1.5 rounded-full mr-3 flex-shrink-0">
                          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12a9 9 0 1 1-6.2-8.6" />
                          </svg>
                          Subiendo…
                        </span>
                      ) : (
                        <button
                          onClick={() => triggerUpload(row.mesKey)}
                          className="flex items-center gap-[6px] text-[12px] font-bold text-[#5A6270] bg-[#F4F6F8] border border-[#E2E5EA] px-3 py-1.5 rounded-full mr-3 cursor-pointer hover:border-steel hover:text-steel transition flex-shrink-0"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 15V3" /><path d="M7 8l5-5 5 5" /><path d="M5 21h14" />
                          </svg>
                          Subir comprobante
                        </button>
                      )}

                      <span className="text-[12px] font-black px-3 py-1 rounded-full flex-shrink-0" style={{ background: row.estadoBg, color: row.estadoC }}>
                        {row.estado}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Nota de contacto */}
              <div className="flex items-start gap-4 bg-[#F6F8FA] border border-[#ECEEF2] rounded-[16px] px-5 py-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A929E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
                <p className="text-[13.5px] text-[#6A7280] font-semibold leading-[1.6] m-0">
                  Si tienes alguna pregunta sobre tu facturación o necesitas un comprobante, escríbenos al{' '}
                  <a href="https://wa.me/51991403038" target="_blank" rel="noopener noreferrer" className="text-steel font-bold no-underline hover:underline">
                    WhatsApp de soporte
                  </a>{' '}
                  o por el chat de Mensajes.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
