import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

// Extrae el texto de un documento (PDF, Word o .txt) que el equipo sube
// desde "Configurar perfil SAT", para no tener que copiar/pegar el ICP o
// el mapa de empatía a mano. Solo extrae texto — SAT lo guarda como
// referencia, no lo analiza con IA (ver nota en el modal del panel).
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    let texto = '';
    if (name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      texto = result.value;
    } else if (name.endsWith('.pdf')) {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      texto = result.text;
    } else if (name.endsWith('.txt')) {
      texto = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Formato no soportado. Sube un .pdf, .docx o .txt' }, { status: 400 });
    }

    texto = texto.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!texto) return NextResponse.json({ error: 'No se pudo leer texto de ese archivo' }, { status: 400 });

    return NextResponse.json({ texto });
  } catch (e) {
    return NextResponse.json({ error: `No se pudo leer el archivo: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}
