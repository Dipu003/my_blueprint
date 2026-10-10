// The character's welcome speech: loads the clips, plays them, and tells the 3D face how far to open
// its mouth. The clips themselves come from scripts/generate-voice.ps1 (text in intro-lines.json).
//
// Lip-sync is measured from the recording, not guessed: when a clip loads, its loudness is sampled 60
// times a second ("envelope") together with a rough bright/dull measure (round "oo" vs wide "ee").
// While a line plays, `mouth()` reads the envelope at the playing position. Because it follows a clock
// rather than the speakers, the face keeps talking in step with the captions when sound is muted or
// still locked by the browser.

import introData from '@/data/intro-lines.json';
import { audioContext, audioLive, isSoundEnabled } from '@/lib/sound';

export type Gesture = 'wave' | 'chest' | 'explain' | 'point' | 'welcome';

export interface IntroLine {
  id: string;
  /** Shown as the caption. */
  text: string;
  /** What the voice is told to read (spelled out so "AI" is not said as "ay"). */
  speech: string;
  gesture: Gesture | 'idle';
  /** Tech tags orbit him while this line is spoken (the key-skills lines). */
  chips?: boolean;
}

export const INTRO_LINES = introData.lines as IntroLine[];

/** Tune the character's voice here. */
export const VOICE = {
  // Playback speed. The clips are read by an adult-sounding voice; playing them a little faster lifts the
  // pitch AND the vocal formants together, which is what makes a voice sound younger.
  // 1 = as recorded, 1.1 = young man, 1.2 = teenager, 1.3 = child.
  rate: 1.16,
  loudness: 0.115, // every line is levelled to this loudness (RMS, about -19 dBFS: the same as the announcer)
  ceiling: 0.8, // and no peak goes above this (about -2 dBFS), so nothing ever clips (the 80 Hz filter adds a little)
  gap: 0.22, // seconds of silence between two lines
};

interface Clip {
  buf: AudioBuffer;
  start: number; // where the speech starts inside the buffer (s)
  dur: number; // length of the speech inside the buffer (s), at normal speed
  hop: number; // seconds per envelope sample
  env: Float32Array; // 0..1.2 loudness
  bright: Float32Array; // -1 (round) .. 1 (wide)
}

const clips = new Map<string, Promise<Clip | null>>();

const percentile = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;

/**
 * Evens out a clip's loudness and keeps its peaks under a ceiling, with a look-ahead limiter: for every
 * millisecond it works out the gain that would bring the peak under the ceiling, spreads that dip a few
 * milliseconds either side and smooths it, so the volume eases down before a loud syllable and back up
 * after it (no clicks, and no clipping, which a plain gain or a compressor node cannot promise).
 */
function level(src: Float32Array, sr: number, a: number, b: number): Float32Array {
  let sum = 0;
  for (let i = a; i <= b; i++) sum += src[i] * src[i];
  const g0 = VOICE.loudness / Math.max(Math.sqrt(sum / Math.max(1, b - a + 1)), 1e-4);

  const block = Math.max(1, Math.round(sr * 0.001)); // 1 ms
  const nb = Math.ceil(src.length / block);
  const need = new Float32Array(nb);
  for (let j = 0; j < nb; j++) {
    let pk = 0;
    const end = Math.min(src.length, (j + 1) * block);
    for (let i = j * block; i < end; i++) {
      const v = Math.abs(src[i]);
      if (v > pk) pk = v;
    }
    need[j] = Math.min(1, VOICE.ceiling / Math.max(pk * g0, 1e-6));
  }
  const spread = new Float32Array(nb); // the deepest dip within 4 ms either side
  for (let j = 0; j < nb; j++) {
    let m = 1;
    for (let k = Math.max(0, j - 4); k <= Math.min(nb - 1, j + 4); k++) if (need[k] < m) m = need[k];
    spread[j] = m;
  }
  const smooth = new Float32Array(nb); // averaged over 5 ms: never deeper than the dip it came from
  for (let j = 0; j < nb; j++) {
    let t = 0;
    let c = 0;
    for (let k = Math.max(0, j - 2); k <= Math.min(nb - 1, j + 2); k++) {
      t += spread[k];
      c++;
    }
    smooth[j] = t / c;
  }
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const pos = i / block - 0.5;
    const j0 = Math.max(0, Math.min(nb - 1, Math.floor(pos)));
    const j1 = Math.min(nb - 1, j0 + 1);
    const f = Math.max(0, Math.min(1, pos - j0));
    out[i] = src[i] * g0 * (smooth[j0] * (1 - f) + smooth[j1] * f);
  }
  return out;
}

function analyse(decoded: AudioBuffer): Clip {
  const d0 = decoded.getChannelData(0);
  const sr = decoded.sampleRate;

  // Where the speech really starts and ends (the generator leaves silence on both sides).
  const thr = 0.015;
  let a = 0;
  let b = d0.length - 1;
  while (a < b && Math.abs(d0[a]) < thr) a++;
  while (b > a && Math.abs(d0[b]) < thr) b--;
  const start = Math.max(0, a / sr - 0.02);
  const end = Math.min(decoded.duration, b / sr + 0.1);

  // The buffer that is played: levelled and peak-limited. The mouth is measured from the same samples.
  const d = level(d0, sr, a, b);
  const buf = new AudioBuffer({ length: d.length, sampleRate: sr, numberOfChannels: 1 });
  buf.copyToChannel(d, 0);

  // Loudness and brightness, 60 times a second.
  const hop = 1 / 60;
  const step = Math.max(1, Math.round(sr * hop));
  const win = step * 2;
  const first = Math.round(start * sr);
  const n = Math.max(1, Math.ceil(((end - start) * sr) / step));
  const env = new Float32Array(n);
  const raw = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const from = first + k * step;
    const to = Math.min(d.length - 1, from + win);
    let e = 0;
    let diff = 0;
    for (let i = from + 1; i <= to; i++) {
      e += d[i] * d[i];
      const x = d[i] - d[i - 1];
      diff += x * x;
    }
    const len = Math.max(1, to - from);
    const r = Math.sqrt(e / len);
    env[k] = r;
    raw[k] = Math.sqrt(diff / len) / (r + 1e-4); // high-frequency share: higher = "ee"/"s", lower = "oo"/"aa"
  }
  const sorted = Array.from(env).sort((x, y) => x - y);
  const top = Math.max(percentile(sorted, 0.9), 1e-4);
  for (let k = 0; k < n; k++) env[k] = Math.min(1.2, env[k] / top);

  const voiced = Array.from(raw).filter((_, k) => env[k] > 0.25).sort((x, y) => x - y);
  const lo = percentile(voiced, 0.15);
  const hi = Math.max(percentile(voiced, 0.85), lo + 1e-3);
  const bright = new Float32Array(n);
  for (let k = 0; k < n; k++) bright[k] = Math.max(-1, Math.min(1, ((raw[k] - lo) / (hi - lo)) * 2 - 1));

  return { buf, start, dur: Math.max(0.2, end - start), hop, env, bright };
}

function loadClip(id: string): Promise<Clip | null> {
  let p = clips.get(id);
  if (!p) {
    // An offline context decodes without needing the browser to have unlocked audio yet.
    p =
      typeof window === 'undefined' || typeof OfflineAudioContext === 'undefined'
        ? Promise.resolve(null)
        : fetch(`/voice/${id}.wav`)
            .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
            .then((ab) => new OfflineAudioContext(1, 1, 44100).decodeAudioData(ab))
            .then(analyse)
            .catch(() => null);
    clips.set(id, p);
  }
  return p;
}

/** Reading time when a clip is missing: about 15 characters a second. */
const fallbackSeconds = (line: IntroLine) => Math.max(1.4, line.text.length / 15);

const secondsFor = (clip: Clip | null, line: IntroLine) => (clip ? clip.dur / VOICE.rate : fallbackSeconds(line)) + 0.05;

/** How long a line lasts when played (seconds), for timing its caption. */
export async function lineSeconds(line: IntroLine): Promise<number> {
  return secondsFor(await loadClip(line.id), line);
}

/** Fetches and analyses every intro line. Safe to call early and more than once. */
export async function preloadIntro(): Promise<boolean> {
  const all = await Promise.all(INTRO_LINES.map((l) => loadClip(l.id)));
  return all.every(Boolean);
}

/* ---------------- playing ---------------- */

interface Playing {
  token: number;
  clip: Clip | null;
  t0: number; // performance.now() when the speech starts
  total: number; // seconds the line lasts
  src: AudioBufferSourceNode | null;
  out: GainNode | null;
  timer: ReturnType<typeof setTimeout>;
  finish: (completed: boolean) => void;
  latency: number;
}

let cur: Playing | null = null;
let seq = 0;

export interface MouthShape {
  /** 0 (closed) .. 1 (wide open). */
  open: number;
  /** -1 (round, "oo") .. 1 (wide, "ee"). */
  wide: number;
  speaking: boolean;
}

const SILENT: MouthShape = { open: 0, wide: 0, speaking: false };

/**
 * Plays one line. Resolves true when it finished, false when it was cut off (`stopSpeaking`, or another
 * line started). Works without sound too (muted, locked, or the clip is missing): the same clock runs,
 * so captions and the mouth stay in step.
 */
export async function speak(line: IntroLine): Promise<boolean> {
  stopSpeaking();
  const token = ++seq;
  const clip = await loadClip(line.id);
  if (token !== seq) return false;

  const rate = VOICE.rate;
  const total = secondsFor(clip, line);

  return new Promise<boolean>((resolve) => {
    const p: Playing = {
      token,
      clip,
      t0: performance.now() + 40,
      total,
      src: null,
      out: null,
      latency: 0.03,
      timer: setTimeout(() => p.finish(true), total * 1000 + 90),
      finish: (completed) => {
        clearTimeout(p.timer);
        if (cur === p) cur = null;
        try {
          p.src?.stop();
        } catch {}
        p.src?.disconnect();
        p.out?.disconnect();
        resolve(completed);
      },
    };
    cur = p;

    const c = clip && isSoundEnabled() && audioLive() ? audioContext() : null;
    if (c && clip) {
      p.latency = c.outputLatency || c.baseLatency || 0.03;
      const src = c.createBufferSource();
      src.buffer = clip.buf;
      src.playbackRate.value = rate;
      // Rumble below 80 Hz removed. The levelling and the peak limiting are already in the samples (see
      // level()); a compressor node here would add its own make-up gain and push the output into clipping.
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 80;
      const out = c.createGain(); // only here so a mute can cut the sound without stopping the mouth
      src.connect(hp).connect(out).connect(c.destination);
      src.start(c.currentTime + 0.04, clip.start, clip.dur);
      p.src = src;
      p.out = out;
    }
  });
}

/** Cuts off whatever is being said. */
export function stopSpeaking() {
  seq++;
  cur?.finish(false);
}

/** How the mouth should look right now; read it every frame. */
export function mouth(): MouthShape {
  const p = cur;
  if (!p) return SILENT;

  // Sound muted part-way through a line: the face carries on, the voice stops.
  if (p.out && !isSoundEnabled()) {
    try {
      p.src?.stop();
    } catch {}
    p.out.disconnect();
    p.out = null;
    p.src = null;
  }

  const elapsed = (performance.now() - p.t0) / 1000 - p.latency;
  if (elapsed < 0) return { open: 0, wide: 0, speaking: true };

  if (!p.clip) {
    // No recording to follow: a lively, irregular open-close at about the pace people talk.
    const t = elapsed;
    const syl = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 4.6 + Math.sin(t * 2.3) * 2);
    const phrase = 0.55 + 0.45 * Math.sin(t * 1.9 + 1);
    return { open: Math.max(0, syl * phrase * 0.9 - 0.08), wide: Math.sin(t * 3.1) * 0.6, speaking: true };
  }

  const k = (elapsed * VOICE.rate) / p.clip.hop;
  const i = Math.floor(k);
  if (i < 0 || i >= p.clip.env.length - 1) return { open: 0, wide: 0, speaking: true };
  const f = k - i;
  const e = p.clip.env[i] * (1 - f) + p.clip.env[i + 1] * f;
  const w = p.clip.bright[i] * (1 - f) + p.clip.bright[i + 1] * f;
  // A noise gate, then a gentle curve so quiet syllables still move the lips.
  const open = Math.min(1, Math.max(0, (e - 0.1) / 0.62)) ** 0.85;
  return { open, wide: w, speaking: true };
}
