import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token !== 'liderium-tmp-check') return NextResponse.json({ error: 'no' }, { status: 403 });

  const res = await fetch(`https://${req.headers.get('host')}/api/cron/alertas-diarias`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const data = await res.json();
  return NextResponse.json({ status: res.status, data });
}
