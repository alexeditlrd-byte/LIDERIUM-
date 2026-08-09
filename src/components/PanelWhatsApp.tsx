'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Dropdown from '@/components/Dropdown';

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

interface Message {
  id: string;
  direction: 'in' | 'out';
  text: string;
  mediaUrl: string | null;
  mediaType: string | null;
  createdTime: string;
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

  const openConversation = (phone: string) => {
    setSelectedPhone(phone);
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

  const selected = conversations.find(c => c.phone === selectedPhone) ?? null;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- lastSeenTick es intencional, marca cuando localStorage cambió
  const lastSeenMap = useMemo(() => readLastSeen(), [lastSeenTick]);

  const pushLocalMessage = (partial: Partial<Message>) => {
    if (!selected) return;
    const newMsg: Message = {
      id: `local-${localIdCounter.current++}`,
      direction: 'out',
      text: '',
      mediaUrl: null,
      mediaType: null,
      createdTime: new Date().toISOString(),
      ...partial,
    };
    setMessages(m => {
      const updated = [...m, newMsg];
      messagesCache.current[selected.phone] = updated;
      return updated;
    });
  };

  const submitReply = async () => {
    const text = reply;
    if (!selected || !text.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: selected.phone, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      pushLocalMessage({ text });
      setReply('');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo enviar', false);
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

    const { error: uploadError } = await supabase.storage.from('wa-media').uploadToSignedUrl(urlData.filePath, urlData.token, file);
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
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus' : 'audio/webm;codecs=opus';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `nota-de-voz.${ext}`, { type: mimeType });
        setSendingVoice(true);
        try {
          await uploadAndSend(file, 'audio');
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
      <div className="flex items-center justify-end mb-4">
        <button onClick={openProfileModal} className="flex items-center gap-2 bg-white text-[#15171C] border border-[#E2E5EA] font-bold text-[13px] px-4 py-[9px] rounded-[10px] cursor-pointer hover:border-steel transition">
          ⚙️ Perfil del negocio
        </button>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: '300px 1fr', height: '620px' }}>
        <div className="bg-white border border-[#ECEEF2] rounded-[20px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F2F5]">
            <div className="font-grotesk font-bold text-[15px] text-[#15171C]">Conversaciones</div>
            <button onClick={() => loadConversations()} title="Actualizar" className="w-8 h-8 rounded-[9px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-10 text-[13px] text-[#8A929E] font-semibold">Cargando…</div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-10 px-5 text-[13px] text-[#8A929E] font-semibold">Sin conversaciones todavía. En cuanto alguien te escriba por WhatsApp, va a aparecer aquí.</div>
            ) : (
              conversations.map(c => {
                const hasUnread = new Date(c.updatedTime).getTime() > new Date(lastSeenMap[c.phone] || 0).getTime();
                return (
                  <div key={c.phone} onClick={() => openConversation(c.phone)}
                    className="px-5 py-3.5 cursor-pointer border-b border-[#F2F4F7] transition"
                    style={{
                      background: hasUnread ? '#EAF7F1' : selectedPhone === c.phone ? '#F6F8FA' : undefined,
                      borderLeft: hasUnread ? '3px solid #1F9B6E' : '3px solid transparent',
                    }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13.5px] font-bold truncate" style={{ color: hasUnread ? '#1F9B6E' : '#15171C' }}>{c.contactName}</div>
                      {hasUnread && (
                        <span className="flex-shrink-0 text-[11px] font-black text-[#1F9B6E]">Nuevo</span>
                      )}
                    </div>
                    <div className="text-[11.5px] font-semibold truncate" style={{ color: hasUnread ? '#3B8E6F' : '#9AA0A8' }}>{c.lastText || '—'}</div>
                    <div className="text-[10.5px] font-semibold text-[#C2C8D2] mt-0.5">{timeAgo(c.updatedTime)}</div>
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
              <div className="px-6 py-4 border-b border-[#F0F2F5]">
                <div className="font-grotesk font-bold text-[15px] text-[#15171C]">{selected.contactName}</div>
                <div className="text-[11.5px] text-[#9AA0A8] font-semibold">{selected.phone}</div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-3 bg-[#FAFBFC]">
                {messages.length === 0 ? (
                  <div className="text-center text-[13px] text-[#8A929E] font-semibold">Sin mensajes.</div>
                ) : (
                  messages.map(m => {
                    const isMe = m.direction === 'out';
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
                          ) : m.text ? m.text : (
                            <span className="italic" style={{ color: isMe ? '#AEB4BE' : '#9AA0A8' }}>📎 Contenido no disponible</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="relative px-6 py-4 border-t border-[#F0F2F5]">
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
                  <input
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitReply(); }}
                    placeholder={recording ? 'Grabando nota de voz…' : 'Escribe una respuesta…'}
                    disabled={recording}
                    className="flex-1 h-11 px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[13.5px] font-medium outline-none bg-[#FAFBFC] text-[#15171C] focus:border-steel focus:bg-white transition disabled:opacity-60"
                  />
                  <button onClick={submitReply} disabled={sending || !reply.trim()}
                    className="h-11 px-5 bg-[#15171C] text-white border-none rounded-[12px] cursor-pointer font-bold text-[13px] hover:bg-steel transition disabled:opacity-50 disabled:cursor-not-allowed">
                    {sending ? 'Enviando…' : 'Enviar'}
                  </button>
                </div>
                <p className="text-[11.5px] text-[#9AA0A8] font-semibold mt-2">Solo se pueden mandar mensajes libres dentro de las 24h desde el último mensaje del cliente. Fuera de ese margen, WhatsApp exige una plantilla aprobada.</p>
              </div>
            </>
          )}
        </div>
      </div>

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
