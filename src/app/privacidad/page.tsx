export const metadata = {
  title: 'Política de Privacidad — Liderium',
};

export default function PrivacidadPage() {
  return (
    <div className="max-w-[720px] mx-auto px-6 py-16 md:py-24 text-white">
      <h1 className="font-grotesk font-bold text-[32px] md:text-[40px] -tracking-[0.02em] mb-2">Política de Privacidad</h1>
      <p className="text-[#8A929E] text-[14px] mb-10">Última actualización: agosto de 2026</p>

      <div className="flex flex-col gap-8 text-[15px] leading-[1.7] text-[#C2C8D2]">
        <section>
          <h2 className="font-grotesk font-bold text-[19px] text-white mb-2">1. Quiénes somos</h2>
          <p>Liderium es una agencia de marketing digital. Esta política explica qué información recopilamos de nuestros clientes y visitantes, y cómo la usamos.</p>
        </section>

        <section>
          <h2 className="font-grotesk font-bold text-[19px] text-white mb-2">2. Qué información recopilamos</h2>
          <p className="mb-2">Recopilamos la información que nos proporcionas directamente al contactarnos o convertirte en cliente:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>Nombre, número de WhatsApp, correo electrónico y usuario de Instagram.</li>
            <li>El contenido de los mensajes que nos envías por Instagram o WhatsApp para coordinar servicios, reuniones o soporte.</li>
            <li>Datos de las reuniones agendadas (fecha, hora, tema) para coordinar tu calendario.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-grotesk font-bold text-[19px] text-white mb-2">3. Cómo usamos tu información</h2>
          <p className="mb-2">Usamos esta información únicamente para:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>Responder tus mensajes y brindarte atención comercial.</li>
            <li>Coordinar y recordar reuniones.</li>
            <li>Dar seguimiento a los servicios contratados con nuestra agencia.</li>
          </ul>
          <p className="mt-2">No vendemos, alquilamos ni compartimos tu información con terceros para fines de publicidad ajenos a Liderium.</p>
        </section>

        <section>
          <h2 className="font-grotesk font-bold text-[19px] text-white mb-2">4. Integración con Instagram y WhatsApp</h2>
          <p>Usamos la API de Instagram y la API de WhatsApp Business (de Meta) para leer y responder los mensajes que nos escriben nuestros clientes desde esas plataformas, dentro de nuestro propio panel interno. Esta integración solo accede a las conversaciones de nuestras cuentas de negocio y se usa exclusivamente para brindar atención al cliente — no publicamos, no recopilamos datos de otras cuentas, ni usamos esta información con fines distintos a los descritos en esta política.</p>
        </section>

        <section>
          <h2 className="font-grotesk font-bold text-[19px] text-white mb-2">5. Conservación y eliminación de datos</h2>
          <p>Conservamos tu información mientras exista una relación comercial activa o mientras sea razonablemente necesario para los fines descritos. Puedes solicitar la eliminación de tus datos escribiéndonos al correo de contacto abajo.</p>
        </section>

        <section>
          <h2 className="font-grotesk font-bold text-[19px] text-white mb-2">6. Contacto</h2>
          <p>Si tienes preguntas sobre esta política o quieres solicitar la eliminación de tus datos, escríbenos a <a href="mailto:contacto@liderium.com" className="text-[#6FB7F0] underline">contacto@liderium.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
