'use client';

import { useState, useEffect } from 'react';
import Landing from '@/components/Landing';
import Login, { ClientData } from '@/components/Login';
import Portal from '@/components/Portal';
import Staff from '@/components/Staff';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [view, setView] = useState<'landing' | 'login' | 'portal' | 'staff'>('landing');
  const [transit, setTransit] = useState(false);
  const [intro, setIntro] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);

  const goView = (v: typeof view) => {
    setTransit(true);
    const t1 = setTimeout(() => { setView(v); window.scrollTo(0, 0); }, 480);
    const t2 = setTimeout(() => setTransit(false), 1080);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setClientData(null);
    goView('landing');
  };

  // Restore session on page load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const meta = session.user.user_metadata;
        if (meta?.role === 'staff') {
          setView('staff');
        } else if (meta?.role === 'client') {
          setClientData({ name: meta.name ?? 'Cliente', slug: meta.slug ?? '', plan: meta.plan ?? 'Crecimiento', email: session.user.email ?? '' });
          setView('portal');
        }
      }
    });
  }, []);

  // Intro animation
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 2550);
    return () => clearTimeout(t);
  }, []);

  // Parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.querySelectorAll('[data-parallax]').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (e.clientY > rect.bottom || e.clientY < rect.top) return;
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        (el as HTMLElement).style.setProperty('--px', px.toFixed(3));
        (el as HTMLElement).style.setProperty('--py', py.toFixed(3));
        const spot = el.querySelector('[data-spot]') as HTMLElement;
        if (spot) { spot.style.left = (e.clientX - rect.left) + 'px'; spot.style.top = (e.clientY - rect.top) + 'px'; spot.style.opacity = '1'; }
      });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative min-h-screen">
      {intro && (
        <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-[#1d2433] via-[#0E0F12] to-[#0B0C0F] flex flex-col items-center justify-center animate-introOverlay">
          <img src="/assets/liderium-white.png" alt="Liderium" className="w-[min(440px,64vw)] animate-introLogo" />
          <div className="mt-6 h-[2px] w-[min(180px,40vw)] bg-steel animate-introLine" />
          <p className="mt-4 text-[#6a7484] text-[13px] font-semibold tracking-widest uppercase animate-introFade">Tu estrategia. Tu crecimiento.</p>
        </div>
      )}
      {transit && (
        <div className="fixed inset-0 z-[9998] bg-gradient-to-b from-[#1d2433] via-[#0B0C0F] to-[#0B0C0F] flex items-center justify-center pointer-events-none animate-transitIn">
          <img src="/assets/liderium-white.png" alt="" className="w-[min(280px,52vw)] animate-transitLogo" />
        </div>
      )}

      {view === 'landing' && <Landing onLogin={() => goView('login')} />}
      {view === 'login' && (
        <Login
          onLanding={() => goView('landing')}
          onPortal={(data) => { setClientData(data); goView('portal'); }}
          onStaff={() => goView('staff')}
        />
      )}
      {view === 'portal' && <Portal onLogout={handleLogout} clientData={clientData} />}
      {view === 'staff' && <Staff onLogout={handleLogout} />}
    </div>
  );
}
