import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const TOKEN = 'bbc31d11ced7b3899a69e398ea7d230b38ac0364164bac6a';

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (token !== TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const uid = 'd82cf2be-ac55-4f0b-b60a-c66c5665f643';
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(uid, {
    user_metadata: { role: 'staff', founder: false, name: 'Maryori' },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, metadata: data.user.user_metadata });
}
