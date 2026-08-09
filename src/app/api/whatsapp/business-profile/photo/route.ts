import { NextRequest, NextResponse } from 'next/server';
import { updateProfilePicture } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    await updateProfilePicture(buffer, file.type || 'image/jpeg');
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 502 });
  }
}
