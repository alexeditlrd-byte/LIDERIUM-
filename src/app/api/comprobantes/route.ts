import { NextResponse } from 'next/server';

export async function GET() {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl) return NextResponse.json({ comprobantes: [] });

  try {
    const res = await fetch(scriptUrl, { redirect: 'follow' });
    const data = await res.json();
    return NextResponse.json({ comprobantes: data.comprobantes ?? [] });
  } catch {
    return NextResponse.json({ comprobantes: [] });
  }
}
