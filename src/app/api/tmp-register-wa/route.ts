import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token !== 'liderium-tmp-check') return NextResponse.json({ error: 'no' }, { status: 403 });

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', pin: '246813' }),
  });
  const data = await res.json();
  return NextResponse.json({ status: res.status, data });
}
