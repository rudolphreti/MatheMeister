export function playCoinSound(enabled: boolean) {
  if (!enabled) return;
  const Ctx = window.AudioContext || (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.value = 880;
  g.gain.value = 0.05;
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
  o.stop(ctx.currentTime + 0.12);
}
