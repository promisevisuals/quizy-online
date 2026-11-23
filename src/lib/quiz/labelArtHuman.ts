/**
 * Label Lab drawings for the human-body topics. Every drawing is a static SVG fragment for a
 * 480 × 480 box. Labels sit in the side columns (or rows above and below), so the drawing
 * keeps to the middle of the box.
 */

export const SKIN = "#f2c49b";
export const SKIN_LINE = "#c98d5e";
const HAIR = "#3b2a1d";

/** A limb drawn as a rounded stroke with an outline. */
const limb = (d: string, w: number, fill = SKIN, line = SKIN_LINE) =>
  `<path d="${d}" fill="none" stroke="${line}" stroke-width="${w + 3}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

/* ───────── whole body, front view (swimsuit, bare feet) ───────── */
export const figureArt = `
  <ellipse cx="240" cy="470" rx="110" ry="7" fill="#e6d3ad"/>
  <ellipse cx="201" cy="74" rx="8" ry="12" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <ellipse cx="279" cy="74" rx="8" ry="12" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <rect x="231" y="102" width="18" height="26" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <circle cx="240" cy="70" r="38" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <path d="M202 64C200 38 220 29 240 29S280 38 278 64C270 51 256 45 240 45S210 51 202 64Z" fill="${HAIR}"/>
  <path d="M220 57q6-4 12 0M248 57q6-4 12 0" fill="none" stroke="${HAIR}" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="226" cy="67" r="4.5" fill="#2a2416"/><circle cx="254" cy="67" r="4.5" fill="#2a2416"/>
  <path d="M240 71l-4 11h8" fill="none" stroke="${SKIN_LINE}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M229 92q11 8 22 0" fill="none" stroke="#b5483f" stroke-width="3" stroke-linecap="round"/>
  ${limb("M202 136L181 198L173 256", 17)}
  ${limb("M278 136L299 198L307 256", 17)}
  <path d="M198 136q2-13 18-13h48q16 0 18 13l-4 112h-76z" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <path d="M214 160q12 9 22 1M244 161q10 8 22-1" fill="none" stroke="${SKIN_LINE}" stroke-width="2" stroke-linecap="round"/>
  <path d="M240 178v34" stroke="${SKIN_LINE}" stroke-width="1.5" opacity=".45"/>
  <circle cx="240" cy="230" r="3" fill="${SKIN_LINE}"/>
  <ellipse cx="171" cy="274" rx="12" ry="17" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <ellipse cx="309" cy="274" rx="12" ry="17" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <path d="M166 282v8M171 283v9M176 282v8M304 282v8M309 283v9M314 282v8" stroke="${SKIN_LINE}" stroke-width="1.5" stroke-linecap="round"/>
  ${limb("M221 296L217 372L214 436", 20)}
  ${limb("M259 296L263 372L266 436", 20)}
  <path d="M200 244h80l4 58h-36l-8-22-8 22h-36z" fill="#1c4f7a" stroke="#143a5a" stroke-width="2"/>
  <path d="M210 368q7 6 14 0M256 368q7 6 14 0" fill="none" stroke="${SKIN_LINE}" stroke-width="2" stroke-linecap="round"/>
  <ellipse cx="211" cy="450" rx="16" ry="12" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <ellipse cx="269" cy="450" rx="16" ry="12" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  ${[199, 204.5, 210, 215.5, 221].map((x) => `<circle cx="${x}" cy="461" r="3.4" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="1.5"/>`).join("")}
  ${[259, 264.5, 270, 275.5, 281].map((x) => `<circle cx="${x}" cy="461" r="3.4" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="1.5"/>`).join("")}
`;

/* ───────── the face, up close ───────── */
export const faceArt = `
  <rect x="198" y="360" width="84" height="120" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <path d="M150 480q90-50 180 0z" fill="#2f9a5f"/>
  <ellipse cx="128" cy="264" rx="15" ry="30" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <ellipse cx="352" cy="264" rx="15" ry="30" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <path d="M126 250q8 14 0 28M354 250q-8 14 0 28" fill="none" stroke="${SKIN_LINE}" stroke-width="2"/>
  <ellipse cx="240" cy="258" rx="112" ry="140" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <path d="M128 232C120 142 172 100 240 100S360 142 352 232C340 182 300 142 240 142S140 182 128 232Z" fill="${HAIR}"/>
  <path d="M168 206q26-16 54-4M258 202q28-12 54 4" fill="none" stroke="${HAIR}" stroke-width="7" stroke-linecap="round"/>
  <path d="M168 234q28-22 56 0q-28 18-56 0z" fill="#fff" stroke="#2a2416" stroke-width="2"/>
  <path d="M256 234q28-22 56 0q-28 18-56 0z" fill="#fff" stroke="#2a2416" stroke-width="2"/>
  <circle cx="196" cy="233" r="10" fill="#6b4a2b"/><circle cx="196" cy="233" r="4.5" fill="#1d140c"/>
  <circle cx="284" cy="233" r="10" fill="#6b4a2b"/><circle cx="284" cy="233" r="4.5" fill="#1d140c"/>
  <path d="M170 226q26-22 52 0M258 226q26-22 52 0" fill="none" stroke="${SKIN_LINE}" stroke-width="2"/>
  ${[264, 272, 280, 288, 296, 304].map((x, i) => `<path d="M${x} ${[229, 225, 223, 223, 225, 229][i]}l${(x - 284) / 6} -9" stroke="#2a2416" stroke-width="2" stroke-linecap="round"/>`).join("")}
  ${[176, 184, 192, 200, 208, 216].map((x, i) => `<path d="M${x} ${[229, 225, 223, 223, 225, 229][i]}l${(x - 196) / 6} -9" stroke="#2a2416" stroke-width="2" stroke-linecap="round"/>`).join("")}
  <circle cx="178" cy="292" r="20" fill="#f4a6a6" opacity=".55"/><circle cx="302" cy="292" r="20" fill="#f4a6a6" opacity=".55"/>
  <path d="M240 244q-6 38-18 56q18 12 36 0q-12-18-18-56" fill="none" stroke="${SKIN_LINE}" stroke-width="2.5" stroke-linejoin="round"/>
  <ellipse cx="230" cy="302" rx="6" ry="3.5" fill="#8a5a3c"/><ellipse cx="250" cy="302" rx="6" ry="3.5" fill="#8a5a3c"/>
  <path d="M234 313l-2 19M246 313l2 19" stroke="${SKIN_LINE}" stroke-width="2" stroke-linecap="round"/>
  <path d="M206 340q16-12 34-6q18-6 34 6q-34 10-68 0z" fill="#c8575b"/>
  <path d="M206 340q34 30 68 0q-34 8-68 0z" fill="#b5483f"/>
  <path d="M228 384q12 6 24 0" fill="none" stroke="${SKIN_LINE}" stroke-width="2" stroke-linecap="round"/>
`;

/* ───────── the back of a right hand ───────── */
const NAIL = `fill="#fbe3e0" stroke="#d9a3a0" stroke-width="2"`;
export const handArt = `
  <path d="M196 372h88l8 108h-104z" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <rect x="178" y="128" width="32" height="160" rx="16" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <rect x="214" y="104" width="32" height="180" rx="16" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <rect x="250" y="120" width="31" height="165" rx="15.5" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <rect x="285" y="164" width="27" height="122" rx="13.5" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  ${limb("M196 318L138 258", 34)}
  <path d="M176 266q-6 62 20 110h88q26-48 22-110z" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
  <path d="M179 270h126" stroke="${SKIN}" stroke-width="6"/>
  <rect x="184" y="136" width="20" height="26" rx="9" ${NAIL}/>
  <rect x="220" y="112" width="20" height="26" rx="9" ${NAIL}/>
  <rect x="255.5" y="128" width="20" height="25" rx="9" ${NAIL}/>
  <rect x="288.5" y="172" width="18" height="22" rx="8" ${NAIL}/>
  <ellipse cx="141" cy="262" rx="9" ry="12" transform="rotate(-44 141 262)" ${NAIL}/>
  ${[
    [194, 196],
    [194, 236],
    [230, 176],
    [230, 222],
    [265.5, 186],
    [265.5, 228],
    [298.5, 216],
    [298.5, 246],
  ]
    .map(([x, y]) => `<path d="M${x - 8} ${y}q8 4 16 0" fill="none" stroke="${SKIN_LINE}" stroke-width="1.8" stroke-linecap="round"/>`)
    .join("")}
  ${[194, 230, 265.5, 298.5].map((x) => `<path d="M${x - 11} 286q11-9 22 0" fill="none" stroke="${SKIN_LINE}" stroke-width="2.2" stroke-linecap="round"/>`).join("")}
  <path d="M199 382q41 8 82 0" fill="none" stroke="${SKIN_LINE}" stroke-width="2"/>
`;

/* ───────── a right ear, from the side ───────── */
export const earArt = `
  <circle cx="240" cy="250" r="196" fill="#fbe4cf"/>
  <path d="M206 108C236 70 312 72 334 150C352 214 330 268 304 300C292 316 296 344 292 372C288 404 262 414 246 400C232 388 236 360 222 344C212 330 196 320 194 300C190 260 186 200 196 150C198 130 200 118 206 108Z" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="3"/>
  <path d="M214 126C244 98 300 102 316 158C330 208 312 254 290 282" fill="none" stroke="${SKIN_LINE}" stroke-width="3" stroke-linecap="round"/>
  <path d="M222 222C240 206 272 220 270 252C268 286 246 300 228 296C214 292 206 272 210 248Z" fill="#e3a77c"/>
  <path d="M230 168C262 154 292 182 290 222C288 252 274 280 262 306" fill="none" stroke="#e8b48d" stroke-width="12" stroke-linecap="round"/>
  <path d="M230 168C262 154 292 182 290 222C288 252 274 280 262 306" fill="none" stroke="${SKIN_LINE}" stroke-width="2" stroke-linecap="round" opacity=".6"/>
  <path d="M244 172C252 152 268 144 282 152" fill="none" stroke="#e8b48d" stroke-width="8" stroke-linecap="round"/>
  <ellipse cx="217" cy="268" rx="11" ry="14" fill="#5a3a28"/>
  <path d="M196 262C182 270 182 296 198 304C207 296 207 270 196 262Z" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2.5"/>
  <path d="M240 314C252 304 272 306 276 320C266 328 250 328 240 314Z" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2.5"/>
  <path d="M252 376q14 10 30 0" fill="none" stroke="#e8a98a" stroke-width="6" stroke-linecap="round" opacity=".6"/>
`;

/* ───────── organs in the torso ───────── */
export const torsoArt = `
  <circle cx="240" cy="56" r="42" fill="#fbe7d6" stroke="${SKIN_LINE}" stroke-width="2"/>
  <rect x="222" y="94" width="36" height="28" fill="#fbe7d6" stroke="${SKIN_LINE}" stroke-width="2"/>
  <path d="M222 118h36v6q56 6 70 32l-6 314h-164l-6-314q14-26 70-32z" fill="#fbe7d6" stroke="${SKIN_LINE}" stroke-width="2"/>
  <path d="M206 50c0-20 16-30 34-30s34 10 34 30c0 14-14 20-34 20s-34-6-34-20z" fill="#f3a6b8" stroke="#c96b84" stroke-width="2"/>
  <path d="M216 42q6-8 12 0t12 0 12 0 10 2M214 54q8 6 16 0t16 0 16 0 10 0" fill="none" stroke="#c96b84" stroke-width="2"/>
  <path d="M254 102L256 150" stroke="#d89a8a" stroke-width="9" stroke-linecap="round"/>
  <rect x="234" y="100" width="12" height="78" rx="5" fill="#b5d6f0" stroke="#6c9bc4" stroke-width="2"/>
  ${[110, 120, 130, 140, 150, 160, 170].map((y) => `<path d="M236 ${y}h8" stroke="#6c9bc4" stroke-width="1.5"/>`).join("")}
  <ellipse cx="231" cy="113" rx="8" ry="6" fill="#e57f8f" stroke="#b0495b" stroke-width="1.5"/><ellipse cx="249" cy="113" rx="8" ry="6" fill="#e57f8f" stroke="#b0495b" stroke-width="1.5"/>
  <ellipse cx="196" cy="218" rx="34" ry="62" fill="#f4a6a6" stroke="#c96060" stroke-width="2"/>
  <ellipse cx="284" cy="218" rx="34" ry="62" fill="#f4a6a6" stroke="#c96060" stroke-width="2"/>
  <path d="M240 178l-24 18M240 178l24 18" stroke="#6c9bc4" stroke-width="6" stroke-linecap="round"/>
  <path d="M256 226c-6-13-26-9-24 7 2 13 24 27 24 27s22-14 24-27c2-16-18-20-24-7z" fill="#d63a3a" stroke="#8f1f1f" stroke-width="2"/>
  <path d="M156 292Q240 252 324 292" fill="none" stroke="#b5574a" stroke-width="7" stroke-linecap="round"/>
  <path d="M162 300C190 290 250 290 278 300C270 326 228 340 190 340C170 340 160 322 162 300Z" fill="#9c4a3a" stroke="#6b2d22" stroke-width="2"/>
  <ellipse cx="222" cy="345" rx="9" ry="12" fill="#5f9e4a" stroke="#3d6b2e" stroke-width="2"/>
  <ellipse cx="174" cy="372" rx="11" ry="18" fill="#b0413e" stroke="#7a2523" stroke-width="2"/>
  <ellipse cx="306" cy="372" rx="11" ry="18" fill="#b0413e" stroke="#7a2523" stroke-width="2"/>
  <path d="M266 298C292 288 318 298 312 326C306 352 282 362 266 350C256 342 266 330 278 326C286 318 276 308 266 298Z" fill="#f0b37e" stroke="#b5743d" stroke-width="2"/>
  <ellipse cx="318" cy="302" rx="7" ry="17" fill="#7a3b6b" stroke="#4f2245" stroke-width="2"/>
  <path d="M228 366C250 356 290 356 304 362C296 372 262 376 228 372Z" fill="#f7d36b" stroke="#c49a25" stroke-width="2"/>
  <rect x="200" y="394" width="80" height="54" rx="12" fill="#f8d8b8"/>
  <path d="M206 404q12 10 24 0t24 0t24 0M206 420q12 10 24 0t24 0t24 0M206 436q12 10 24 0t24 0t24 0" fill="none" stroke="#e0a77a" stroke-width="6" stroke-linecap="round"/>
  <path d="M186 446V394q0-8 8-8h92q8 0 8 8v52q0 8-8 6h-34" fill="none" stroke="#c48b5c" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M186 452q-4 12 4 18" fill="none" stroke="#c48b5c" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="240" cy="462" rx="14" ry="8" fill="#f7d36b" stroke="#c49a25" stroke-width="2"/>
`;

/* ───────── the heart, cut open (front view: the heart's right side is on the left) ───────── */
const BLUE = "#5b84c4";
const BLUE_LINE = "#34558c";
const RED = "#c0392b";
const RED_LINE = "#80241b";
export const heartArt = `
  <rect x="188" y="56" width="26" height="160" rx="9" fill="${BLUE}" stroke="${BLUE_LINE}" stroke-width="2"/>
  <rect x="192" y="320" width="26" height="130" rx="9" fill="${BLUE}" stroke="${BLUE_LINE}" stroke-width="2"/>
  ${[272, 294, 316].map((x) => `<rect x="${x}" y="46" width="11" height="40" rx="4" fill="${RED}" stroke="${RED_LINE}" stroke-width="2"/>`).join("")}
  <path d="M266 232V124Q266 82 304 82Q342 82 342 124V206" fill="none" stroke="${RED_LINE}" stroke-width="32" stroke-linecap="round"/>
  <path d="M266 232V124Q266 82 304 82Q342 82 342 124V206" fill="none" stroke="${RED}" stroke-width="27" stroke-linecap="round"/>
  <path d="M322 214h28M322 244h28" stroke="${RED_LINE}" stroke-width="15" stroke-linecap="round"/>
  <path d="M322 214h28M322 244h28" stroke="${RED}" stroke-width="11" stroke-linecap="round"/>
  <path d="M186 212C182 168 232 160 252 178C276 160 330 170 326 216C322 286 290 344 252 404C212 344 190 286 186 212Z" fill="#e8a0a0" stroke="#9b2c2c" stroke-width="3"/>
  <ellipse cx="207" cy="230" rx="19" ry="28" fill="#7fa6dc" stroke="${BLUE_LINE}" stroke-width="2"/>
  <ellipse cx="292" cy="228" rx="26" ry="26" fill="#e46b6b" stroke="${RED_LINE}" stroke-width="2"/>
  <path d="M204 274C210 264 236 264 243 272L243 362C224 338 206 308 204 274Z" fill="#7fa6dc" stroke="${BLUE_LINE}" stroke-width="2"/>
  <path d="M259 272C268 262 300 264 306 276C302 312 284 346 259 382Z" fill="#e46b6b" stroke="${RED_LINE}" stroke-width="2"/>
  <path d="M200 266l8 6 8-6M276 266l8 6 8-6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M234 268Q228 196 252 156" fill="none" stroke="${BLUE_LINE}" stroke-width="27" stroke-linecap="round"/>
  <path d="M234 268Q228 196 252 156" fill="none" stroke="#3f6fb5" stroke-width="22" stroke-linecap="round"/>
  <path d="M246 158H150M258 156H374" stroke="${BLUE_LINE}" stroke-width="17" stroke-linecap="round"/>
  <path d="M246 158H150M258 156H374" stroke="#3f6fb5" stroke-width="13" stroke-linecap="round"/>
`;

/* ───────── the brain, from the side (the front is on the left) ───────── */
export const brainArt = `
  <path d="M130 240C110 170 160 96 250 92L246 180C226 210 200 226 176 250C160 254 140 252 130 240Z" fill="#8fb8e8" stroke="#4d78ad" stroke-width="2"/>
  <path d="M250 92C300 90 340 110 356 150L300 200L246 180Z" fill="#9ed39a" stroke="#4f8f4b" stroke-width="2"/>
  <path d="M356 150C372 180 374 230 360 262C346 282 330 292 316 296L300 200Z" fill="#f7d36b" stroke="#b59128" stroke-width="2"/>
  <path d="M176 250C200 226 226 210 246 180L300 200L316 296C290 304 260 304 240 300C214 298 190 286 176 250Z" fill="#f3a6b8" stroke="#c96b84" stroke-width="2"/>
  <path d="M158 170q16 10 30 0t30 4M150 210q18 8 36-2M196 130q14 12 30 2M270 120q16 12 34 4M286 160q14 10 30 0M330 200q10 14 24 8M336 240q-12 10-4 22M200 270q20 8 40 0t36 6M222 240q16 10 34 2" fill="none" stroke="rgba(60,40,30,.35)" stroke-width="2" stroke-linecap="round"/>
  <path d="M262 296C266 330 268 362 262 402H246C250 362 250 330 244 300Z" fill="#e8c39e" stroke="#a8825a" stroke-width="2"/>
  <ellipse cx="318" cy="328" rx="42" ry="28" fill="#c9a0dc" stroke="#7d58a0" stroke-width="2"/>
  ${[[312, 26], [322, 37], [332, 38], [342, 30]].map(([y, half]) => `<path d="M${318 - half} ${y}q${half} 5 ${half * 2} 0" fill="none" stroke="#7d58a0" stroke-width="1.6" opacity=".7"/>`).join("")}
  <rect x="246" y="398" width="16" height="74" rx="6" fill="#e8c39e" stroke="#a8825a" stroke-width="2"/>
`;

/* ───────── the skeleton, front view ───────── */
const BONE = "#f8f4ea";
const BONE_LINE = "#a89a7c";
const bone = (x1: number, y1: number, x2: number, y2: number, w = 9) =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${BONE_LINE}" stroke-width="${w + 4}" stroke-linecap="round"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="${BONE}" stroke-width="${w}" stroke-linecap="round"/>`;
const knob = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="2"/>`;
/** A hand or foot: wrist/ankle bones, then fanned long bones and finger/toe bones. */
const extremity = (x: number, y: number, dir: 1 | -1, spread: number, len: number) => {
  const parts = [knob(x - 5, y, 4.5), knob(x + 5, y, 4.5), knob(x - 5, y + 8, 4.5), knob(x + 5, y + 8, 4.5)];
  for (let i = 0; i < 5; i++) {
    const dx = (i - 2) * spread * dir;
    const sx = x + (i - 2) * 3;
    parts.push(bone(sx, y + 14, sx + dx * 0.6, y + 14 + len * 0.55, 2.6));
    parts.push(bone(sx + dx * 0.6, y + 17 + len * 0.55, sx + dx, y + 14 + len, 2.2));
  }
  return parts.join("");
};

export const skeletonArt = `
  <path d="M210 50a30 30 0 1 1 60 0v16q-30 12-60 0z" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="3"/>
  <ellipse cx="229" cy="48" rx="7.5" ry="8.5" fill="#3d3627"/><ellipse cx="251" cy="48" rx="7.5" ry="8.5" fill="#3d3627"/>
  <path d="M236 64l4-7 4 7z" fill="#3d3627"/>
  <path d="M218 70q22 36 44 0v8q-22 30-44 0z" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="3"/>
  <path d="M228 74v6M236 76v6M244 76v6M252 74v6" stroke="${BONE_LINE}" stroke-width="2"/>
  ${[100, 112].map((y) => `<rect x="234" y="${y}" width="12" height="10" rx="3" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="2"/>`).join("")}
  ${bone(236, 132, 196, 128, 7)}${bone(244, 132, 284, 128, 7)}
  ${[140, 154, 168, 182, 196, 210].map((y, i) => `<path d="M236 ${y}q-${46 - i * 3} 2-${42 - i * 3} ${20 - i}" fill="none" stroke="${BONE_LINE}" stroke-width="5" stroke-linecap="round"/><path d="M244 ${y}q${46 - i * 3} 2 ${42 - i * 3} ${20 - i}" fill="none" stroke="${BONE_LINE}" stroke-width="5" stroke-linecap="round"/>`).join("")}
  ${[124, 138, 152, 166, 180, 194, 208, 222, 236, 250, 264].map((y) => `<rect x="234" y="${y}" width="12" height="11" rx="3" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="2"/>`).join("")}
  <rect x="232" y="138" width="16" height="66" rx="6" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="2"/>
  ${[270, 280].map((y) => `<rect x="233" y="${y}" width="14" height="9" rx="3" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="2"/>`).join("")}
  <path d="M202 296q38-26 76 0l-8 38q-30 14-60 0z" fill="${BONE}" stroke="${BONE_LINE}" stroke-width="3"/>
  <path d="M230 292h20l-4 28h-12z" fill="#ece3cf" stroke="${BONE_LINE}" stroke-width="2"/>
  <circle cx="220" cy="318" r="6" fill="#e9e0cc"/><circle cx="260" cy="318" r="6" fill="#e9e0cc"/>
  ${bone(196, 134, 180, 218, 9)}${bone(284, 134, 300, 218, 9)}
  ${bone(172, 226, 160, 290, 4.5)}${bone(182, 226, 174, 292, 4.5)}
  ${bone(308, 226, 320, 290, 4.5)}${bone(298, 226, 306, 292, 4.5)}
  ${extremity(167, 300, -1, 6, 44)}${extremity(313, 300, 1, 6, 44)}
  ${bone(216, 328, 220, 394, 10)}${bone(264, 328, 260, 394, 10)}
  ${knob(220, 404, 7)}${knob(260, 404, 7)}
  ${bone(224, 414, 223, 440, 7)}${bone(212, 416, 213, 438, 3.5)}
  ${bone(256, 414, 257, 440, 7)}${bone(268, 416, 267, 438, 3.5)}
  ${knob(214, 449, 4)}${knob(223, 449, 4)}${knob(257, 449, 4)}${knob(266, 449, 4)}
  ${[0, 1, 2, 3, 4].map((i) => bone(208 + i * 4.5, 456, 203 + i * 5.5, 468, 2.2) + bone(252 + i * 4.5, 456, 251 + i * 5.5, 468, 2.2)).join("")}
  ${[0, 1, 2, 3, 4].map((i) => bone(203 + i * 5.5, 472, 202 + i * 5.8, 477, 2) + bone(251 + i * 5.5, 472, 252 + i * 5.8, 477, 2)).join("")}
`;
