import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendText, sendMedia, sendTemplate } from '@/lib/whatsapp';

const MEDIA_TYPES = ['image', 'video', 'document', 'audio'];

export async function POST(req: NextRequest) {
  const { phone, text, mediaUrl, mediaType, templateName, templateLanguage, templateParams } = await req.json();
  if (!phone) return NextResponse.json({ error: 'Falta destinatario' }, { status: 400 });

  const tipo = MEDIA_TYPES.includes(mediaType) ? mediaType : 'document';

  try {
    let waMessageId: string | null;
    if (templateName) {
      waMessageId = await sendTemplate(phone, templateName, templateLanguage || 'es', templateParams ?? []);
    } else if (mediaUrl) {
      waMessageId = await sendMedia(phone, mediaUrl, tipo);
    } else if (text?.trim()) {
      waMessageId = await sendText(phone, text.trim());
    } else {
      return NextResponse.json({ error: 'Falta mensaje o archivo' }, { status: 400 });
    }

    // A diferencia de Instagram, Meta no nos avisa por webhook de los
    // mensajes que nosotros mandamos — hay que guardarlo a mano para que
    // quede en el historial de la conversación. Guardamos también el id
    // que Meta le puso al mensaje: es lo único que permite después
    // enlazar los webhooks de "entregado/leído" con esta fila exacta.
    await supabaseAdmin.from('whatsapp_messages').insert({
      wa_message_id: waMessageId,
      phone,
      direction: 'out',
      text: text?.trim() ?? '',
      media_url: mediaUrl ?? null,
      media_type: mediaUrl ? tipo : null,
      status: 'sent',
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 502 });
  }
}
