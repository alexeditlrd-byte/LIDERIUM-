import { NextRequest, NextResponse } from 'next/server';
import { getMessages } from '@/lib/instagram';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');
  if (!conversationId) return NextResponse.json({ error: 'Falta conversationId' }, { status: 400 });
  try {
    const messages = await getMessages(conversationId);
    return NextResponse.json({ messages });
  } catch (e) {
    return NextResponse.json({ messages: [], error: e instanceof Error ? e.message : 'Error' }, { status: 502 });
  }
}
