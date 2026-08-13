import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token !== 'liderium-tmp-check') return NextResponse.json({ error: 'no' }, { status: 403 });

  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  const res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'hola_reactivar_lead',
      language: 'es_PE',
      category: 'MARKETING',
      components: [{ type: 'BODY', text: '¡Hola! 👋' }],
    }),
  });
  const data = await res.json();
  return NextResponse.json({ status: res.status, data });
}
