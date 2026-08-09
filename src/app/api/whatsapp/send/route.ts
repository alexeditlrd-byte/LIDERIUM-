import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendText, sendMedia } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  const { phone, text, mediaUrl, mediaType } = await req.json();
  if (!phone) return NextResponse.json({ error: 'Falta destinatario' }, { status: 400 });

  try {
    if (mediaUrl) {
      await sendMedia(phone, mediaUrl, mediaType === 'video' ? 'video' : 'image');
    } else if (text?.trim()) {
      await sendText(phone, text.trim());
    } else {
      return NextResponse.json({ error: 'Falta mensaje o archivo' }, { status: 400 });
    }

    // A diferencia de Instagram, Meta no nos avisa por webhook de los
    // mensajes que nosotros mandamos — hay que guardarlo a mano para que
    // quede en el historial de la conversación.
    await supabaseAdmin.from('whatsapp_messages').insert({
      phone,
      direction: 'out',
      text: text?.trim() ?? '',
      media_url: mediaUrl ?? null,
      media_type: mediaUrl ? (mediaType === 'video' ? 'video' : 'image') : null,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 502 });
  }
}
