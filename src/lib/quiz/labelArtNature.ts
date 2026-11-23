/**
 * Label Lab drawings for plants, animals and the Earth, each a static SVG fragment for a
 * 480 × 480 box. Upright drawings keep to the middle so labels can sit in the side columns;
 * wide scenes keep clear of the top and bottom rows, where their labels go.
 */

const LEAF = "#5bb04f";
const LEAF_LINE = "#2f7a2a";

/* ───────── a whole flowering plant ───────── */
const petals = (cx: number, cy: number, n: number, r: number, rx: number, ry: number, fill: string, line: string) =>
  Array.from({ length: n }, (_, i) => {
    const a = (360 / n) * i;
    return `<ellipse cx="${cx}" cy="${cy - r}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${cx} ${cy})" fill="${fill}" stroke="${line}" stroke-width="2"/>`;
  }).join("");

export const plantArt = `
  <rect x="70" y="330" width="340" height="150" rx="14" fill="#8b5e3c"/>
  ${[
    [100, 360],
    [140, 420],
    [330, 350],
    [380, 430],
    [300, 462],
    [120, 456],
    [360, 390],
    [180, 470],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#6e472b"/>`)
    .join("")}
  <path d="M70 334q170-14 340 0" stroke="#6aa84f" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M240 334C242 372 238 412 240 460" stroke="#e2cfa6" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M240 352C220 362 202 372 188 390M240 374C262 382 280 394 292 412M240 404C226 414 216 426 210 442" stroke="#e2cfa6" stroke-width="4" fill="none" stroke-linecap="round"/>
  ${[428, 436, 444, 452].map((y) => `<path d="M240 ${y}l-9-4M240 ${y + 3}l9-4" stroke="#f3e8cc" stroke-width="1.6" stroke-linecap="round"/>`).join("")}
  <path d="M240 334C236 262 244 192 240 112" stroke="#3f8f3a" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M240 184C258 172 276 160 288 148" stroke="#3f8f3a" stroke-width="5" fill="none" stroke-linecap="round"/>
  <ellipse cx="293" cy="141" rx="9" ry="15" transform="rotate(38 293 141)" fill="#6abf5e" stroke="${LEAF_LINE}" stroke-width="2"/>
  <path d="M297 128q4-6 6-2" stroke="#f28cb1" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M240 232L222 226" stroke="#3f8f3a" stroke-width="5" stroke-linecap="round"/>
  <path d="M222 226C200 196 166 192 148 204C162 228 194 240 222 226Z" fill="${LEAF}" stroke="${LEAF_LINE}" stroke-width="2"/>
  <path d="M222 226Q186 212 152 205M204 220l-6-12M188 216l-8-12M172 211l-8-8M204 220l-4 10M188 216l-4 10" fill="none" stroke="#d6f0c4" stroke-width="2" stroke-linecap="round"/>
  <path d="M240 268L264 264" stroke="#3f8f3a" stroke-width="5" stroke-linecap="round"/>
  <path d="M264 264C286 238 320 234 338 246C324 270 292 280 264 264Z" fill="${LEAF}" stroke="${LEAF_LINE}" stroke-width="2"/>
  <path d="M264 264Q300 252 334 247" fill="none" stroke="#d6f0c4" stroke-width="2" stroke-linecap="round"/>
  ${petals(240, 98, 6, 26, 15, 24, "#f28cb1", "#c95b85")}
  <circle cx="240" cy="98" r="14" fill="#f7d36b" stroke="#c49a25" stroke-width="2"/>
`;

/* ───────── a flower cut in half ───────── */
export const flowerArt = `
  <rect x="232" y="360" width="16" height="120" fill="#3f8f3a"/>
  <path d="M206 350C180 344 160 326 150 304C176 308 200 322 214 340Z" fill="#4e9e44" stroke="${LEAF_LINE}" stroke-width="2"/>
  <path d="M274 350C300 344 320 326 330 304C304 308 280 322 266 340Z" fill="#4e9e44" stroke="${LEAF_LINE}" stroke-width="2"/>
  <path d="M214 338C170 320 120 250 136 170C176 196 214 260 226 330Z" fill="#f7a8c8" stroke="#c95b85" stroke-width="2"/>
  <path d="M266 338C310 320 360 250 344 170C304 196 266 260 254 330Z" fill="#f7a8c8" stroke="#c95b85" stroke-width="2"/>
  <path d="M200 350C210 330 270 330 280 350C270 368 210 368 200 350Z" fill="#6abf5e" stroke="${LEAF_LINE}" stroke-width="2"/>
  <path d="M214 330C204 290 196 240 192 200M266 330C276 290 284 240 288 200" stroke="#e8d77a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="191" cy="190" rx="8" ry="13" fill="#e69a2e" stroke="#a8641a" stroke-width="2"/>
  <ellipse cx="289" cy="190" rx="8" ry="13" fill="#e69a2e" stroke="#a8641a" stroke-width="2"/>
  ${[
    [178, 172],
    [204, 168],
    [300, 170],
    [276, 166],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#f2b630"/>`)
    .join("")}
  <rect x="236" y="166" width="8" height="108" fill="#b7e08a" stroke="#4e8a2e" stroke-width="2"/>
  <path d="M225 170C225 150 255 150 255 170Z" fill="#e0c341" stroke="#a88a2e" stroke-width="2"/>
  <ellipse cx="240" cy="302" rx="26" ry="34" fill="#b7e08a" stroke="#4e8a2e" stroke-width="2"/>
  ${[
    [231, 292],
    [249, 292],
    [231, 312],
    [249, 312],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#fff6c8" stroke="#a88a2e" stroke-width="1.6"/>`)
    .join("")}
`;

/* ───────── a single leaf ───────── */
const veins = [
  [134, 34],
  [172, 56],
  [212, 72],
  [252, 80],
  [292, 78],
  [332, 64],
  [370, 40],
]
  .map(
    ([y, L]) =>
      `<path d="M240 ${y}q${-L * 0.55} ${-L * 0.12} ${-L} ${-L * 0.5}M240 ${y}q${L * 0.55} ${-L * 0.12} ${L} ${-L * 0.5}" fill="none" stroke="#d6f0c4" stroke-width="2.4" stroke-linecap="round"/>`,
  )
  .join("");
export const leafArt = `
  <rect x="236" y="400" width="8" height="64" rx="3" fill="#4e9e44" stroke="${LEAF_LINE}" stroke-width="1.5"/>
  <path d="M236 452C220 444 212 458 222 468C230 468 236 462 236 452Z" fill="#6abf5e" stroke="${LEAF_LINE}" stroke-width="1.5"/>
  <path d="M244 452C260 444 268 458 258 468C250 468 244 462 244 452Z" fill="#6abf5e" stroke="${LEAF_LINE}" stroke-width="1.5"/>
  <path d="M240 70C300 110 340 200 330 290C322 350 280 392 240 404C200 392 158 350 150 290C140 200 180 110 240 70Z" fill="#6abf5e" stroke="${LEAF_LINE}" stroke-width="7" stroke-dasharray="3 5" stroke-linejoin="round"/>
  <path d="M240 70C300 110 340 200 330 290C322 350 280 392 240 404C200 392 158 350 150 290C140 200 180 110 240 70Z" fill="#6abf5e" stroke="${LEAF_LINE}" stroke-width="2"/>
  ${veins}
  <path d="M240 404V80" stroke="#e8f5c8" stroke-width="6" stroke-linecap="round"/>
`;

/* ───────── inside a leaf (a slice through it) ───────── */
const cellsRow = (y: number, h: number, n: number, fill: string, line: string, x0 = 156, x1 = 324, gap?: [number, number]) => {
  const w = (x1 - x0) / n;
  return Array.from({ length: n }, (_, i) => {
    const x = x0 + i * w;
    if (gap && x + w > gap[0] && x < gap[1]) return "";
    return `<rect x="${x + 1}" y="${y}" width="${w - 2}" height="${h}" rx="5" fill="${fill}" stroke="${line}" stroke-width="1.5"/>`;
  }).join("");
};
const palisade = Array.from({ length: 9 }, (_, i) => {
  const x = 157 + i * 18.6;
  const dots = [0, 1, 2, 3]
    .map((k) => `<circle cx="${x + 9.3 + (k % 2 ? 3 : -3)}" cy="${150 + k * 22}" r="3.2" fill="#2f7a2a"/>`)
    .join("");
  return `<rect x="${x}" y="138" width="16.6" height="96" rx="8" fill="#9fdb8a" stroke="#4e9e44" stroke-width="1.5"/>${dots}`;
}).join("");
const spongy = [
  [172, 254],
  [206, 248],
  [296, 252],
  [312, 280],
  [170, 300],
  [196, 326],
  [288, 330],
  [316, 318],
  [176, 340],
  [214, 262],
  [272, 262],
  [204, 296],
  [278, 300],
]
  .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="#b6e3a2" stroke="#5fa84f" stroke-width="1.5"/>`)
  .join("");
export const leafSliceArt = `
  <rect x="156" y="236" width="168" height="120" fill="#e9f6df"/>
  <rect x="156" y="100" width="168" height="8" fill="#f4f1c2" stroke="#c9c28a" stroke-width="1.5"/>
  ${cellsRow(108, 28, 7, "#eef8e6", "#8fbf7f")}
  ${palisade}
  ${spongy}
  <circle cx="240" cy="294" r="34" fill="#f0e6c8" stroke="#a88a2e" stroke-width="2"/>
  ${[
    [226, 280],
    [240, 274],
    [254, 280],
    [233, 289],
    [247, 289],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="#c9e4f7" stroke="#3d7bb0" stroke-width="1.5"/>`)
    .join("")}
  ${[
    [228, 304],
    [238, 310],
    [248, 304],
    [256, 312],
    [222, 313],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#f7d9a8" stroke="#b5743d" stroke-width="1.2"/>`)
    .join("")}
  ${cellsRow(356, 22, 7, "#eef8e6", "#8fbf7f", 156, 324, [228, 252])}
  <ellipse cx="229" cy="367" rx="8" ry="12" fill="#7cc46a" stroke="#3d7a2e" stroke-width="1.5"/>
  <ellipse cx="251" cy="367" rx="8" ry="12" fill="#7cc46a" stroke="#3d7a2e" stroke-width="1.5"/>
  <rect x="156" y="378" width="168" height="6" fill="#f4f1c2" stroke="#c9c28a" stroke-width="1.2"/>
  <rect x="237" y="377" width="6" height="8" fill="#fffdf8"/>
  <path d="M240 420v-26M232 402l8-8 8 8" fill="none" stroke="#7c8b95" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="250" y="418" font-size="13" font-weight="800" fill="#7c8b95" font-family="Nunito, sans-serif">air in and out</text>
`;

/* ───────── a honeybee, from above ───────── */
const WING = `fill="rgba(200,228,255,.72)" stroke="#7aa3c8" stroke-width="2"`;
const leg = (pts: string) => `<path d="${pts}" fill="none" stroke="#3a2c1a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
export const beeArt = `
  ${leg("M206 162L164 146L144 158")}${leg("M204 180L158 200L144 224")}${leg("M210 198L174 248L170 282")}
  ${leg("M274 162L316 146L336 158")}${leg("M276 180L322 200L336 224")}${leg("M270 198L306 248L310 282")}
  <ellipse cx="318" cy="134" rx="62" ry="24" transform="rotate(-18 318 134)" ${WING}/>
  <ellipse cx="162" cy="134" rx="62" ry="24" transform="rotate(18 162 134)" ${WING}/>
  <ellipse cx="304" cy="196" rx="44" ry="17" transform="rotate(22 304 196)" ${WING}/>
  <ellipse cx="176" cy="196" rx="44" ry="17" transform="rotate(-22 176 196)" ${WING}/>
  <path d="M240 368l-7 4 7 22 7-22z" fill="#3a2c1a"/>
  <ellipse cx="240" cy="292" rx="46" ry="80" fill="#f2b630" stroke="#3a2c1a" stroke-width="3"/>
  ${[250, 280, 310, 340].map((y) => `<path d="M${240 - (y > 330 ? 30 : 44)} ${y}q${y > 330 ? 30 : 44} 10 ${y > 330 ? 60 : 88} 0" fill="none" stroke="#3a2c1a" stroke-width="12"/>`).join("")}
  <ellipse cx="240" cy="176" rx="40" ry="42" fill="#c98a2e" stroke="#3a2c1a" stroke-width="3"/>
  ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${214 + i * 10} ${150 + (i % 2) * 6}l3 6" stroke="#8a5a1a" stroke-width="2" stroke-linecap="round"/>`).join("")}
  <path d="M228 74C222 58 210 44 196 32M252 74C258 58 270 44 284 32" fill="none" stroke="#3a2c1a" stroke-width="4" stroke-linecap="round"/>
  <circle cx="240" cy="104" r="32" fill="#3a2c1a"/>
  <ellipse cx="214" cy="100" rx="11" ry="19" fill="#5b4a3a" stroke="#1d140c" stroke-width="2"/>
  <ellipse cx="266" cy="100" rx="11" ry="19" fill="#5b4a3a" stroke="#1d140c" stroke-width="2"/>
  <path d="M232 76l-6-10M248 76l6-10" stroke="#c98a2e" stroke-width="5" stroke-linecap="round"/>
`;

/* ───────── a grasshopper, side view (head on the left) ───────── */
const GREEN = "#7cbf4a";
const GREEN_LINE = "#3f7a1f";
export const grasshopperArt = `
  <path d="M126 210C110 170 84 140 52 118M134 206C126 168 116 134 98 104" fill="none" stroke="${GREEN_LINE}" stroke-width="3" stroke-linecap="round"/>
  <path d="M178 284L166 334L144 346M206 286L222 334L206 350" fill="none" stroke="${GREEN_LINE}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M226 266C250 250 380 240 418 254C428 262 424 278 410 284C370 296 260 296 226 290Z" fill="${GREEN}" stroke="${GREEN_LINE}" stroke-width="3"/>
  ${[260, 286, 312, 338, 364, 390].map((x) => `<path d="M${x} 252q-4 20 0 40" fill="none" stroke="${GREEN_LINE}" stroke-width="1.6" opacity=".6"/>`).join("")}
  ${[262, 288, 314, 340, 366].map((x) => `<circle cx="${x + 10}" cy="276" r="3" fill="#2d4a17"/>`).join("")}
  <path d="M418 262l38 6-36 8z" fill="#5f9a36" stroke="${GREEN_LINE}" stroke-width="2"/>
  <path d="M186 232C230 220 360 222 412 240C380 250 250 252 192 250Z" fill="#9ccf6e" stroke="${GREEN_LINE}" stroke-width="2.5"/>
  <path d="M200 240C260 236 340 236 400 242" fill="none" stroke="${GREEN_LINE}" stroke-width="1.5" opacity=".6"/>
  <path d="M160 214C190 200 228 204 236 224L232 288C210 298 180 296 164 286Z" fill="#8ccb58" stroke="${GREEN_LINE}" stroke-width="3"/>
  <ellipse cx="243" cy="270" rx="7" ry="10" fill="#e4f2c8" stroke="${GREEN_LINE}" stroke-width="2"/>
  <ellipse cx="136" cy="244" rx="32" ry="40" fill="${GREEN}" stroke="${GREEN_LINE}" stroke-width="3"/>
  <ellipse cx="130" cy="226" rx="12" ry="15" fill="#6b4a2b" stroke="#3d2a18" stroke-width="2"/>
  <circle cx="126" cy="222" r="3.5" fill="#fff" opacity=".7"/>
  <path d="M112 274l10 14 10-10" fill="#8a6a2a" stroke="#5a4418" stroke-width="2" stroke-linejoin="round"/>
  <path d="M238 284C268 270 312 230 348 206" fill="none" stroke="${GREEN_LINE}" stroke-width="27" stroke-linecap="round"/>
  <path d="M238 284C268 270 312 230 348 206" fill="none" stroke="#9ccf6e" stroke-width="22" stroke-linecap="round"/>
  <path d="M256 268q30-20 70-50" fill="none" stroke="${GREEN_LINE}" stroke-width="1.5" stroke-dasharray="4 4"/>
  <path d="M348 206L298 348" fill="none" stroke="${GREEN_LINE}" stroke-width="7" stroke-linecap="round"/>
  ${[0, 1, 2, 3, 4].map((i) => `<path d="M${341 - i * 9} ${226 + i * 25}l7 4" stroke="${GREEN_LINE}" stroke-width="2"/>`).join("")}
  <path d="M298 348L262 356" fill="none" stroke="${GREEN_LINE}" stroke-width="6" stroke-linecap="round"/>
  ${[0, 1, 2].map((i) => `<circle cx="${290 - i * 11}" cy="${350 + i * 1.5}" r="3.5" fill="${GREEN_LINE}"/>`).join("")}
  <path d="M262 356l-8-6M262 356l-8 5" stroke="#2d4a17" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M60 372h360" stroke="#d6c39a" stroke-width="4" stroke-linecap="round"/>
`;

/* ───────── a fish, side view (head on the left) ───────── */
const FISH = "#f2a33a";
const FISH_LINE = "#a8641a";
const fishBody = `M96 238C120 186 190 162 260 168C320 174 362 200 384 236C362 272 320 300 260 306C190 312 120 290 96 238Z`;
const fishFins = `
  <path d="M384 236L446 172C436 206 436 266 446 304Z" fill="#f7c26b" stroke="${FISH_LINE}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M220 172C230 130 280 112 318 124C306 146 300 166 300 176Z" fill="#f7c26b" stroke="${FISH_LINE}" stroke-width="2.5"/>
  <path d="M230 300C228 324 236 338 248 344C252 330 258 316 262 304Z" fill="#f7c26b" stroke="${FISH_LINE}" stroke-width="2.5"/>
  <path d="M300 300C304 318 318 330 334 334C334 316 336 302 340 290Z" fill="#f7c26b" stroke="${FISH_LINE}" stroke-width="2.5"/>
`;
export const fishArt = `
  ${fishFins}
  <path d="${fishBody}" fill="${FISH}" stroke="${FISH_LINE}" stroke-width="3"/>
  ${[0, 1, 2, 3, 4, 5]
    .flatMap((col) => [0, 1, 2, 3].map((row) => [214 + col * 26, 196 + row * 24 + (col % 2) * 12]))
    .filter(([x, y]) => y < 292 && !(x > 330 && (y < 210 || y > 266)))
    .map(([x, y]) => `<path d="M${x} ${y}q10 6 0 14" fill="none" stroke="#d07f22" stroke-width="2"/>`)
    .join("")}
  <path d="M190 182C206 214 206 262 190 292" fill="none" stroke="${FISH_LINE}" stroke-width="3" stroke-linecap="round"/>
  <path d="M206 250C220 258 232 272 236 286C222 284 208 272 202 260Z" fill="#f7c26b" stroke="${FISH_LINE}" stroke-width="2"/>
  <path d="M200 232C260 226 330 228 380 236" fill="none" stroke="#7a4a12" stroke-width="2.5" stroke-dasharray="3 6" stroke-linecap="round"/>
  <circle cx="148" cy="214" r="14" fill="#fff" stroke="#5a3a18" stroke-width="2"/>
  <circle cx="145" cy="214" r="7" fill="#1d140c"/>
  <circle cx="124" cy="222" r="3" fill="#7a4a12"/>
  <path d="M98 238q10 8 22 6" fill="none" stroke="#7a4a12" stroke-width="3" stroke-linecap="round"/>
`;

/* ───────── inside a fish ───────── */
export const fishInsideArt = `
  ${fishFins}
  <path d="${fishBody}" fill="#fbe2c2" stroke="${FISH_LINE}" stroke-width="3"/>
  ${Array.from({ length: 13 }, (_, i) => `<rect x="${178 + i * 16}" y="186" width="12" height="9" rx="3" fill="#f8f4ea" stroke="#a89a7c" stroke-width="1.5"/>`).join("")}
  <path d="M232 204C262 200 310 200 340 206" fill="none" stroke="#8a2f3a" stroke-width="6" stroke-linecap="round"/>
  <ellipse cx="290" cy="230" rx="48" ry="16" fill="#dfe7ee" stroke="#8a9aa8" stroke-width="2"/>
  <ellipse cx="146" cy="206" rx="13" ry="10" fill="#f3a6b8" stroke="#c96b84" stroke-width="2"/>
  ${[0, 1, 2, 3].map((i) => `<path d="M${170 + i * 7} 226q-6 16 0 34" fill="none" stroke="#d63a3a" stroke-width="4" stroke-linecap="round"/>`).join("")}
  <path d="M186 292c-4-9-16-6-15 4 1 7 15 15 15 15s14-8 15-15c1-10-11-13-15-4z" fill="#d63a3a" stroke="#8f1f1f" stroke-width="1.5"/>
  <path d="M206 262C224 252 252 256 256 272C254 290 232 300 212 294C202 288 200 272 206 262Z" fill="#9c4a3a" stroke="#6b2d22" stroke-width="2"/>
  <path d="M252 252C272 248 290 256 288 270C284 282 266 284 254 276Z" fill="#f0b37e" stroke="#b5743d" stroke-width="2"/>
  <path d="M286 272q14 0 14 12t-14 12-14 10 12 6 20-4" fill="none" stroke="#e0a77a" stroke-width="6" stroke-linecap="round"/>
`;

/* ───────── the water cycle (a wide scene) ───────── */
const wavy = (x: number, y: number, h: number, color: string) =>
  `<path d="M${x} ${y}q-6 ${-h / 6} 0 ${-h / 3}t0 ${-h / 3} 0 ${-h / 3}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/><path d="M${x - 6} ${y - h + 8}l6-10 6 10" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
const cloud = (x: number, y: number, s: number, fill: string) =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}"><circle cx="-30" cy="6" r="22"/><circle cx="0" cy="-8" r="30"/><circle cx="32" cy="4" r="24"/><rect x="-52" y="4" width="108" height="26" rx="13"/></g>`;
const tree = (x: number, y: number) =>
  `<rect x="${x - 4}" y="${y - 6}" width="8" height="28" fill="#7a5230"/><circle cx="${x}" cy="${y - 20}" r="20" fill="#3f8f3a"/><circle cx="${x - 12}" cy="${y - 8}" r="13" fill="#4ea047"/><circle cx="${x + 12}" cy="${y - 8}" r="13" fill="#4ea047"/>`;
export const waterArt = `
  <rect x="0" y="50" width="480" height="300" fill="#dff1fb"/>
  <circle cx="72" cy="104" r="30" fill="#f7c948" stroke="#e0a020" stroke-width="3"/>
  ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M72 104m${Math.cos((a * Math.PI) / 180) * 38} ${Math.sin((a * Math.PI) / 180) * 38}l${Math.cos((a * Math.PI) / 180) * 10} ${Math.sin((a * Math.PI) / 180) * 10}" stroke="#e0a020" stroke-width="3" stroke-linecap="round"/>`).join("")}
  ${cloud(228, 96, 1, "#ffffff")}
  ${cloud(352, 104, 1.05, "#9fb3c8")}
  ${[318, 336, 354, 372, 390].map((x) => `<path d="M${x} 140l-7 16M${x - 10} 170l-7 16M${x - 2} 198l-7 16" stroke="#3d8fd1" stroke-width="3" stroke-linecap="round"/>`).join("")}
  ${[150, 176, 202].map((x, i) => `<circle cx="${x}" cy="${168 - i * 8}" r="3" fill="#8fb3cf"/><circle cx="${x + 10}" cy="${180 - i * 6}" r="2.4" fill="#8fb3cf"/>`).join("")}
  <path d="M300 350L410 160L480 270V350Z" fill="#8c7a6a" stroke="#5e5044" stroke-width="2"/>
  <path d="M410 160L384 206l14-6 12 10 12-8 14 6z" fill="#ffffff" stroke="#b7c6d4" stroke-width="2"/>
  ${[[398, 128], [418, 116], [384, 146]].map(([x, y]) => `<text x="${x}" y="${y}" font-size="16" fill="#9fb3c8">❄</text>`).join("")}
  ${wavy(436, 176, 46, "#9fb3c8")}
  <path d="M404 212C396 244 380 270 360 300C344 320 330 330 300 340" fill="none" stroke="#5aa7e0" stroke-width="5" stroke-linecap="round"/>
  <path d="M0 290C60 280 120 288 170 300L170 350H0Z" fill="#3d8fd1"/>
  <path d="M10 300q12-6 24 0t24 0 24 0M70 318q12-6 24 0t24 0" fill="none" stroke="#bfe0f7" stroke-width="2"/>
  <path d="M170 300C200 296 260 300 300 340H170Z" fill="#7cbf4a"/>
  <rect x="0" y="350" width="480" height="84" fill="#a9865e"/>
  <path d="M0 350C60 344 160 346 300 340C340 338 420 344 480 350" fill="#7cbf4a"/>
  <path d="M300 340C270 346 230 350 170 352L120 340" fill="none" stroke="#3d8fd1" stroke-width="10" stroke-linecap="round"/>
  <ellipse cx="240" cy="344" rx="34" ry="8" fill="#5aa7e0" stroke="#3d8fd1" stroke-width="2"/>
  ${tree(186, 300)}${tree(214, 306)}
  ${wavy(190, 266, 40, "#6fb0a0")}${wavy(214, 272, 40, "#6fb0a0")}
  ${wavy(60, 286, 70, "#5aa7e0")}${wavy(110, 290, 70, "#5aa7e0")}
  <path d="M300 336l18-18" stroke="#2f6fa5" stroke-width="3" stroke-linecap="round"/>
  <path d="M350 300l-26 30m0 0l2-12m-2 12l12-3" fill="none" stroke="#2f6fa5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="0" y="404" width="480" height="30" fill="#6fb0e0" opacity=".85"/>
  <path d="M0 404H480" stroke="#2f6fa5" stroke-width="2.5" stroke-dasharray="8 5"/>
  ${[280, 320, 360].map((x) => `<path d="M${x} 360v32m-6-8l6 8 6-8" fill="none" stroke="#2f6fa5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="5 4"/>`).join("")}
  <path d="M420 420H200m10-7l-10 7 10 7" fill="none" stroke="#1f4f7a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
`;

/* ───────── a volcano, cut open ───────── */
export const volcanoArt = `
  <rect x="0" y="60" width="480" height="300" fill="#fde8d0"/>
  ${cloud(240, 92, 1.5, "#8d8a86")}${cloud(196, 70, 0.9, "#a8a49e")}${cloud(292, 74, 0.9, "#a8a49e")}
  ${[
    [140, 128, 9],
    [340, 116, 8],
    [118, 170, 6],
    [372, 160, 7],
  ]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#4a3b33"/><path d="M${x} ${y}q${x < 240 ? 30 : -30} 10 ${x < 240 ? 60 : -60} 30" fill="none" stroke="#c9b9a8" stroke-width="2" stroke-dasharray="3 5"/>`)
    .join("")}
  <path d="M40 360L196 160H284L440 360Z" fill="#8a6a50" stroke="#5e4634" stroke-width="2"/>
  ${[200, 240, 280, 320].map((y) => {
    const half = 44 + ((y - 160) / 200) * 156;
    return `<path d="M${240 - half} ${y}L${240 + half} ${y}" stroke="#6e5240" stroke-width="3" opacity=".7"/>`;
  }).join("")}
  <path d="M196 160L208 174H272L284 160" fill="#5e4634"/>
  <path d="M232 174V400H248V174Z" fill="#e8531e"/>
  <path d="M244 300L330 246" stroke="#e8531e" stroke-width="12" stroke-linecap="round"/>
  <path d="M206 168C186 210 170 246 150 300C146 312 150 318 156 312C176 270 196 226 214 176Z" fill="#f07c2a" stroke="#c4421a" stroke-width="2"/>
  <path d="M330 246C352 276 372 310 386 340" fill="none" stroke="#f07c2a" stroke-width="9" stroke-linecap="round"/>
  <path d="M110 352C90 344 74 350 60 356" fill="none" stroke="#f07c2a" stroke-width="10" stroke-linecap="round"/>
  <path d="M286 176C330 196 360 230 390 280C400 296 380 300 370 290C350 250 320 216 286 196Z" fill="#b0aaa4" opacity=".85"/>
  ${cloud(372, 286, 0.55, "#b0aaa4")}
  <rect x="0" y="360" width="480" height="120" fill="#6b5847"/>
  ${[[60, 400], [120, 452], [380, 410], [420, 460], [330, 470], [150, 390]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#57473a"/>`).join("")}
  <path d="M232 360V400H248V360Z" fill="#e8531e"/>
  <ellipse cx="240" cy="418" rx="92" ry="26" fill="#e8531e" stroke="#a8341a" stroke-width="3"/>
  <ellipse cx="240" cy="414" rx="60" ry="13" fill="#f59a3c" opacity=".7"/>
`;

/* ───────── layers of the Earth ───────── */
export const earthArt = `
  <circle cx="210" cy="250" r="156" fill="#cfe8fb" opacity=".8"/>
  <circle cx="210" cy="250" r="140" fill="#3d8fd1"/>
  <path d="M120 170C150 150 180 160 200 150C230 136 250 160 240 190C226 214 190 200 170 224C150 246 120 230 110 210C104 194 108 180 120 170ZM100 290C130 280 150 300 170 300C190 300 196 330 170 350C150 364 120 350 104 330C96 314 92 298 100 290Z" fill="#7cbf4a" stroke="#3f7a1f" stroke-width="2"/>
  <path d="M210 250L350 250A140 140 0 0 1 210 390Z" fill="#8a6a50"/>
  <path d="M210 250L338 250A128 128 0 0 1 210 378Z" fill="#e8742a"/>
  <path d="M210 250L314 250A104 104 0 0 1 210 354Z" fill="#c9431e"/>
  <path d="M210 250L276 250A66 66 0 0 1 210 316Z" fill="#f5b43a"/>
  <path d="M210 250L240 250A30 30 0 0 1 210 280Z" fill="#fff0a8"/>
  <path d="M210 250H350M210 250V390" stroke="#5e4634" stroke-width="2"/>
`;
