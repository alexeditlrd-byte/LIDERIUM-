export const metadata = {
  title: 'Términos de Servicio — Liderium',
};

export default function TerminosPage() {
  return (
    <div className="max-w-[720px] mx-auto px-6 py-16 md:py-24 text-white">
      <h1 className="font-grotesk font-bold text-[32px] md:text-[40px] -tracking-[0.02em] mb-2">Términos de Servicio</h1>
      <p className="text-[#8A929E] text-[14px] mb-10">Última actualización: agosto de 2026</p>

      <div className="flex flex-col gap-8 text-[15px] leading-[1.7] text-[#C2C8D2]">
        <section>
          <h2 className="font-grotesk font-bold text-[19px] text-white mb-2">1. Sobre Liderium</h2>
          <p>Liderium es una agencia de marketing digital que ofrece estrategia de contenido, gestión de redes sociales y servicios relacionados a sus clientes.</p>
        </section>

        <section>
          <h2 className="font-grotesk font-bold text-[19px] text-white mb-2">2. Uso del sitio y del panel de clientes</h2>
          <p>El acceso al portal de clientes y al panel interno de Liderium es exclusivo para clientes y equipo autorizado. Cada cuenta es personal e intransferible; el usuario es responsable de mantener sus credenciales seguras.</p>
        </section>

        <section>
          <h2 className="font-grotesk font-bold text-[19px] text-white mb-2">3. Comunicación por Instagram y WhatsApp</h2>
          <p>Al escribirnos por Instagram o WhatsApp, aceptas que usemos esos canales para responderte y coordinar los servicios contratados, conforme a nuestra <a href="/privacidad" className="text-[#6FB7F0] underline">Política de Privacidad</a>.</p>
        </section>

        <section>
          <h2 className="font-grotesk font-bold text-[19px] text-white mb-2">4. Contacto</h2>
          <p>Para preguntas sobre estos términos, escríbenos a <a href="mailto:contacto@liderium.com" className="text-[#6FB7F0] underline">contacto@liderium.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
