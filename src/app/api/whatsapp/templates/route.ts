import { NextResponse } from 'next/server';
import { getMessageTemplates } from '@/lib/whatsapp';

export async function GET() {
  try {
    const templates = await getMessageTemplates();
    return NextResponse.json({ templates });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 502 });
  }
}
