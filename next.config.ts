import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El binario de ffmpeg-static es un archivo binario referenciado por
  // una ruta calculada en runtime, no un require() literal — el rastreo
  // automático de Next.js para las funciones serverless de Vercel no lo
  // detecta solo, así que hay que incluirlo a mano o la conversión de
  // audio falla en producción con "ffmpeg no encontrado".
  outputFileTracingIncludes: {
    '/api/whatsapp/transcode-audio': ['./node_modules/ffmpeg-static/**'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
