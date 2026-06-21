import { NextResponse } from 'next/server';

export const revalidate = 30; // caché 30 segundos en Vercel

export async function GET() {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl) return NextResponse.json({ comprobantes: [] });

  try {
    const res = await fetch(scriptUrl, {
      redirect: 'follow',
      next: { revalidate: 30 },
    });
    const data = await res.json();
    return NextResponse.json(
      { comprobantes: data.comprobantes ?? [] },
      { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } }
    );
  } catch {
    return NextResponse.json({ comprobantes: [] });
  }
}
