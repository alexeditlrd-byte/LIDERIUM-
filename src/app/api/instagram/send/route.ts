import { NextRequest, NextResponse } from 'next/server';
import { sendMessage, sendAttachment } from '@/lib/instagram';

export async function POST(req: NextRequest) {
  const { recipientId, text, attachmentUrl, attachmentType } = await req.json();
  if (!recipientId) return NextResponse.json({ error: 'Falta destinatario' }, { status: 400 });
  try {
    if (attachmentUrl) {
      await sendAttachment(recipientId, attachmentUrl, attachmentType === 'video' ? 'video' : 'image');
    } else if (text?.trim()) {
      await sendMessage(recipientId, text.trim());
    } else {
      return NextResponse.json({ error: 'Falta mensaje o archivo' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 502 });
  }
}
