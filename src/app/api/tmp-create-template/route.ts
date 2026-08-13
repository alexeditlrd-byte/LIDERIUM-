import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token !== 'liderium-tmp-check') return NextResponse.json({ error: 'no' }, { status: 403 });

  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'seguimiento_envio_archivo',
      language: 'es_PE',
      category: 'MARKETING',
      components: [{ type: 'BODY', text: '¡Hola! 👋 ¿Cómo vas? Necesito que me respondas para poder enviarte el archivo que quedamos en la reunión.' }],
    }),
  });
  const data = await res.json();
  return NextResponse.json({ status: res.status, data });
}
