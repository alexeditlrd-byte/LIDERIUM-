import { NextRequest, NextResponse } from 'next/server';

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

// Meta llama a esto cada vez que hay un mensaje/evento nuevo. Solo hace
// falta responder 200 rápido — la app de Liderium lee las conversaciones
// en vivo directo de la API cuando alguien abre la pestaña de Instagram,
// no dependemos de guardar cada evento que llega aquí.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (body) console.log('[instagram/webhook]', JSON.stringify(body));
  return NextResponse.json({ received: true });
}
