// Sonido tipo WhatsApp/notificación cuando llega un mensaje entrante —
// sintetizado con Web Audio (sin archivo de audio propio) para no
// depender de ningún asset ni de derechos sobre un sonido real.
// Compartido entre el panel de WhatsApp y el de Instagram.
export function playIncomingSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.09);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.09 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.2);
    });
    setTimeout(() => ctx.close(), 500);
  } catch {
    // Los navegadores bloquean audio si todavía no hubo ninguna
    // interacción del usuario con la página — no es un error real.
  }
}
