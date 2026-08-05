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

interface MessagingEvent { sender?: { id?: string } }
interface WebhookEntry { messaging?: MessagingEvent[] }

// Meta llama a esto al instante cada vez que llega un mensaje nuevo.
// Guardamos una señal chiquita en Supabase (solo el id de quien escribió)
// para que el panel se entere en tiempo real vía Supabase Realtime, sin
// tener que esperar al siguiente ciclo de polling. El contenido real del
// mensaje se sigue leyendo en vivo de la API de Instagram, no se duplica.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (body) {
    console.log('[instagram/webhook]', JSON.stringify(body));
    try {
      const selfId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '';
      const entries: WebhookEntry[] = body.entry ?? [];
      const participantIds = new Set<string>();
      for (const entry of entries) {
        for (const m of entry.messaging ?? []) {
          const senderId = m.sender?.id;
          if (senderId && senderId !== selfId) participantIds.add(senderId);
        }
      }
      if (participantIds.size > 0) {
        await supabaseAdmin.from('ig_events').insert(
          [...participantIds].map(participant_id => ({ participant_id }))
        );
      }
    } catch (e) {
      console.error('[instagram/webhook] no se pudo registrar la señal:', e instanceof Error ? e.message : String(e));
    }
  }
  return NextResponse.json({ received: true });
}
