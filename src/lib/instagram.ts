// Puente hacia la API de Instagram (Messaging) para leer y responder los DMs
// de una cuenta de Instagram Business conectada (ver docs/instagram-api.md).
// Se lee en vivo directo de Meta, sin guardar copia local de los mensajes.

const GRAPH = 'https://graph.instagram.com/v21.0';

function accessToken() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error('INSTAGRAM_ACCESS_TOKEN no está configurado');
  return token;
}

export interface IGConversation {
  id: string;
  participantId: string;
  username: string;
  updatedTime: string;
}

export interface IGMessage {
  id: string;
  fromId: string;
  text: string;
  createdTime: string;
}

async function igFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${GRAPH}${path}`);
  url.searchParams.set('access_token', accessToken());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || 'Error al hablar con la API de Instagram');
  return data;
}

interface RawParticipant { id: string; username: string; }
interface RawConversation { id: string; updated_time: string; participants?: { data: RawParticipant[] } }
interface RawMessage { id: string; from?: { id: string }; message?: string; created_time: string }

export async function listConversations(): Promise<IGConversation[]> {
  const data = await igFetch('/me/conversations', { fields: 'participants,updated_time' });
  const selfId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '';
  return ((data.data ?? []) as RawConversation[]).map((c) => {
    const participants = c.participants?.data ?? [];
    const other = participants.find((p) => p.id !== selfId) ?? participants[0];
    return {
      id: c.id,
      participantId: other?.id ?? '',
      username: other?.username ?? 'Desconocido',
      updatedTime: c.updated_time,
    };
  });
}

export async function getMessages(conversationId: string): Promise<IGMessage[]> {
  const data = await igFetch(`/${conversationId}`, { fields: 'messages{id,from,message,created_time}' });
  const messages = (data.messages?.data ?? []) as RawMessage[];
  return messages
    .map((m) => ({ id: m.id, fromId: m.from?.id ?? '', text: m.message ?? '', createdTime: m.created_time }))
    .reverse();
}

export async function sendMessage(recipientId: string, text: string): Promise<void> {
  const url = new URL(`${GRAPH}/me/messages`);
  url.searchParams.set('access_token', accessToken());
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || 'No se pudo enviar el mensaje de Instagram');
}
