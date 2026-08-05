'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Conversation {
  id: string;
  participantId: string;
  username: string;
  updatedTime: string;
}

interface Message {
  id: string;
  fromId: string;
  text: string;
  shareLink: string | null;
  createdTime: string;
}

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
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, selectedId]);

  const computeUnread = (convs: Conversation[]) => {
    const lastSeen = readLastSeen();
    if (Object.keys(lastSeen).length === 0) {
      // Primera vez que se usa esta pestaña: no marcamos todo el historial
      // como no leído, solo lo que llegue de aquí en adelante.
      const baseline: Record<string, string> = {};
      convs.forEach(c => { baseline[c.id] = c.updatedTime; });
      writeLastSeen(baseline);
      setUnreadCounts({});
      return;
    }
    convs
      .filter(c => new Date(c.updatedTime) > new Date(lastSeen[c.id] || 0))
      .forEach(c => {
        fetch(`/api/instagram/messages?conversationId=${c.id}`)
          .then(r => r.json())
          .then(d => {
            const msgs: Message[] = d.messages ?? [];
            messagesCache.current[c.id] = msgs;
            const since = new Date(lastSeen[c.id] || 0);
            const count = msgs.filter(m => m.fromId === c.participantId && new Date(m.createdTime) > since).length;
            if (count > 0) setUnreadCounts(prev => ({ ...prev, [c.id]: count }));
          })
          .catch(() => {});
      });
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
        computeUnread(convs);
        // Precarga las 5 conversaciones mas recientes en segundo plano
        // para que abrirlas se sienta instantaneo.
        convs.slice(0, 5).forEach(c => prefetchMessages(c.id));
      })
      .catch(() => { if (!silent) showToast('No se pudo cargar Instagram', false); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadConversations();
    // Revisa mensajes nuevos cada 10s sin que el comercial tenga que
    // apretar refrescar — así se sienten como si llegaran en el momento.
    const interval = setInterval(() => loadConversations(true), 10000);
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
        const participantId = (payload.new as { participant_id?: string }).participant_id;
        if (!participantId) return;
        const conv = conversationsRef.current.find(c => c.participantId === participantId);
        if (conv) {
          // Marca no leido al instante (sin esperar a comparar fechas con
          // Instagram, que a veces tarda un par de segundos en actualizarse).
          if (selectedIdRef.current !== conv.id) {
            setUnreadCounts(prev => ({ ...prev, [conv.id]: (prev[conv.id] || 0) + 1 }));
          }
          fetchAndCacheMessages(conv.id);
          // Reintenta una vez mas por si Instagram todavia no habia
          // indexado el mensaje en el primer intento.
          setTimeout(() => fetchAndCacheMessages(conv.id), 2500);
        }
        loadConversations(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openConversation = (id: string) => {
    setSelectedId(id);
    setUnreadCounts(prev => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    const lastSeen = readLastSeen();
    lastSeen[id] = new Date().toISOString();
    writeLastSeen(lastSeen);
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

  const submitReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/instagram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: selected.participantId, text: reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const newMsg = { id: `local-${Date.now()}`, fromId: 'me', text: reply, shareLink: null, createdTime: new Date().toISOString() };
      setMessages(m => {
        const updated = [...m, newMsg];
        messagesCache.current[selected.id] = updated;
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
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-10 text-[13px] text-[#8A929E] font-semibold">Cargando…</div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-10 px-5 text-[13px] text-[#8A929E] font-semibold">Sin conversaciones todavía.</div>
            ) : (
              conversations.map(c => {
                const hasUnread = !!unreadCounts[c.id];
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
                        <span className="flex-shrink-0 text-[11px] font-black text-[#1F9B6E]">
                          {unreadCounts[c.id]} nuevo{unreadCounts[c.id] > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] font-semibold" style={{ color: hasUnread ? '#3B8E6F' : '#9AA0A8' }}>{timeAgo(c.updatedTime)}</div>
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
                <div className="font-grotesk font-bold text-[15px] text-[#15171C]">@{selected.username}</div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-3 bg-[#FAFBFC]">
                {messages.length === 0 ? (
                  <div className="text-center text-[13px] text-[#8A929E] font-semibold">Sin mensajes.</div>
                ) : (
                  messages.map(m => {
                    const isMe = m.fromId === selected.participantId ? false : true;
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[70%] px-4 py-2.5 whitespace-pre-wrap text-[13.5px] leading-[1.5] rounded-[14px]"
                          style={{
                            background: isMe ? '#15171C' : '#fff',
                            color: isMe ? '#fff' : '#15171C',
                            border: isMe ? 'none' : '1px solid #ECEEF2',
                          }}>
                          {m.text ? m.text : m.shareLink ? (
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
              <div className="flex gap-[10px] px-6 py-4 border-t border-[#F0F2F5]">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
