import { NextResponse } from 'next/server';
import { listConversations } from '@/lib/instagram';

export async function GET() {
  try {
    const conversations = await listConversations();
    return NextResponse.json({ conversations });
  } catch (e) {
    return NextResponse.json({ conversations: [], error: e instanceof Error ? e.message : 'Error' }, { status: 502 });
  }
}
