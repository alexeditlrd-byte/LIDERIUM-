'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface ClientData {
  name: string;
  slug: string;
  plan: string;
  email: string;
}

interface LoginProps {
  onLanding: () => void;
  onPortal: (data: ClientData) => void;
  onStaff: () => void;
}

export default function Login({ onLanding, onPortal, onStaff }: LoginProps) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pass) { setErr('Ingresa tu email y contraseña.'); return; }
    setLoading(true);
    setErr('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });

    if (error) {
      setErr('Email o contraseña incorrectos.');
      setLoading(false);
      return;
    }

    const meta = data.user.user_metadata;
    if (meta?.role === 'staff') {
      onStaff();
    } else {
      onPortal({
        name: meta?.name ?? 'Cliente',
        slug: meta?.slug ?? '',
        plan: meta?.plan ?? 'Crecimiento',
        email: data.user.email ?? '',
      });
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen grid grid-cols-[1.05fr_1fr] bg-[#0B0C0F] text-white overflow-hidden" data-parallax>
      {/* Background */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1c2839] via-[#11131a] to-[#0B0C0F]" />
        <div data-spot className="absolute w-[600px] h-[600px] rounded-full blur-[12px] opacity-0 transition-all" style={{ background: 'radial-gradient(circle, rgba(111,183,240,.18), rgba(47,179,137,.06))', left: '30%', top: '40%', marginLeft: '-300px', marginTop: '-300px', mixBlendMode: 'screen' }} />
        <div className="absolute inset-0 will-change-transform transition-transform duration-500">
          <div className="absolute w-[680px] h-[680px] left-[-140px] top-[-200px] rounded-full blur-[52px] animate-auroraA" style={{ background: 'radial-gradient(circle, rgba(46,108,160,.45), transparent 62%)', animationDuration: '17s' }} />
          <div className="absolute w-[560px] h-[560px] left-[18%] bottom-[-260px] rounded-full blur-[56px] animate-auroraB" style={{ background: 'radial-gradient(circle, rgba(47,179,137,.34), transparent 62%)', animationDuration: '22s' }} />
          <div className="absolute w-[520px] h-[520px] right-[-120px] top-[20%] rounded-full blur-[58px] animate-auroraC" style={{ background: 'radial-gradient(circle, rgba(46,108,160,.30), transparent 62%)', animationDuration: '25s' }} />
        </div>
      </div>

      {/* Left panel */}
      <div className="relative z-10 px-[54px] py-[54px] flex flex-col justify-between">
        <div className="flex items-center gap-[10px] cursor-pointer w-max hover:opacity-80 transition" onClick={onLanding}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AEB4BE" strokeWidth="2.2"><path d="M19 12H5" /><path d="M11 18l-6-6 6-6" /></svg>
          <span className="text-[#AEB4BE] font-bold text-[14px]">Volver al sitio</span>
        </div>
        <div className="relative">
          <img src="/assets/liderium-white.png" alt="Liderium" className="h-10 w-auto mb-[30px]" />
          <h2 className="font-grotesk font-bold text-[36px] leading-[1.1] -tracking-[0.02em] mb-4">Todo tu contenido,<br />en un solo lugar.</h2>
          <p className="text-[#AEB4BE] text-[16px] leading-[1.6] max-w-[380px]">Tu estrategia, tus métricas de crecimiento y los consejos del equipo — listos cuando los necesites.</p>
        </div>
        <div className="flex items-center gap-[10px] text-[#7E8693] text-[13px] font-semibold">
          <span className="w-[7px] h-[7px] rounded-full bg-mint shadow-lg" style={{ boxShadow: '0 0 10px #2FB389' }} />
          Acceso seguro · privado para cada cliente
        </div>
      </div>

      {/* Right form */}
      <div className="relative z-10 flex items-center justify-center px-10">
        <div className="relative w-full max-w-[400px] bg-gradient-to-br from-[rgba(40,52,72,.5)] to-[rgba(13,15,20,.42)] backdrop-blur-[28px] border border-[rgba(255,255,255,.14)] rounded-[24px] shadow-2xl px-[34px] py-[38px]">
          <div className="absolute top-0 left-[18px] right-[18px] h-1/2 bg-gradient-to-b from-[rgba(255,255,255,.08)] to-transparent rounded-[24px] pointer-events-none" />

          <h1 className="relative font-grotesk font-bold text-[27px] -tracking-[0.02em] mb-1 text-white">Bienvenido</h1>
          <p className="relative text-[#AEB4BE] text-[14.5px] mb-[26px]">Ingresa con las credenciales que te dimos</p>

          <form onSubmit={handleLogin} className="relative flex flex-col gap-[15px]">
            <div>
              <label className="block text-[13px] font-bold text-[#C2C8D2] mb-[7px]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErr(''); }}
                placeholder="tucorreo@email.com"
                autoComplete="email"
                className="w-full h-[50px] px-4 border-[1.5px] border-[rgba(255,255,255,.12)] rounded-[13px] font-semibold text-[15px] outline-none bg-[rgba(255,255,255,.05)] text-white focus:border-[#6FB7F0] focus:bg-[rgba(255,255,255,.09)] transition"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#C2C8D2] mb-[7px]">Contraseña</label>
              <input
                type="password"
                value={pass}
                onChange={(e) => { setPass(e.target.value); setErr(''); }}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full h-[50px] px-4 border-[1.5px] border-[rgba(255,255,255,.12)] rounded-[13px] font-semibold text-[15px] outline-none bg-[rgba(255,255,255,.05)] text-white focus:border-[#6FB7F0] focus:bg-[rgba(255,255,255,.09)] transition"
              />
            </div>

            {err && <div className="text-[#FF8A8A] text-[13px] font-semibold">{err}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] mt-1 bg-gradient-to-br from-white to-[#dfe9f5] text-[#15171C] border-none rounded-[13px] font-bold text-[15.5px] cursor-pointer flex items-center justify-center gap-[9px] shadow-lg hover:shadow-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>
                  Verificando…
                </>
              ) : (
                <>
                  Ingresar
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
