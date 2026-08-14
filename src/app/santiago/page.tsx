'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Archivo, Instrument_Sans } from 'next/font/google';

const archivo = Archivo({ weight: ['500', '700', '800', '900'], subsets: ['latin'], variable: '--font-archivo' });
const instrumentSans = Instrument_Sans({ weight: ['400', '500', '600'], subsets: ['latin'], variable: '--font-instrument-sans' });

// Datos de contacto — cambiar aquí si el número o los mensajes precargados cambian.
const WHATSAPP_NUMBER = '51977980111';
const MSG_WORKSHOP = 'Hola Santiago, tengo interés de workshops';
const MSG_SERVICIO = 'Hola Santiago, tengo interés de servicios';
const PRECIO = 'S/ 200';

function waLink(text: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

const RED = '#FF4536';
const BLUE = '#2E6CA0';
const BLUE_LIGHT = '#5FA0DA';
const BG = '#08080A';
const TEXT = '#F4F1EA';

export default function SantiagoEstrategiasPage() {
  const [open, setOpen] = useState(false);
  const [openDet, setOpenDet] = useState(false);

  return (
    <>
      <style>{`
        .ss-page a { color: ${TEXT}; text-decoration: none; }
        .ss-page a:hover { color: ${RED}; }
        .ss-page ::selection { background: ${RED}; color: ${BG}; }
        @keyframes ssPulseDot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(.8); } }
        .ss-servicio-card:hover { border-color: ${BLUE_LIGHT}; transform: translateY(-2px); }
        .ss-toggle:hover { color: ${RED}; }
      `}</style>

      <div
        className={`ss-page ${archivo.variable} ${instrumentSans.variable}`}
        style={{
          background: `radial-gradient(680px circle at 12% -5%, rgba(46,108,160,0.20), transparent 60%),
            radial-gradient(680px circle at 92% 105%, rgba(255,69,54,0.16), transparent 60%),
            ${BG}`,
          minHeight: '100vh',
          fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif',
          color: TEXT,
          display: 'flex',
          justifyContent: 'center',
          padding: '0 16px 64px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 1040, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '26px 2px 6px' }}>
            <div style={{ fontFamily: "var(--font-archivo), sans-serif", fontWeight: 900, fontSize: 15, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
              Santiago<span style={{ color: RED }}>.</span>estrategias
            </div>
          </div>

          <div
            style={{
              border: '1px solid #1C1C22',
              borderRadius: 22,
              padding: 'clamp(22px, 3vw, 40px) clamp(20px, 3vw, 40px)',
              background: 'linear-gradient(180deg, #101014 0%, #0A0A0D 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 88, height: 88, borderRadius: 999, overflow: 'hidden', flex: 'none', border: '1px solid #26262E', position: 'relative' }}>
                <Image src="/santiago-avatar.webp" alt="Santiago Noriega" fill className="object-cover" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontFamily: "var(--font-archivo), sans-serif", fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em' }}>Santiago Noriega</div>
                <div style={{ fontSize: 13.5, color: '#8B8880' }}>Estrategias virales&nbsp;</div>
              </div>
            </div>

            <h1 style={{ fontFamily: "var(--font-archivo), sans-serif", fontWeight: 900, fontSize: 'clamp(32px, 5.5vw, 52px)', lineHeight: 1.02, letterSpacing: '-0.035em', margin: '4px 0 0' }}>
              Escalo marcas personales con <span style={{ color: BLUE_LIGHT }}>estrategias virales</span>.
            </h1>
            <p style={{ margin: 0, fontSize: 'clamp(15px, 1.6vw, 18px)', lineHeight: 1.55, color: '#A9A6A0' }}>
              +2M de vistas generadas para mis clientes. Te enseño el sistema en los workshops o lo ejecutamos juntos como servicio.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 4 }}>
              {[
                { value: '+2M', label: 'vistas' },
                { value: '2 días', label: 'intensivos' },
                { value: '100%', label: 'en vivo' },
              ].map(stat => (
                <div key={stat.label} style={{ border: '1px solid #1C1C22', borderRadius: 14, padding: '12px 12px 11px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontFamily: "var(--font-archivo), sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em' }}>{stat.value}</div>
                  <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#75736D' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 2px 2px' }}>
            <div style={{ fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#75736D' }}>Elige por dónde empezar</div>
            <div style={{ height: 1, background: '#1C1C22', flex: 1 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, alignItems: 'start' }}>
            {/* Workshop */}
            <div
              style={{
                border: '1px solid #2A1512',
                borderRadius: 22,
                padding: 'clamp(20px, 2.4vw, 30px)',
                background: 'linear-gradient(160deg, #1A0D0B 0%, #0C0A0A 70%)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <a href={waLink(MSG_WORKSHOP)} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', gap: 16, color: TEXT }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: RED }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: RED, animation: 'ssPulseDot 1.8s ease-in-out infinite', display: 'inline-block' }} />
                    Enseñanza · Cupos limitados
                  </div>
                  <div style={{ fontFamily: "var(--font-archivo), sans-serif", fontWeight: 800, fontSize: 15 }}>{PRECIO}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontFamily: "var(--font-archivo), sans-serif", fontWeight: 900, fontSize: 'clamp(28px, 3.4vw, 38px)', lineHeight: 1.05, letterSpacing: '-0.03em' }}>Workshops</div>
                  <div style={{ fontSize: 15, lineHeight: 1.55, color: '#B4B0A9' }}>
                    Dos días intensivos, en vivo, para aprender a crear contenido estratégico: de la idea a la publicación, con un sistema que puedes repetir cada semana.
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {['22 y 23 de agosto', 'Online vía Zoom', '2 sesiones de 2h'].map(tag => (
                    <span key={tag} style={{ fontSize: 12, color: '#C9C5BE', border: '1px solid #2A1512', borderRadius: 999, padding: '6px 11px' }}>{tag}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: RED, color: '#0B0605', borderRadius: 14, padding: '15px 18px', fontFamily: "var(--font-archivo), sans-serif", fontWeight: 800, fontSize: 15.5, marginTop: 2 }}>
                  <span>RESERVA TU CUPO 🚀</span>
                  <span>→</span>
                </div>
              </a>

              <div
                className="ss-toggle"
                onClick={() => setOpen(s => !s)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', borderTop: '1px solid #2A1512', marginTop: 4, padding: '16px 2px 2px' }}
              >
                <span style={{ fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#B4B0A9', fontWeight: 600 }}>¿Qué aprenderás?</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: RED, fontWeight: 600 }}>
                  {open ? 'Ver menos' : 'Ver más'}
                  <span style={{ fontFamily: "var(--font-archivo), sans-serif", fontSize: 15 }}>{open ? '−' : '+'}</span>
                </span>
              </div>

              {open && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
                  {[
                    { n: '01', title: 'Marca y posicionamiento', desc: 'Nicho, arquetipo de audiencia y una razón clara para que te escuchen.' },
                    { n: '02', title: 'Estrategia de contenido', desc: 'TOFU / MOFU / BOFU, sistema de ideación, hooks, retención y guionización.' },
                    { n: '03', title: 'Producción de contenido', desc: 'Presencia en cámara, manual de grabación, edición en CapCut y adaptación a cada canal.' },
                    { n: '04', title: 'Sistematización + IA', desc: 'IA aplicada, reutilización de contenido y constancia sin depender de la inspiración.' },
                  ].map(item => (
                    <div key={item.n} style={{ border: '1px solid #241310', borderRadius: 16, padding: '16px 18px', background: '#0C0A0A', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontFamily: "var(--font-archivo), sans-serif", fontWeight: 800, fontSize: 12, color: RED, letterSpacing: '0.04em' }}>{item.n}</div>
                      <div style={{ fontFamily: "var(--font-archivo), sans-serif", fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>{item.title}</div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#96938D' }}>{item.desc}</div>
                    </div>
                  ))}
                </div>
              )}

              <div
                className="ss-toggle"
                onClick={() => setOpenDet(s => !s)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', borderTop: '1px solid #2A1512', marginTop: 4, padding: '16px 2px 2px' }}
              >
                <span style={{ fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#B4B0A9', fontWeight: 600 }}>Más detalles</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: RED, fontWeight: 600 }}>
                  {openDet ? 'Ver menos' : 'Ver más'}
                  <span style={{ fontFamily: "var(--font-archivo), sans-serif", fontSize: 15 }}>{openDet ? '−' : '+'}</span>
                </span>
              </div>

              {openDet && (
                <div style={{ display: 'grid', gap: 12 }}>
                  {[
                    { label: 'Fechas', value: '22 y 23 de agosto, 2026' },
                    { label: 'Horario', value: <>Día 1: 10:00–12:00<br />Día 2: 9:00–11:00</> },
                    { label: 'Modalidad', value: 'Online en vivo · Zoom' },
                    { label: 'Incluye', value: 'Grabaciones + constancia' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid #241310', paddingBottom: 11 }}>
                      <span style={{ fontSize: 14, color: '#8B8880' }}>{row.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'right' }}>{row.value}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ fontSize: 14, color: '#8B8880' }}>Inversión</span>
                    <span style={{ fontFamily: "var(--font-archivo), sans-serif", fontSize: 16, fontWeight: 800, color: RED }}>{PRECIO}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Servicio */}
            <a
              href={waLink(MSG_SERVICIO)}
              target="_blank"
              rel="noopener noreferrer"
              className="ss-servicio-card"
              style={{ border: '1px solid #12263A', borderRadius: 22, padding: 'clamp(20px, 2.4vw, 30px)', background: 'linear-gradient(160deg, #0B1620 0%, #0A0A0D 70%)', display: 'flex', flexDirection: 'column', gap: 16, color: TEXT, transition: 'border-color .2s, transform .2s' }}
            >
              <div style={{ fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: BLUE_LIGHT }}>Servicio · Trabajo uno a uno</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontFamily: "var(--font-archivo), sans-serif", fontWeight: 900, fontSize: 'clamp(28px, 3.4vw, 38px)', lineHeight: 1.05, letterSpacing: '-0.03em' }}>Servicios</div>
                <div style={{ fontSize: 15, lineHeight: 1.55, color: '#A9A6A0' }}>
                  Diseño y ejecuto la estrategia de contenido de tu marca personal: guiones, producción y sistematización para que publiques con dirección y crezcas mes a mes.
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {['Estrategia y posicionamiento de marca', 'Guionización y contenido viral', 'Producción y edición mensual'].map(item => (
                  <div key={item} style={{ display: 'flex', gap: 10, fontSize: 14, color: '#C9C5BE' }}>
                    <span style={{ color: BLUE_LIGHT }}>—</span>{item}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: BLUE, color: '#F4F1EA', borderRadius: 14, padding: '15px 18px', fontFamily: "var(--font-archivo), sans-serif", fontWeight: 800, fontSize: 15.5, marginTop: 2 }}>
                <span>Consultar por WhatsApp</span>
                <span>→</span>
              </div>
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '30px 0 0' }}>
            <a href="https://www.instagram.com/santiago.estrategias/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: '#8B8880' }}>
              @santiago.estrategias
            </a>
            <div style={{ fontSize: 12, color: '#4E4D49' }}>Liderium · Estrategias virales</div>
          </div>
        </div>
      </div>
    </>
  );
}
