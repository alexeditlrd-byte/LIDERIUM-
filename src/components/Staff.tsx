'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import type { Lead } from '@/lib/leads-sheet';
import PanelComercial from '@/components/PanelComercial';
import PanelFinanzas from '@/components/PanelFinanzas';
import PanelInstagram from '@/components/PanelInstagram';
import PanelWhatsApp from '@/components/PanelWhatsApp';
import PanelLeadsPrioritarios from '@/components/PanelLeadsPrioritarios';
import PanelMetricas from '@/components/PanelMetricas';
import PanelTareas from '@/components/PanelTareas';
import Dropdown from '@/components/Dropdown';

interface StaffProps {
  onLogout: () => void;
}

type StaffTab = 'comercial' | 'guia' | 'clientes' | 'finanzas' | 'pagos' | 'calendario' | 'instagram' | 'whatsapp' | 'sat' | 'metricas' | 'tareas';

const ICONS: Record<string, React.ReactNode> = {
  comercial: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /><path d="M16 7h3v3" />
    </svg>
  ),
  guia: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
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
  instagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><path d="M17.5 6.5h.01" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14L21 3" />
    </svg>
  ),
  sat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" />
    </svg>
  ),
  metricas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M3 3v18h18" /><rect x="7" y="13" width="3" height="5" /><rect x="12" y="9" width="3" height="9" /><rect x="17" y="6" width="3" height="12" />
    </svg>
  ),
  tareas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><path d="M5.5 6.5l1 1 2-2" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M5.5 17.5l1 1 2-2" /><path d="M14 6.5h7M14 17.5h7" />
    </svg>
  ),
};

const allNavItems: { id: StaffTab; label: string; founderOnly?: boolean }[] = [
  { id: 'comercial', label: 'Comercial' },
  { id: 'tareas', label: 'Tareas' },
  { id: 'sat', label: 'SAT · Leads prioritarios' },
  { id: 'metricas', label: 'Métricas' },
  { id: 'guia', label: 'Guía' },
  { id: 'finanzas', label: 'Finanzas', founderOnly: true },
  { id: 'calendario', label: 'Calendario' },
  { id: 'instagram', label: 'Instagram de Santiago' },
  // WhatsApp: oculto del menú por decisión del equipo (volvieron a la app
  // normal de WhatsApp Business en vez de la Cloud API) — el código y la
  // ruta siguen intactos por si en algún momento quieren retomarlo,
  // por ejemplo con "Coexistence" (app + API en el mismo número).
  // { id: 'whatsapp', label: 'WhatsApp' },
];

const titles: Record<StaffTab, string> = {
  comercial: 'Panel comercial',
  guia: 'Guía',
  clientes: 'Gestión de clientes',
  finanzas: 'Finanzas',
  pagos: 'Pagos de clientes',
  calendario: 'Calendario de reuniones',
  instagram: 'Instagram de Santiago',
  whatsapp: 'WhatsApp',
  sat: 'SAT — Agente de priorización de leads',
  metricas: 'Métricas — comercial y canal',
  tareas: 'Tareas',
};

const RESPONSABLE_EMAIL: Record<string, string> = {
  Winona: 'winonadavila@gmail.com',
  Maryori: 'maryori.drgj@gmail.com',
  Santiago: 'santialonsonorpe@gmail.com',
};

// Personas con disponibilidad/agenda propia para reuniones. "Responsable"
// y "Propietario" (Terry/Santiago) son campos separados en el formulario,
// cada uno con su propia grilla de horarios y su propia validación de
// choques — ambos reutilizan el mismo motor de disponibilidad.
const RESPONSABLES_DISPONIBILIDAD = ['Winona', 'Maryori', 'Santiago'];
const PROPIETARIOS_DISPONIBILIDAD = ['Terry', 'Santiago'];
// Todas las personas que pueden configurar sus propias horas libres.
const TODAS_DISPONIBILIDAD = ['Terry', 'Santiago', 'Winona', 'Maryori'];
const DIAS_SEMANA = [
  { valor: 1, label: 'Lun' }, { valor: 2, label: 'Mar' }, { valor: 3, label: 'Mié' },
  { valor: 4, label: 'Jue' }, { valor: 5, label: 'Vie' }, { valor: 6, label: 'Sáb' }, { valor: 0, label: 'Dom' },
];
// Franja horaria que se puede marcar como libre, 07:00–21:00 cada 30 min.
const HORAS_EDITABLES = Array.from({ length: 28 }, (_, i) => {
  const t = 7 * 60 + i * 30;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
});

const meetings = [
  { day: 'Hoy · Mar 17', time: '10:00', client: 'Aurora Café', type: 'Revisión de contenido', who: 'Mateo', c: '#2E6CA0' },
  { day: 'Hoy · Mar 17', time: '15:30', client: 'Studio Norte', type: 'Estrategia mensual', who: 'Lucía', c: '#2FB389' },
  { day: 'Mañana · Mié 18', time: '09:00', client: 'Fit Lima', type: 'Onboarding', who: 'Diego', c: '#15171C' },
  { day: 'Jue 19', time: '17:00', client: 'Aurora Café', type: 'Reunión de estrategia', who: 'Mateo', c: '#2E6CA0' },
  { day: 'Vie 20', time: '11:00', client: 'Verde Market', type: 'Kickoff de campaña', who: 'Lucía', c: '#C9821F' },
];

function statusPill(status: string) {
  if (status === 'Al día') return { bg: '#EAF7F1', color: '#1F9B6E' };
  if (status === 'Pendiente') return { bg: '#FBF1E2', color: '#B5740F' };
  return { bg: '#FCEDED', color: '#D14343' };
}

function dayLabelOf(d: Date) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
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
  const [tab, setTab] = useState<StaffTab>('comercial');
  const [staffName, setStaffName] = useState('Equipo · Liderium');
  const [staffInitials, setStaffInitials] = useState('LI');
  const [dbClients, setDbClients] = useState<any[]>([]);

  const [isFounder, setIsFounder] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Equipo';
      setStaffName(`${name} · Liderium`);
      setStaffInitials(name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase());
      setIsFounder(user.user_metadata?.founder === true);
      setAvatarUrl(user.user_metadata?.avatar_url ?? '');
    });
  }, []);

  const handleAvatarSelect = async (file: File | null) => {
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const urlRes = await fetch('/api/mi-perfil/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error ?? 'No se pudo preparar la subida');

      const { error: uploadError } = await supabase.storage.from('perfiles').uploadToSignedUrl(urlData.filePath, urlData.token, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: urlData.publicUrl } });
      if (updateError) throw updateError;

      setAvatarUrl(urlData.publicUrl);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo subir la foto', false);
    }
    setUploadingAvatar(false);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };
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

  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  const [reunionForm, setReunionForm] = useState({ clientSlug: '', clientName: '', clientEmail: '', title: '', mentor: '', mentorRole: '', mentorEmail: '', propietario: '', fecha: '', hora: '', duracion: 45 });
  const [creatingReunion, setCreatingReunion] = useState(false);
  const [reunionCreated, setReunionCreated] = useState<{ meetLink: string } | null>(null);
  const [reunionErr, setReunionErr] = useState('');

  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[] | null>(null);
  useEffect(() => {
    const { mentor, fecha, duracion } = reunionForm;
    Promise.resolve().then(() => {
      if (!mentor || !fecha || !RESPONSABLES_DISPONIBILIDAD.includes(mentor)) { setAvailableSlots(null); return; }
      return fetch(`/api/disponibilidad?propietario=${encodeURIComponent(mentor)}&fecha=${fecha}&duracion=${duracion}`)
        .then(r => r.json())
        .then(d => setAvailableSlots(d.slots ?? []));
    }).catch(() => setAvailableSlots([]));
  }, [reunionForm.mentor, reunionForm.fecha, reunionForm.duracion]); // eslint-disable-line react-hooks/exhaustive-deps

  const [availablePropietarioSlots, setAvailablePropietarioSlots] = useState<{ time: string; available: boolean }[] | null>(null);
  useEffect(() => {
    const { propietario, fecha, duracion } = reunionForm;
    Promise.resolve().then(() => {
      if (!propietario || !fecha || !PROPIETARIOS_DISPONIBILIDAD.includes(propietario)) { setAvailablePropietarioSlots(null); return; }
      return fetch(`/api/disponibilidad?propietario=${encodeURIComponent(propietario)}&fecha=${fecha}&duracion=${duracion}`)
        .then(r => r.json())
        .then(d => setAvailablePropietarioSlots(d.slots ?? []));
    }).catch(() => setAvailablePropietarioSlots([]));
  }, [reunionForm.propietario, reunionForm.fecha, reunionForm.duracion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Editor de "mis horas libres": cada persona marca a mano qué medias
  // horas tiene disponibles por día, en vez de un solo bloque 9–18 fijo.
  const [showDispModal, setShowDispModal] = useState(false);
  const [dispPersona, setDispPersona] = useState('');
  const [dispDia, setDispDia] = useState(new Date().getDay());
  const [dispSemana, setDispSemana] = useState<Record<number, string[]> | null>(null);
  const [dispLoading, setDispLoading] = useState(false);
  const [dispSaving, setDispSaving] = useState(false);

  const openDispModal = () => {
    setDispPersona('');
    setDispSemana(null);
    setShowDispModal(true);
  };

  const loadDispPersona = (persona: string) => {
    setDispPersona(persona);
    setDispSemana(null);
    if (!persona) return;
    setDispLoading(true);
    fetch(`/api/disponibilidad?propietario=${encodeURIComponent(persona)}`)
      .then(r => r.json())
      .then(d => {
        const horario = d.horario ?? { horaInicio: '09:00', horaFin: '18:00', dias: [1, 2, 3, 4, 5], slots: null };
        if (horario.slots) { setDispSemana(horario.slots); return; }
        // Todavía no lo configuró: precarga el bloque por defecto para que
        // solo tenga que destildar lo que no le sirva.
        const inicio = horario.horaInicio, fin = horario.horaFin;
        const inicioMin = Number(inicio.slice(0, 2)) * 60 + Number(inicio.slice(3, 5));
        const finMin = Number(fin.slice(0, 2)) * 60 + Number(fin.slice(3, 5));
        const preset: Record<number, string[]> = {};
        for (const dia of [0, 1, 2, 3, 4, 5, 6]) {
          preset[dia] = horario.dias.includes(dia)
            ? HORAS_EDITABLES.filter(h => { const mins = Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5)); return mins >= inicioMin && mins < finMin; })
            : [];
        }
        setDispSemana(preset);
      })
      .catch(() => showToast('No se pudo cargar la disponibilidad', false))
      .finally(() => setDispLoading(false));
  };

  const toggleDispHora = (hora: string) => {
    setDispSemana(prev => {
      const actual = prev ?? {};
      const dia = actual[dispDia] ?? [];
      const nuevoDia = dia.includes(hora) ? dia.filter(h => h !== hora) : [...dia, hora].sort();
      return { ...actual, [dispDia]: nuevoDia };
    });
  };

  const marcarDispDia = (todas: boolean) => {
    setDispSemana(prev => ({ ...(prev ?? {}), [dispDia]: todas ? [...HORAS_EDITABLES] : [] }));
  };

  const saveDisponibilidad = async () => {
    if (!dispPersona || !dispSemana) return;
    setDispSaving(true);
    try {
      const res = await fetch('/api/disponibilidad', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propietario: dispPersona, slots: dispSemana }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Disponibilidad de ${dispPersona} actualizada`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo guardar', false);
    }
    setDispSaving(false);
  };

  useEffect(() => {
    fetch('/api/clientes').then(r => r.json()).then(d => setDbClients(d.clients ?? [])).catch(() => {});
  }, []);

  const loadReuniones = () => {
    fetch('/api/reuniones').then(r => r.json()).then(d => setReuniones(d.meetings ?? [])).catch(() => {});
  };

  const [reschedule, setReschedule] = useState<{ id: string; fecha: string; hora: string } | null>(null);
  const [reschedulingBusy, setReschedulingBusy] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const [reunionDay, setReunionDay] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const shiftReunionDay = (delta: number) => setReunionDay(d => { const nd = new Date(d); nd.setDate(nd.getDate() + delta); return nd; });
  const goToToday = () => setReunionDay(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [ownerFilter, setOwnerFilter] = useState('Todos');
  const ownerOfMeeting = (m: any) => m.propietario || comercialLeads.find(l => l.id === m.client_slug)?.propietario || '';

  const openReschedule = (m: any) => {
    const d = new Date(m.scheduled_at);
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    setReschedule({ id: m.id, fecha, hora });
  };

  const submitReschedule = async () => {
    if (!reschedule) return;
    setReschedulingBusy(true);
    const scheduledAt = new Date(`${reschedule.fecha}T${reschedule.hora}:00`).toISOString();
    const res = await fetch('/api/reuniones', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reschedule.id, scheduledAt }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Reunión reprogramada');
      setReschedule(null);
      loadReuniones();
    } else {
      showToast(data.error ?? 'Error al reprogramar', false);
    }
    setReschedulingBusy(false);
  };

  const handleDeleteMeeting = async (m: any) => {
    if (!confirm(`¿Cancelar la reunión "${m.title}"? Se notificará al invitado.`)) return;
    setCancelingId(m.id);
    const res = await fetch(`/api/reuniones?id=${m.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showToast('Reunión cancelada');
      loadReuniones();
    } else {
      showToast(data.error ?? 'Error al cancelar', false);
    }
    setCancelingId(null);
  };

  const [comercialLeads, setComercialLeads] = useState<Lead[]>([]);
  const loadComercialLeads = () => {
    fetch('/api/leads').then(r => r.json()).then(d => setComercialLeads(d.leads ?? [])).catch(() => {});
  };

  useEffect(() => {
    if (tab === 'calendario') { loadReuniones(); loadComercialLeads(); }
  }, [tab]);

  const [guias, setGuias] = useState<any[]>([]);
  const [guiaFolders, setGuiaFolders] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<{ id: string; name: string } | null>(null);

  const loadGuias = () => {
    fetch('/api/guias').then(r => r.json()).then(d => { setGuias(d.guias ?? []); setGuiaFolders(d.folders ?? []); }).catch(() => {});
  };
  useEffect(() => {
    if (tab === 'guia') { loadGuias(); setCurrentFolder(null); }
  }, [tab]);

  const [showGuiaModal, setShowGuiaModal] = useState(false);
  const [guiaLabel, setGuiaLabel] = useState('');
  const [guiaFile, setGuiaFile] = useState<File | null>(null);
  const [uploadingGuia, setUploadingGuia] = useState(false);
  const guiaInputRef = useRef<HTMLInputElement>(null);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const openGuiaModal = () => {
    setGuiaLabel('');
    setGuiaFile(null);
    setShowGuiaModal(true);
  };

  const handleUploadGuia = async () => {
    if (!guiaFile) return;
    setUploadingGuia(true);
    try {
      // 1) Pide una URL firmada y sube el archivo directo a Storage desde
      // el navegador — así documentos grandes no pasan por nuestro
      // servidor (que tiene un límite de 4.5MB por request).
      const urlRes = await fetch('/api/guia-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: guiaFile.name }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error ?? 'No se pudo preparar la subida');

      const { error: uploadError } = await supabase.storage
        .from('guias')
        .uploadToSignedUrl(urlData.filePath, urlData.token, guiaFile, { contentType: guiaFile.type });
      if (uploadError) throw uploadError;

      // 2) Guarda el registro del documento ya subido.
      const res = await fetch('/api/guias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: guiaLabel || guiaFile.name,
          fileName: guiaFile.name,
          filePath: urlData.filePath,
          publicUrl: urlData.publicUrl,
          mimeType: guiaFile.type,
          uploadedBy: staffName,
          folderId: currentFolder?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Error al guardar el documento');

      showToast('Documento subido a la guía');
      setShowGuiaModal(false);
      loadGuias();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error de conexión al subir el documento', false);
    }
    setUploadingGuia(false);
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await fetch('/api/guia-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Carpeta creada');
        setShowFolderModal(false);
        setFolderName('');
        loadGuias();
      } else {
        showToast(data.error ?? 'Error al crear la carpeta', false);
      }
    } catch {
      showToast('Error de conexión al crear la carpeta', false);
    }
    setCreatingFolder(false);
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm('¿Eliminar esta carpeta y todos sus documentos?')) return;
    const res = await fetch(`/api/guia-folders?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showToast('Carpeta eliminada');
      if (currentFolder?.id === id) setCurrentFolder(null);
      loadGuias();
    } else {
      showToast(data.error ?? 'Error al eliminar la carpeta', false);
    }
  };

  const handleDeleteGuia = async (id: string) => {
    if (!confirm('¿Eliminar este documento de la guía?')) return;
    const res = await fetch(`/api/guias?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showToast('Documento eliminado');
      loadGuias();
    } else {
      showToast(data.error ?? 'Error al eliminar', false);
    }
  };

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
    setReunionForm({ clientSlug: '', clientName: '', clientEmail: '', title: '', mentor: '', mentorRole: '', mentorEmail: '', propietario: '', fecha: '', hora: '', duracion: 45 });
    setReunionCreated(null);
    setReunionErr('');
    setShowReunionModal(true);
  };

  const handleCrearReunion = async () => {
    const { clientSlug, title, mentor, mentorEmail, fecha, hora } = reunionForm;
    if (!clientSlug || !title || !mentor || !mentorEmail || !fecha || !hora) { setReunionErr('Completa todos los campos.'); return; }
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
  return (
    <div className="relative min-h-screen bg-[#F5F6F8] md:grid md:h-screen md:overflow-hidden" style={{ gridTemplateColumns: '256px 1fr' }}>

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
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-[9997] md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 w-[256px] z-[9998] bg-[#15171C] text-white flex flex-col px-4 py-[22px] transition-transform duration-300 md:relative md:translate-x-0 md:z-20 md:sticky md:top-0 md:h-screen ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-2.5 pb-2 mb-2">
          <Image src="/assets/liderium-white.png" alt="Liderium" width={400} height={100} className="h-[26px] w-auto" />
        </div>
        <div className="px-2.5 pb-[18px]">
          <span className="text-[11px] font-black tracking-[0.1em] uppercase text-mint">Panel interno</span>
        </div>

        <nav className="flex flex-col gap-[2px] flex-1">
          {allNavItems.filter(item => !item.founderOnly || isFounder).map((item) => (
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
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleAvatarSelect(e.target.files?.[0] ?? null)} />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              title="Cambiar foto de perfil"
              className="relative w-[38px] h-[38px] rounded-[11px] bg-gradient-to-br from-[#15171C] to-[#2E6CA0] border border-[#333944] flex items-center justify-center font-black text-sm text-white flex-shrink-0 cursor-pointer p-0 overflow-hidden group disabled:opacity-70"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                staffInitials
              )}
              <span className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                {uploadingAvatar ? (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                )}
              </span>
            </button>
            <div className="text-[13.5px] leading-tight">
              <div className="font-bold">{staffName}</div>
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
      <div className="relative z-10 flex flex-col min-w-0 md:min-h-0">
        {/* Header */}
        <header className="bg-[rgba(238,240,244,.82)] backdrop-blur-[12px] border-b border-[rgba(0,0,0,.06)] px-4 md:px-[38px] py-4 md:py-5 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden w-9 h-9 flex items-center justify-center rounded-[10px] bg-white border border-[#E2E5EA] text-[#3C434F]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
            <div>
              <div className="text-[12.5px] font-bold text-[#8A929E] tracking-[0.04em] hidden md:block">Equipo Liderium</div>
              <h1 className="font-grotesk font-bold text-[18px] md:text-[25px] tracking-[-0.02em] text-[#15171C]">{titles[tab]}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex items-center gap-2 bg-white border border-[#E2E5EA] text-[#3C434F] font-bold text-[13px] px-[14px] py-2.5 rounded-[11px]">
              <span className="w-2 h-2 rounded-full bg-mint animate-pulseDot" />
              Google Calendar conectado
            </div>
            <div className="w-[38px] h-[38px] md:w-[42px] md:h-[42px] rounded-[12px] bg-gradient-to-br from-[#15171C] to-[#2E6CA0] flex items-center justify-center font-bold text-sm text-white">ML</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 md:px-[38px] py-5 md:py-[34px] overflow-auto">

          {/* ── COMERCIAL ── */}
          {tab === 'comercial' && <PanelComercial showToast={showToast} />}

          {/* ── SAT ── */}
          {tab === 'sat' && <PanelLeadsPrioritarios showToast={showToast} />}

          {/* ── TAREAS ── */}
          {tab === 'tareas' && <PanelTareas showToast={showToast} />}

          {/* ── MÉTRICAS ── */}
          {tab === 'metricas' && <PanelMetricas />}

          {/* ── INSTAGRAM ── */}
          {tab === 'instagram' && <PanelInstagram showToast={showToast} />}

          {/* ── WHATSAPP ── */}
          {tab === 'whatsapp' && <PanelWhatsApp showToast={showToast} />}

          {/* ── GUÍA ── */}
          {tab === 'guia' && (
            <div>
              {/* Modal subir documento */}
              {showGuiaModal && (
                <div className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,.55)] flex items-center justify-center p-6" onClick={() => { if (!uploadingGuia) setShowGuiaModal(false); }}>
                  <div className="bg-white rounded-[22px] w-full max-w-[440px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-7 py-5 border-b border-[#F0F2F5]">
                      <div>
                        <div className="font-grotesk font-bold text-[19px] text-[#15171C]">Subir documento</div>
                        <div className="text-[13px] text-[#8A929E] font-semibold mt-0.5">Visible para todo el equipo</div>
                      </div>
                      <button onClick={() => setShowGuiaModal(false)} className="w-9 h-9 rounded-[10px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="px-7 py-6 flex flex-col gap-4">
                      <div>
                        <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Nombre / etiqueta del documento</label>
                        <input type="text" placeholder="Ej: Guía de onboarding de clientes" value={guiaLabel} onChange={e => setGuiaLabel(e.target.value)}
                          className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Archivo</label>
                        <input ref={guiaInputRef} type="file" className="hidden" onChange={e => setGuiaFile(e.target.files?.[0] ?? null)} />
                        {guiaFile ? (
                          <div className="flex items-center gap-3 bg-[#F6F8FA] border border-[#E7E9EE] rounded-[12px] px-4 py-3">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E6CA0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                            <span className="flex-1 text-[13.5px] font-semibold text-[#15171C] truncate">{guiaFile.name}</span>
                            <button onClick={() => setGuiaFile(null)} className="text-[#C2C8D2] hover:text-[#D14343] border-none bg-transparent cursor-pointer text-[11px] font-bold">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => guiaInputRef.current?.click()}
                            className="w-full h-[80px] border-2 border-dashed border-[#D0D5DD] rounded-[12px] flex flex-col items-center justify-center gap-1 cursor-pointer bg-[#FAFBFC] hover:border-steel hover:bg-white transition">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A929E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3" /><path d="M7 8l5-5 5 5" /><path d="M5 21h14" /></svg>
                            <span className="text-[13px] font-semibold text-[#8A929E]">Seleccionar archivo</span>
                          </button>
                        )}
                      </div>
                      <button onClick={handleUploadGuia} disabled={!guiaFile || uploadingGuia}
                        className="w-full h-12 bg-[#15171C] text-white border-none rounded-[12px] font-bold text-[15px] cursor-pointer hover:bg-steel transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {uploadingGuia ? (
                          <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>Subiendo…</>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3" /><path d="M7 8l5-5 5 5" /><path d="M5 21h14" /></svg>
                            Subir documento
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal nueva carpeta */}
              {showFolderModal && (
                <div className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,.55)] flex items-center justify-center p-6" onClick={() => { if (!creatingFolder) setShowFolderModal(false); }}>
                  <div className="bg-white rounded-[22px] w-full max-w-[400px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-7 py-5 border-b border-[#F0F2F5]">
                      <div className="font-grotesk font-bold text-[19px] text-[#15171C]">Nueva carpeta</div>
                      <button onClick={() => setShowFolderModal(false)} className="w-9 h-9 rounded-[10px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="px-7 py-6 flex flex-col gap-4">
                      <div>
                        <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Nombre de la carpeta</label>
                        <input type="text" placeholder="Ej: SOPs de contenido" value={folderName} onChange={e => setFolderName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); }}
                          className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" autoFocus />
                      </div>
                      <button onClick={handleCreateFolder} disabled={!folderName.trim() || creatingFolder}
                        className="w-full h-12 bg-[#15171C] text-white border-none rounded-[12px] font-bold text-[15px] cursor-pointer hover:bg-steel transition disabled:opacity-50 disabled:cursor-not-allowed">
                        {creatingFolder ? 'Creando…' : 'Crear carpeta'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-5">
                <div>
                  {currentFolder ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCurrentFolder(null)} className="text-[13px] font-bold text-[#2E6CA0] bg-transparent border-none cursor-pointer hover:underline p-0">Guía</button>
                      <span className="text-[13px] text-[#C2C8D2]">/</span>
                      <span className="text-[13px] font-bold text-[#15171C]">{currentFolder.name}</span>
                    </div>
                  ) : (
                    <p className="text-[14px] text-[#8A929E] font-semibold">{guiaFolders.length} carpeta{guiaFolders.length !== 1 ? 's' : ''} · {guias.length} documento{guias.length !== 1 ? 's' : ''}</p>
                  )}
                </div>
                {isFounder && (
                  <div className="flex gap-2">
                    {!currentFolder && (
                      <button onClick={() => { setFolderName(''); setShowFolderModal(true); }} className="flex items-center gap-2 bg-white text-[#15171C] border border-[#E2E5EA] font-bold text-[14px] px-5 py-[11px] rounded-[12px] cursor-pointer hover:border-steel transition">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /><path d="M12 11v4M10 13h4" /></svg>
                        Nueva carpeta
                      </button>
                    )}
                    <button onClick={openGuiaModal} className="flex items-center gap-2 bg-[#15171C] text-white border-none font-bold text-[14px] px-5 py-[11px] rounded-[12px] cursor-pointer hover:bg-steel transition">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                      Subir documento
                    </button>
                  </div>
                )}
              </div>

              {(() => {
                const visibleGuias = guias.filter((g: any) => (currentFolder ? g.folderId === currentFolder.id : !g.folderId));
                const showEmpty = visibleGuias.length === 0 && (currentFolder || guiaFolders.length === 0);
                return showEmpty ? (
                  <div className="bg-white border border-[#ECEEF2] rounded-[20px] px-8 py-16 flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-[16px] bg-[#F4F6F8] flex items-center justify-center mb-4">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#AEB4BE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </div>
                    <div className="font-grotesk font-bold text-[18px] text-[#15171C] mb-1">Sin documentos aún</div>
                    <div className="text-[14px] text-[#8A929E] font-semibold">{isFounder ? 'Sube el primer documento de esta sección.' : 'Todavía no hay documentos publicados.'}</div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {!currentFolder && guiaFolders.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {guiaFolders.map((f: any) => (
                          <div key={f.id} onClick={() => setCurrentFolder({ id: f.id, name: f.name })}
                            className="flex items-center gap-3 bg-white border border-[#ECEEF2] rounded-[16px] px-5 py-4 cursor-pointer hover:border-steel transition">
                            <div className="w-10 h-10 rounded-[11px] bg-[#FBF1E2] flex items-center justify-center flex-shrink-0">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B5740F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-[14px] text-[#15171C] truncate">{f.name}</div>
                              <div className="text-[12px] text-[#8A929E] font-semibold">{guias.filter((g: any) => g.folderId === f.id).length} documento{guias.filter((g: any) => g.folderId === f.id).length !== 1 ? 's' : ''}</div>
                            </div>
                            {isFounder && (
                              <button onClick={e => { e.stopPropagation(); handleDeleteFolder(f.id); }} title="Eliminar carpeta"
                                className="w-8 h-8 flex items-center justify-center rounded-[9px] bg-[#F4F6F8] border border-[#E2E5EA] text-[#5A6270] cursor-pointer hover:border-[#D14343] hover:text-[#D14343] transition flex-shrink-0">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {visibleGuias.length > 0 && (
                      <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden">
                        {visibleGuias.map((g: any, i: number) => (
                          <div key={g.id ?? i} className="flex items-center gap-4 px-6 py-4 border-b border-[#F2F4F7] last:border-b-0 hover:bg-[#FAFBFC] transition">
                            <div className="w-10 h-10 rounded-[11px] bg-[#EAF1F8] flex items-center justify-center flex-shrink-0">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E6CA0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-[14.5px] text-[#15171C] truncate">{g.label}</div>
                              <div className="text-[12.5px] text-[#8A929E] font-semibold truncate">{g.fileName}{g.uploadedBy ? ` · Subido por ${g.uploadedBy}` : ''}</div>
                            </div>
                            <a href={g.link} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-black text-[#2E6CA0] bg-[#EAF1F8] px-3 py-[7px] rounded-full no-underline hover:bg-[#DCE9F5] transition flex-shrink-0">Ver</a>
                            {isFounder && (
                              <button onClick={() => handleDeleteGuia(g.id)} title="Eliminar"
                                className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-[#F4F6F8] border border-[#E2E5EA] text-[#5A6270] cursor-pointer hover:border-[#D14343] hover:text-[#D14343] transition flex-shrink-0">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

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
                          <Dropdown value={form.plan} onChange={v => setForm(f => ({ ...f, plan: v }))} options={['Esencial', 'Crecimiento', 'Pro']}
                            className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition bg-white" />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          {tab === 'finanzas' && <PanelFinanzas showToast={showToast} />}

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
                <div className="overflow-x-auto">
                <div className="grid px-6 py-[14px] bg-[#FAFBFC] border-b border-[#F0F2F5] text-[11.5px] font-black uppercase tracking-[0.04em] text-[#9AA0A8]"
                  style={{ gridTemplateColumns: '1.6fr 1fr 0.9fr 1fr 1fr 1fr', minWidth: '680px' }}>
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
                      style={{ gridTemplateColumns: '1.6fr 1fr 0.9fr 1fr 1fr 1fr', minWidth: '680px' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[10px] bg-[#F2F4F7] flex items-center justify-center font-black text-[12.5px] text-[#5A6270] flex-shrink-0">{ini}</div>
                        <span className="font-bold text-[14.5px] text-[#15171C]">{c.name}</span>
                      </div>
                      <span className="text-[14px] text-[#5A6270] font-semibold">{c.plan}</span>
                      <span className="font-black text-[14px] text-[#15171C]">{c.amount}</span>
                      <div className="relative w-max">
                        <Dropdown
                          value={c.status ?? 'Al día'}
                          onChange={async newStatus => {
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
                          options={['Al día', 'Pendiente', 'Vencido']}
                          style={{ background: pill.bg, color: pill.color, opacity: savingStatusSlug === c.slug ? 0.6 : 1 }}
                          className="text-[12px] font-black pl-3 pr-2 py-1 rounded-full border-none cursor-pointer outline-none"
                        />
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
                </div>{/* /overflow-x-auto */}
              </div>
            </div>
          )}

          {/* ── CALENDARIO ── */}
          {tab === 'calendario' && (
            <div>
              {/* Modal configurar disponibilidad */}
              {showDispModal && (
                <div className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,.55)] flex items-center justify-center p-6" onClick={() => setShowDispModal(false)}>
                  <div className="bg-white rounded-[22px] w-full max-w-[560px] shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-7 py-5 border-b border-[#F0F2F5] rounded-t-[22px]">
                      <div>
                        <div className="font-grotesk font-bold text-[19px] text-[#15171C]">Configurar disponibilidad</div>
                        <div className="text-[13px] text-[#8A929E] font-semibold mt-0.5">Marca a mano las horas libres — solo esas van a aparecer al agendar</div>
                      </div>
                      <button onClick={() => setShowDispModal(false)} className="w-9 h-9 rounded-[10px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="px-7 py-6 flex flex-col gap-4">
                      <div>
                        <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Persona</label>
                        <Dropdown value={dispPersona} onChange={loadDispPersona}
                          className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition bg-white"
                          listClassName="max-h-[220px]"
                          options={[{ value: '', label: 'Selecciona…' }, ...TODAS_DISPONIBILIDAD.map(p => ({ value: p, label: p }))]} />
                      </div>
                      {dispPersona && (
                        dispLoading || !dispSemana ? (
                          <div className="text-center py-6 text-[13px] text-[#8A929E] font-semibold">Cargando…</div>
                        ) : (
                          <>
                            <div className="flex gap-1.5 flex-wrap">
                              {DIAS_SEMANA.map(d => (
                                <button key={d.valor} type="button" onClick={() => setDispDia(d.valor)}
                                  className="px-3 py-2 rounded-[9px] text-[12.5px] font-bold border cursor-pointer transition"
                                  style={{
                                    background: dispDia === d.valor ? '#15171C' : '#F4F6F8',
                                    color: dispDia === d.valor ? '#fff' : '#5A6270',
                                    borderColor: dispDia === d.valor ? '#15171C' : '#E2E5EA',
                                  }}>
                                  {d.label}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-bold text-[#8A929E]">{(dispSemana[dispDia] ?? []).length} horas libres ese día</span>
                              <div className="flex gap-2">
                                <button onClick={() => marcarDispDia(true)} className="text-[11.5px] font-bold text-[#1F9B6E] bg-transparent border-none cursor-pointer hover:underline p-0">Marcar todo</button>
                                <button onClick={() => marcarDispDia(false)} className="text-[11.5px] font-bold text-[#D14343] bg-transparent border-none cursor-pointer hover:underline p-0">Vaciar día</button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-[220px] overflow-y-auto border-[1.5px] border-[#E2E5EA] rounded-[12px] p-3">
                              {HORAS_EDITABLES.map(hora => {
                                const libre = (dispSemana[dispDia] ?? []).includes(hora);
                                return (
                                  <button key={hora} type="button" onClick={() => toggleDispHora(hora)}
                                    className={`px-2.5 py-1.5 rounded-[7px] text-[12px] font-bold border cursor-pointer ${
                                      libre
                                        ? 'bg-[#EAF7F1] text-[#1F9B6E] border-[#CFEBDF] hover:border-[#1F9B6E]'
                                        : 'bg-[#F4F6F8] text-[#AEB4BE] border-[#E2E5EA] hover:border-[#C2C8D2]'
                                    }`}>
                                    {libre ? '🟢' : '⚪'} {hora}
                                  </button>
                                );
                              })}
                            </div>
                            <button onClick={saveDisponibilidad} disabled={dispSaving}
                              className="w-full h-11 bg-[#15171C] text-white border-none rounded-[12px] font-bold text-[14px] cursor-pointer hover:bg-steel transition disabled:opacity-60 disabled:cursor-not-allowed">
                              {dispSaving ? 'Guardando…' : `Guardar disponibilidad de ${dispPersona}`}
                            </button>
                          </>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                          <Dropdown value={reunionForm.clientSlug} onChange={slug => {
                            const lead = comercialLeads.find(l => l.id === slug);
                            setReunionForm(f => ({ ...f, clientSlug: slug, clientName: lead?.nombre ?? '', clientEmail: '', mentorRole: lead?.plan ?? '', propietario: lead?.propietario ?? f.propietario }));
                          }} className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition bg-white"
                            options={[{ value: '', label: 'Selecciona cliente…' }, ...comercialLeads.map(lead => ({ value: lead.id, label: lead.nombre }))]} />
                          {(() => {
                            const selectedLead = comercialLeads.find(l => l.id === reunionForm.clientSlug);
                            if (!selectedLead) return null;
                            return (
                              <div className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#2E6CA0] bg-[#EAF1F8] px-2.5 py-1 rounded-full">
                                Situación: {selectedLead.faseVenta} · {selectedLead.estado}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Responsable</label>
                            <Dropdown value={reunionForm.mentor} onChange={mentor => {
                              setReunionForm(f => ({ ...f, mentor, mentorEmail: RESPONSABLE_EMAIL[mentor] ?? f.mentorEmail }));
                            }}
                              className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition bg-white"
                              options={[{ value: '', label: 'Selecciona…' }, ...RESPONSABLES_DISPONIBILIDAD.map(r => ({ value: r, label: r }))]} />
                          </div>
                          <div>
                            <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Plan</label>
                            <div className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-bold text-[#15171C] bg-[#F4F6F8] flex items-center">
                              {reunionForm.mentorRole || '—'}
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Propietario</label>
                          <Dropdown value={reunionForm.propietario} onChange={propietario => setReunionForm(f => ({ ...f, propietario }))}
                            className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition bg-white"
                            options={[{ value: '', label: 'Selecciona…' }, ...PROPIETARIOS_DISPONIBILIDAD.map(p => ({ value: p, label: p }))]} />
                          {reunionForm.propietario && (
                            !availablePropietarioSlots ? null : availablePropietarioSlots.length === 0 ? (
                              <div className="mt-2 w-full px-3 py-2 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[12.5px] font-semibold text-[#9AA0A8]">Sin horario laboral ese día para {reunionForm.propietario}</div>
                            ) : (
                              <div className="mt-2 w-full max-h-[46px] hover:max-h-[180px] overflow-y-auto border-[1.5px] border-[#E2E5EA] rounded-[12px] px-2 py-2 flex flex-wrap gap-1.5 transition-all">
                                {availablePropietarioSlots.map(s => (
                                  <div key={s.time}
                                    className={`px-2 py-1 rounded-[7px] text-[12px] font-bold border ${
                                      s.available
                                        ? 'bg-[#EAF7F1] text-[#1F9B6E] border-[#CFEBDF]'
                                        : 'bg-[#F4F6F8] text-[#C2C8D2] border-[#E2E5EA] line-through'
                                    }`}>
                                    {s.available ? '🟢' : '🔴'} {s.time}
                                  </div>
                                ))}
                              </div>
                            )
                          )}
                        </div>
                        <div>
                          <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Gmail del responsable</label>
                          <input type="email" placeholder="mateo@liderium.com" value={reunionForm.mentorEmail} onChange={e => setReunionForm(f => ({ ...f, mentorEmail: e.target.value }))}
                            className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                          <p className="text-[12px] text-[#8A929E] font-semibold mt-1.5">Se le invita a este correo para que la reunión aparezca en su Google Calendar.</p>
                        </div>
                        <div>
                          <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Gmail del cliente</label>
                          <input type="email" placeholder="cliente@correo.com" value={reunionForm.clientEmail} onChange={e => setReunionForm(f => ({ ...f, clientEmail: e.target.value }))}
                            className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                          <p className="text-[12px] text-[#8A929E] font-semibold mt-1.5">Opcional — si lo agregas, también se le invita a la reunión de Google Calendar.</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Fecha</label>
                            <input type="date" value={reunionForm.fecha} onChange={e => setReunionForm(f => ({ ...f, fecha: e.target.value }))}
                              className="w-full h-[46px] px-3 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                          </div>
                          <div>
                            <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Hora</label>
                            {!availableSlots ? (
                              <input type="time" value={reunionForm.hora} onChange={e => setReunionForm(f => ({ ...f, hora: e.target.value }))}
                                className="w-full h-[46px] px-3 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                            ) : availableSlots.length === 0 ? (
                              <div className="w-full h-[46px] px-3 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[12.5px] font-semibold text-[#9AA0A8] flex items-center">Sin horario laboral ese día</div>
                            ) : (
                              <div className="w-full max-h-[46px] hover:max-h-[180px] overflow-y-auto border-[1.5px] border-[#E2E5EA] rounded-[12px] px-2 py-2 flex flex-wrap gap-1.5 transition-all">
                                {availableSlots.map(s => (
                                  <button key={s.time} type="button" disabled={!s.available}
                                    onClick={() => setReunionForm(f => ({ ...f, hora: s.time }))}
                                    className={`px-2 py-1 rounded-[7px] text-[12px] font-bold border ${
                                      reunionForm.hora === s.time
                                        ? 'bg-[#15171C] text-white border-[#15171C]'
                                        : s.available
                                          ? 'bg-[#EAF7F1] text-[#1F9B6E] border-[#CFEBDF] cursor-pointer hover:border-[#1F9B6E]'
                                          : 'bg-[#F4F6F8] text-[#C2C8D2] border-[#E2E5EA] cursor-not-allowed line-through'
                                    }`}>
                                    {s.available ? '🟢' : '🔴'} {s.time}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Duración</label>
                            <Dropdown value={String(reunionForm.duracion)} onChange={v => setReunionForm(f => ({ ...f, duracion: +v }))}
                              className="w-full h-[46px] px-3 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14px] font-medium outline-none text-[#15171C] focus:border-steel transition bg-white"
                              options={[{ value: '30', label: '30 min' }, { value: '45', label: '45 min' }, { value: '60', label: '1 hora' }, { value: '90', label: '1.5 horas' }]} />
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
                  <button onClick={openDispModal} className="flex items-center gap-2 bg-[#F4F6F8] text-[#15171C] border border-[#E2E5EA] font-bold text-[14px] px-5 py-[11px] rounded-[12px] cursor-pointer hover:bg-[#ECEEF2] transition flex-shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                    Configurar disponibilidad
                  </button>
                  <button onClick={openReunionModal} className="flex items-center gap-2 bg-[#15171C] text-white border-none font-bold text-[14px] px-5 py-[11px] rounded-[12px] cursor-pointer hover:bg-steel transition flex-shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                    Nueva reunión
                  </button>
                </div>
              </div>

              <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden px-2 py-3.5">
                <div className="px-4 pb-1.5 flex items-center justify-between gap-3">
                  <h3 className="font-grotesk font-semibold text-[18px] text-[#15171C]">Próximas reuniones</h3>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Dropdown value={ownerFilter} onChange={setOwnerFilter}
                      className="h-8 bg-[#F4F6F8] border border-[#E2E5EA] rounded-[8px] px-2.5 text-[12px] font-bold text-[#3C434F] cursor-pointer outline-none"
                      align="right"
                      options={[{ value: 'Todos', label: 'Propietario: Todos' }, { value: 'Terry', label: 'Terry' }, { value: 'Santiago', label: 'Santiago' }]} />
                    <button onClick={goToToday} className="text-[11.5px] font-bold text-steel bg-transparent border-none cursor-pointer hover:underline p-0">Hoy</button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 pb-2">
                  <button onClick={() => shiftReunionDay(-1)} title="Día anterior"
                    className="w-8 h-8 flex items-center justify-center rounded-[9px] bg-[#F4F6F8] border border-[#E2E5EA] text-[#5A6270] cursor-pointer hover:border-steel hover:text-steel transition flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                  </button>
                  <div className="text-[13px] font-black uppercase tracking-[0.04em] text-[#15171C] text-center">{dayLabelOf(reunionDay)}</div>
                  <button onClick={() => shiftReunionDay(1)} title="Día siguiente"
                    className="w-8 h-8 flex items-center justify-center rounded-[9px] bg-[#F4F6F8] border border-[#E2E5EA] text-[#5A6270] cursor-pointer hover:border-steel hover:text-steel transition flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                  </button>
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
                ) : (() => {
                  const colors = ['#2E6CA0','#2FB389','#15171C','#C9821F','#7C5CBF','#D14343'];
                  const periodOf = (hour: number) => (hour < 12 ? 'Mañana' : hour < 19 ? 'Tarde' : 'Noche');
                  const dayReuniones = reuniones
                    .filter((m: any) => ownerFilter === 'Todos' || ownerOfMeeting(m) === ownerFilter)
                    .filter((m: any) => new Date(m.scheduled_at).toDateString() === reunionDay.toDateString());

                  if (dayReuniones.length === 0) {
                    return (
                      <div className="flex flex-col items-center py-12 text-center px-8">
                        <div className="font-bold text-[14.5px] text-[#15171C] mb-1">Sin reuniones este día</div>
                        <div className="text-[13px] text-[#8A929E] font-semibold">Usa las flechas para ver otro día</div>
                      </div>
                    );
                  }

                  const periods: { label: string; items: any[] }[] = [];
                  dayReuniones.forEach((m: any) => {
                    const period = periodOf(new Date(m.scheduled_at).getHours());
                    let group = periods.find(p => p.label === period);
                    if (!group) { group = { label: period, items: [] }; periods.push(group); }
                    group.items.push(m);
                  });
                  const periodOrder = ['Mañana', 'Tarde', 'Noche'];
                  periods.sort((a, b) => periodOrder.indexOf(a.label) - periodOrder.indexOf(b.label));

                  let cardIndex = 0;
                  return periods.map(period => (
                    <div key={period.label}>
                      <div className="px-4 pt-1.5 pb-1 text-[10.5px] font-bold uppercase tracking-[0.04em] text-steel">{period.label}</div>
                      {period.items.map((m: any) => {
                        const fmt = formatMeetDate(m.scheduled_at);
                        const color = colors[cardIndex++ % colors.length];
                        return (
                          <div key={m.id} className="flex items-center gap-4 px-4 py-[14px] rounded-[14px] hover:bg-[#FAFBFC] transition">
                            <div className="w-1 h-[46px] rounded-full flex-shrink-0" style={{ background: color }} />
                            <div className="w-[70px] flex-shrink-0">
                              <div className="font-black text-[14px] text-[#15171C]">{fmt.time}</div>
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
                            <button onClick={() => openReschedule(m)} title="Reprogramar"
                              className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-[#F4F6F8] border border-[#E2E5EA] text-[#5A6270] cursor-pointer hover:border-steel hover:text-steel transition flex-shrink-0">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2.5" /><path d="M3 9h18M8 2v4M16 2v4" /><path d="M12 13v4M10 15h4" /></svg>
                            </button>
                            <button onClick={() => handleDeleteMeeting(m)} disabled={cancelingId === m.id} title="Cancelar reunión"
                              className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-[#F4F6F8] border border-[#E2E5EA] text-[#5A6270] cursor-pointer hover:border-[#D14343] hover:text-[#D14343] transition flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>

              {reschedule && (
              <div className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,.55)] flex items-center justify-center p-6" onClick={() => { if (!reschedulingBusy) setReschedule(null); }}>
                <div className="bg-white rounded-[22px] w-full max-w-[400px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-7 py-5 border-b border-[#F0F2F5]">
                    <div className="font-grotesk font-bold text-[19px] text-[#15171C]">Reprogramar reunión</div>
                    <button onClick={() => setReschedule(null)} className="w-9 h-9 rounded-[10px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="px-7 py-6 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Fecha</label>
                        <input type="date" value={reschedule.fecha} onChange={e => setReschedule(r => r && ({ ...r, fecha: e.target.value }))}
                          className="w-full h-[46px] px-3 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Hora</label>
                        <input type="time" value={reschedule.hora} onChange={e => setReschedule(r => r && ({ ...r, hora: e.target.value }))}
                          className="w-full h-[46px] px-3 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                      </div>
                    </div>
                    <button onClick={submitReschedule} disabled={reschedulingBusy}
                      className="w-full h-12 bg-[#15171C] text-white border-none rounded-[12px] font-bold text-[15px] cursor-pointer hover:bg-steel transition disabled:opacity-60 disabled:cursor-not-allowed">
                      {reschedulingBusy ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
