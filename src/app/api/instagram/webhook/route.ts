import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Verificación del webhook (Meta llama a esto una vez al configurarlo).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

interface MessagingEvent { sender?: { id?: string }; message?: { text?: string } }
interface WebhookEntry { messaging?: MessagingEvent[] }

// Meta llama a esto al instante cada vez que llega un mensaje nuevo, y ya
// trae el texto adentro del aviso. Guardamos ese texto junto con la señal
// para mostrarlo de inmediato en el panel sin tener que volver a
// preguntarle a la API de Instagram (que a veces tarda unos segundos en
// tener el mensaje listo para leer). Poco después igual se refresca con
// la version definitiva de la API, por si era una foto/reel compartido
// en vez de texto plano.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (body) {
    console.log('[instagram/webhook]', JSON.stringify(body));
    try {
      const selfId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '';
      const entries: WebhookEntry[] = body.entry ?? [];
      const events: { participant_id: string; text_preview: string | null }[] = [];
      for (const entry of entries) {
        for (const m of entry.messaging ?? []) {
          const senderId = m.sender?.id;
          if (senderId && senderId !== selfId) {
            events.push({ participant_id: senderId, text_preview: m.message?.text ?? null });
          }
        }
      }
      if (events.length > 0) {
        await supabaseAdmin.from('ig_events').insert(events);
      }
    } catch (e) {
      console.error('[instagram/webhook] no se pudo registrar la señal:', e instanceof Error ? e.message : String(e));
    }
  }
  return NextResponse.json({ received: true });
}
