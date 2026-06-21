import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const clientSlug = formData.get('clientSlug') as string;
  const mes = formData.get('mes') as string;

  if (!file || !clientSlug || !mes) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }

  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl) {
    return NextResponse.json({ error: 'GOOGLE_SCRIPT_URL no configurado en .env.local' }, { status: 500 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');

  const res = await fetch(scriptUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileData: base64,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      clientSlug,
      mes,
    }),
  });

  const data = await res.json();
  if (!data.success) {
    return NextResponse.json({ error: data.error }, { status: 500 });
  }

  return NextResponse.json({
    fileId: data.fileId,
    link: data.link,
    fileName: data.name,
    clientSlug,
    mes,
    uploadedAt: new Date().toLocaleString('es-PE'),
  });
}
