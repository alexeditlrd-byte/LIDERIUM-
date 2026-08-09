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
}
interface WAContact { wa_id: string; profile?: { name?: string } }
interface WAValue { messages?: WAMessage[]; contacts?: WAContact[] }
interface WAChange { value: WAValue }
interface WAEntry { changes: WAChange[] }

// Mensajes de foto/video/documento no traen una URL directa — hay que
// pedirle a Meta la URL temporal del archivo con su media id.
async function resolveMediaUrl(mediaId: string): Promise<string | null> {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const res = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.url ?? null;
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
          for (const m of messages) {
            const contactName = contacts.find(c => c.wa_id === m.from)?.profile?.name ?? '';
            let text = m.text?.body ?? '';
            let mediaUrl: string | null = null;
            let mediaType: string | null = null;

            if (m.type === 'image' && m.image) {
              mediaType = 'image';
              mediaUrl = await resolveMediaUrl(m.image.id);
              if (m.image.caption) text = m.image.caption;
            } else if (m.type === 'video' && m.video) {
              mediaType = 'video';
              mediaUrl = await resolveMediaUrl(m.video.id);
              if (m.video.caption) text = m.video.caption;
            } else if (m.type === 'document' && m.document) {
              mediaType = 'document';
              mediaUrl = await resolveMediaUrl(m.document.id);
              text = m.document.filename ?? text;
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
