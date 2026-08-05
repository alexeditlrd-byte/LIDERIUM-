import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/instagram';

export async function POST(req: NextRequest) {
  const { recipientId, text } = await req.json();
  if (!recipientId || !text?.trim()) return NextResponse.json({ error: 'Falta destinatario o mensaje' }, { status: 400 });
  try {
    await sendMessage(recipientId, text.trim());
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 502 });
  }
}
