import { NextRequest, NextResponse } from 'next/server';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token !== 'liderium-tmp-check') return NextResponse.json({ error: 'no' }, { status: 403 });

  const exists = ffmpegPath ? fs.existsSync(ffmpegPath) : false;
  let dirListing: string[] = [];
  let dirError: string | null = null;
  try {
    const dir = ffmpegPath ? path.dirname(ffmpegPath) : null;
    dirListing = dir ? fs.readdirSync(dir) : [];
  } catch (e) {
    dirError = e instanceof Error ? e.message : String(e);
  }

  let stat: string | null = null;
  try {
    if (ffmpegPath && exists) {
      const s = fs.statSync(ffmpegPath);
      stat = `size=${s.size} mode=${s.mode.toString(8)}`;
    }
  } catch { /* ignore */ }

  const altPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
  const altExists = fs.existsSync(altPath);
  let altDirListing: string[] = [];
  try {
    altDirListing = fs.readdirSync(path.join(process.cwd(), 'node_modules', 'ffmpeg-static'));
  } catch { /* ignore */ }

  return NextResponse.json({ ffmpegPath, exists, stat, dirListing, dirError, cwd: process.cwd(), altPath, altExists, altDirListing });
}
