/**
 * Game sound effects, made on the fly with Web Audio (no sound files to download).
 * Every sound is optional: if the browser blocks audio, the game just stays quiet.
 */

let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) ctx = new window.AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type Note = { f: number; to?: number; at?: number; len: number; type?: OscillatorType; vol?: number };

function play(notes: Note[]) {
  const a = audio();
  if (!a) return;
  const now = a.currentTime;
  for (const n of notes) {
    try {
      const start = now + (n.at ?? 0);
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = n.type ?? "sine";
      osc.frequency.setValueAtTime(n.f, start);
      if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, start + n.len);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(n.vol ?? 0.2, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + n.len);
      osc.connect(gain);
      gain.connect(a.destination);
      osc.start(start);
      osc.stop(start + n.len + 0.02);
    } catch {
      /* sound is optional */
    }
  }
}

/** A short crunchy burst of noise, for the chewing part of a bite. */
function crunch(at: number, len: number, vol: number) {
  const a = audio();
  if (!a) return;
  try {
    const frames = Math.floor(a.sampleRate * len);
    const buffer = a.createBuffer(1, frames, a.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = a.createBufferSource();
    src.buffer = buffer;
    const filter = a.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    const gain = a.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(a.destination);
    src.start(a.currentTime + at);
  } catch {
    /* sound is optional */
  }
}

export const sfx = {
  /** Snake eats the right letter: a "nom" that rises with each letter of the word. */
  chomp(step = 0) {
    const base = 440 * Math.pow(2, Math.min(step, 14) / 12);
    play([
      { f: base, to: base * 1.5, len: 0.09, type: "triangle", vol: 0.25 },
      { f: base * 1.5, to: base * 2, at: 0.07, len: 0.08, type: "triangle", vol: 0.18 },
    ]);
    crunch(0.02, 0.06, 0.25);
    crunch(0.11, 0.05, 0.18);
  },
  /** Wrong letter or bumping into itself: a low buzz. */
  wrong() {
    play([
      { f: 220, to: 110, len: 0.32, type: "sawtooth", vol: 0.16 },
      { f: 233, to: 116, len: 0.32, type: "square", vol: 0.07 },
    ]);
  },
  /** A whole word spelled: a quick happy run up. */
  word() {
    [523, 659, 784, 1047].forEach((f, i) => play([{ f, at: i * 0.09, len: 0.16, type: "triangle", vol: 0.22 }]));
    play([{ f: 1319, at: 0.36, len: 0.35, type: "sine", vol: 0.16 }]);
  },
  /** Out of lives: a sad slide down. */
  gameOver() {
    [392, 370, 349].forEach((f, i) => play([{ f, at: i * 0.28, len: 0.26, type: "triangle", vol: 0.22 }]));
    play([{ f: 330, to: 196, at: 0.84, len: 0.7, type: "triangle", vol: 0.22 }]);
  },
  /** Go! */
  start() {
    play([
      { f: 392, len: 0.1, type: "triangle", vol: 0.2 },
      { f: 587, at: 0.1, len: 0.16, type: "triangle", vol: 0.22 },
    ]);
  },
  /** Little click for taps and turns. */
  tick() {
    play([{ f: 1200, len: 0.03, type: "square", vol: 0.04 }]);
  },
};
