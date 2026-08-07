import { NextRequest, NextResponse } from 'next/server';

const TOKEN = 'b9f1c4e8a2d670135fe94ac8b3d0271e6a5c9847f0123def';

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.access_token;
}

export async function POST(req: NextRequest) {
  const { token, meetingCode } = await req.json();
  if (token !== TOKEN) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const accessToken = await getAccessToken();
  const res = await fetch(`https://meet.googleapis.com/v2/spaces/${meetingCode}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  return NextResponse.json({ status: res.status, data });
}
