import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('token') !== 'diag2026liderium') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (searchParams.get('action') === 'subscribe') {
    const subscribeRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const subscribeData = await subscribeRes.json();
    return NextResponse.json({ subscribeResult: subscribeData });
  }

  const subRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const subData = await subRes.json();

  const phoneRes = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const phoneData = await phoneRes.json();

  return NextResponse.json({ subscribedApps: subData, phoneInfo: phoneData });
}
