// Puente hacia la API de WhatsApp Business (Cloud API). A diferencia de
// Instagram, WhatsApp NO tiene un endpoint para "traer las conversaciones
// existentes" — los mensajes solo llegan por webhook en tiempo real, así
// que acá el historial se arma guardando cada mensaje (entrante y
// saliente) en Supabase (tabla whatsapp_messages), no leyendo en vivo de Meta.

const GRAPH = 'https://graph.facebook.com/v21.0';

function accessToken() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error('WHATSAPP_ACCESS_TOKEN no está configurado');
  return token;
}

function phoneNumberId() {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!id) throw new Error('WHATSAPP_PHONE_NUMBER_ID no está configurado');
  return id;
}

export async function sendText(to: string, text: string): Promise<void> {
  const url = `${GRAPH}/${phoneNumberId()}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    const msg = data.error?.message || 'No se pudo enviar el mensaje de WhatsApp';
    // Fuera de la ventana de 24h desde el último mensaje del cliente, Meta
    // exige usar una plantilla aprobada en vez de texto libre.
    if (data.error?.code === 131047 || /24 hour/i.test(msg)) {
      throw new Error('Han pasado más de 24h desde el último mensaje del cliente — WhatsApp exige una plantilla aprobada para reabrir la conversación.');
    }
    throw new Error(msg);
  }
}

export async function sendMedia(to: string, mediaUrl: string, type: 'image' | 'video' | 'document'): Promise<void> {
  const url = `${GRAPH}/${phoneNumberId()}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type,
      [type]: { link: mediaUrl },
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || 'No se pudo enviar el archivo de WhatsApp');
}
