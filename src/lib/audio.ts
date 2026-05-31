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

export function playDigitSound(enabled: boolean) {
  if (!enabled) return;
  const Ctx = window.AudioContext || (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = 440;
  g.gain.value = 0.02;
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
  o.stop(ctx.currentTime + 0.06);
}


function playTone(enabled: boolean, type: OscillatorType, startFrequency: number, endFrequency: number, gainValue: number, durationSeconds: number) {
  if (!enabled) return;
  const Ctx = window.AudioContext || (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = startFrequency;
  g.gain.value = gainValue;
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.frequency.exponentialRampToValueAtTime(endFrequency, ctx.currentTime + durationSeconds * 0.65);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSeconds);
  o.stop(ctx.currentTime + durationSeconds);
}

export function playVisualizationCrossSound(enabled: boolean) {
  playTone(enabled, 'square', 520, 420, 0.015, 0.05);
}

export function playVisualizationStepCorrectSound(enabled: boolean) {
  playTone(enabled, 'triangle', 660, 990, 0.035, 0.1);
}

export function playVisualizationStepWrongSound(enabled: boolean) {
  playTone(enabled, 'sawtooth', 220, 140, 0.025, 0.12);
}
