'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Dropdown from '@/components/Dropdown';
import ChatLeadCard from '@/components/ChatLeadCard';
import { useSatContext } from '@/lib/use-sat-context';
import { matchLeadByPhone } from '@/lib/lead-match';
import { computeLeadScore, esLeadCuestionario } from '@/lib/lead-scoring';

const VERTICALES = [
  { value: 'UNDEFINED', label: 'Sin definir' },
  { value: 'OTHER', label: 'Otro' },
  { value: 'AUTO', label: 'Automóviles' },
  { value: 'BEAUTY', label: 'Belleza, spa y salón' },
  { value: 'APPAREL', label: 'Ropa y accesorios' },
  { value: 'EDU', label: 'Educación' },
  { value: 'ENTERTAIN', label: 'Entretenimiento' },
  { value: 'EVENT_PLAN', label: 'Organización de eventos' },
  { value: 'FINANCE', label: 'Finanzas y banca' },
  { value: 'GROCERY', label: 'Abarrotes' },
  { value: 'GOVT', label: 'Gobierno' },
  { value: 'HOTEL', label: 'Hotel y alojamiento' },
  { value: 'HEALTH', label: 'Salud' },
  { value: 'NONPROFIT', label: 'Sin fines de lucro' },
  { value: 'PROF_SERVICES', label: 'Servicios profesionales' },
  { value: 'RETAIL', label: 'Comercio minorista' },
  { value: 'TRAVEL', label: 'Viajes y transporte' },
  { value: 'RESTAURANT', label: 'Restaurante' },
];

// Códigos de país para el número de WhatsApp del modal "Nuevo chat" —
// Perú primero (por defecto) y luego el resto de países donde el equipo
// suele tener contactos.
const COUNTRY_CODES = [
  { id: 'PE', code: '51', flag: '🇵🇪', name: 'Perú' },
  { id: 'US', code: '1', flag: '🇺🇸', name: 'Estados Unidos' },
  { id: 'MX', code: '52', flag: '🇲🇽', name: 'México' },
  { id: 'CO', code: '57', flag: '🇨🇴', name: 'Colombia' },
  { id: 'AR', code: '54', flag: '🇦🇷', name: 'Argentina' },
  { id: 'CL', code: '56', flag: '🇨🇱', name: 'Chile' },
  { id: 'EC', code: '593', flag: '🇪🇨', name: 'Ecuador' },
  { id: 'BO', code: '591', flag: '🇧🇴', name: 'Bolivia' },
  { id: 'VE', code: '58', flag: '🇻🇪', name: 'Venezuela' },
  { id: 'UY', code: '598', flag: '🇺🇾', name: 'Uruguay' },
  { id: 'PY', code: '595', flag: '🇵🇾', name: 'Paraguay' },
  { id: 'CR', code: '506', flag: '🇨🇷', name: 'Costa Rica' },
  { id: 'PA', code: '507', flag: '🇵🇦', name: 'Panamá' },
  { id: 'GT', code: '502', flag: '🇬🇹', name: 'Guatemala' },
  { id: 'HN', code: '504', flag: '🇭🇳', name: 'Honduras' },
  { id: 'SV', code: '503', flag: '🇸🇻', name: 'El Salvador' },
  { id: 'NI', code: '505', flag: '🇳🇮', name: 'Nicaragua' },
  { id: 'DO', code: '1', flag: '🇩🇴', name: 'Rep. Dominicana' },
  { id: 'ES', code: '34', flag: '🇪🇸', name: 'España' },
  { id: 'BR', code: '55', flag: '🇧🇷', name: 'Brasil' },
];

// Cuando el modal se abre prellenado con un número completo (ej. desde
// el atajo de "ventana de 24h vencida"), separa el código de país del
// resto — probando primero los códigos más largos para no confundir,
// por ejemplo, Bolivia (591) con Perú (51).
function splitPhone(full: string): { countryId: string; local: string } {
  const digits = full.replace(/[^0-9]/g, '');
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  const match = sorted.find(c => digits.startsWith(c.code));
  if (match) return { countryId: match.id, local: digits.slice(match.code.length) };
  return { countryId: 'PE', local: digits };
}

const RESPONSABLES_CHAT = ['Winona', 'Maryori'];
const ESTADOS_CHAT = ['Pendiente', 'En seguimiento', 'Resuelto'];
const ESTADO_CHAT_COLOR: Record<string, { bg: string; color: string }> = {
  'Pendiente': { bg: '#FBF1E2', color: '#B5740F' },
  'En seguimiento': { bg: '#EAF1F8', color: '#2E6CA0' },
  'Resuelto': { bg: '#EAF7F1', color: '#1F9B6E' },
};

// Estado de aprobación de una plantilla en Meta — se muestra en el modal
// "Nuevo chat" para no tener que ir a revisar WhatsApp Manager aparte.
const TEMPLATE_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  APPROVED: { label: 'Aprobada', color: '#1F9B6E', bg: '#EAF7F1' },
  PENDING: { label: 'En revisión', color: '#B5740F', bg: '#FBF1E2' },
  REJECTED: { label: 'Rechazada', color: '#D14343', bg: '#FCEDED' },
};
const templateStatusMeta = (status: string) => TEMPLATE_STATUS_META[status] ?? { label: status, color: '#5A6270', bg: '#F4F6F8' };

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '🙂', '😉', '😍', '😘', '🥰',
  '😎', '🤩', '🥳', '😇', '🤗', '🤔', '😅', '😢', '😭', '😮',
  '😱', '😴', '🙄', '😬', '🤝', '👍', '👎', '👏', '🙏', '💪',
  '👋', '✌️', '🤞', '👌', '❤️', '🧡', '💛', '💚', '💙', '💜',
  '🔥', '✨', '🎉', '🎊', '💯', '⭐', '✅', '❌', '⏰', '📅',
  '📌', '📎', '📷', '🎥', '💰', '💵', '📈', '🚀', '💡', '🙌',
];

interface Conversation {
  phone: string;
  contactName: string;
  lastText: string;
  updatedTime: string;
}

interface ChatMeta { responsable: string; estado: string; nombre: string; }

interface Message {
  id: string;
  direction: 'in' | 'out';
  text: string;
  mediaUrl: string | null;
  mediaType: string | null;
  createdTime: string;
  status: string | null;
  statusDetail: string | null;
}

// Sonido tipo WhatsApp cuando llega un mensaje entrante — sintetizado
// con Web Audio (sin archivo de audio propio) para no depender de ningún
// asset ni de derechos sobre el sonido real de WhatsApp.
function playIncomingSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.09);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.09 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.2);
    });
    setTimeout(() => ctx.close(), 500);
  } catch {
    // Los navegadores bloquean audio si todavía no hubo ninguna
    // interacción del usuario con la página — no es un error real.
  }
}

function StatusTicks({ status, statusDetail }: { status: string | null; statusDetail: string | null }) {
  if (status === 'read') return <span title="Leído" style={{ color: '#53BDEB' }}>✓✓</span>;
  if (status === 'delivered') return <span title="Entregado" style={{ color: '#AEB4BE' }}>✓✓</span>;
  if (status === 'failed') return <span title={statusDetail || 'No se pudo entregar'} style={{ color: '#D14343' }}>⚠</span>;
  return <span title="Enviado" style={{ color: '#AEB4BE' }}>✓</span>;
}

const URL_SPLIT_REGEX = /(https?:\/\/[^\s]+)/g;

// Convierte los links sueltos dentro de un mensaje de texto en <a> clicables
// — split() con un grupo de captura deja el texto en índices pares y el
// link capturado en los impares, así que no hace falta volver a testear.
function linkify(text: string, color: string) {
  return text.split(URL_SPLIT_REGEX).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all" style={{ color }}>
        {part}
      </a>
    ) : (
      part
    )
  );
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const LAST_SEEN_KEY = 'liderium_wa_last_seen';
const LAST_SEEN_INIT_KEY = 'liderium_wa_last_seen_init';

function readLastSeen(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(LAST_SEEN_KEY) || '{}'); } catch { return {}; }
}
function writeLastSeen(data: Record<string, string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(data));
}

export default function PanelWhatsApp({ showToast }: { showToast: (text: string, ok?: boolean) => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const messagesCache = useRef<Record<string, Message[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localIdCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [quickReplies, setQuickReplies] = useState<{ id: string; texto: string }[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [newQuickReply, setNewQuickReply] = useState('');

  useEffect(() => {
    fetch('/api/whatsapp/quick-replies').then(r => r.json()).then(d => setQuickReplies(d.replies ?? [])).catch(() => {});
  }, []);

  const addQuickReply = async () => {
    if (!newQuickReply.trim()) return;
    const res = await fetch('/api/whatsapp/quick-replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: newQuickReply.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error ?? 'No se pudo guardar', false); return; }
    setQuickReplies(q => [...q, data.reply]);
    setNewQuickReply('');
  };

  const deleteQuickReply = async (id: string) => {
    setQuickReplies(q => q.filter(r => r.id !== id));
    await fetch(`/api/whatsapp/quick-replies?id=${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);

  // Perfil de negocio (foto, descripción, categoría) — lo que ve el
  // cliente al abrir "Info. del contacto" en su WhatsApp.
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ about: '', description: '', email: '', address: '', website: '', vertical: 'UNDEFINED' });
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [lastSeenTick, setLastSeenTick] = useState(0);
  const touchLastSeen = () => setLastSeenTick(t => t + 1);

  // Organización: responsable asignado + estado por conversación,
  // búsqueda y filtro de no leídos — todo esto es puramente de
  // organización del equipo, no afecta lo que se manda a WhatsApp.
  const [chatMeta, setChatMeta] = useState<Record<string, ChatMeta>>({});
  const [search, setSearch] = useState('');
  const [soloNoLeidos, setSoloNoLeidos] = useState(false);
  const [responsableFilter, setResponsableFilter] = useState('Todos');
  const [estadoFilter, setEstadoFilter] = useState('Todos');

  // Buscar dentro de los mensajes de la conversación abierta (no confundir
  // con "search", que busca entre conversaciones en la lista de la izquierda).
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');

  // Cuando falla un envío libre por estar fuera de la ventana de 24h,
  // guarda el teléfono para el que pasó — así se puede ofrecer el atajo a
  // "Nuevo chat con plantilla" directo para esa conversación.
  const [windowExpiredPhone, setWindowExpiredPhone] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/chat-meta?canal=whatsapp').then(r => r.json()).then(d => setChatMeta(d.meta ?? {})).catch(() => {});
  }, []);

  const updateChatMeta = (phone: string, patch: Partial<ChatMeta>) => {
    setChatMeta(prev => {
      const current: ChatMeta = prev[phone] ?? { responsable: '', estado: 'Pendiente', nombre: '' };
      return { ...prev, [phone]: { ...current, ...patch } };
    });
    fetch('/api/chat-meta', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canal: 'whatsapp', conversationKey: phone, ...patch }),
    }).catch(() => showToast('No se pudo guardar', false));
  };

  // Vincular con Comercial: qué lead corresponde a este número, y su
  // score de SAT si ya vino del cuestionario — todo en vivo, sin guardar
  // ningún vínculo aparte (se recalcula comparando el teléfono).
  const { leads: satLeads, setLeads: setSatLeads, nichosGanados, reunionLeadIds, pagoLeadIds, perfil: satPerfil } = useSatContext();
  const [creatingLead, setCreatingLead] = useState(false);

  // WhatsApp no siempre manda un nombre de perfil (a veces solo el
  // número) — este nombre a mano manda sobre eso, y si hay un lead
  // vinculado, se usa el nombre del lead antes que el número en crudo.
  // Se calcula UNA sola vez acá, sobre cada conversación, y tanto la
  // lista como el encabezado leen ese mismo campo (conversation.resolvedName)
  // — así no hay forma de que queden desincronizados entre sí.
  const conversationsWithNames = useMemo(() => {
    return conversations.map(c => {
      const customName = chatMeta[c.phone]?.nombre?.trim();
      const lead = customName ? null : matchLeadByPhone(satLeads, c.phone);
      const resolvedName = customName || lead?.nombre?.trim() || c.contactName;
      return { ...c, resolvedName };
    });
  }, [conversations, chatMeta, satLeads]);

  const matchedLead = useMemo(() => {
    if (!selectedPhone) return null;
    return matchLeadByPhone(satLeads, selectedPhone);
  }, [satLeads, selectedPhone]);

  const leadScore = useMemo(() => {
    if (!matchedLead || !esLeadCuestionario(matchedLead)) return null;
    const result = computeLeadScore(matchedLead, {
      nichosGanados,
      tieneReunion: reunionLeadIds.has(matchedLead.id),
      tienePago: pagoLeadIds.has(matchedLead.id),
      perfil: satPerfil,
    });
    return { score: result.score, tier: result.tierCalculado };
  }, [matchedLead, nichosGanados, reunionLeadIds, pagoLeadIds, satPerfil]);

  const handleCreateLeadFromChat = async () => {
    if (!selected) return;
    setCreatingLead(true);
    try {
      const res = await fetch('/api/chat-crear-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: selected.resolvedName, numero: selected.phone, canal: 'whatsapp' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSatLeads(prev => [data.lead, ...prev]);
      showToast(data.duplicate ? 'Ya existía un lead con este número — vinculado' : 'Lead creado y vinculado');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo crear el lead', false);
    }
    setCreatingLead(false);
  };

  // Nuevo chat: para escribirle primero a alguien que nunca te escribió,
  // WhatsApp exige mandar una plantilla ya aprobada por Meta como primer
  // mensaje — no deja texto libre. Por eso este modal pide elegir una
  // plantilla (con sus variables) en vez de dejar escribir cualquier cosa.
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatDraft, setNewChatDraft] = useState({ nombre: '', phone: '' });
  const [countryId, setCountryId] = useState('PE');
  const [templates, setTemplates] = useState<{ name: string; language: string; bodyText: string; variableCount: number; status: string }[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templatesError, setTemplatesError] = useState('');
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [templateParams, setTemplateParams] = useState<string[]>([]);
  const [sendingTemplate, setSendingTemplate] = useState(false);

  const openNewChatModal = (preset?: { nombre: string; phone: string }) => {
    setShowNewChatModal(true);
    if (preset) {
      const { countryId: presetCountryId, local } = splitPhone(preset.phone);
      setCountryId(presetCountryId);
      setNewChatDraft({ nombre: preset.nombre, phone: local });
    } else {
      setCountryId('PE');
      setNewChatDraft({ nombre: '', phone: '' });
    }
    setSelectedTemplateName('');
    setTemplateParams([]);
    setTemplatesError('');
    setLoadingTemplates(true);
    fetch('/api/whatsapp/templates')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setTemplatesError(d.error); return; }
        const list = d.templates ?? [];
        setTemplates(list);
        // Preferir una ya aprobada para que quede lista para enviar de
        // una — si no hay ninguna, igual mostrar la primera (pendiente o
        // rechazada) para que se vea su estado en vez de una lista vacía.
        const defaultTpl = list.find((t: { status: string }) => t.status === 'APPROVED') ?? list[0];
        if (defaultTpl) {
          setSelectedTemplateName(defaultTpl.name);
          setTemplateParams(new Array(defaultTpl.variableCount).fill(''));
        }
      })
      .catch(() => setTemplatesError('No se pudieron cargar las plantillas'))
      .finally(() => setLoadingTemplates(false));
  };

  const selectedTemplate = templates.find(t => t.name === selectedTemplateName) ?? null;

  const pickTemplate = (name: string) => {
    setSelectedTemplateName(name);
    const tpl = templates.find(t => t.name === name);
    setTemplateParams(new Array(tpl?.variableCount ?? 0).fill(''));
  };

  const previewTemplateText = () => {
    if (!selectedTemplate) return '';
    let text = selectedTemplate.bodyText;
    templateParams.forEach((v, i) => { text = text.replace(`{{${i + 1}}}`, v || `{{${i + 1}}}`); });
    return text;
  };

  const sendNewChat = async () => {
    if (!selectedTemplate || selectedTemplate.status !== 'APPROVED' || !newChatDraft.phone.trim()) return;
    setSendingTemplate(true);
    try {
      const dialCode = COUNTRY_CODES.find(c => c.id === countryId)?.code ?? '51';
      const phone = (dialCode + newChatDraft.phone).replace(/[^0-9]/g, '');
      const text = previewTemplateText();
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone, text,
          templateName: selectedTemplate.name,
          templateLanguage: selectedTemplate.language,
          templateParams,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const contactName = newChatDraft.nombre.trim() || phone;
      setConversations(prev => [{ phone, contactName, lastText: text, updatedTime: new Date().toISOString() }, ...prev.filter(c => c.phone !== phone)]);
      if (newChatDraft.nombre.trim()) updateChatMeta(phone, { nombre: newChatDraft.nombre.trim() });
      showToast('Mensaje enviado — chat creado');
      setShowNewChatModal(false);
      openConversation(phone);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo enviar la plantilla', false);
    }
    setSendingTemplate(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, selectedPhone]);

  const ensureBaseline = (convs: Conversation[]) => {
    // Marca "ya visto" una sola vez por navegador, con una bandera aparte
    // — no basta con mirar si el mapa de vistos está vacío, porque
    // arrancó sin ninguna conversación y eso reiniciaba la línea base en
    // cada consulta, tapando los mensajes nuevos apenas llegaban.
    if (typeof window === 'undefined' || localStorage.getItem(LAST_SEEN_INIT_KEY)) return;
    const baseline: Record<string, string> = {};
    convs.forEach(c => { baseline[c.phone] = c.updatedTime; });
    writeLastSeen(baseline);
    localStorage.setItem(LAST_SEEN_INIT_KEY, '1');
    touchLastSeen();
  };

  const loadConversations = (silent = false) => {
    fetch('/api/whatsapp/conversations')
      .then(r => r.json())
      .then(d => {
        const convs: Conversation[] = d.conversations ?? [];
        setConversations(convs);
        ensureBaseline(convs);
      })
      .catch(() => { if (!silent) showToast('No se pudo cargar WhatsApp', false); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadConversations();
    const interval = setInterval(() => loadConversations(true), 5000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPhoneRef = useRef<string | null>(null);
  useEffect(() => { selectedPhoneRef.current = selectedPhone; }, [selectedPhone]);

  const fetchAndCacheMessages = (phone: string) => {
    return fetch(`/api/whatsapp/messages?phone=${encodeURIComponent(phone)}`)
      .then(r => r.json())
      .then(d => {
        const msgs: Message[] = d.messages ?? [];
        messagesCache.current[phone] = msgs;
        if (selectedPhoneRef.current === phone) setMessages(msgs);
        return msgs;
      })
      .catch(() => []);
  };

  // Tiempo real: cada mensaje nuevo (entrante) llega por Supabase Realtime
  // apenas el webhook lo guarda, sin esperar a la próxima vuelta del polling.
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, payload => {
        const row = payload.new as { phone?: string; direction?: string; created_at?: string };
        if (!row.phone || row.direction !== 'in') return;
        playIncomingSound();
        const bumpedTime = row.created_at || new Date().toISOString();
        setConversations(prev => {
          const exists = prev.some(c => c.phone === row.phone);
          if (!exists) return prev;
          return prev.map(c => (c.phone === row.phone ? { ...c, updatedTime: bumpedTime } : c));
        });
        fetchAndCacheMessages(row.phone);
        loadConversations(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ticks de entrega/lectura en vivo — Meta avisa el cambio de estado con
  // un UPDATE sobre la misma fila que guardamos al enviar.
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-message-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages' }, payload => {
        const row = payload.new as { id?: string; phone?: string; status?: string };
        if (!row.id || !row.phone) return;
        setMessages(prev => {
          if (!prev.some(m => m.id === row.id)) return prev;
          const updated = prev.map(m => (m.id === row.id ? { ...m, status: row.status ?? m.status } : m));
          messagesCache.current[row.phone!] = updated;
          return updated;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const openConversation = (phone: string) => {
    setSelectedPhone(phone);
    setShowMessageSearch(false);
    setMessageSearch('');
    setWindowExpiredPhone(null);
    setShowQuickReplies(false);
    const lastSeen = readLastSeen();
    lastSeen[phone] = new Date().toISOString();
    writeLastSeen(lastSeen);
    touchLastSeen();
  };

  useEffect(() => {
    if (!selectedPhone) return;
    const cached = messagesCache.current[selectedPhone];
    Promise.resolve(cached).then(cachedMessages => {
      if (cachedMessages) { setMessages(cachedMessages); return; }
      return fetch(`/api/whatsapp/messages?phone=${encodeURIComponent(selectedPhone)}`)
        .then(r => r.json())
        .then(d => {
          const msgs = d.messages ?? [];
          messagesCache.current[selectedPhone] = msgs;
          setMessages(msgs);
        });
    }).catch(() => showToast('No se pudo cargar la conversación', false));
  }, [selectedPhone]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = conversationsWithNames.find(c => c.phone === selectedPhone) ?? null;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- lastSeenTick es intencional, marca cuando localStorage cambió
  const lastSeenMap = useMemo(() => readLastSeen(), [lastSeenTick]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversationsWithNames.filter(c => {
      const meta = chatMeta[c.phone] ?? { responsable: '', estado: 'Pendiente', nombre: '' };
      if (q && !(c.resolvedName.toLowerCase().includes(q) || c.phone.includes(q))) return false;
      if (responsableFilter !== 'Todos' && meta.responsable !== responsableFilter) return false;
      if (estadoFilter !== 'Todos' && meta.estado !== estadoFilter) return false;
      if (soloNoLeidos) {
        const hasUnread = new Date(c.updatedTime).getTime() > new Date(lastSeenMap[c.phone] || 0).getTime();
        if (!hasUnread) return false;
      }
      return true;
    });
  }, [conversationsWithNames, chatMeta, search, responsableFilter, estadoFilter, soloNoLeidos, lastSeenMap]);

  const visibleMessages = useMemo(() => {
    const q = messageSearch.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(m => m.text.toLowerCase().includes(q));
  }, [messages, messageSearch]);

  const pushLocalMessage = (partial: Partial<Message>) => {
    if (!selected) return;
    const newMsg: Message = {
      id: `local-${localIdCounter.current++}`,
      direction: 'out',
      text: '',
      mediaUrl: null,
      mediaType: null,
      createdTime: new Date().toISOString(),
      status: 'sent',
      statusDetail: null,
      ...partial,
    };
    setMessages(m => {
      const updated = [...m, newMsg];
      messagesCache.current[selected.phone] = updated;
      return updated;
    });
    // El mensaje optimista de arriba no tiene el id real de la fila en la
    // base — sin eso, cuando llegue el status (entregado/leído) por
    // webhook no hay cómo saber a cuál mensaje pertenece. Esta relectura
    // en segundo plano lo reemplaza por la fila real ya guardada.
    setTimeout(() => fetchAndCacheMessages(selected.phone), 1500);
  };

  const submitReply = async (override?: string) => {
    const text = override ?? reply;
    if (!selected || !text.trim()) return;
    setSending(true);
    setWindowExpiredPhone(null);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: selected.phone, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      pushLocalMessage({ text });
      if (override === undefined) setReply('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo enviar';
      if (/24h/i.test(msg)) setWindowExpiredPhone(selected.phone);
      showToast(msg, false);
    }
    setSending(false);
  };

  const uploadAndSend = async (file: File, mediaType: 'image' | 'video' | 'document' | 'audio') => {
    if (!selected) return;
    const urlRes = await fetch('/api/whatsapp/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name }),
    });
    const urlData = await urlRes.json();
    if (!urlRes.ok) throw new Error(urlData.error ?? 'No se pudo preparar la subida');

    const { error: uploadError } = await supabase.storage.from('wa-media').uploadToSignedUrl(urlData.filePath, urlData.token, file, { contentType: file.type });
    if (uploadError) throw uploadError;

    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: selected.phone, mediaUrl: urlData.publicUrl, mediaType }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    pushLocalMessage({ mediaUrl: urlData.publicUrl, mediaType });
  };

  const handleFileSelect = async (file: File | null) => {
    if (!file || !selected) return;
    setUploadingFile(true);
    try {
      const mediaType: 'image' | 'video' | 'document' =
        file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'document';
      await uploadAndSend(file, mediaType);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo enviar el archivo', false);
    }
    setUploadingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // No hace falta que el navegador grabe en un formato que WhatsApp
      // acepte — igual lo convierte el servidor a mp3 antes de mandarlo
      // (ver /api/whatsapp/transcode-audio), porque aunque Chrome/Brave
      // digan que graban en mp4, adentro va códec Opus, no AAC, y Meta lo
      // rechaza igual. Acá solo se usa lo que el navegador grabe mejor.
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setSendingVoice(true);
        try {
          if (!selected) throw new Error('Selecciona una conversación');
          const transcodeRes = await fetch('/api/whatsapp/transcode-audio', { method: 'POST', body: blob });
          const transcodeData = await transcodeRes.json();
          if (!transcodeRes.ok) throw new Error(transcodeData.error ?? 'No se pudo convertir el audio');
          const res = await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: selected.phone, mediaUrl: transcodeData.publicUrl, mediaType: 'audio' }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          pushLocalMessage({ mediaUrl: transcodeData.publicUrl, mediaType: 'audio' });
        } catch (e) {
          showToast(e instanceof Error ? e.message : 'No se pudo enviar la nota de voz', false);
        }
        setSendingVoice(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      showToast('No se pudo acceder al micrófono', false);
    }
  };

  const openProfileModal = () => {
    setShowProfileModal(true);
    setLoadingProfile(true);
    fetch('/api/whatsapp/business-profile')
      .then(r => r.json())
      .then(d => {
        if (d.error) { showToast(d.error, false); return; }
        const p = d.profile;
        setProfileDraft({
          about: p.about ?? '',
          description: p.description ?? '',
          email: p.email ?? '',
          address: p.address ?? '',
          website: p.websites?.[0] ?? '',
          vertical: p.vertical || 'UNDEFINED',
        });
        setProfilePictureUrl(p.profilePictureUrl ?? '');
      })
      .catch(() => showToast('No se pudo cargar el perfil de WhatsApp', false))
      .finally(() => setLoadingProfile(false));
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch('/api/whatsapp/business-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          about: profileDraft.about,
          description: profileDraft.description,
          email: profileDraft.email,
          address: profileDraft.address,
          websites: profileDraft.website ? [profileDraft.website] : [],
          vertical: profileDraft.vertical,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Perfil de WhatsApp actualizado');
      setShowProfileModal(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo guardar', false);
    }
    setSavingProfile(false);
  };

  const handlePhotoSelect = async (file: File | null) => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/whatsapp/business-profile/photo', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfilePictureUrl(URL.createObjectURL(file));
      showToast('Foto de perfil actualizada — puede tardar unos minutos en verse en WhatsApp');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo subir la foto', false);
    }
    setUploadingPhoto(false);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  return (
    <div>
      <div className="grid gap-4" style={{ gridTemplateColumns: '300px 1fr', height: '620px' }}>
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F2F5]">
            <div className="font-grotesk font-bold text-[15px] text-[#15171C]">Conversaciones</div>
            <div className="flex items-center gap-2">
              <button onClick={() => openNewChatModal()} title="Nuevo chat" className="w-8 h-8 rounded-[9px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
              <button onClick={openProfileModal} title="Perfil del negocio" className="w-8 h-8 rounded-[9px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2] text-[14px]">
                ⚙️
              </button>
              <button onClick={() => loadConversations()} title="Actualizar" className="w-8 h-8 rounded-[9px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
              </button>
            </div>
          </div>
          <div className="px-4 py-3 border-b border-[#F0F2F5] flex flex-col gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o número…"
              className="w-full h-9 px-3 border-[1.5px] border-[#E2E5EA] rounded-[9px] text-[12.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setSoloNoLeidos(s => !s)}
                className={`px-2.5 py-1 rounded-[7px] text-[11px] font-bold cursor-pointer border transition ${soloNoLeidos ? 'bg-[#15171C] text-white border-[#15171C]' : 'bg-white text-[#5A6270] border-[#E2E5EA]'}`}>
                No leídos
              </button>
              <Dropdown value={responsableFilter} onChange={setResponsableFilter} options={['Todos', ...RESPONSABLES_CHAT]}
                className="h-[26px] bg-white border border-[#E2E5EA] rounded-[7px] px-2 text-[11px] font-bold text-[#3C434F] cursor-pointer outline-none" />
              <Dropdown value={estadoFilter} onChange={setEstadoFilter} options={['Todos', ...ESTADOS_CHAT]}
                className="h-[26px] bg-white border border-[#E2E5EA] rounded-[7px] px-2 text-[11px] font-bold text-[#3C434F] cursor-pointer outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-10 text-[13px] text-[#8A929E] font-semibold">Cargando…</div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-10 px-5 text-[13px] text-[#8A929E] font-semibold">Sin conversaciones todavía. En cuanto alguien te escriba por WhatsApp, va a aparecer aquí.</div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-10 px-5 text-[13px] text-[#8A929E] font-semibold">Ningún chat coincide con el filtro.</div>
            ) : (
              filteredConversations.map(c => {
                const hasUnread = new Date(c.updatedTime).getTime() > new Date(lastSeenMap[c.phone] || 0).getTime();
                const meta = chatMeta[c.phone];
                return (
                  <div key={c.phone} onClick={() => openConversation(c.phone)}
                    className="px-5 py-3.5 cursor-pointer border-b border-[#F2F4F7] transition"
                    style={{
                      background: hasUnread ? '#EAF7F1' : selectedPhone === c.phone ? '#F6F8FA' : undefined,
                      borderLeft: hasUnread ? '3px solid #1F9B6E' : '3px solid transparent',
                    }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13.5px] font-bold truncate" style={{ color: hasUnread ? '#1F9B6E' : '#15171C' }}>{c.resolvedName}</div>
                      {hasUnread && (
                        <span className="flex-shrink-0 text-[11px] font-black text-[#1F9B6E]">Nuevo</span>
                      )}
                    </div>
                    <div className="text-[11.5px] font-semibold truncate" style={{ color: hasUnread ? '#3B8E6F' : '#9AA0A8' }}>{c.lastText || '—'}</div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10.5px] font-semibold text-[#C2C8D2]">{timeAgo(c.updatedTime)}</span>
                      {meta?.responsable && (
                        <span className="text-[10px] font-black text-[#5A6270] bg-[#F4F6F8] px-1.5 py-[1px] rounded-full">{meta.responsable}</span>
                      )}
                      {meta?.estado && meta.estado !== 'Pendiente' && (
                        <span className="text-[10px] font-black px-1.5 py-[1px] rounded-full" style={{ background: ESTADO_CHAT_COLOR[meta.estado]?.bg, color: ESTADO_CHAT_COLOR[meta.estado]?.color }}>{meta.estado}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-[13.5px] text-[#8A929E] font-semibold">Selecciona una conversación</div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-[#F0F2F5] flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <input
                    key={`${selected.phone}:${selected.resolvedName}`}
                    defaultValue={selected.resolvedName}
                    placeholder="Ponle un nombre a este chat…"
                    onBlur={e => {
                      const value = e.target.value.trim();
                      // Solo guarda si de verdad escribiste algo distinto a lo
                      // que ya se estaba mostrando (nombre del lead, o el
                      // número) — así hacer clic y salir sin tocar nada no
                      // termina guardando ese valor como si fuera manual.
                      if (value !== selected.resolvedName) updateChatMeta(selected.phone, { nombre: value });
                    }}
                    title="Editar nombre del contacto"
                    className="font-grotesk font-bold text-[15px] text-[#15171C] bg-transparent border-none outline-none p-0 w-full focus:underline"
                  />
                  <div className="text-[11.5px] text-[#9AA0A8] font-semibold">{selected.phone}</div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`tel:+${selected.phone}`} title="Llamar"
                    className="w-8 h-8 flex-shrink-0 rounded-[8px] border-none cursor-pointer flex items-center justify-center text-[#5A6270] bg-[#F4F6F8] hover:bg-[#EAF7F1] hover:text-[#1F9B6E] transition no-underline">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  </a>
                  <button onClick={() => setShowMessageSearch(s => !s)} title="Buscar en la conversación"
                    className="w-8 h-8 flex-shrink-0 rounded-[8px] border-none cursor-pointer flex items-center justify-center text-[#5A6270] transition"
                    style={{ background: showMessageSearch ? '#EAF1F8' : '#F4F6F8' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></svg>
                  </button>
                  <Dropdown value={chatMeta[selected.phone]?.responsable ?? ''} onChange={v => updateChatMeta(selected.phone, { responsable: v })}
                    options={[{ value: '', label: 'Sin asignar' }, ...RESPONSABLES_CHAT.map(r => ({ value: r, label: r }))]}
                    className="h-8 bg-[#F4F6F8] border border-[#E2E5EA] rounded-[8px] px-2.5 text-[12px] font-bold text-[#3C434F] cursor-pointer outline-none" align="right" />
                  <Dropdown value={chatMeta[selected.phone]?.estado || 'Pendiente'} onChange={v => updateChatMeta(selected.phone, { estado: v })}
                    options={ESTADOS_CHAT}
                    style={{ background: ESTADO_CHAT_COLOR[chatMeta[selected.phone]?.estado || 'Pendiente']?.bg, color: ESTADO_CHAT_COLOR[chatMeta[selected.phone]?.estado || 'Pendiente']?.color }}
                    className="h-8 border-none rounded-[8px] px-2.5 text-[12px] font-black cursor-pointer outline-none" align="right" />
                </div>
              </div>
              {showMessageSearch && (
                <div className="px-6 py-2.5 border-b border-[#F0F2F5] bg-[#FAFBFC]">
                  <input
                    autoFocus
                    value={messageSearch}
                    onChange={e => setMessageSearch(e.target.value)}
                    placeholder="Buscar dentro de esta conversación…"
                    className="w-full h-8 px-3 border border-[#E2E5EA] rounded-[8px] text-[12.5px] font-medium outline-none bg-white text-[#15171C] focus:border-steel transition"
                  />
                  {messageSearch.trim() && (
                    <div className="text-[11px] font-semibold text-[#9AA0A8] mt-1.5">{visibleMessages.length} resultado{visibleMessages.length === 1 ? '' : 's'}</div>
                  )}
                </div>
              )}
              <ChatLeadCard lead={matchedLead} score={leadScore} creating={creatingLead} onCreateLead={handleCreateLeadFromChat} />
              <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-3 bg-[#FAFBFC]">
                {visibleMessages.length === 0 ? (
                  <div className="text-center text-[13px] text-[#8A929E] font-semibold">
                    {messageSearch.trim() ? 'Sin resultados para esa búsqueda.' : 'Sin mensajes.'}
                  </div>
                ) : (
                  visibleMessages.map(m => {
                    const isMe = m.direction === 'out';
                    const isCaptionable = m.mediaType === 'image' || m.mediaType === 'video';
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${m.mediaUrl ? 'p-1.5' : 'px-4 py-2.5'} whitespace-pre-wrap text-[13.5px] leading-[1.5] rounded-[14px]`}
                          style={{
                            background: isMe ? '#15171C' : '#fff',
                            color: isMe ? '#fff' : '#15171C',
                            border: isMe ? 'none' : '1px solid #ECEEF2',
                          }}>
                          {m.mediaUrl ? (
                            m.mediaType === 'video' ? (
                              <video src={m.mediaUrl} controls className="rounded-[10px] max-w-full max-h-[260px]" />
                            ) : m.mediaType === 'image' ? (
                              <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer">
                                <img src={m.mediaUrl} alt="Adjunto" className="rounded-[10px] max-w-full max-h-[260px] block" />
                              </a>
                            ) : m.mediaType === 'audio' ? (
                              <audio src={m.mediaUrl} controls className="max-w-full" />
                            ) : (
                              <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold" style={{ color: isMe ? '#9fc3e3' : '#2E6CA0' }}>
                                📎 {m.text || 'Ver documento'}
                              </a>
                            )
                          ) : m.text ? (
                            linkify(m.text, isMe ? '#9fc3e3' : '#2E6CA0')
                          ) : (
                            <span className="italic" style={{ color: isMe ? '#AEB4BE' : '#9AA0A8' }}>📎 Contenido no disponible</span>
                          )}
                          {isCaptionable && m.text && (
                            <div className="px-1.5 pt-1.5">{linkify(m.text, isMe ? '#9fc3e3' : '#2E6CA0')}</div>
                          )}
                          {isMe && (
                            <div className={`text-[10px] font-bold text-right ${m.mediaUrl ? 'px-1.5 pt-1' : 'pt-1'}`}>
                              <StatusTicks status={m.status} statusDetail={m.statusDetail} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="relative px-6 py-4 border-t border-[#F0F2F5]">
                {showQuickReplies && (
                  <div className="absolute bottom-full left-6 mb-2 w-[320px] max-h-[280px] overflow-y-auto bg-white border border-[#E2E5EA] rounded-[14px] shadow-lg p-3 z-10">
                    <div className="text-[12px] font-bold text-[#5A6270] mb-2">Respuestas rápidas</div>
                    {quickReplies.length === 0 && (
                      <div className="text-[12.5px] text-[#9AA0A8] font-semibold mb-2">Todavía no agregas ninguna.</div>
                    )}
                    <div className="flex flex-col gap-1.5 mb-3">
                      {quickReplies.map(qr => (
                        <div key={qr.id} className="flex items-center gap-1.5 group">
                          <button
                            onClick={() => { submitReply(qr.texto); setShowQuickReplies(false); }}
                            className="flex-1 text-left px-3 py-2 bg-[#F4F6F8] hover:bg-[#EAF1F8] rounded-[9px] text-[12.5px] font-medium text-[#15171C] border-none cursor-pointer truncate">
                            {qr.texto}
                          </button>
                          <button onClick={() => deleteQuickReply(qr.id)} title="Eliminar"
                            className="flex-shrink-0 w-7 h-7 rounded-[7px] bg-transparent border-none text-[#C2C8D2] hover:text-[#D14343] hover:bg-[#FBEAEA] cursor-pointer text-[13px] font-bold">
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-[#F0F2F5] pt-2.5">
                      <textarea value={newQuickReply} onChange={e => setNewQuickReply(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addQuickReply(); }}
                        placeholder="Nueva respuesta rápida… (Enter para salto de línea)"
                        rows={3}
                        className="w-full px-3 py-2 border-[1.5px] border-[#E2E5EA] rounded-[9px] text-[12.5px] font-medium outline-none text-[#15171C] focus:border-steel transition resize-none" />
                      <button onClick={addQuickReply} disabled={!newQuickReply.trim()}
                        className="mt-1.5 w-full h-9 px-3 bg-[#15171C] text-white border-none rounded-[9px] cursor-pointer font-bold text-[12px] disabled:opacity-50 disabled:cursor-not-allowed">
                        Agregar
                      </button>
                    </div>
                  </div>
                )}
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-6 mb-2 w-[280px] bg-white border border-[#E2E5EA] rounded-[14px] shadow-lg p-3 z-10">
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJIS.map(emoji => (
                        <button key={emoji} type="button" onClick={() => setReply(r => r + emoji)}
                          className="w-8 h-8 flex items-center justify-center text-[18px] bg-transparent border-none rounded-[7px] cursor-pointer hover:bg-[#F4F6F8]">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-[10px]">
                  <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden"
                    onChange={e => handleFileSelect(e.target.files?.[0] ?? null)} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} title="Enviar archivo"
                    className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-[#F4F6F8] hover:bg-[#ECEEF2] border-none rounded-[12px] cursor-pointer text-[#5A6270] disabled:opacity-50 disabled:cursor-not-allowed">
                    {uploadingFile ? (
                      <svg className="animate-spin" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                    )}
                  </button>
                  <button onClick={() => setShowEmojiPicker(s => !s)} title="Emojis"
                    className="w-11 h-11 flex-shrink-0 flex items-center justify-center border-none rounded-[12px] cursor-pointer text-[18px] transition"
                    style={{ background: showEmojiPicker ? '#EAF1F8' : '#F4F6F8' }}>
                    😊
                  </button>
                  <button onClick={toggleRecording} disabled={sendingVoice} title={recording ? 'Detener y enviar' : 'Grabar nota de voz'}
                    className="w-11 h-11 flex-shrink-0 flex items-center justify-center border-none rounded-[12px] cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: recording ? '#FCEDED' : '#F4F6F8', color: recording ? '#D14343' : '#5A6270' }}>
                    {sendingVoice ? (
                      <svg className="animate-spin" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>
                    ) : recording ? (
                      <span className="w-3 h-3 rounded-[3px] bg-[#D14343] animate-pulse" />
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v4M8 23h8" /></svg>
                    )}
                  </button>
                  <button onClick={() => setShowQuickReplies(s => !s)} title="Respuestas rápidas"
                    className="w-11 h-11 flex-shrink-0 flex items-center justify-center border-none rounded-[12px] cursor-pointer transition"
                    style={{ background: showQuickReplies ? '#EAF1F8' : '#F4F6F8', color: showQuickReplies ? '#2E6CA0' : '#5A6270' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                  </button>
                  <input
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitReply(); }}
                    placeholder={recording ? 'Grabando nota de voz…' : 'Escribe una respuesta…'}
                    disabled={recording}
                    className="flex-1 h-11 px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[13.5px] font-medium outline-none bg-[#FAFBFC] text-[#15171C] focus:border-steel focus:bg-white transition disabled:opacity-60"
                  />
                  <button onClick={() => submitReply()} disabled={sending || !reply.trim()}
                    className="h-11 px-5 bg-[#15171C] text-white border-none rounded-[12px] cursor-pointer font-bold text-[13px] hover:bg-steel transition disabled:opacity-50 disabled:cursor-not-allowed">
                    {sending ? 'Enviando…' : 'Enviar'}
                  </button>
                </div>
                {windowExpiredPhone === selected.phone ? (
                  <div className="flex items-center justify-between gap-3 mt-2.5 px-3.5 py-2.5 bg-[#FBF1E2] border border-[#F0DCB0] rounded-[10px]">
                    <span className="text-[11.5px] font-semibold text-[#8A5A0F]">Pasaron más de 24h desde su último mensaje — hay que reabrir con una plantilla aprobada.</span>
                    <button
                      onClick={() => openNewChatModal({ nombre: selected.resolvedName, phone: selected.phone })}
                      className="shrink-0 bg-[#15171C] text-white text-[11.5px] font-bold px-3 py-[7px] rounded-[8px] border-none cursor-pointer hover:bg-steel transition"
                    >
                      Nuevo chat con plantilla
                    </button>
                  </div>
                ) : (
                  <p className="text-[11.5px] text-[#9AA0A8] font-semibold mt-2">Solo se pueden mandar mensajes libres dentro de las 24h desde el último mensaje del cliente. Fuera de ese margen, WhatsApp exige una plantilla aprobada.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal nuevo chat */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,.55)] flex items-center justify-center p-6" onClick={() => { if (!sendingTemplate) setShowNewChatModal(false); }}>
          <div className="bg-white rounded-[22px] w-full max-w-[480px] max-h-[88vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 py-5 border-b border-[#F0F2F5] sticky top-0 bg-white">
              <div>
                <div className="font-grotesk font-bold text-[19px] text-[#15171C]">Nuevo chat</div>
                <div className="text-[13px] text-[#8A929E] font-semibold mt-0.5">WhatsApp exige una plantilla aprobada para escribirle primero a alguien nuevo</div>
              </div>
              <button onClick={() => setShowNewChatModal(false)} className="w-9 h-9 rounded-[10px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2] flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-7 py-6 flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Nombre</label>
                <input value={newChatDraft.nombre} onChange={e => setNewChatDraft(d => ({ ...d, nombre: e.target.value }))}
                  placeholder="Nombre del contacto"
                  className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Número de WhatsApp</label>
                <div className="flex gap-2">
                  <Dropdown
                    value={countryId}
                    onChange={setCountryId}
                    options={COUNTRY_CODES.map(c => ({ value: c.id, label: `${c.flag} +${c.code}` }))}
                    listClassName="max-h-[240px]"
                    className="h-[46px] px-3.5 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition bg-white flex-shrink-0"
                  />
                  <input value={newChatDraft.phone} onChange={e => setNewChatDraft(d => ({ ...d, phone: e.target.value }))}
                    placeholder="987654321"
                    className="flex-1 min-w-0 h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                </div>
              </div>

              {loadingTemplates ? (
                <div className="text-center py-6 text-[13px] text-[#8A929E] font-semibold">Cargando plantillas…</div>
              ) : templatesError ? (
                <div className="bg-[#FCEDED] border border-[#F3C9C9] rounded-[12px] px-4 py-3 text-[12.5px] text-[#B4232F] font-semibold">{templatesError}</div>
              ) : templates.length === 0 ? (
                <div className="bg-[#FBF1E2] border border-[#F0D9A8] rounded-[12px] px-4 py-3 text-[12.5px] text-[#8A6020] font-semibold">
                  Todavía no tienes ninguna plantilla creada. Tienes que crear una en el WhatsApp Manager y esperar su aprobación antes de poder escribirle primero a un contacto nuevo.
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Plantilla</label>
                    <Dropdown className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition bg-white"
                      value={selectedTemplateName} onChange={pickTemplate}
                      options={templates.map(t => ({ value: t.name, label: t.status === 'APPROVED' ? t.name : `${t.name} — ${templateStatusMeta(t.status).label}` }))} />
                  </div>
                  {selectedTemplate && (
                    <div className="inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black"
                      style={{ background: templateStatusMeta(selectedTemplate.status).bg, color: templateStatusMeta(selectedTemplate.status).color }}>
                      {templateStatusMeta(selectedTemplate.status).label}
                    </div>
                  )}
                  {selectedTemplate && selectedTemplate.status !== 'APPROVED' && (
                    <div className="bg-[#FBF1E2] border border-[#F0D9A8] rounded-[12px] px-4 py-3 text-[12.5px] text-[#8A6020] font-semibold">
                      {selectedTemplate.status === 'PENDING'
                        ? 'Esta plantilla todavía está en revisión de Meta — no se puede usar para enviar hasta que se apruebe.'
                        : 'Meta rechazó esta plantilla — hay que corregirla o crear una nueva en el WhatsApp Manager.'}
                    </div>
                  )}
                  {templateParams.map((val, i) => (
                    <div key={i}>
                      <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Variable {`{{${i + 1}}}`}</label>
                      <input value={val} onChange={e => setTemplateParams(prev => prev.map((v, vi) => (vi === i ? e.target.value : v)))}
                        className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                    </div>
                  ))}
                  {selectedTemplate && (
                    <div className="bg-[#F6F8FA] border border-[#E7E9EE] rounded-[12px] px-4 py-3">
                      <div className="text-[11px] font-black text-[#8A929E] uppercase tracking-[0.05em] mb-1.5">Vista previa</div>
                      <div className="text-[13px] text-[#15171C] font-medium whitespace-pre-wrap">{previewTemplateText()}</div>
                    </div>
                  )}
                </>
              )}
            </div>
            {templates.length > 0 && (
              <div className="flex gap-3 px-7 pb-7">
                <button onClick={() => setShowNewChatModal(false)} className="flex-1 h-11 bg-[#F4F6F8] text-[#15171C] border border-[#E2E5EA] rounded-[12px] font-bold text-[14px] cursor-pointer hover:bg-[#ECEEF2] transition">Cancelar</button>
                <button onClick={sendNewChat} disabled={sendingTemplate || !newChatDraft.phone.trim() || !selectedTemplate || selectedTemplate.status !== 'APPROVED'}
                  className="flex-1 h-11 bg-[#15171C] text-white border-none rounded-[12px] font-bold text-[14px] cursor-pointer hover:bg-steel transition disabled:opacity-60 disabled:cursor-not-allowed">
                  {sendingTemplate ? 'Enviando…' : selectedTemplate && selectedTemplate.status !== 'APPROVED' ? 'Plantilla no disponible' : 'Enviar y crear chat'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal perfil de negocio */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,.55)] flex items-center justify-center p-6" onClick={() => { if (!savingProfile) setShowProfileModal(false); }}>
          <div className="bg-white rounded-[22px] w-full max-w-[520px] max-h-[88vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 py-5 border-b border-[#F0F2F5] sticky top-0 bg-white">
              <div>
                <div className="font-grotesk font-bold text-[19px] text-[#15171C]">Perfil del negocio</div>
                <div className="text-[13px] text-[#8A929E] font-semibold mt-0.5">Lo que ven tus clientes al abrir &ldquo;Info. del contacto&rdquo; en WhatsApp</div>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="w-9 h-9 rounded-[10px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2] flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            {loadingProfile ? (
              <div className="text-center py-14 text-[13px] text-[#8A929E] font-semibold">Cargando…</div>
            ) : (
              <>
                <div className="px-7 py-6 flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-[#F4F6F8] border border-[#E2E5EA] overflow-hidden flex items-center justify-center flex-shrink-0">
                      {profilePictureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profilePictureUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[22px] font-black text-[#AEB4BE]">S</span>
                      )}
                    </div>
                    <div>
                      <input ref={photoInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={e => handlePhotoSelect(e.target.files?.[0] ?? null)} />
                      <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}
                        className="px-3.5 py-2 bg-[#F4F6F8] text-[#15171C] border border-[#E2E5EA] rounded-[9px] font-bold text-[12.5px] cursor-pointer hover:border-steel transition disabled:opacity-50 disabled:cursor-not-allowed">
                        {uploadingPhoto ? 'Subiendo…' : 'Cambiar foto'}
                      </button>
                      <p className="text-[11.5px] text-[#9AA0A8] font-semibold mt-1.5">JPG o PNG</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Acerca de</label>
                    <input value={profileDraft.about} onChange={e => setProfileDraft(d => ({ ...d, about: e.target.value }))}
                      placeholder="Ej. Disponible"
                      className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Descripción</label>
                    <textarea value={profileDraft.description} onChange={e => setProfileDraft(d => ({ ...d, description: e.target.value }))}
                      placeholder="A qué se dedica Liderium…"
                      className="w-full min-h-[70px] px-4 py-3 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[13.5px] font-medium outline-none text-[#15171C] focus:border-steel transition resize-y" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Categoría</label>
                    <Dropdown className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition bg-white"
                      value={profileDraft.vertical} onChange={v => setProfileDraft(d => ({ ...d, vertical: v }))} options={VERTICALES} />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Correo</label>
                    <input type="email" value={profileDraft.email} onChange={e => setProfileDraft(d => ({ ...d, email: e.target.value }))}
                      placeholder="contacto@liderium.com"
                      className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Sitio web</label>
                    <input value={profileDraft.website} onChange={e => setProfileDraft(d => ({ ...d, website: e.target.value }))}
                      placeholder="https://liderium.vercel.app"
                      className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-[#5A6270] mb-[7px]">Dirección</label>
                    <input value={profileDraft.address} onChange={e => setProfileDraft(d => ({ ...d, address: e.target.value }))}
                      className="w-full h-[46px] px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[14.5px] font-medium outline-none text-[#15171C] focus:border-steel transition" />
                  </div>
                </div>
                <div className="flex gap-3 px-7 pb-7">
                  <button onClick={() => setShowProfileModal(false)} className="flex-1 h-11 bg-[#F4F6F8] text-[#15171C] border border-[#E2E5EA] rounded-[12px] font-bold text-[14px] cursor-pointer hover:bg-[#ECEEF2] transition">Cancelar</button>
                  <button onClick={saveProfile} disabled={savingProfile}
                    className="flex-1 h-11 bg-[#15171C] text-white border-none rounded-[12px] font-bold text-[14px] cursor-pointer hover:bg-steel transition disabled:opacity-60 disabled:cursor-not-allowed">
                    {savingProfile ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
