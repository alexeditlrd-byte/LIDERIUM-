import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const TOKEN = '256609c59036366ceecb74d4a685b9be41be90361851a430';

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (token !== TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const uid = 'd82cf2be-ac55-4f0b-b60a-c66c5665f643';
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(uid, {
    email: 'maryori.drgj@gmail.com',
    email_confirm: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, email: data.user.email });
}
