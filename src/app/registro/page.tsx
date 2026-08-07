'use client';

import { useState } from 'react';
import Image from 'next/image';

const FACTURACION_OPTIONS = [
  { value: '0-1k', label: 'Menos de $1,000 USD' },
  { value: '1k-5k', label: '$1,000 - $5,000 USD' },
  { value: '5k-20k', label: '$5,000 - $20,000 USD' },
  { value: '20k+', label: 'Más de $20,000 USD' },
];

interface Recurso {
  tipo: 'pdf' | 'drive' | 'video' | 'link';
  titulo: string;
  url: string;
}

const RECURSO_LABEL: Record<Recurso['tipo'], string> = {
  pdf: 'Descargar PDF',
  drive: 'Abrir en Google Drive',
  video: 'Ver el video',
  link: 'Abrir enlace',
};

const inputClass = 'w-full box-border bg-[#050a1a] border border-[#1e2a55] rounded-[10px] px-4 py-[14px] text-[15px] text-[#eef1f5] outline-none focus:border-[#3b5bff] transition';
const labelClass = 'block text-[14px] font-semibold text-[#c7cfda] mb-2';

export default function RegistroPage() {
  const [form, setForm] = useState({ nombre: '', email: '', instagram: '', numero: '', producto: '', nicho: '', facturacion: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [recurso, setRecurso] = useState<Recurso | null>(null);
  const [done, setDone] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const facturacionLabel = FACTURACION_OPTIONS.find(o => o.value === form.facturacion)?.label ?? '';
      const res = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, facturacionLabel, linkAds: typeof window !== 'undefined' ? window.location.href : '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo enviar el formulario.');

      // El recurso gratuito se entrega de inmediato, sin intervención
      // manual: apenas se confirma el registro se busca la configuración
      // actual y se muestra el botón de descarga/enlace.
      const recursoRes = await fetch('/api/recurso-gratuito');
      const recursoData = await recursoRes.json();
      setRecurso(recursoData.recurso ?? null);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el formulario.');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_0%,#0d1a3d_0%,#04070d_45%)] bg-[#04070d] text-[#eef1f5] flex flex-col items-center px-6 py-16 md:py-20">
      <div className="max-w-[640px] w-full text-center mb-10">
        <Image src="/assets/liderium-white.png" alt="Liderium" width={160} height={44} className="h-11 w-auto mx-auto mb-5" priority />
        <h1 className="font-grotesk text-[32px] md:text-[42px] leading-[1.15] font-extrabold mb-4 -tracking-[0.01em]">Escala tu marca personal con contenido que convierte</h1>
        <p className="text-[16px] md:text-[17px] leading-[1.6] text-[#a8b2c0] m-0">Completa el formulario y agenda una consulta gratuita con nuestro equipo para diseñar tu estrategia de contenido.</p>
      </div>

      {!done ? (
        <form onSubmit={submit} className="max-w-[560px] w-full bg-[#0a1024] border border-[#1b2550] rounded-[20px] p-8 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <div className="mb-6">
            <label className={labelClass}>Nombre completo</label>
            <input required value={form.nombre} onChange={set('nombre')} placeholder="Tu nombre y apellido" className={inputClass} />
          </div>
          <div className="mb-6">
            <label className={labelClass}>Correo electrónico</label>
            <input required type="email" value={form.email} onChange={set('email')} placeholder="tu@correo.com" className={inputClass} />
          </div>
          <div className="mb-6">
            <label className={labelClass}>Usuario de Instagram</label>
            <input value={form.instagram} onChange={set('instagram')} placeholder="@tunombre" className={inputClass} />
          </div>
          <div className="mb-6">
            <label className={labelClass}>Número de celular</label>
            <input required type="tel" value={form.numero} onChange={set('numero')} placeholder="+52 55 1234 5678" className={inputClass} />
          </div>
          <div className="mb-6">
            <label className={labelClass}>¿Qué producto o servicio estás vendiendo?</label>
            <input required value={form.producto} onChange={set('producto')} placeholder="Ej. Asesorías de fitness online" className={inputClass} />
          </div>
          <div className="mb-6">
            <label className={labelClass}>Nicho</label>
            <input required value={form.nicho} onChange={set('nicho')} placeholder="Ej. Salud y bienestar" className={inputClass} />
          </div>
          <div className="mb-8">
            <label className={labelClass}>Facturación mensual actual</label>
            <select required value={form.facturacion} onChange={set('facturacion')} className={inputClass}>
              <option value="">Selecciona un rango</option>
              {FACTURACION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {error && <div className="mb-4 text-[13.5px] font-semibold text-[#ff6b6b]">{error}</div>}

          <button type="submit" disabled={submitting}
            className="w-full bg-gradient-to-br from-[#3b5bff] to-[#22e6c8] text-white border-none rounded-[10px] py-4 text-[16px] font-bold cursor-pointer transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed">
            {submitting ? 'Enviando…' : 'Agendar mi consulta gratuita'}
          </button>
          <p className="text-center text-[13px] text-[#6b7684] mt-4 mb-0">Sin compromiso · Respuesta en menos de 24 horas</p>
        </form>
      ) : (
        <div className="max-w-[560px] w-full bg-[#0a1024] border border-[#1b2550] rounded-[20px] px-8 py-14 md:px-10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] text-center">
          <div className="w-14 h-14 rounded-full bg-[rgba(34,230,200,0.15)] border border-[rgba(34,230,200,0.35)] flex items-center justify-center mx-auto mb-6 text-[26px] text-[#22e6c8]">✓</div>
          <h2 className="font-grotesk text-[24px] font-extrabold mb-3">¡Listo, recibimos tus datos!</h2>
          <p className="text-[15px] leading-[1.6] text-[#a8b2c0] mb-6">Nuestro equipo revisará tu información y te contactará por WhatsApp o llamada para agendar tu consulta gratuita en menos de 24 horas.</p>

          {recurso?.url && (
            <>
              <div className="h-px bg-[#1b2550] my-6" />
              <p className="text-[14px] font-semibold text-[#c7cfda] mb-3">Como agradecimiento, aquí tienes tu recurso gratuito:</p>
              <a href={recurso.url} target="_blank" rel="noopener noreferrer"
                className="inline-block w-full box-border bg-gradient-to-br from-[#3b5bff] to-[#22e6c8] text-white no-underline rounded-[10px] py-4 text-[15px] font-bold hover:opacity-90 transition">
                {recurso.titulo || RECURSO_LABEL[recurso.tipo]}
              </a>
            </>
          )}
        </div>
      )}

      <p className="max-w-[560px] w-full text-center text-[13px] text-[#4b5563] mt-7">© {new Date().getFullYear()} Liderium. Tus datos están protegidos y solo se usan para contactarte sobre este servicio.</p>
    </div>
  );
}
