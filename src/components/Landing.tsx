'use client';

import { useState, useEffect } from 'react';

interface LandingProps {
  onLogin: () => void;
}

export default function Landing({ onLogin }: LandingProps) {
  const [reel, setReel] = useState(0);
  const [reelHover, setReelHover] = useState(false);

  const reels = [
    { src: 'https://www.instagram.com/reel/DXsi-voDCdT/embed/' },
    { src: 'https://www.instagram.com/reel/Czsy-_TOOwe/embed/' },
    { src: 'https://www.instagram.com/reel/DZTkJP1xpC5/embed/' },
  ];

  const N = reels.length;

  useEffect(() => {
    if (reelHover) return;
    const interval = setInterval(() => {
      setReel((prev) => (prev + 1) % N);
    }, 4200);
    return () => clearInterval(interval);
  }, [reelHover, N]);

  const getCardStyle = (i: number): React.CSSProperties => {
    let off = ((i - reel) % N + N) % N;
    if (off > N / 2) off -= N;
    const ad = Math.abs(off);
    const front = off === 0;
    const tx = off * 250;
    const tz = -ad * 150;
    const ry = -off * 38;
    const sc = Math.max(0.62, 1 - ad * 0.15);
    const op = ad > 2 ? 0 : 1 - ad * 0.28;
    const z = 100 - ad;
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '300px',
      height: '533px',
      borderRadius: '26px',
      overflow: 'hidden',
      background: '#0d0f14',
      transformOrigin: 'center',
      transition: 'transform 0.8s cubic-bezier(0.25,0.8,0.3,1), opacity 0.8s ease, box-shadow 0.8s ease, filter 0.8s ease',
      transform: `translateX(${tx}px) translateZ(${tz}px) rotateY(${ry}deg) scale(${sc})`,
      opacity: op,
      zIndex: z,
      filter: front ? 'none' : 'saturate(0.7) brightness(0.74)',
      border: front ? '1px solid rgba(155,200,240,.30)' : '1px solid rgba(255,255,255,.08)',
      boxShadow: front
        ? '0 44px 90px -28px rgba(0,0,0,.85), 0 0 70px -8px rgba(46,108,160,.55)'
        : '0 30px 60px -34px rgba(0,0,0,.7)',
      cursor: front ? 'default' : 'pointer',
    };
  };

  const wa = 'https://wa.me/51991403038';

  return (
    <div className="relative overflow-hidden bg-[#0B0C0F] text-white">
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-[rgba(11,12,15,0.72)] backdrop-blur-2xl border-b border-[rgba(255,255,255,.07)]">
        <div className="max-w-[1240px] mx-auto px-8 h-[74px] flex items-center justify-between gap-6">
          <img src="/assets/liderium-white.png" alt="Liderium" className="h-7 w-auto" />
          <nav className="hidden md:flex gap-[34px] items-center">
            {[
              { href: '#casos', label: 'Resultados' },
              { href: '#servicios', label: 'Servicios' },
              { href: '#metodo', label: 'Cómo trabajamos' },
              { href: '#casos', label: 'Casos reales' },
              { href: '#contacto', label: 'Contacto' },
            ].map((link) => (
              <a key={link.label} href={link.href} className="text-[14.5px] font-semibold text-[#C2C8D2] hover:text-white transition no-underline">
                {link.label}
              </a>
            ))}
          </nav>
          <button
            onClick={onLogin}
            className="flex items-center gap-2 border border-[rgba(255,255,255,.85)] bg-white text-[#15171C] font-bold text-[14px] px-5 py-3 rounded-full hover:bg-mint hover:border-mint hover:text-white transition cursor-pointer"
          >
            Acceso
          </button>
        </div>
      </header>

      {/* HERO */}
      <section id="heroSection" data-parallax className="relative bg-[#0E0F12] overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 75% 18%, #1c2839 0%, #11131a 48%, #0B0C0F 100%)' }} />
          <div
            data-spot
            className="absolute rounded-full opacity-0 transition-all"
            style={{
              width: '580px', height: '580px',
              left: '62%', top: '30%', marginLeft: '-290px', marginTop: '-290px',
              background: 'radial-gradient(circle, rgba(111,183,240,.22), rgba(47,179,137,.07) 46%, transparent 70%)',
              filter: 'blur(10px)', mixBlendMode: 'screen',
            }}
          />
          {/* Aurora orbs */}
          <div className="absolute inset-0 will-change-transform" style={{ transition: 'transform .5s cubic-bezier(.2,.7,.2,1)', transform: 'translate(calc(var(--px,0)*38px),calc(var(--py,0)*32px))' }}>
            <div className="absolute w-[760px] h-[760px] left-[-120px] top-[-220px] rounded-full blur-[46px] animate-auroraA" style={{ background: 'radial-gradient(circle, rgba(46,108,160,.55), transparent 62%)' }} />
            <div className="absolute w-[680px] h-[680px] right-[-140px] top-[-120px] rounded-full blur-[50px] animate-auroraB" style={{ background: 'radial-gradient(circle, rgba(47,179,137,.42), transparent 64%)' }} />
            <div className="absolute w-[560px] h-[560px] left-[38%] bottom-[-260px] rounded-full blur-[54px] animate-auroraC" style={{ background: 'radial-gradient(circle, rgba(46,108,160,.34), transparent 66%)' }} />
          </div>
          {/* Grid */}
          <div className="absolute inset-0 opacity-50 animate-scanGrid" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
            maskImage: 'radial-gradient(120% 80% at 60% 30%, #000 30%, transparent 78%)',
            transition: 'transform .45s ease-out',
            transform: 'translate(calc(var(--px,0)*-22px), calc(var(--py,0)*-18px))',
          }} />
          {/* Beam */}
          <div className="absolute top-0 bottom-0 left-0 w-[46%] blur-[6px] animate-beamSweep"
            style={{ background: 'linear-gradient(90deg,transparent,rgba(155,200,240,.16),transparent)' }} />
          {/* Logo watermark */}
          <img src="/assets/liderium-white.png" alt="" aria-hidden="true"
            className="absolute pointer-events-none select-none opacity-[0.05]"
            style={{ right: '-70px', top: '54px', width: '720px', transition: 'transform .55s ease-out', transform: 'translate(calc(var(--px,0)*26px), calc(var(--py,0)*20px))' }} />
          <div className="absolute inset-0" style={{ boxShadow: 'inset 0 -90px 120px -40px #0B0C0F, inset 0 60px 90px -50px rgba(0,0,0,.5)' }} />
        </div>

        <div className="relative max-w-[1240px] mx-auto px-5 md:px-8 py-[64px] md:py-[104px] pb-[64px] md:pb-[96px] grid grid-cols-1 md:grid-cols-[1.08fr_0.92fr] gap-[40px] md:gap-[60px] items-center">
          {/* Left */}
          <div className="animate-fadeUp">
            {/* Badge */}
            <div className="inline-flex items-center gap-[9px] bg-[rgba(255,255,255,.06)] border border-[rgba(255,255,255,.12)] rounded-full px-[14px] py-[7px] mb-[28px]">
              <span className="w-[8px] h-[8px] rounded-full bg-mint flex-shrink-0 animate-pulseDot" />
              <span className="text-[12.5px] font-bold tracking-[0.08em] uppercase text-[#C2C8D2]">Consultora de contenido digital</span>
            </div>

            <h1 className="font-grotesk font-bold text-[38px] md:text-[60px] leading-[0.98] tracking-[-0.025em] mb-6 text-white">
              Escala tus ventas con{' '}
              <span className="italic">100% contenido orgánico</span>{' '}
              y{' '}
              <span className="relative whitespace-nowrap text-[#6FB7F0]">
                estrategias virales
                <svg viewBox="0 0 300 12" preserveAspectRatio="none" className="absolute left-0 bottom-[-8px] w-full h-[11px]" fill="none">
                  <path d="M3 8C70 2 230 2 297 7" stroke="#2FB389" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="text-[18.5px] leading-[1.6] text-[#AEB4BE] max-w-[520px] mb-9">
              Creamos la estrategia y los guiones de tu contenido para que crezca solo. Tú ves cada video, tu estrategia y tus métricas en un mismo lugar.
            </p>

            <div className="flex gap-[14px] flex-wrap items-center mb-[40px]">
              <button
                onClick={onLogin}
                className="flex items-center gap-[9px] bg-white text-[#15171C] border-none font-bold text-[15.5px] px-7 py-4 rounded-full cursor-pointer shadow-[0_12px_34px_-10px_rgba(0,0,0,.6)] hover:bg-mint hover:text-white transition"
              >
                Quiero escalar mis ventas
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
                </svg>
              </button>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-[9px] bg-[rgba(255,255,255,.06)] text-white border border-[rgba(255,255,255,.22)] font-bold text-[15.5px] px-6 py-4 rounded-full cursor-pointer no-underline hover:border-white hover:bg-[rgba(255,255,255,.12)] transition"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.8.7.8-2.7-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.1-.5 0a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2.1-.2 0-.3 0-.5s-.5-1.3-.7-1.7-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3c-.3.3-1 .9-1 2.3s1 2.7 1.1 2.9 2 3.1 5 4.3c1.8.8 2.5.8 3.4.7.5-.1 1.4-.6 1.6-1.1s.2-1 .2-1.1z" />
                </svg>
                Hablar con el equipo
              </a>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-[32px] flex-wrap">
              {[
                { value: '+262%', label: 'crecimiento medio' },
                { value: '1.2M', label: 'reproducciones' },
                { value: '100%', label: 'orgánico' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-[10px]">
                  {i > 0 && <span className="w-px h-[28px] bg-[rgba(255,255,255,.12)]" />}
                  <div>
                    <div className="font-grotesk font-bold text-[22px] leading-none text-white">{stat.value}</div>
                    <div className="text-[12px] font-semibold text-[#7E8693] mt-[2px]">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: portal preview card */}
          <div className="relative animate-[fadeUp_0.9s_ease_both]">
            <div className="absolute inset-[18px_-8px_-18px_18px] bg-gradient-to-br from-[#2E6CA0] to-[#2FB389] rounded-[26px] opacity-30 blur-[8px]" />
            <div className="relative bg-gradient-to-br from-[rgba(40,52,72,.55)] to-[rgba(13,15,20,.42)] backdrop-blur-[26px] border border-[rgba(255,255,255,.16)] rounded-[22px] shadow-[0_40px_80px_-28px_rgba(0,0,0,.8)] overflow-hidden animate-floaty">
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-[rgba(255,255,255,.10)] to-transparent pointer-events-none" />
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,.1)] relative">
                <div className="flex items-center gap-[9px]">
                  <span className="w-[10px] h-[10px] rounded-full bg-mint" style={{ boxShadow: '0 0 12px #2FB389' }} />
                  <span className="font-black text-[13.5px] text-white">Portal · Aurora Café</span>
                </div>
                <span className="text-[11px] font-bold text-[#5FD3A8] bg-[rgba(47,179,137,.18)] border border-[rgba(47,179,137,.25)] px-[10px] py-[4px] rounded-full">En vivo</span>
              </div>
              {/* Card body */}
              <div className="px-5 pt-5 pb-5 relative">
                <div className="text-[12px] text-[#8A929E] font-bold uppercase tracking-[0.06em] mb-[6px]">Seguidores</div>
                <div className="flex items-end gap-[10px] mb-[18px]">
                  <div className="font-grotesk font-bold text-[34px] leading-none text-white">16.1K</div>
                  <div className="text-[#5FD3A8] font-black text-[14px] pb-[5px]">▲ 262%</div>
                </div>
                <svg viewBox="0 0 280 90" className="w-full h-[90px] block">
                  <defs>
                    <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#5FA0DA" stopOpacity="0.38" />
                      <stop offset="1" stopColor="#5FA0DA" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon points="6,84 6,70 46,64 86,52 126,55 166,38 206,28 246,16 274,10 274,84" fill="url(#pv)" />
                  <polyline points="6,70 46,64 86,52 126,55 166,38 206,28 246,16 274,10" fill="none" stroke="#6FB7F0" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="274" cy="10" r="4" fill="#6FB7F0" />
                </svg>
                <div className="grid grid-cols-2 gap-[10px] mt-[18px]">
                  <div className="bg-[rgba(255,255,255,.05)] border border-[rgba(255,255,255,.06)] rounded-[13px] p-[13px]">
                    <div className="text-[11px] text-[#9AA0A8] font-bold">Reproducciones</div>
                    <div className="font-grotesk font-bold text-[19px] text-white">1.24M</div>
                  </div>
                  <div className="bg-[rgba(255,255,255,.05)] border border-[rgba(255,255,255,.06)] rounded-[13px] p-[13px]">
                    <div className="text-[11px] text-[#9AA0A8] font-bold">Videos</div>
                    <div className="font-grotesk font-bold text-[19px] text-white">37</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CASOS / REELS */}
      <section id="casos" data-parallax className="relative overflow-hidden bg-[#0B0C0F] py-[96px]">
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 50% 0%, #16202e 0%, #0d1016 46%, #0B0C0F 100%)' }} />
          <div className="absolute inset-0 will-change-transform" style={{ transition: 'transform .5s cubic-bezier(.2,.7,.2,1)', transform: 'translate(calc(var(--px,0)*30px),calc(var(--py,0)*26px))' }}>
            <div className="absolute w-[640px] h-[640px] left-[-160px] top-[-160px] rounded-full blur-[52px] animate-auroraA" style={{ background: 'radial-gradient(circle, rgba(46,108,160,.34), transparent 64%)', animationDuration: '18s' }} />
            <div className="absolute w-[560px] h-[560px] right-[-160px] bottom-[-220px] rounded-full blur-[56px] animate-auroraB" style={{ background: 'radial-gradient(circle, rgba(47,179,137,.26), transparent 66%)', animationDuration: '23s' }} />
          </div>
        </div>

        <div className="relative z-10 max-w-[1240px] mx-auto px-8">
          <div className="flex items-end justify-between gap-[30px] mb-[44px] flex-wrap">
            <div>
              <h2 className="font-grotesk font-bold text-[44px] leading-[1.04] tracking-[-0.025em] mb-[14px] text-white">
                Contenido que se vuelve viral
              </h2>
              <p className="text-[17px] leading-[1.6] text-[#9097A2] max-w-[520px]">
                Reels que guionizamos y planeamos para nuestros clientes. El carrusel gira solo — o muévelo tú con las flechas para ver cada video.
              </p>
            </div>
            {/* Client card */}
            <div className="flex items-center gap-[14px] bg-[rgba(255,255,255,.04)] border border-[rgba(255,255,255,.1)] rounded-[18px] px-5 py-4 backdrop-blur-2xl">
              <div className="w-[54px] h-[54px] rounded-full bg-gradient-to-br from-[#2E6CA0] to-[#2FB389] flex items-center justify-center font-black text-[18px] text-white flex-shrink-0">SN</div>
              <div>
                <div className="font-black text-[15.5px] text-white">santiago.estrategias</div>
                <div className="text-[12.5px] text-[#8A929E] font-semibold mb-[6px]">Santiago Noriega · Estrategias Virales</div>
                <div className="flex gap-[14px]">
                  <span className="text-[13px] font-bold text-[#C2C8D2]">2,883 <span className="text-[#7E8693] font-semibold">seguidores</span></span>
                  <span className="text-[13px] font-bold text-mint">+2M <span className="text-[#7E8693] font-semibold">vistas</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Carousel */}
          <div
            onMouseEnter={() => setReelHover(true)}
            onMouseLeave={() => setReelHover(false)}
            className="relative flex items-center justify-center h-[600px]"
            style={{ perspective: '1500px' }}
          >
            <button
              onClick={() => setReel((p) => (p - 1 + N) % N)}
              aria-label="Anterior"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-[5] w-[52px] h-[52px] rounded-full border border-[rgba(255,255,255,.16)] bg-[rgba(255,255,255,.06)] backdrop-blur-2xl text-white cursor-pointer flex items-center justify-center hover:bg-[rgba(255,255,255,.14)] hover:border-[rgba(255,255,255,.4)] transition"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>

            <div className="relative w-[300px] h-[533px]" style={{ transformStyle: 'preserve-3d' }}>
              {reels.map((r, i) => (
                <div key={i} style={getCardStyle(i)} onClick={() => !getCardStyle(i).cursor?.includes('default') && setReel(i)}>
                  <iframe
                    src={r.src}
                    loading="lazy"
                    scrolling="no"
                    allowTransparency
                    allowFullScreen
                    style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
                  />
                  {i !== reel && <div className="absolute inset-0 cursor-pointer" onClick={() => setReel(i)} />}
                </div>
              ))}
            </div>

            <button
              onClick={() => setReel((p) => (p + 1) % N)}
              aria-label="Siguiente"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-[5] w-[52px] h-[52px] rounded-full border border-[rgba(255,255,255,.16)] bg-[rgba(255,255,255,.06)] backdrop-blur-2xl text-white cursor-pointer flex items-center justify-center hover:bg-[rgba(255,255,255,.14)] hover:border-[rgba(255,255,255,.4)] transition"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-[10px] mt-[30px]">
            {reels.map((_, i) => (
              <button
                key={i}
                onClick={() => setReel(i)}
                style={{
                  width: reel === i ? '28px' : '9px',
                  height: '9px',
                  borderRadius: '99px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all .4s ease',
                  background: reel === i ? 'linear-gradient(90deg,#2E6CA0,#2FB389)' : 'rgba(255,255,255,.22)',
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="servicios" data-parallax className="relative overflow-hidden bg-[#101218] text-white py-[90px]">
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 will-change-transform" style={{ transition: 'transform .5s cubic-bezier(.2,.7,.2,1)', transform: 'translate(calc(var(--px,0)*26px),calc(var(--py,0)*22px))' }}>
            <div className="absolute w-[620px] h-[620px] left-[-160px] top-[-160px] rounded-full blur-[60px] animate-auroraA" style={{ background: 'radial-gradient(circle, rgba(46,108,160,.30), transparent 64%)', animationDuration: '19s' }} />
            <div className="absolute w-[560px] h-[560px] right-[-180px] bottom-[-200px] rounded-full blur-[64px] animate-auroraB" style={{ background: 'radial-gradient(circle, rgba(47,179,137,.22), transparent 66%)', animationDuration: '24s' }} />
          </div>
        </div>

        <div className="relative z-10 max-w-[1240px] mx-auto px-8">
          <div className="flex items-end justify-between gap-[30px] mb-[48px] flex-wrap">
            <div>
              <div className="text-[12.5px] font-black tracking-[0.12em] uppercase text-mint mb-[14px]">Lo que hacemos por ti</div>
              <h2 className="font-grotesk font-bold text-[42px] leading-[1.05] tracking-[-0.025em] max-w-[560px]">
                Contenido que se ve premium y vende solo
              </h2>
            </div>
            <p className="text-[#9097A2] text-[16px] leading-[1.6] max-w-[330px]">
              Tú nos cuentas tu marca y nosotros nos encargamos de la estrategia, los guiones y la medición — con datos que respaldan cada decisión.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[18px]">
            {[
              {
                title: 'Guiones que enganchan',
                desc: 'Escribimos guiones pensados para retener: ganchos en los primeros 3 segundos, ritmo y un cierre que invita a la acción.',
                iconBg: '#13202c',
                borderHover: '#2E6CA0',
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5FA0DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="3" />
                    <path d="M10 9l5 3-5 3z" fill="#5FA0DA" stroke="none" />
                  </svg>
                ),
              },
              {
                title: 'Estrategia viral',
                desc: 'Detectamos tendencias y formatos ganadores para tu nicho. Un calendario claro con pilares de contenido y objetivos medibles.',
                iconBg: '#15231d',
                borderHover: '#2FB389',
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5FD3A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" /><path d="M7 14l4-5 3 3 5-7" />
                  </svg>
                ),
              },
              {
                title: 'Crecimiento orgánico',
                desc: 'Cero pauta forzada: hacemos crecer tu comunidad con contenido que la gente quiere compartir. Reportes claros cada mes.',
                iconBg: '#21242c',
                borderHover: '#fff',
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20V10M18 20V4M6 20v-4" />
                  </svg>
                ),
              },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-[#1C2029] border border-[#262B35] rounded-[20px] p-[30px] transition-all duration-200"
                style={{ '--hover-border': s.borderHover } as React.CSSProperties}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = s.borderHover)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#262B35')}
              >
                <div className="w-[50px] h-[50px] rounded-[14px] flex items-center justify-center mb-[22px]" style={{ background: s.iconBg }}>
                  {s.icon}
                </div>
                <h3 className="font-grotesk font-semibold text-[21px] mb-[10px]">{s.title}</h3>
                <p className="text-[#9097A2] text-[15px] leading-[1.6] m-0">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* METHOD */}
      <section id="metodo" data-parallax className="relative overflow-hidden bg-[#0B0C0F] py-[96px]">
        <div className="relative z-10 max-w-[1240px] mx-auto px-8">
          <div className="text-center mb-[54px]">
            <div className="text-[12.5px] font-black tracking-[0.12em] uppercase text-[#5FD3A8] mb-[14px]">Cómo trabajamos</div>
            <h2 className="font-grotesk font-bold text-[42px] leading-[1.05] tracking-[-0.025em] text-white">
              Cuatro pasos, cero complicaciones
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
            {[
              { num: '01', title: 'Descubrimos', desc: 'Analizamos tu marca, tu audiencia y a tu competencia para definir el rumbo.' },
              { num: '02', title: 'Planeamos', desc: 'Creamos la estrategia y el calendario de contenido con pilares claros.' },
              { num: '03', title: 'Guionizamos', desc: 'Escribimos los guiones de cada pieza con ganchos y estructura pensada para volverse viral.' },
              { num: '04', title: 'Medimos', desc: 'Reportamos resultados en tu portal y optimizamos mes a mes.' },
            ].map((step, i) => (
              <div key={i} className="px-[26px]" style={{ borderRight: i < 3 ? '1px solid rgba(255,255,255,.09)' : 'none' }}>
                <div className="font-grotesk font-bold text-[15px] text-[#5FA0DA] mb-[14px]">{step.num}</div>
                <h3 className="font-grotesk font-semibold text-[20px] mb-[9px] text-white">{step.title}</h3>
                <p className="text-[#9097A2] text-[14.5px] leading-[1.6] m-0">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PORTAL TEASER */}
      <section id="portal" className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#15171C 0%,#1c2734 60%,#2E6CA0 140%)' }}>
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-[560px] h-[560px] left-[-160px] bottom-[-220px] rounded-full blur-[64px] animate-auroraA" style={{ background: 'radial-gradient(circle, rgba(46,108,160,.24), transparent 66%)', animationDuration: '23s' }} />
          <div className="absolute w-[480px] h-[480px] right-[-160px] top-[-180px] rounded-full blur-[66px] animate-auroraC" style={{ background: 'radial-gradient(circle, rgba(47,179,137,.16), transparent 66%)', animationDuration: '28s' }} />
          <div className="absolute inset-0 animate-beamSweep" style={{
            background: 'linear-gradient(90deg,transparent,rgba(155,200,240,.09),transparent)',
            filter: 'blur(6px)',
            animationDuration: '13s',
          }} />
          <img src="/assets/liderium-white.png" alt="" aria-hidden="true"
            className="absolute opacity-[0.06] pointer-events-none select-none"
            style={{ right: '-100px', bottom: '-60px', width: '600px' }} />
        </div>

        <div className="relative z-10 max-w-[1240px] mx-auto px-8 py-[72px]">
          <div className="flex items-center gap-[10px] mb-5">
            <span className="text-[11.5px] font-black tracking-[0.12em] uppercase text-[#6FB7F0] bg-[rgba(111,183,240,.1)] border border-[rgba(111,183,240,.2)] px-3 py-[5px] rounded-full">
              Acceso exclusivo para clientes
            </span>
          </div>
          <h2 className="font-grotesk font-bold text-[44px] leading-[1.04] tracking-[-0.025em] text-white mb-4 max-w-[700px]">
            Tu portal privado, ordenado y siempre actualizado
          </h2>
          <p className="text-[17px] leading-[1.6] text-[#AEB4BE] max-w-[560px] mb-[28px]">
            Tú ves tu estrategia, tus métricas de crecimiento y los consejos del equipo — todo en un mismo lugar, en tiempo real.
          </p>
          <div className="flex gap-[24px] flex-wrap mb-[36px]">
            {['Videos editados', 'Estrategia de contenido', 'Métricas en vivo', 'Consejos del equipo'].map((c) => (
              <div key={c} className="flex items-center gap-[8px] text-[#cfd4db] font-semibold text-[14.5px]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2FB389" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {c}
              </div>
            ))}
          </div>
          <button
            onClick={onLogin}
            className="flex items-center gap-[9px] bg-white text-[#15171C] border-none font-bold text-[15.5px] px-7 py-4 rounded-full cursor-pointer hover:bg-mint hover:text-white transition"
          >
            Acceder a mi portal
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </section>

      {/* FOOTER / CONTACTO */}
      <footer id="contacto" className="relative overflow-hidden bg-[#0F1115] text-white py-[72px]">
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-[560px] h-[560px] left-[-160px] bottom-[-220px] rounded-full blur-[64px] animate-auroraA" style={{ background: 'radial-gradient(circle, rgba(46,108,160,.24), transparent 66%)', animationDuration: '23s' }} />
          <div className="absolute w-[480px] h-[480px] right-[-160px] top-[-180px] rounded-full blur-[66px] animate-auroraC" style={{ background: 'radial-gradient(circle, rgba(47,179,137,.16), transparent 66%)', animationDuration: '28s' }} />
        </div>

        <div className="relative z-10 max-w-[1240px] mx-auto px-5 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-[36px] md:gap-[48px] pb-[50px] border-b border-[#23262E]">
            <div>
              <img src="/assets/liderium-white.png" alt="Liderium" className="h-[34px] w-auto mb-5" />
              <p className="text-[#8A929E] text-[15px] leading-[1.6] max-w-[340px] m-0">
                Consultora de contenido digital. Hacemos crecer marcas con contenido orgánico y estrategias virales.
              </p>
            </div>
            <div>
              <div className="font-black text-[13px] tracking-[0.08em] uppercase text-[#6A7280] mb-[18px]">Contacto</div>
              <a href="https://wa.me/51977980111" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-[10px] text-[#cfd4db] font-semibold text-[15px] no-underline mb-[13px] hover:text-mint transition">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2z" />
                </svg>
                +51 977 980 111
              </a>
              <a href="mailto:lideriumteam@gmail.com"
                className="flex items-center gap-3 bg-gradient-to-br from-[rgba(46,108,160,.16)] to-[rgba(47,179,137,.10)] border border-[rgba(155,200,240,.22)] rounded-[14px] px-[15px] py-[13px] text-white no-underline mt-1 hover:border-[rgba(155,200,240,.5)] transition w-full">
                <span className="w-[38px] h-[38px] rounded-[11px] bg-[rgba(255,255,255,.06)] border border-[rgba(255,255,255,.1)] flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6FB7F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M4 7l8 6 8-6" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold text-[#8A929E] uppercase tracking-[0.06em]">Escríbenos por correo</span>
                  <span className="block text-[14px] font-bold text-white mt-[2px] truncate">lideriumteam@gmail.com</span>
                </span>
              </a>
            </div>
            <div>
              <div className="font-black text-[13px] tracking-[0.08em] uppercase text-[#6A7280] mb-[18px]">Síguenos</div>
              <a href="https://instagram.com/liderium.marketing_" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-[10px] text-[#cfd4db] font-semibold text-[15px] no-underline mb-[13px] hover:text-mint transition">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5.5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
                </svg>
                @liderium.marketing_
              </a>
              <button onClick={onLogin}
                className="mt-[14px] flex items-center gap-2 bg-[rgba(255,255,255,.06)] border border-[rgba(255,255,255,.14)] text-white font-bold text-[13.5px] px-4 py-[10px] rounded-[11px] cursor-pointer hover:bg-[rgba(255,255,255,.12)] transition">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Acceso a la plataforma
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:justify-between gap-2 pt-[26px]">
            <span className="text-[#6A7280] text-[13.5px]">© 2026 Liderium · Consultora de contenido digital</span>
            <span className="text-[#6A7280] text-[13.5px]">Hecho con estrategia, no con suerte.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
