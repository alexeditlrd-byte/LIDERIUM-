import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const planAmounts: Record<string, string> = {
  'Esencial': 'S/ 1,600',
  'Crecimiento': 'S/ 2,400',
  'Pro': 'S/ 3,800',
};

export async function POST(req: NextRequest) {
  const { name, email, password, plan } = await req.json();

  if (!name || !email || !password || !plan) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  }

  const slug = toSlug(name);

  // 1. Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'client', name, slug, plan },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // 2. Crear carpeta en Google Drive
  let driveFolderId = '';
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (scriptUrl) {
    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createFolder', clientName: name, clientSlug: slug }),
      });
      const data = await res.json();
      driveFolderId = data.folderId ?? '';
    } catch {}
  }

  // 3. Guardar en la tabla clients
  const { error: dbError } = await supabaseAdmin
    .from('clients')
    .insert({
      user_id: authData.user.id,
      name,
      slug,
      plan,
      amount: planAmounts[plan] ?? 'S/ 2,400',
      drive_folder_id: driveFolderId,
      status: 'Al día',
    });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, email, slug });
}
