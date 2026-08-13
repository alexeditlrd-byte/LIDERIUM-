import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token !== 'liderium-tmp-check') return NextResponse.json({ error: 'no' }, { status: 403 });

  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  // Borra las dos plantillas que quedaron mal (texto corto viejo).
  const del1 = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=hola_reactivar_lead`, { method: 'DELETE', headers });
  const del2 = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=saludo_reactivacion`, { method: 'DELETE', headers });

  const createRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'reactivar_lead_v2',
      language: 'es_PE',
      category: 'MARKETING',
      components: [{ type: 'BODY', text: '¡Hola! 👋 ¿Cómo vas? Quedé pendiente de tu respuesta, avísame si seguimos.' }],
    }),
  });
  const createData = await createRes.json();

  return NextResponse.json({
    deleted: { del1: await del1.json(), del2: await del2.json() },
    created: { status: createRes.status, data: createData },
  });
}
