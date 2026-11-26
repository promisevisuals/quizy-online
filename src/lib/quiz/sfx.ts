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
  /** A brick slides one step. */
  move() {
    play([{ f: 660, len: 0.025, type: "square", vol: 0.035 }]);
  },
  /** A brick turns. */
  turn() {
    play([{ f: 880, to: 1175, len: 0.05, type: "triangle", vol: 0.08 }]);
  },
  /** A brick lands. */
  thud() {
    play([{ f: 150, to: 80, len: 0.09, type: "triangle", vol: 0.2 }]);
    crunch(0, 0.04, 0.1);
  },
  /** Rows cleared: bigger and brighter for more rows. */
  clear(rows = 1) {
    const notes = [523, 659, 784, 1047, 1319].slice(0, Math.min(5, rows + 1));
    notes.forEach((f, i) => play([{ f, at: i * 0.06, len: 0.14, type: "triangle", vol: 0.2 }]));
    if (rows >= 4) play([{ f: 1568, at: 0.32, len: 0.4, type: "sine", vol: 0.18 }]);
  },
  /** Level up / goal reached. */
  levelUp() {
    [659, 784, 988, 1319].forEach((f, i) => play([{ f, at: i * 0.08, len: 0.18, type: "square", vol: 0.08 }]));
  },
  /** A card slides onto the table. */
  card() {
    crunch(0, 0.05, 0.12);
    play([{ f: 300, to: 520, len: 0.06, type: "triangle", vol: 0.06 }]);
  },
  /** Going to market: a soft shuffle. */
  draw() {
    crunch(0, 0.08, 0.1);
    crunch(0.07, 0.06, 0.08);
  },
  /** Sweets popping: rises with each cascade. */
  pop(step = 0) {
    const f = 520 * Math.pow(2, Math.min(step, 10) / 6);
    play([
      { f, to: f * 1.6, len: 0.1, type: "sine", vol: 0.2 },
      { f: f * 1.5, at: 0.05, len: 0.08, type: "triangle", vol: 0.1 },
    ]);
  },
  /** A special sweet or a big blast. */
  blast() {
    play([{ f: 220, to: 55, len: 0.35, type: "sawtooth", vol: 0.12 }]);
    crunch(0, 0.25, 0.25);
    play([{ f: 880, to: 1760, at: 0.05, len: 0.25, type: "sine", vol: 0.12 }]);
  },
  /** The ball jumps. */
  jump() {
    play([{ f: 300, to: 620, len: 0.12, type: "triangle", vol: 0.14 }]);
  },
  /** The ball lands with a little boing. */
  boing(strength = 1) {
    play([{ f: 180 + 60 * strength, to: 120, len: 0.08, type: "sine", vol: Math.min(0.2, 0.06 * strength) }]);
  },
  /** A ring or a crystal collected. */
  ring() {
    play([
      { f: 988, len: 0.08, type: "sine", vol: 0.16 },
      { f: 1319, at: 0.07, len: 0.16, type: "sine", vol: 0.16 },
    ]);
  },
  /** You won the game or the level. */
  win() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => play([{ f, at: i * 0.11, len: 0.2, type: "triangle", vol: 0.2 }]));
  },
  /** Squash! */
  stomp() {
    play([{ f: 520, to: 180, len: 0.12, type: "square", vol: 0.1 }]);
    crunch(0, 0.05, 0.12);
  },
  /** Ouch: a power-up was lost. */
  hurt() {
    play([
      { f: 700, to: 300, len: 0.18, type: "sawtooth", vol: 0.09 },
      { f: 500, to: 200, at: 0.12, len: 0.2, type: "sawtooth", vol: 0.07 },
    ]);
  },
  /** A power-up is yours. */
  power() {
    [523, 784, 659, 1047, 1319].forEach((f, i) => play([{ f, at: i * 0.06, len: 0.12, type: "square", vol: 0.07 }]));
  },
  /** A gem. */
  gem() {
    play([{ f: 1568, len: 0.06, type: "sine", vol: 0.12 }, { f: 2093, at: 0.05, len: 0.1, type: "sine", vol: 0.1 }]);
  },
  /** A block bumped from below. */
  bump() {
    play([{ f: 220, to: 330, len: 0.08, type: "square", vol: 0.08 }]);
  },
  /** Spitting fire. */
  fire() {
    play([{ f: 900, to: 300, len: 0.12, type: "sawtooth", vol: 0.06 }]);
    crunch(0, 0.08, 0.06);
  },
  /** A cannon or a boss shoots. */
  shoot() {
    play([{ f: 160, to: 70, len: 0.15, type: "triangle", vol: 0.16 }]);
    crunch(0, 0.1, 0.1);
  },
  /** Rumble: a boss lands or a stone starts to fall. */
  quake() {
    play([{ f: 70, to: 40, len: 0.3, type: "sawtooth", vol: 0.12 }]);
  },
  /** Hit the boss! */
  bossHit() {
    play([{ f: 300, to: 900, len: 0.15, type: "square", vol: 0.1 }, { f: 120, at: 0.05, len: 0.25, type: "sawtooth", vol: 0.1 }]);
  },
  /** A big win fanfare (boss beaten, sweet crush). */
  fanfare() {
    [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => play([{ f, at: i * 0.12, len: 0.22, type: "square", vol: 0.08 }, { f: f / 2, at: i * 0.12, len: 0.22, type: "triangle", vol: 0.1 }]));
  },
};
