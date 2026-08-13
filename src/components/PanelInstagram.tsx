'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Dropdown from '@/components/Dropdown';
import ChatLeadCard from '@/components/ChatLeadCard';
import { useSatContext } from '@/lib/use-sat-context';
import { matchLeadByInstagram } from '@/lib/lead-match';
import { computeLeadScore, esLeadCuestionario } from '@/lib/lead-scoring';
import { playIncomingSound } from '@/lib/sound';

interface Conversation {
  id: string;
  participantId: string;
  username: string;
  updatedTime: string;
}

interface ChatMeta { responsable: string; estado: string; }

interface Message {
  id: string;
  fromId: string;
  text: string;
  shareLink: string | null;
  attachmentUrl: string | null;
  attachmentType: 'image' | 'video' | 'audio' | null;
  createdTime: string;
}

interface QuickReply {
  id: string;
  texto: string;
}

const RESPONSABLES_CHAT = ['Winona', 'Maryori'];
const ESTADOS_CHAT = ['Pendiente', 'En seguimiento', 'Resuelto'];
const ESTADO_CHAT_COLOR: Record<string, { bg: string; color: string }> = {
  'Pendiente': { bg: '#FBF1E2', color: '#B5740F' },
  'En seguimiento': { bg: '#EAF1F8', color: '#2E6CA0' },
  'Resuelto': { bg: '#EAF7F1', color: '#1F9B6E' },
};

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '🙂', '😉', '😍', '😘', '🥰',
  '😎', '🤩', '🥳', '😇', '🤗', '🤔', '😅', '😢', '😭', '😮',
  '😱', '😴', '🙄', '😬', '🤝', '👍', '👎', '👏', '🙏', '💪',
  '👋', '✌️', '🤞', '👌', '❤️', '🧡', '💛', '💚', '💙', '💜',
  '🔥', '✨', '🎉', '🎊', '💯', '⭐', '✅', '❌', '⏰', '📅',
  '📌', '📎', '📷', '🎥', '💰', '💵', '📈', '🚀', '💡', '🙌',
];

function timeAgo(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const LAST_SEEN_KEY = 'liderium_ig_last_seen';

function readLastSeen(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(LAST_SEEN_KEY) || '{}'); } catch { return {}; }
}
function writeLastSeen(data: Record<string, string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(data));
}

export default function PanelInstagram({ showToast }: { showToast: (text: string, ok?: boolean) => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const messagesCache = useRef<Record<string, Message[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const localIdCounter = useRef(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);

  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [newQuickReply, setNewQuickReply] = useState('');
  const [editingQuickReplyId, setEditingQuickReplyId] = useState<string | null>(null);
  const [editingQuickReplyText, setEditingQuickReplyText] = useState('');

  useEffect(() => {
    fetch('/api/instagram/quick-replies').then(r => r.json()).then(d => setQuickReplies(d.replies ?? [])).catch(() => {});
  }, []);

  // Organización: responsable asignado + estado por conversación,
  // búsqueda y filtro de no leídos — solo organiza el trabajo del
  // equipo, no cambia nada de lo que se manda a Instagram.
  const [chatMeta, setChatMeta] = useState<Record<string, ChatMeta>>({});
  const [search, setSearch] = useState('');
  const [soloNoLeidos, setSoloNoLeidos] = useState(false);
  const [responsableFilter, setResponsableFilter] = useState('Todos');
  const [estadoFilter, setEstadoFilter] = useState('Todos');

  useEffect(() => {
    fetch('/api/chat-meta?canal=instagram').then(r => r.json()).then(d => setChatMeta(d.meta ?? {})).catch(() => {});
  }, []);

  const updateChatMeta = (convId: string, patch: Partial<ChatMeta>) => {
    setChatMeta(prev => {
      const current: ChatMeta = prev[convId] ?? { responsable: '', estado: 'Pendiente' };
      return { ...prev, [convId]: { ...current, ...patch } };
    });
    fetch('/api/chat-meta', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canal: 'instagram', conversationKey: convId, ...patch }),
    }).catch(() => showToast('No se pudo guardar', false));
  };

  const addQuickReply = async () => {
    if (!newQuickReply.trim()) return;
    const res = await fetch('/api/instagram/quick-replies', {
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
    await fetch(`/api/instagram/quick-replies?id=${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const startEditQuickReply = (qr: QuickReply) => {
    setEditingQuickReplyId(qr.id);
    setEditingQuickReplyText(qr.texto);
  };

  const saveEditQuickReply = async () => {
    if (!editingQuickReplyId || !editingQuickReplyText.trim()) return;
    const id = editingQuickReplyId;
    const texto = editingQuickReplyText.trim();
    try {
      const res = await fetch('/api/instagram/quick-replies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, texto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuickReplies(q => q.map(r => (r.id === id ? data.reply : r)));
      setEditingQuickReplyId(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo guardar', false);
    }
  };

  // "No leído" se calcula siempre de la misma forma, en el momento de
  // pintar la lista: la conversación se actualizó después de la última
  // vez que la abriste. Nada de contadores separados que se puedan
  // desincronizar — un solo dato de verdad (conversations + lastSeen).
  const [lastSeenTick, setLastSeenTick] = useState(0);
  const touchLastSeen = () => setLastSeenTick(t => t + 1);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, selectedId]);

  const ensureBaseline = (convs: Conversation[]) => {
    const lastSeen = readLastSeen();
    if (Object.keys(lastSeen).length > 0) return;
    // Primera vez que se usa esta pestaña: no marcamos todo el historial
    // como no leído, solo lo que llegue de aquí en adelante.
    const baseline: Record<string, string> = {};
    convs.forEach(c => { baseline[c.id] = c.updatedTime; });
    writeLastSeen(baseline);
    touchLastSeen();
  };

  const fetchingRef = useRef<Set<string>>(new Set());
  const prefetchMessages = (id: string) => {
    if (messagesCache.current[id] || fetchingRef.current.has(id)) return;
    fetchingRef.current.add(id);
    fetch(`/api/instagram/messages?conversationId=${id}`)
      .then(r => r.json())
      .then(d => { messagesCache.current[id] = d.messages ?? []; })
      .catch(() => {})
      .finally(() => fetchingRef.current.delete(id));
  };

  const loadConversations = (silent = false) => {
    fetch('/api/instagram/conversations')
      .then(r => r.json())
      .then(d => {
        const convs: Conversation[] = d.conversations ?? [];
        setConversations(convs);
        if (d.error) { if (!silent) setConfigured(false); if (!silent) showToast(d.error, false); return; }
        ensureBaseline(convs);
        // Precarga las 5 conversaciones mas recientes en segundo plano
        // para que abrirlas se sienta instantaneo.
        convs.slice(0, 5).forEach(c => prefetchMessages(c.id));
      })
      .catch(() => { if (!silent) showToast('No se pudo cargar Instagram', false); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadConversations();
    // Revisa mensajes nuevos cada 4s como respaldo garantizado, por si el
    // tiempo real (Supabase Realtime) fallara por algún motivo.
    const interval = setInterval(() => loadConversations(true), 4000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(() => {
      fetch(`/api/instagram/messages?conversationId=${selectedId}`)
        .then(r => r.json())
        .then(d => {
          const msgs: Message[] = d.messages ?? [];
          messagesCache.current[selectedId] = msgs;
          setMessages(msgs);
        })
        .catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedId]);

  // Refs para que la suscripción en tiempo real (que se arma una sola vez)
  // siempre vea el estado más reciente sin tener que reconectarse.
  const conversationsRef = useRef<Conversation[]>([]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  const fetchAndCacheMessages = (id: string) => {
    return fetch(`/api/instagram/messages?conversationId=${id}`)
      .then(r => r.json())
      .then(d => {
        const msgs: Message[] = d.messages ?? [];
        messagesCache.current[id] = msgs;
        if (selectedIdRef.current === id) setMessages(msgs);
        return msgs;
      })
      .catch(() => []);
  };

  useEffect(() => {
    const channel = supabase
      .channel('ig-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ig_events' }, payload => {
        const row = payload.new as { participant_id?: string; text_preview?: string | null; created_at?: string };
        const participantId = row.participant_id;
        if (!participantId) return;
        const conv = conversationsRef.current.find(c => c.participantId === participantId);
        if (conv) {
          playIncomingSound();
          // Adelanta la hora de esta conversación al instante, sin esperar
          // a que Instagram termine de actualizar su propio updated_time —
          // así "no leído" (que se calcula comparando esa hora) aparece de
          // inmediato en vez de depender de la API.
          const bumpedTime = row.created_at || new Date().toISOString();
          setConversations(prev => prev.map(c => (c.id === conv.id ? { ...c, updatedTime: bumpedTime } : c)));
          // El aviso de Meta ya trae el texto — lo mostramos de una vez,
          // sin esperar a volver a preguntarle a la API de Instagram.
          if (row.text_preview) {
            const optimistic: Message = {
              id: `rt-${Date.now()}`,
              fromId: conv.participantId,
              text: row.text_preview,
              shareLink: null,
              attachmentUrl: null,
              attachmentType: null,
              createdTime: row.created_at || new Date().toISOString(),
            };
            const updated = [...(messagesCache.current[conv.id] || []), optimistic];
            messagesCache.current[conv.id] = updated;
            if (selectedIdRef.current === conv.id) setMessages(updated);
          }
          fetchAndCacheMessages(conv.id);
          // Reintenta una vez mas por si era una foto/reel (sin texto) y
          // la API de Instagram todavia no lo habia indexado.
          setTimeout(() => fetchAndCacheMessages(conv.id), 2500);
        }
        loadConversations(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openConversation = (id: string) => {
    setSelectedId(id);
    const lastSeen = readLastSeen();
    lastSeen[id] = new Date().toISOString();
    writeLastSeen(lastSeen);
    touchLastSeen();
  };

  useEffect(() => {
    if (!selectedId) return;
    const cached = messagesCache.current[selectedId];
    Promise.resolve(cached).then(cachedMessages => {
      if (cachedMessages) { setMessages(cachedMessages); return; }
      return fetch(`/api/instagram/messages?conversationId=${selectedId}`)
        .then(r => r.json())
        .then(d => {
          const msgs = d.messages ?? [];
          messagesCache.current[selectedId] = msgs;
          setMessages(msgs);
        });
    }).catch(() => showToast('No se pudo cargar la conversación', false));
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = conversations.find(c => c.id === selectedId) ?? null;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- lastSeenTick es intencional, marca cuando localStorage cambió
  const lastSeenMap = useMemo(() => readLastSeen(), [lastSeenTick]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter(c => {
      const meta = chatMeta[c.id] ?? { responsable: '', estado: 'Pendiente' };
      if (q && !c.username.toLowerCase().includes(q)) return false;
      if (responsableFilter !== 'Todos' && meta.responsable !== responsableFilter) return false;
      if (estadoFilter !== 'Todos' && meta.estado !== estadoFilter) return false;
      if (soloNoLeidos) {
        const hasUnread = new Date(c.updatedTime).getTime() > new Date(lastSeenMap[c.id] || 0).getTime();
        if (!hasUnread) return false;
      }
      return true;
    });
  }, [conversations, chatMeta, search, responsableFilter, estadoFilter, soloNoLeidos, lastSeenMap]);

  // Vincular con Comercial: qué lead corresponde a este usuario de
  // Instagram, y su score de SAT si ya vino del cuestionario.
  const satCtx = useSatContext();
  const [creatingLead, setCreatingLead] = useState(false);

  const matchedLead = useMemo(() => {
    if (!selected) return null;
    return matchLeadByInstagram(satCtx.leads, selected.username);
  }, [satCtx.leads, selected]);

  const leadScore = useMemo(() => {
    if (!matchedLead || !esLeadCuestionario(matchedLead)) return null;
    const result = computeLeadScore(matchedLead, {
      nichosGanados: satCtx.nichosGanados,
      tieneReunion: satCtx.reunionLeadIds.has(matchedLead.id),
      tienePago: satCtx.pagoLeadIds.has(matchedLead.id),
      perfil: satCtx.perfil,
    });
    return { score: result.score, tier: result.tierCalculado };
  }, [matchedLead, satCtx.nichosGanados, satCtx.reunionLeadIds, satCtx.pagoLeadIds, satCtx.perfil]);

  const handleCreateLeadFromChat = async () => {
    if (!selected) return;
    setCreatingLead(true);
    try {
      const res = await fetch('/api/chat-crear-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: selected.username, instagram: selected.username, canal: 'instagram' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      satCtx.setLeads(prev => [data.lead, ...prev]);
      showToast(data.duplicate ? 'Ya existía un lead vinculado a este usuario' : 'Lead creado y vinculado');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo crear el lead', false);
    }
    setCreatingLead(false);
  };

  const pushLocalMessage = (partial: Partial<Message>) => {
    if (!selected) return;
    const newMsg: Message = {
      id: `local-${localIdCounter.current++}`,
      fromId: 'me',
      text: '',
      shareLink: null,
      attachmentUrl: null,
      attachmentType: null,
      createdTime: new Date().toISOString(),
      ...partial,
    };
    setMessages(m => {
      const updated = [...m, newMsg];
      messagesCache.current[selected.id] = updated;
      return updated;
    });
  };

  const submitReply = async (textOverride?: string) => {
    const text = textOverride ?? reply;
    if (!selected || !text.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/instagram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: selected.participantId, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      pushLocalMessage({ text });
      if (!textOverride) setReply('');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo enviar', false);
    }
    setSending(false);
  };

  const handleFileSelect = async (file: File | null) => {
    if (!file || !selected) return;
    setUploadingFile(true);
    try {
      const urlRes = await fetch('/api/instagram/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error ?? 'No se pudo preparar la subida');

      const { error: uploadError } = await supabase.storage
        .from('ig-media')
        .uploadToSignedUrl(urlData.filePath, urlData.token, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const attachmentType: 'image' | 'video' = file.type.startsWith('video') ? 'video' : 'image';
      const res = await fetch('/api/instagram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: selected.participantId, attachmentUrl: urlData.publicUrl, attachmentType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      pushLocalMessage({ attachmentUrl: urlData.publicUrl, attachmentType });
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
      // No hace falta que el navegador grabe en un formato que Instagram
      // acepte — el servidor lo convierte a AAC/m4a antes de mandarlo
      // (ver /api/instagram/transcode-audio), igual que se hace con las
      // notas de voz de WhatsApp.
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
          const transcodeRes = await fetch('/api/instagram/transcode-audio', { method: 'POST', body: blob });
          const transcodeData = await transcodeRes.json();
          if (!transcodeRes.ok) throw new Error(transcodeData.error ?? 'No se pudo convertir el audio');
          const res = await fetch('/api/instagram/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipientId: selected.participantId, attachmentUrl: transcodeData.publicUrl, attachmentType: 'audio' }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          pushLocalMessage({ attachmentUrl: transcodeData.publicUrl, attachmentType: 'audio' });
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

  return (
    <div>
      {!configured && (
        <div className="flex items-center gap-3 bg-[#FBF1E2] border border-[#F0D9A8] rounded-[14px] px-5 py-4 mb-5 text-[13.5px] text-[#8A6020] font-semibold">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A6020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M12 9v4M12 17h.01" /><circle cx="12" cy="12" r="10" /></svg>
          No se pudo conectar con Instagram. Revisa que el token de acceso siga vigente.
        </div>
      )}
      <div className="grid gap-4" style={{ gridTemplateColumns: '300px 1fr', height: '620px' }}>
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F2F5]">
            <div className="font-grotesk font-bold text-[15px] text-[#15171C]">Conversaciones</div>
            <button onClick={() => loadConversations()} title="Actualizar" className="w-8 h-8 rounded-[9px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
            </button>
          </div>
          <div className="px-4 py-3 border-b border-[#F0F2F5] flex flex-col gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por usuario…"
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
              <div className="text-center py-10 px-5 text-[13px] text-[#8A929E] font-semibold">Sin conversaciones todavía.</div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-10 px-5 text-[13px] text-[#8A929E] font-semibold">Ningún chat coincide con el filtro.</div>
            ) : (
              filteredConversations.map(c => {
                const hasUnread = new Date(c.updatedTime).getTime() > new Date(lastSeenMap[c.id] || 0).getTime();
                const meta = chatMeta[c.id];
                return (
                  <div key={c.id} onClick={() => openConversation(c.id)} onMouseEnter={() => prefetchMessages(c.id)}
                    className="px-5 py-3.5 cursor-pointer border-b border-[#F2F4F7] transition"
                    style={{
                      background: hasUnread ? '#EAF7F1' : selectedId === c.id ? '#F6F8FA' : undefined,
                      borderLeft: hasUnread ? '3px solid #1F9B6E' : '3px solid transparent',
                    }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13.5px] font-bold truncate" style={{ color: hasUnread ? '#1F9B6E' : '#15171C' }}>@{c.username}</div>
                      {hasUnread && (
                        <span className="flex-shrink-0 text-[11px] font-black text-[#1F9B6E]">Nuevo</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[11.5px] font-semibold" style={{ color: hasUnread ? '#3B8E6F' : '#9AA0A8' }}>{timeAgo(c.updatedTime)}</span>
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
                <div className="font-grotesk font-bold text-[15px] text-[#15171C]">@{selected.username}</div>
                <div className="flex items-center gap-2">
                  <Dropdown value={chatMeta[selected.id]?.responsable ?? ''} onChange={v => updateChatMeta(selected.id, { responsable: v })}
                    options={[{ value: '', label: 'Sin asignar' }, ...RESPONSABLES_CHAT.map(r => ({ value: r, label: r }))]}
                    className="h-8 bg-[#F4F6F8] border border-[#E2E5EA] rounded-[8px] px-2.5 text-[12px] font-bold text-[#3C434F] cursor-pointer outline-none" align="right" />
                  <Dropdown value={chatMeta[selected.id]?.estado || 'Pendiente'} onChange={v => updateChatMeta(selected.id, { estado: v })}
                    options={ESTADOS_CHAT}
                    style={{ background: ESTADO_CHAT_COLOR[chatMeta[selected.id]?.estado || 'Pendiente']?.bg, color: ESTADO_CHAT_COLOR[chatMeta[selected.id]?.estado || 'Pendiente']?.color }}
                    className="h-8 border-none rounded-[8px] px-2.5 text-[12px] font-black cursor-pointer outline-none" align="right" />
                </div>
              </div>
              <ChatLeadCard lead={matchedLead} score={leadScore} creating={creatingLead} onCreateLead={handleCreateLeadFromChat} />
              <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-3 bg-[#FAFBFC]">
                {messages.length === 0 ? (
                  <div className="text-center text-[13px] text-[#8A929E] font-semibold">Sin mensajes.</div>
                ) : (
                  messages.map(m => {
                    const isMe = m.fromId === selected.participantId ? false : true;
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${m.attachmentUrl ? 'p-1.5' : 'px-4 py-2.5'} whitespace-pre-wrap text-[13.5px] leading-[1.5] rounded-[14px]`}
                          style={{
                            background: isMe ? '#15171C' : '#fff',
                            color: isMe ? '#fff' : '#15171C',
                            border: isMe ? 'none' : '1px solid #ECEEF2',
                          }}>
                          {m.attachmentUrl ? (
                            m.attachmentType === 'video' ? (
                              <video src={m.attachmentUrl} controls className="rounded-[10px] max-w-full max-h-[260px]" />
                            ) : m.attachmentType === 'audio' ? (
                              <audio src={m.attachmentUrl} controls className="max-w-full" />
                            ) : (
                              <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                <img src={m.attachmentUrl} alt="Adjunto" className="rounded-[10px] max-w-full max-h-[260px] block" />
                              </a>
                            )
                          ) : m.text ? m.text : m.shareLink ? (
                            <a href={m.shareLink} target="_blank" rel="noopener noreferrer"
                              className="underline font-semibold" style={{ color: isMe ? '#9fc3e3' : '#2E6CA0' }}>
                              🔗 Ver reel / publicación compartida
                            </a>
                          ) : (
                            <span className="italic" style={{ color: isMe ? '#AEB4BE' : '#9AA0A8' }}>📎 Contenido no disponible (foto o sticker)</span>
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
                      {quickReplies.map(qr => editingQuickReplyId === qr.id ? (
                        <div key={qr.id} className="flex flex-col gap-1.5">
                          <textarea
                            value={editingQuickReplyText}
                            onChange={e => setEditingQuickReplyText(e.target.value)}
                            rows={2}
                            autoFocus
                            className="w-full px-3 py-2 border-[1.5px] border-steel rounded-[9px] text-[12.5px] font-medium outline-none text-[#15171C] resize-none" />
                          <div className="flex gap-1.5">
                            <button onClick={saveEditQuickReply} disabled={!editingQuickReplyText.trim()}
                              className="flex-1 h-8 bg-[#15171C] text-white border-none rounded-[8px] cursor-pointer font-bold text-[11.5px] disabled:opacity-50 disabled:cursor-not-allowed">
                              Guardar
                            </button>
                            <button onClick={() => setEditingQuickReplyId(null)}
                              className="flex-1 h-8 bg-[#F4F6F8] text-[#5A6270] border-none rounded-[8px] cursor-pointer font-bold text-[11.5px]">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div key={qr.id} className="flex items-center gap-1.5 group">
                          <button
                            onClick={() => { submitReply(qr.texto); setShowQuickReplies(false); }}
                            className="flex-1 text-left px-3 py-2 bg-[#F4F6F8] hover:bg-[#EAF1F8] rounded-[9px] text-[12.5px] font-medium text-[#15171C] border-none cursor-pointer truncate">
                            {qr.texto}
                          </button>
                          <button onClick={() => startEditQuickReply(qr)} title="Editar"
                            className="flex-shrink-0 w-7 h-7 rounded-[7px] bg-transparent border-none text-[#C2C8D2] hover:text-[#2E6CA0] hover:bg-[#EAF1F8] cursor-pointer flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
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
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden"
                    onChange={e => handleFileSelect(e.target.files?.[0] ?? null)} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} title="Enviar foto o video"
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
