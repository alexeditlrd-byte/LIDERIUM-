import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token !== 'liderium-tmp-check') return NextResponse.json({ error: 'no' }, { status: 403 });
  return NextResponse.json({ secret: process.env.MANYCHAT_WEBHOOK_SECRET });
}
