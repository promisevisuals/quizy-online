/**
 * Label Lab diagrams. Each is a small hand-drawn SVG (viewBox 0 0 480 400) plus the parts to label:
 * `at` is the point on the drawing, `slot` is where the blank label sits. `tier` 1 = everyday words,
 * 2 = a bit harder, 3 = science words. `hard` swaps in the scientific name on Hard and Expert.
 */

export type LabelPart = { word: string; hard?: string; at: [number, number]; slot: [number, number]; tier: 1 | 2 | 3 };
export type LabelDiagram = { id: string; title: string; emoji: string; art: string; parts: LabelPart[] };

const SKIN = "#f2c49b";
const SKIN_LINE = "#c98d5e";

const body = `
  <ellipse cx="240" cy="392" rx="120" ry="8" fill="#e6d3ad"/>
  <path d="M202 58c2-30 24-44 40-44s38 12 40 40c-10-10-26-14-40-14s-30 6-40 18z" fill="#3b2a1d"/>
  <ellipse cx="202" cy="74" rx="8" ry="12" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <ellipse cx="278" cy="74" rx="8" ry="12" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <circle cx="240" cy="72" r="38" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <path d="M202 60c6-20 22-30 38-30s32 10 38 30c-8-12-22-18-38-18s-30 6-38 18z" fill="#3b2a1d"/>
  <circle cx="226" cy="68" r="4.5" fill="#2a2416"/><circle cx="254" cy="68" r="4.5" fill="#2a2416"/>
  <path d="M240 72l-4 10h8" fill="none" stroke="${SKIN_LINE}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M228 92q12 9 24 0" fill="none" stroke="#b5483f" stroke-width="3" stroke-linecap="round"/>
  <rect x="231" y="106" width="18" height="18" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <path d="M196 132q4-12 20-12h48q16 0 20 12l-4 100h-80z" fill="#2f9a5f" stroke="#1c7a4a" stroke-width="2"/>
  <path d="M200 130l-24 50-8 58" fill="none" stroke="${SKIN}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M280 130l24 50 8 58" fill="none" stroke="${SKIN}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M200 130q-6 4-10 14" fill="none" stroke="#2f9a5f" stroke-width="18" stroke-linecap="round"/>
  <path d="M280 130q6 4 10 14" fill="none" stroke="#2f9a5f" stroke-width="18" stroke-linecap="round"/>
  <circle cx="167" cy="244" r="12" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <circle cx="313" cy="244" r="12" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <rect x="200" y="228" width="80" height="48" rx="6" fill="#1c4f7a"/>
  <path d="M220 272l-3 50-3 50" fill="none" stroke="${SKIN}" stroke-width="19" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M260 272l3 50 3 50" fill="none" stroke="${SKIN}" stroke-width="19" stroke-linecap="round" stroke-linejoin="round"/>
  <ellipse cx="206" cy="380" rx="18" ry="9" fill="#c13d3d"/><ellipse cx="274" cy="380" rx="18" ry="9" fill="#c13d3d"/>
  <path d="M222 160q18 10 36 0" fill="none" stroke="#1c7a4a" stroke-width="2" opacity=".6"/>
`;

const organs = `
  <circle cx="240" cy="56" r="40" fill="#fbe7d6" stroke="${SKIN_LINE}" stroke-width="2"/>
  <path d="M212 50c0-18 14-26 28-26s28 8 28 26c0 12-12 18-28 18s-28-6-28-18z" fill="#f3a6b8" stroke="#c96b84" stroke-width="2"/>
  <path d="M222 44q6-8 12 0t12 0 10 2M220 54q8 6 16 0t16 0 10 0" fill="none" stroke="#c96b84" stroke-width="2"/>
  <path d="M224 94h32v14q46 4 58 26l-4 236h-140l-4-236q12-22 58-26z" fill="#fbe7d6" stroke="${SKIN_LINE}" stroke-width="2"/>
  <rect x="235" y="96" width="10" height="56" rx="4" fill="#b5d6f0" stroke="#6c9bc4" stroke-width="2"/>
  <path d="M240 150l-22 16M240 150l22 16" stroke="#6c9bc4" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="208" cy="182" rx="26" ry="44" fill="#f4a6a6" stroke="#c96060" stroke-width="2"/>
  <ellipse cx="272" cy="182" rx="26" ry="44" fill="#f4a6a6" stroke="#c96060" stroke-width="2"/>
  <path d="M252 178c-6-10-20-6-18 6 2 10 18 20 18 20s16-10 18-20c2-12-12-16-18-6z" fill="#d63a3a" stroke="#8f1f1f" stroke-width="2"/>
  <path d="M182 238c10-14 44-16 58-6 4 12-10 20-30 20s-30-4-28-14z" fill="#9c4a3a" stroke="#6b2d22" stroke-width="2"/>
  <path d="M250 228c16-8 38-2 38 16s-20 26-34 20c-10-4-4-14-10-20s-6-12 6-16z" fill="#f0b37e" stroke="#b5743d" stroke-width="2"/>
  <ellipse cx="190" cy="266" rx="9" ry="15" fill="#b0413e" stroke="#7a2523" stroke-width="2"/>
  <ellipse cx="290" cy="266" rx="9" ry="15" fill="#b0413e" stroke="#7a2523" stroke-width="2"/>
  <path d="M204 280q36-12 72 0v44q-36 12-72 0z" fill="#f3c6a0" stroke="#c48b5c" stroke-width="2"/>
  <path d="M212 292q10 8 20 0t20 0 20 0M212 308q10 8 20 0t20 0 20 0" fill="none" stroke="#c48b5c" stroke-width="2"/>
  <ellipse cx="240" cy="346" rx="16" ry="12" fill="#f7d36b" stroke="#c49a25" stroke-width="2"/>
`;

const BONE = "#f8f4ea";
const BONE_LINE = "#a89a7c";
const bone = (x1: number, y1: number, x2: number, y2: number, w = 9) =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${BONE_LINE}" stroke-width="${w + 4}" stroke-linecap="round"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="${BONE}" stroke-width="${w}" stroke-linecap="round"/>`;

const skeleton = `
  <circle cx="240" cy="48" r="30" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="3"/>
  <ellipse cx="229" cy="46" rx="7" ry="8" fill="#3d3627"/><ellipse cx="251" cy="46" rx="7" ry="8" fill="#3d3627"/>
  <path d="M236 62l4-6 4 6z" fill="#3d3627"/>
  <path d="M222 70q18 18 36 0v8q-18 14-36 0z" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="3"/>
  <path d="M230 76v6M240 78v6M250 76v6" stroke="${BONE_LINE}" stroke-width="2"/>
  ${[100, 116, 132, 148, 164, 180, 196, 212, 228, 244].map((y) => `<rect x="233" y="${y}" width="14" height="12" rx="4" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="2"/>`).join("")}
  ${bone(238, 110, 198, 114, 7)}${bone(242, 110, 282, 114, 7)}
  ${[130, 146, 162, 178].map((y, i) => `<path d="M236 ${y}q-${44 - i * 4} 4-${40 - i * 4} ${22 - i * 2}" fill="none" stroke="${BONE_LINE}" stroke-width="6" stroke-linecap="round"/><path d="M244 ${y}q${44 - i * 4} 4 ${40 - i * 4} ${22 - i * 2}" fill="none" stroke="${BONE_LINE}" stroke-width="6" stroke-linecap="round"/>`).join("")}
  ${bone(198, 118, 180, 196)}${bone(282, 118, 300, 196)}
  ${bone(180, 200, 170, 262, 7)}${bone(300, 200, 310, 262, 7)}
  <circle cx="168" cy="272" r="9" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="2"/><circle cx="312" cy="272" r="9" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="2"/>
  <path d="M206 262q34-16 68 0l-8 30q-26 12-52 0z" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="3"/>
  <circle cx="224" cy="280" r="7" fill="#e9e0cc"/><circle cx="256" cy="280" r="7" fill="#e9e0cc"/>
  ${bone(224, 296, 220, 340, 11)}${bone(256, 296, 260, 340, 11)}
  <circle cx="219" cy="346" r="8" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="2.5"/><circle cx="261" cy="346" r="8" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="2.5"/>
  ${bone(218, 356, 216, 388, 8)}${bone(262, 356, 264, 388, 8)}
  <ellipse cx="208" cy="394" rx="14" ry="5" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="2"/><ellipse cx="272" cy="394" rx="14" ry="5" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="2"/>
`;

const plant = `
  <rect x="120" y="300" width="240" height="96" rx="10" fill="#8a5a36"/>
  <path d="M120 304h240" stroke="#5e3b20" stroke-width="4"/>
  <circle cx="160" cy="340" r="3" fill="#6f4628"/><circle cx="330" cy="360" r="4" fill="#6f4628"/><circle cx="300" cy="330" r="3" fill="#6f4628"/>
  <path d="M240 302c-6 20-26 34-40 60M240 302c4 22 18 34 30 58M240 302c0 24-4 46-2 70M226 330c-12 4-20 12-24 22M256 336c10 2 18 10 22 18" fill="none" stroke="#e9d3a8" stroke-width="4" stroke-linecap="round"/>
  <path d="M240 302V112" stroke="#3aa86b" stroke-width="9" stroke-linecap="round"/>
  <path d="M240 160q30-10 52-22" stroke="#3aa86b" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="296" cy="140" rx="9" ry="13" fill="#7fc97f" transform="rotate(30 296 140)"/>
  <path d="M298 134q4-6 0-12" stroke="#e86a8f" stroke-width="4" stroke-linecap="round"/>
  <path d="M240 232c-30-30-60-20-66 0 20 16 48 14 66 0z" fill="#4cbf7d" stroke="#1c7a4a" stroke-width="2"/>
  <path d="M240 200c30-30 60-20 66 0-20 16-48 14-66 0z" fill="#4cbf7d" stroke="#1c7a4a" stroke-width="2"/>
  <path d="M240 232l-56-2M240 200l56-2" stroke="#1c7a4a" stroke-width="1.5"/>
  ${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="240" cy="72" rx="15" ry="26" fill="#f28fb0" stroke="#c9577c" stroke-width="2" transform="rotate(${a} 240 98)"/>`).join("")}
  <circle cx="240" cy="98" r="15" fill="#f5c542" stroke="#c49a25" stroke-width="2"/>
`;

const flower = `
  <path d="M240 400V300" stroke="#3aa86b" stroke-width="14" stroke-linecap="round"/>
  <path d="M240 300c-30 0-46-16-50-30 18-4 38 6 50 22M240 300c30 0 46-16 50-30-18-4-38 6-50 22" fill="#5fbf6f" stroke="#1c7a4a" stroke-width="2"/>
  <path d="M232 284c-60 10-110-40-96-130 40 20 72 70 88 118z" fill="#f6a9c4" stroke="#c9577c" stroke-width="2"/>
  <path d="M248 284c60 10 110-40 96-130-40 20-72 70-88 118z" fill="#f6a9c4" stroke="#c9577c" stroke-width="2"/>
  <ellipse cx="240" cy="270" rx="22" ry="18" fill="#9fd88f" stroke="#3a8a4a" stroke-width="2"/>
  <circle cx="234" cy="268" r="4" fill="#fff6d8"/><circle cx="246" cy="272" r="4" fill="#fff6d8"/>
  <path d="M240 252V200" stroke="#8cc77a" stroke-width="7" stroke-linecap="round"/>
  <ellipse cx="240" cy="192" rx="14" ry="9" fill="#e9b949" stroke="#b5862a" stroke-width="2"/>
  <path d="M228 262l-26-82M252 262l26-82" stroke="#d9d0a0" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="201" cy="172" rx="9" ry="13" fill="#f0a030" stroke="#b56a10" stroke-width="2"/>
  <ellipse cx="279" cy="172" rx="9" ry="13" fill="#f0a030" stroke="#b56a10" stroke-width="2"/>
`;

const insect = `
  <path d="M232 78q-16-26-30-34M248 78q16-26 30-34" fill="none" stroke="#2a2416" stroke-width="3" stroke-linecap="round"/>
  <circle cx="202" cy="44" r="4" fill="#2a2416"/><circle cx="278" cy="44" r="4" fill="#2a2416"/>
  <ellipse cx="194" cy="146" rx="52" ry="26" fill="#d8ecf7" stroke="#8bb3cc" stroke-width="2" opacity=".9" transform="rotate(-18 194 146)"/>
  <ellipse cx="286" cy="146" rx="52" ry="26" fill="#d8ecf7" stroke="#8bb3cc" stroke-width="2" opacity=".9" transform="rotate(18 286 146)"/>
  <path d="M222 140l-44-14-12-18M222 156l-46 8-14 18M226 172l-36 30-6 22M258 140l44-14 12-18M258 156l46 8 14 18M254 172l36 30 6 22" fill="none" stroke="#2a2416" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <ellipse cx="240" cy="236" rx="34" ry="50" fill="#f5c542" stroke="#2a2416" stroke-width="3"/>
  <path d="M208 220h64M206 242h68M212 264h56" stroke="#2a2416" stroke-width="9"/>
  <path d="M234 284l6 14 6-14" fill="#2a2416"/>
  <ellipse cx="240" cy="152" rx="24" ry="28" fill="#6b4b2a" stroke="#2a2416" stroke-width="3"/>
  <circle cx="240" cy="98" r="22" fill="#6b4b2a" stroke="#2a2416" stroke-width="3"/>
  <ellipse cx="228" cy="92" rx="7" ry="9" fill="#1c1c1c"/><ellipse cx="252" cy="92" rx="7" ry="9" fill="#1c1c1c"/>
  <circle cx="230" cy="89" r="2" fill="#fff"/><circle cx="254" cy="89" r="2" fill="#fff"/>
`;

const fish = `
  <path d="M330 200l64-60v120z" fill="#f08a3c" stroke="#b5561a" stroke-width="3" stroke-linejoin="round"/>
  <path d="M200 146c20-34 60-40 90-26l-18 30z" fill="#f08a3c" stroke="#b5561a" stroke-width="3" stroke-linejoin="round"/>
  <path d="M210 254c14 26 40 30 60 20l-16-24z" fill="#f08a3c" stroke="#b5561a" stroke-width="3" stroke-linejoin="round"/>
  <ellipse cx="230" cy="200" rx="112" ry="62" fill="#f7a64e" stroke="#b5561a" stroke-width="3"/>
  ${[250, 280, 310].flatMap((x) => [170, 200, 230].map((y) => `<path d="M${x - 10} ${y - 10}q12 10 0 20" fill="none" stroke="#d9772f" stroke-width="2"/>`)).join("")}
  <path d="M188 160q-16 40 0 80" fill="none" stroke="#b5561a" stroke-width="3"/>
  <path d="M196 206q22 4 36 20-24 4-36-20z" fill="#f08a3c" stroke="#b5561a" stroke-width="2"/>
  <circle cx="158" cy="184" r="12" fill="#fff"/><circle cx="161" cy="184" r="6" fill="#2a2416"/>
  <path d="M120 206q10 6 18 2" fill="none" stroke="#7a3510" stroke-width="3" stroke-linecap="round"/>
  <circle cx="98" cy="160" r="5" fill="none" stroke="#8bb3cc" stroke-width="2"/><circle cx="88" cy="138" r="7" fill="none" stroke="#8bb3cc" stroke-width="2"/>
`;

const water = `
  <rect x="0" y="0" width="480" height="400" fill="#e8f4fb"/>
  <circle cx="90" cy="62" r="30" fill="#f5c542"/>
  ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M90 22v-12" stroke="#f5c542" stroke-width="5" stroke-linecap="round" transform="rotate(${a} 90 62)"/>`).join("")}
  <path d="M300 400L392 190l88 120v90z" fill="#8bb07a"/>
  <path d="M392 190l-22 50 22-12 20 16z" fill="#fff"/>
  <path d="M0 300q40-10 80 0t80 0 80 0 80 0 40 4V400H0z" fill="#3d8fd1"/>
  <path d="M10 330q20-8 40 0t40 0M120 360q20-8 40 0t40 0" fill="none" stroke="#a9d4f5" stroke-width="3" stroke-linecap="round"/>
  <path d="M410 300q-30 20-60 30t-80 0" fill="none" stroke="#3d8fd1" stroke-width="9" stroke-linecap="round"/>
  <path d="M206 70c0-20 26-30 40-16 8-20 44-20 50 4 22-2 30 26 10 32h-92c-18 0-20-20-8-20z" fill="#fff" stroke="#b9cbd8" stroke-width="2"/>
  ${[300, 320, 340, 360].map((x) => `<path d="M${x} 104l-8 18M${x + 6} 130l-8 18" stroke="#3d8fd1" stroke-width="3" stroke-linecap="round"/>`).join("")}
  ${[130, 160, 190].map((x) => `<path d="M${x} 280q-8-12 0-24t0-24 0-24" fill="none" stroke="#e0a54a" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 6"/><path d="M${x - 6} 214l6-10 6 10" fill="none" stroke="#e0a54a" stroke-width="3"/>`).join("")}
`;

export const LABEL_DIAGRAMS: LabelDiagram[] = [
  {
    id: "body",
    title: "Your body",
    emoji: "🧍",
    art: body,
    parts: [
      { word: "Head", at: [240, 40], slot: [60, 26], tier: 1 },
      { word: "Eye", at: [226, 68], slot: [60, 62], tier: 1 },
      { word: "Ear", at: [200, 78], slot: [60, 98], tier: 1 },
      { word: "Neck", at: [234, 116], slot: [60, 134], tier: 2 },
      { word: "Arm", at: [184, 165], slot: [60, 172], tier: 1 },
      { word: "Hand", at: [166, 244], slot: [60, 244], tier: 1 },
      { word: "Knee", at: [216, 322], slot: [60, 318], tier: 2 },
      { word: "Foot", at: [200, 380], slot: [60, 372], tier: 1 },
      { word: "Nose", at: [242, 80], slot: [420, 62], tier: 1 },
      { word: "Mouth", at: [250, 94], slot: [420, 100], tier: 1 },
      { word: "Shoulder", at: [282, 132], slot: [420, 136], tier: 2 },
      { word: "Chest", at: [255, 156], slot: [420, 172], tier: 2 },
      { word: "Elbow", at: [304, 182], slot: [420, 208], tier: 2 },
      { word: "Tummy", hard: "Abdomen", at: [252, 205], slot: [420, 244], tier: 1 },
      { word: "Leg", at: [266, 345], slot: [420, 342], tier: 1 },
    ],
  },
  {
    id: "organs",
    title: "Inside your body",
    emoji: "🫀",
    art: organs,
    parts: [
      { word: "Brain", at: [222, 48], slot: [60, 40], tier: 1 },
      { word: "Windpipe", hard: "Trachea", at: [236, 118], slot: [60, 110], tier: 2 },
      { word: "Lungs", at: [196, 182], slot: [60, 172], tier: 1 },
      { word: "Liver", at: [200, 240], slot: [60, 230], tier: 2 },
      { word: "Kidneys", at: [186, 270], slot: [60, 282], tier: 3 },
      { word: "Bladder", at: [228, 348], slot: [60, 344], tier: 3 },
      { word: "Heart", at: [254, 192], slot: [420, 176], tier: 1 },
      { word: "Stomach", at: [276, 244], slot: [420, 232], tier: 1 },
      { word: "Intestines", at: [262, 302], slot: [420, 302], tier: 2 },
    ],
  },
  {
    id: "skeleton",
    title: "The skeleton",
    emoji: "💀",
    art: skeleton,
    parts: [
      { word: "Skull", hard: "Cranium", at: [214, 40], slot: [60, 34], tier: 1 },
      { word: "Jaw", hard: "Mandible", at: [226, 78], slot: [60, 84], tier: 2 },
      { word: "Spine", hard: "Vertebrae", at: [236, 214], slot: [60, 214], tier: 1 },
      { word: "Hip bone", hard: "Pelvis", at: [212, 274], slot: [60, 268], tier: 2 },
      { word: "Thigh bone", hard: "Femur", at: [222, 318], slot: [60, 318], tier: 2 },
      { word: "Collarbone", hard: "Clavicle", at: [270, 114], slot: [420, 96], tier: 2 },
      { word: "Ribs", at: [270, 156], slot: [420, 150], tier: 1 },
      { word: "Kneecap", hard: "Patella", at: [264, 346], slot: [420, 330], tier: 2 },
      { word: "Shin bone", hard: "Tibia", at: [264, 374], slot: [420, 378], tier: 3 },
    ],
  },
  {
    id: "plant",
    title: "A plant",
    emoji: "🌱",
    art: plant,
    parts: [
      { word: "Petal", at: [226, 60], slot: [60, 52], tier: 2 },
      { word: "Leaf", at: [196, 226], slot: [60, 222], tier: 1 },
      { word: "Roots", at: [214, 350], slot: [60, 352], tier: 1 },
      { word: "Flower", at: [256, 98], slot: [420, 82], tier: 1 },
      { word: "Bud", at: [300, 140], slot: [420, 136], tier: 2 },
      { word: "Stem", at: [244, 262], slot: [420, 262], tier: 1 },
      { word: "Soil", at: [330, 330], slot: [420, 320], tier: 2 },
    ],
  },
  {
    id: "flower",
    title: "Inside a flower",
    emoji: "🌸",
    art: flower,
    parts: [
      { word: "Anther", at: [198, 168], slot: [60, 130], tier: 3 },
      { word: "Petal", at: [160, 200], slot: [60, 210], tier: 1 },
      { word: "Sepal", at: [206, 284], slot: [60, 284], tier: 3 },
      { word: "Stem", at: [236, 352], slot: [60, 352], tier: 1 },
      { word: "Stigma", at: [252, 190], slot: [420, 120], tier: 3 },
      { word: "Filament", at: [270, 214], slot: [420, 180], tier: 3 },
      { word: "Style", at: [244, 226], slot: [420, 230], tier: 3 },
      { word: "Ovary", at: [258, 270], slot: [420, 280], tier: 3 },
    ],
  },
  {
    id: "insect",
    title: "An insect",
    emoji: "🐝",
    art: insect,
    parts: [
      { word: "Antenna", at: [208, 46], slot: [60, 40], tier: 1 },
      { word: "Head", at: [222, 104], slot: [60, 100], tier: 1 },
      { word: "Thorax", at: [222, 156], slot: [60, 160], tier: 3 },
      { word: "Abdomen", at: [208, 236], slot: [60, 240], tier: 3 },
      { word: "Eye", at: [254, 92], slot: [420, 64], tier: 1 },
      { word: "Wing", at: [306, 136], slot: [420, 120], tier: 1 },
      { word: "Leg", at: [310, 184], slot: [420, 186], tier: 1 },
      { word: "Stinger", at: [244, 296], slot: [420, 296], tier: 2 },
    ],
  },
  {
    id: "fish",
    title: "A fish",
    emoji: "🐟",
    art: fish,
    parts: [
      { word: "Eye", at: [158, 182], slot: [110, 70], tier: 1 },
      { word: "Fin", at: [246, 140], slot: [290, 64], tier: 1 },
      { word: "Tail", at: [378, 196], slot: [420, 90], tier: 1 },
      { word: "Mouth", at: [118, 206], slot: [60, 258], tier: 1 },
      { word: "Gills", at: [186, 214], slot: [150, 330], tier: 2 },
      { word: "Scales", at: [282, 214], slot: [330, 330], tier: 2 },
    ],
  },
  {
    id: "water",
    title: "The water cycle",
    emoji: "🌧️",
    art: water,
    parts: [
      { word: "Sun", at: [90, 92], slot: [70, 138], tier: 1 },
      { word: "Cloud", hard: "Condensation", at: [250, 60], slot: [250, 20], tier: 1 },
      { word: "Rain", hard: "Precipitation", at: [334, 128], slot: [410, 40], tier: 1 },
      { word: "Rising vapour", hard: "Evaporation", at: [160, 226], slot: [80, 200], tier: 2 },
      { word: "Sea", hard: "Collection", at: [120, 340], slot: [110, 376], tier: 1 },
      { word: "River", at: [330, 326], slot: [250, 376], tier: 2 },
      { word: "Mountain", at: [392, 236], slot: [410, 170], tier: 1 },
    ],
  },
];

export function labelFor(part: LabelPart, scientific: boolean) {
  return scientific && part.hard ? part.hard : part.word;
}
