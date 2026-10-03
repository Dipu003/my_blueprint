// Tiny WebAudio synth: no asset files needed. Browsers require a user gesture
// before audio starts, so the context is created lazily on the first cue.
// Sounds are tuned to feel like a tactical shooter menu: mechanical clicks,
// bolt/rack thunks and radio beeps.

type Cue = 'hover' | 'tab' | 'tile' | 'click' | 'nav' | 'fetch' | 'sunrise' | 'nightfall' | 'boot' | 'confirm';

let ctx: AudioContext | null = null;
let enabled = true;
let noiseBuf: AudioBuffer | null = null;

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (!on) stopVoice();
}

/* ---------------- Announcer voice ---------------- */
// The lines are pre-rendered clips in /public/voice (see scripts/generate-voice.ps1), played through
// a "radio comms" chain so they sound like mission control in a shooter rather than a browser TTS.
// Tweak the feel here:
const RADIO = {
  highpass: 320, // Hz: trims the low end like a small speaker
  lowpass: 4200, // Hz: comms top end (high enough that her voice stays bright and feminine)
  midBoost: 3, // dB around 1.7 kHz for comms presence
  grit: 1.3, // soft-clip amount (0 = clean)
  static: 0.008, // level of the background hiss while she talks
  volume: 1.15,
  keyDelay: 0.08, // seconds between the "mic key" click and the first word
};

type Clip = { buf: AudioBuffer; start: number; dur: number };
const clips = new Map<string, Promise<Clip | null>>();
let voiceSeq = 0;
let voiceNodes: AudioScheduledSourceNode[] = [];

/** Finds where the speech really starts and ends, so silence padding doesn't delay or drag. */
function trim(buf: AudioBuffer): Clip {
  const d = buf.getChannelData(0);
  const thr = 0.015;
  let a = 0;
  let b = d.length - 1;
  while (a < b && Math.abs(d[a]) < thr) a++;
  while (b > a && Math.abs(d[b]) < thr) b--;
  const start = Math.max(0, a / buf.sampleRate - 0.02);
  const end = Math.min(buf.duration, b / buf.sampleRate + 0.12);
  return { buf, start, dur: Math.max(0.2, end - start) };
}

function loadClip(id: string): Promise<Clip | null> {
  let p = clips.get(id);
  if (!p) {
    const c = getCtx();
    p = c
      ? fetch(`/voice/${id}.wav`)
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
          .then((ab) => c.decodeAudioData(ab))
          .then(trim)
          .catch(() => null)
      : Promise.resolve(null);
    clips.set(id, p);
  }
  return p;
}

function softClip(amount: number): Float32Array {
  const n = 1024;
  const curve = new Float32Array(n);
  const k = Math.max(0.01, amount);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}

function stopVoice() {
  voiceSeq++;
  voiceNodes.forEach((n) => {
    try {
      n.stop();
    } catch {}
  });
  voiceNodes = [];
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

/** Last resort if a clip can't be loaded: the browser's own voice, preferring a female one. */
function speakFallback(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  const en = synth.getVoices().filter((v) => /^en/i.test(v.lang));
  u.voice =
    en.find((v) => /zira|aria|jenny|samantha|hazel|susan|eva|female/i.test(v.name)) ?? en[0] ?? null;
  u.rate = 0.98;
  u.pitch = 1.05;
  synth.speak(u);
}

/**
 * Says a line over the radio: mic-key click, the clip through the comms filter with a little
 * static underneath, then the squelch tail. A newer line always cuts off an older one.
 */
export async function announce(id: string, fallbackText: string) {
  if (!enabled || typeof window === 'undefined') return;
  stopVoice();
  const seq = voiceSeq;
  const clip = await loadClip(id);
  if (seq !== voiceSeq || !enabled) return; // replaced or muted while it was loading
  const c = getCtx();
  if (!c || !clip) return speakFallback(fallbackText);

  const now = c.currentTime;
  const t0 = now + RADIO.keyDelay;

  // voice -> comms filter chain
  const src = c.createBufferSource();
  src.buffer = clip.buf;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = RADIO.highpass;
  hp.Q.value = 0.8;
  const mid = c.createBiquadFilter();
  mid.type = 'peaking';
  mid.frequency.value = 1700;
  mid.Q.value = 1.1;
  mid.gain.value = RADIO.midBoost;
  const grit = c.createWaveShaper();
  grit.curve = softClip(RADIO.grit);
  grit.oversample = '2x';
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = RADIO.lowpass;
  lp.Q.value = 0.8;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -24;
  comp.ratio.value = 6;
  comp.attack.value = 0.003;
  comp.release.value = 0.12;
  const out = c.createGain();
  out.gain.value = RADIO.volume;
  src.connect(hp).connect(mid).connect(grit).connect(lp).connect(comp).connect(out).connect(c.destination);
  src.start(t0, clip.start, clip.dur);
  voiceNodes.push(src);

  // faint static bed while the channel is open
  if (noiseBuf) {
    const hiss = c.createBufferSource();
    hiss.buffer = noiseBuf;
    hiss.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600;
    bp.Q.value = 0.5;
    const hg = c.createGain();
    hg.gain.value = RADIO.static;
    hiss.connect(bp).connect(hg).connect(c.destination);
    hiss.start(now);
    hiss.stop(t0 + clip.dur + 0.1);
    voiceNodes.push(hiss);
  }

  // mic key-up click before the first word, squelch tail after the last
  noise(0.06, 0.16, 2400, 0.8);
  blip(1450, 0.035, 'square', 0.03);
  noise(0.1, 0.13, 2000, 0.7, RADIO.keyDelay + clip.dur);
  blip(900, 0.04, 'square', 0.025, undefined, RADIO.keyDelay + clip.dur);
}

// Minimum gap between repeats of the chattiest cues, so sweeping across a grid stays smooth.
const MIN_GAP: Partial<Record<Cue, number>> = { hover: 45, tile: 50, tab: 90 };
const lastAt: Partial<Record<Cue, number>> = {};

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
  // A 4 ms fade-in removes the click an instant attack makes, so notes sound clean.
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

/** One shared second of white noise, built on first use. */
function noiseBuffer(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** Filtered noise burst: the "metal on metal" part of a click or gun action. */
function noise(dur: number, gain: number, freq: number, q = 1, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
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

/** Rising band of static that swells and fades: the "uplink charging" riser. */
function riser(dur: number, from: number, to: number, gain: number, q = 1.2, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t0);
  f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.85);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

/** Held note at a fixed pitch (no sliding) that swells in and fades out, for a synth pad. */
function pad(freq: number, dur: number, gain: number, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, t0);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + dur * 0.55);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

/**
 * Call on the first user gesture: creates the audio context, fills the noise buffer and loads the
 * speech voices ahead of time, so the first real cue doesn't hitch the page.
 */
export function warmUp(voiceIds: string[] = []) {
  const c = getCtx();
  if (c) noiseBuffer(c);
  voiceIds.forEach((id) => void loadClip(id)); // fetch + decode the announcer clips now
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.getVoices();
}

export function play(cue: Cue) {
  if (!enabled) return;
  const gap = MIN_GAP[cue];
  if (gap) {
    const now = performance.now();
    if (now - (lastAt[cue] ?? 0) < gap) return;
    lastAt[cue] = now;
  }
  switch (cue) {
    case 'hover':
      // light safety-switch tick
      noise(0.025, 0.12, 4200, 3);
      return blip(1800, 0.02, 'square', 0.01);
    case 'tab':
      // short dry tick with a soft mid-pitched body (~600 Hz), about 40 ms. Not a bell (no ringing
      // sine pings) and not a drum (nothing low). Try other pitches/timbres in /ui-lab.html.
      noise(0.012, 0.09, 3000, 2);
      return blip(620, 0.04, 'triangle', 0.05, 540);
    case 'tile':
      // very light, high tick so sweeping across a grid of tiles stays pleasant
      noise(0.018, 0.06, 6200, 4);
      return blip(2700, 0.012, 'square', 0.005);
    case 'click':
      // crisp tech click: bright snap plus a tiny rising tick. No low end (the old thump sounded
      // like a drum).
      noise(0.03, 0.2, 3400, 2.5);
      return blip(1100, 0.045, 'square', 0.03, 1700);
    case 'nav':
      // main-tab select: a tick and two quick low-mid notes, about 0.1 s in total
      noise(0.014, 0.1, 2600, 2);
      blip(520, 0.05, 'triangle', 0.055);
      return blip(780, 0.07, 'triangle', 0.05, undefined, 0.045);
    case 'fetch':
      // "data stream": four tiny soft chirps and one confirming note, all within ~0.32 s
      [760, 960, 860, 1120].forEach((f, i) => blip(f, 0.024, 'triangle', 0.02, undefined, 0.1 + i * 0.035));
      return blip(1240, 0.055, 'triangle', 0.025, undefined, 0.26);
    case 'sunrise':
      // switching to the light theme: a bright rising G-major arpeggio
      blip(784, 0.08, 'sine', 0.05);
      blip(988, 0.08, 'sine', 0.05, undefined, 0.07);
      return blip(1319, 0.14, 'sine', 0.05, undefined, 0.14);
    case 'nightfall':
      // switching to the dark theme: the same notes falling
      blip(1319, 0.08, 'sine', 0.05);
      blip(988, 0.08, 'sine', 0.05, undefined, 0.07);
      return blip(784, 0.16, 'sine', 0.05, undefined, 0.14);
    case 'confirm':
      // radio double-beep
      blip(1320, 0.07, 'square', 0.035);
      blip(1320, 0.07, 'square', 0.035, undefined, 0.11);
      noise(0.03, 0.08, 5000, 1, 0);
      return;
    case 'boot':
      // "system online" stinger, timed to the ~2 s loading bar. Every tone holds a fixed pitch
      // (the old sliding tone sounded like a boing) and nothing sits below ~440 Hz (no thumps).
      noise(0.05, 0.15, 3000, 1); // radio opens
      blip(1450, 0.035, 'square', 0.025);
      riser(1.7, 700, 6500, 0.07, 1.2, 0.1); // uplink charging
      pad(440, 1.9, 0.022, 0.15); // A major chord swelling in
      pad(554, 1.9, 0.02, 0.2);
      pad(659, 1.9, 0.018, 0.25);
      pad(880, 1.7, 0.01, 0.5);
      noise(0.035, 0.22, 2300, 2.2, 0.3); // two metallic bolt clicks
      noise(0.04, 0.22, 3300, 2.2, 0.42);
      blip(1568, 0.07, 'square', 0.03, undefined, 1.85); // "ready" double beep as the bar fills
      blip(2093, 0.12, 'square', 0.03, undefined, 1.95);
      noise(0.03, 0.08, 5000, 1, 1.85);
      return;
  }
}
