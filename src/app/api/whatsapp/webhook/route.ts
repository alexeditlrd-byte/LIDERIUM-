import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Verificación del webhook (Meta llama a esto una vez al configurarlo).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

interface WAMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string };
  video?: { id: string; caption?: string };
  document?: { id: string; caption?: string; filename?: string };
  audio?: { id: string };
  sticker?: { id: string };
}
interface WAContact { wa_id: string; profile?: { name?: string } }
interface WAStatus { id: string; status: string }
interface WAValue { messages?: WAMessage[]; contacts?: WAContact[]; statuses?: WAStatus[] }
interface WAChange { value: WAValue }
interface WAEntry { changes: WAChange[] }

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/3gpp': '3gp',
  'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/amr': 'amr',
  'application/pdf': 'pdf',
};

function safeFileName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

// El link que Meta devuelve para un adjunto entrante exige el token de
// acceso para descargarse y expira en minutos — el navegador del panel
// no puede mostrarlo directo. Hay que bajarlo del lado del servidor (con
// el token) y resubirlo a nuestro storage público (mismo bucket que ya
// usan los archivos salientes) para que quede viendo siempre, como en
// WhatsApp Web.
async function rehostMedia(mediaId: string, suggestedName?: string): Promise<string | null> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  try {
    const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meta = await metaRes.json();
    if (!meta.url) return null;

    const fileRes = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` } });
    if (!fileRes.ok) return null;
    const buffer = Buffer.from(await fileRes.arrayBuffer());

    const ext = EXT_BY_MIME[meta.mime_type] ?? '';
    const name = suggestedName ? safeFileName(suggestedName) : `${mediaId}${ext ? `.${ext}` : ''}`;
    const filePath = `in_${Date.now()}_${name}`;

    await supabaseAdmin.storage.createBucket('wa-media', { public: true, fileSizeLimit: '50MB' }).catch(() => {});
    const { error } = await supabaseAdmin.storage.from('wa-media').upload(filePath, buffer, {
      contentType: meta.mime_type || 'application/octet-stream',
      upsert: true,
    });
    if (error) return null;

    const { data } = supabaseAdmin.storage.from('wa-media').getPublicUrl(filePath);
    return data.publicUrl;
  } catch {
    return null;
  }
}

// Mensajes que llegan por webhook, en vivo — es la única fuente del
// historial de WhatsApp (no hay endpoint para "traer conversaciones
// viejas" como en Instagram), así que cada mensaje se guarda tal cual.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (body) {
    try {
      const entries: WAEntry[] = body.entry ?? [];
      for (const entry of entries) {
        for (const change of entry.changes ?? []) {
          const messages = change.value.messages ?? [];
          const contacts = change.value.contacts ?? [];
          const statuses = change.value.statuses ?? [];

          // Confirmaciones de entrega/lectura de mensajes que nosotros
          // mandamos — se enlazan con la fila guardada en /api/whatsapp/send
          // por el wa_message_id que Meta le puso a cada mensaje.
          for (const s of statuses) {
            await supabaseAdmin.from('whatsapp_messages').update({ status: s.status }).eq('wa_message_id', s.id);
          }

          for (const m of messages) {
            const contactName = contacts.find(c => c.wa_id === m.from)?.profile?.name ?? '';
            let text = m.text?.body ?? '';
            let mediaUrl: string | null = null;
            let mediaType: string | null = null;

            if (m.type === 'image' && m.image) {
              mediaType = 'image';
              mediaUrl = await rehostMedia(m.image.id);
              if (m.image.caption) text = m.image.caption;
            } else if (m.type === 'video' && m.video) {
              mediaType = 'video';
              mediaUrl = await rehostMedia(m.video.id);
              if (m.video.caption) text = m.video.caption;
            } else if (m.type === 'document' && m.document) {
              mediaType = 'document';
              mediaUrl = await rehostMedia(m.document.id, m.document.filename);
              text = m.document.filename ?? text;
            } else if (m.type === 'audio' && m.audio) {
              mediaType = 'audio';
              mediaUrl = await rehostMedia(m.audio.id);
            } else if (m.type === 'sticker' && m.sticker) {
              mediaType = 'image';
              mediaUrl = await rehostMedia(m.sticker.id);
            }

            await supabaseAdmin.from('whatsapp_messages').insert({
              wa_message_id: m.id,
              phone: m.from,
              contact_name: contactName,
              direction: 'in',
              text,
              media_url: mediaUrl,
              media_type: mediaType,
              created_at: new Date(Number(m.timestamp) * 1000).toISOString(),
            });
          }
        }
      }
    } catch (e) {
      console.error('[whatsapp/webhook] no se pudo guardar el mensaje:', e instanceof Error ? e.message : String(e));
    }
  }
  return NextResponse.json({ received: true });
}
