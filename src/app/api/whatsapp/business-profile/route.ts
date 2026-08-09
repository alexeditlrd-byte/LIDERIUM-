import { NextRequest, NextResponse } from 'next/server';
import { getBusinessProfile, updateBusinessProfile } from '@/lib/whatsapp';

export async function GET() {
  try {
    const profile = await getBusinessProfile();
    return NextResponse.json({ profile });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  const { about, address, description, email, websites, vertical } = await req.json();
  try {
    await updateBusinessProfile({ about, address, description, email, websites, vertical });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 502 });
  }
}
