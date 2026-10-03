// Tiny WebAudio synth: no asset files needed. Browsers require a user gesture
// before audio starts, so the context is created lazily on the first cue.
// Sounds are tuned to feel like a tactical shooter menu: mechanical clicks,
// bolt/rack thunks and radio beeps.

type Cue = 'hover' | 'click' | 'boot' | 'confirm';

let ctx: AudioContext | null = null;
let enabled = true;
let noiseBuf: AudioBuffer | null = null;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function blip(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

/** Filtered noise burst: the "metal on metal" part of a click or gun action. */
function noise(dur: number, gain: number, freq: number, q = 1, delay = 0) {
  const c = getCtx();
  if (!c) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

export function play(cue: Cue) {
  if (!enabled) return;
  switch (cue) {
    case 'hover':
      // light safety-switch tick
      noise(0.025, 0.12, 4200, 3);
      return blip(1800, 0.02, 'square', 0.01);
    case 'click':
      // heavy mechanical click: thump + metallic snap
      blip(160, 0.1, 'sine', 0.14, 60);
      noise(0.05, 0.3, 2500, 2);
      noise(0.04, 0.2, 900, 1.5, 0.045);
      return;
    case 'confirm':
      // radio double-beep
      blip(1320, 0.07, 'square', 0.035);
      blip(1320, 0.07, 'square', 0.035, undefined, 0.11);
      noise(0.03, 0.08, 5000, 1, 0);
      return;
    case 'boot':
      // rifle bolt rack + rising uplink tone
      noise(0.06, 0.28, 1800, 2);
      noise(0.07, 0.28, 700, 1.5, 0.16);
      blip(90, 0.6, 'sawtooth', 0.04, 360, 0.25);
      blip(1100, 0.08, 'square', 0.03, undefined, 0.8);
      return;
  }
}
