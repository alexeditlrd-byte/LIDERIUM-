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

export async function sendMedia(to: string, mediaUrl: string, type: 'image' | 'video' | 'document' | 'audio'): Promise<void> {
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

// Perfil de negocio (lo que ve el cliente al abrir "Info. del contacto"
// en su WhatsApp): foto, descripción, categoría, correo, web, dirección.
export interface BusinessProfile {
  about: string;
  address: string;
  description: string;
  email: string;
  profilePictureUrl: string;
  websites: string[];
  vertical: string;
}

export async function getBusinessProfile(): Promise<BusinessProfile> {
  const url = `${GRAPH}/${phoneNumberId()}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken()}` } });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || 'No se pudo leer el perfil de WhatsApp');
  const p = data.data?.[0] ?? {};
  return {
    about: p.about ?? '',
    address: p.address ?? '',
    description: p.description ?? '',
    email: p.email ?? '',
    profilePictureUrl: p.profile_picture_url ?? '',
    websites: p.websites ?? [],
    vertical: p.vertical ?? '',
  };
}

export async function updateBusinessProfile(fields: Partial<Omit<BusinessProfile, 'profilePictureUrl'>>): Promise<void> {
  const body: Record<string, unknown> = { messaging_product: 'whatsapp' };
  if (fields.about !== undefined) body.about = fields.about;
  if (fields.address !== undefined) body.address = fields.address;
  if (fields.description !== undefined) body.description = fields.description;
  if (fields.email !== undefined) body.email = fields.email;
  if (fields.websites !== undefined) body.websites = fields.websites;
  if (fields.vertical !== undefined) body.vertical = fields.vertical;

  const url = `${GRAPH}/${phoneNumberId()}/whatsapp_business_profile`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || 'No se pudo actualizar el perfil de WhatsApp');
}

// La foto de perfil no se puede mandar directo — hay que subirla con la
// "Resumable Upload API" de Meta (3 pasos) y recién ahí queda un
// "handle" que sí acepta whatsapp_business_profile.
export async function updateProfilePicture(buffer: Buffer, mimeType: string): Promise<void> {
  const appId = process.env.WHATSAPP_APP_ID;
  if (!appId) throw new Error('WHATSAPP_APP_ID no está configurado');
  const token = accessToken();

  const sessionRes = await fetch(
    `${GRAPH}/${appId}/uploads?file_length=${buffer.length}&file_type=${encodeURIComponent(mimeType)}&access_token=${token}`,
    { method: 'POST' }
  );
  const sessionData = await sessionRes.json();
  if (!sessionRes.ok || sessionData.error) throw new Error(sessionData.error?.message || 'No se pudo iniciar la subida de la foto');
  const uploadSessionId: string = sessionData.id;

  const uploadRes = await fetch(`${GRAPH}/${uploadSessionId}`, {
    method: 'POST',
    headers: { Authorization: `OAuth ${token}`, file_offset: '0', 'Content-Type': 'application/octet-stream' },
    body: new Uint8Array(buffer),
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok || uploadData.error) throw new Error(uploadData.error?.message || 'No se pudo subir la foto');
  const handle: string = uploadData.h;

  await updateBusinessProfileRaw({ profile_picture_handle: handle });
}

async function updateBusinessProfileRaw(extra: Record<string, unknown>): Promise<void> {
  const url = `${GRAPH}/${phoneNumberId()}/whatsapp_business_profile`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...extra }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || 'No se pudo actualizar la foto de perfil');
}
