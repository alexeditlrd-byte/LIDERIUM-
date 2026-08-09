import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('token') !== 'diag2026liderium') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/whatsapp_business_profile`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      about: 'Disponible',
      description: 'escriben los guiones adaptados a las tendencias actuales para maximizar las probabilidades de que los videos se vuelvan virales sin necesidad de pagar publicidad (100% orgánico).',
      vertical: 'EVENT_PLAN',
      email: 'contacto@liderium.com',
      websites: ['https://liderium.vercel.app/'],
      address: '',
    }),
  });
  const data = await res.json();
  return NextResponse.json({ status: res.status, data });
}
