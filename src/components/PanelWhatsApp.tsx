'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
      const newMsg: Message = {
        id: `local-${localIdCounter.current++}`,
        direction: 'out',
        text,
        mediaUrl: null,
        mediaType: null,
        createdTime: new Date().toISOString(),
      };
      setMessages(m => {
        const updated = [...m, newMsg];
        messagesCache.current[selected.phone] = updated;
        return updated;
      });
      setReply('');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo enviar', false);
    }
    setSending(false);
  };

  return (
    <div>
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
              <div className="px-6 py-4 border-t border-[#F0F2F5]">
                <div className="flex gap-[10px]">
                  <input
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitReply(); }}
                    placeholder="Escribe una respuesta…"
                    className="flex-1 h-11 px-4 border-[1.5px] border-[#E2E5EA] rounded-[12px] text-[13.5px] font-medium outline-none bg-[#FAFBFC] text-[#15171C] focus:border-steel focus:bg-white transition"
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
    </div>
  );
}
