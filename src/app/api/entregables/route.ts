import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientSlug = searchParams.get('clientSlug') ?? '';

  let query = supabaseAdmin
    .from('entregables')
    .select('*')
    .order('uploaded_at', { ascending: false });

  if (clientSlug) query = query.eq('client_slug', clientSlug);

  const { data, error } = await query;
  if (error) return NextResponse.json({ entregables: [] });

  const entregables = (data ?? []).map((e: any) => ({
    clientSlug: e.client_slug,
    clientName: e.client_name,
    fileName: e.file_name,
    label: e.label,
    link: e.public_url,
    downloadLink: e.public_url,
    uploadedAt: e.uploaded_at,
    mimeType: e.mime_type,
  }));

  return NextResponse.json({ entregables });
}
