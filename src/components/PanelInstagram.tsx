'use client';

import { useEffect, useRef, useState } from 'react';

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

export default function PanelInstagram({ showToast }: { showToast: (text: string, ok?: boolean) => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const messagesCache = useRef<Record<string, Message[]>>({});

  const loadConversations = () => {
    fetch('/api/instagram/conversations')
      .then(r => r.json())
      .then(d => {
        setConversations(d.conversations ?? []);
        if (d.error) { setConfigured(false); showToast(d.error, false); }
      })
      .catch(() => showToast('No se pudo cargar Instagram', false))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadConversations(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
            <button onClick={loadConversations} title="Actualizar" className="w-8 h-8 rounded-[9px] bg-[#F4F6F8] border-none cursor-pointer flex items-center justify-center text-[#5A6270] hover:bg-[#ECEEF2]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-10 text-[13px] text-[#8A929E] font-semibold">Cargando…</div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-10 px-5 text-[13px] text-[#8A929E] font-semibold">Sin conversaciones todavía.</div>
            ) : (
              conversations.map(c => (
                <div key={c.id} onClick={() => setSelectedId(c.id)}
                  className={`px-5 py-3.5 cursor-pointer border-b border-[#F2F4F7] transition ${selectedId === c.id ? 'bg-[#F6F8FA]' : 'hover:bg-[#FAFBFC]'}`}>
                  <div className="text-[13.5px] font-bold text-[#15171C]">@{c.username}</div>
                  <div className="text-[11.5px] text-[#9AA0A8] font-semibold">{timeAgo(c.updatedTime)}</div>
                </div>
              ))
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
