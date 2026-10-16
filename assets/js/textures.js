// Procedural canvas textures, so the whole scene ships without image files.
import * as THREE from 'three';

const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const PIXEL = '"Pixelify Sans", ui-monospace, monospace';

export function rng(seed = 7) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { repeat, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

export function woodTexture() {
  const [c, g] = canvas(1024, 512);
  const r = rng(11);
  g.fillStyle = '#5a3820';
  g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 420; i++) {
    const y = r() * 512;
    const h = 1 + r() * 5;
    const l = 30 + r() * 30;
    g.fillStyle = `hsla(${22 + r() * 10}, ${40 + r() * 20}%, ${l * 0.5}%, ${0.08 + r() * 0.18})`;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 32) g.lineTo(x, y + Math.sin(x * 0.006 + i) * 6 * r());
    g.lineTo(1024, y + h); g.lineTo(0, y + h); g.fill();
  }
  // a couple of knots
  for (let k = 0; k < 3; k++) {
    const x = 120 + r() * 800, y = 60 + r() * 380;
    for (let i = 10; i > 0; i--) {
      g.strokeStyle = `rgba(40,22,10,${0.05 + i * 0.012})`;
      g.beginPath(); g.ellipse(x, y, i * 6, i * 2.2, 0, 0, Math.PI * 2); g.stroke();
    }
  }
  return toTexture(c, { repeat: [2, 1] });
}

// a blueprint-style cutting mat, a nod to the old grid background of the site
export function matTexture() {
  const [c, g] = canvas(1536, 768);
  g.fillStyle = '#16233d';
  g.fillRect(0, 0, 1536, 768);
  const step = 24;
  for (let x = 0; x <= 1536; x += step) {
    const major = (x / step) % 5 === 0;
    g.fillStyle = major ? 'rgba(130,190,255,.32)' : 'rgba(120,170,255,.13)';
    g.fillRect(x, 0, major ? 2 : 1, 768);
  }
  for (let y = 0; y <= 768; y += step) {
    const major = (y / step) % 5 === 0;
    g.fillStyle = major ? 'rgba(130,190,255,.32)' : 'rgba(120,170,255,.13)';
    g.fillRect(0, y, 1536, major ? 2 : 1);
  }
  // ruler along the front edge
  g.fillStyle = 'rgba(200,225,255,.65)';
  g.font = `600 15px ${MONO}`;
  for (let i = 1; i < 60; i++) {
    const x = i * step * 1.05 + 24;
    g.fillRect(x, 768 - 34, 2, i % 5 === 0 ? 18 : 9);
    if (i % 5 === 0) g.fillText(String(i), x - 6, 768 - 40);
  }
  g.strokeStyle = 'rgba(160,210,255,.55)';
  g.lineWidth = 4;
  g.strokeRect(14, 14, 1536 - 28, 768 - 28);
  g.font = `700 22px ${PIXEL}`;
  g.fillStyle = 'rgba(160,210,255,.6)';
  g.fillText('EXP-07  //  SIM2REAL', 40, 52);
  g.textAlign = 'right';
  g.fillText('A = 0.10   GAMMA = 0.99', 1536 - 40, 52);
  // a faint 45 degree guide
  g.strokeStyle = 'rgba(160,210,255,.18)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(1536 - 420, 768 - 60); g.lineTo(1536 - 60, 768 - 420); g.stroke();
  g.beginPath(); g.arc(1536 - 60, 768 - 60, 360, Math.PI, Math.PI * 1.5); g.stroke();
  return toTexture(c);
}

export function wallTexture() {
  const [c, g] = canvas(512, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#141826');
  grad.addColorStop(1, '#1d2232');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  const r = rng(3);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(255,255,255,${r() * 0.025})`;
    g.fillRect(r() * 512, r() * 512, 1, 1);
  }
  // vertical panel seams
  g.fillStyle = 'rgba(0,0,0,.25)';
  g.fillRect(0, 0, 2, 512);
  g.fillStyle = 'rgba(255,255,255,.03)';
  g.fillRect(2, 0, 1, 512);
  return toTexture(c, { repeat: [8, 3] });
}

// WALL·E's sun-baked, dented yellow paint
export function rustTexture(seed = 5) {
  const [c, g] = canvas(512, 512);
  const r = rng(seed);
  g.fillStyle = '#d29a26';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    const x = r() * 512, y = r() * 512, s = 4 + r() * 40;
    g.fillStyle = r() < 0.6
      ? `rgba(${120 + r() * 60},${70 + r() * 30},${20 + r() * 20},${0.08 + r() * 0.22})`
      : `rgba(255,${200 + r() * 40},${90 + r() * 60},${0.05 + r() * 0.12})`;
    g.beginPath(); g.ellipse(x, y, s, s * (0.4 + r() * 0.8), r() * 3, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(60,35,10,${0.1 + r() * 0.25})`;
    g.lineWidth = 0.6 + r() * 1.2;
    const x = r() * 512, y = r() * 512;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 20); g.stroke();
  }
  // grime collects at the bottom
  const grad = g.createLinearGradient(0, 300, 0, 512);
  grad.addColorStop(0, 'rgba(70,40,10,0)');
  grad.addColorStop(1, 'rgba(70,40,10,.45)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  return toTexture(c);
}

export function treadTexture() {
  const [c, g] = canvas(64, 64);
  g.fillStyle = '#2a2a2a';
  g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 16) {
    g.fillStyle = '#3d3c3a'; g.fillRect(0, y, 64, 9);
    g.fillStyle = '#1a1a1a'; g.fillRect(0, y + 9, 64, 2);
  }
  return toTexture(c, { repeat: [6, 6] });
}

export function chargeMeterTexture() {
  const [c, g] = canvas(64, 160);
  g.fillStyle = '#16140b'; g.fillRect(0, 0, 64, 160);
  g.fillStyle = '#f2b630';
  g.beginPath(); g.arc(32, 22, 9, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#f2b630'; g.lineWidth = 3;
  for (let a = 0; a < 8; a++) {
    const t = (a / 8) * Math.PI * 2;
    g.beginPath(); g.moveTo(32 + Math.cos(t) * 12, 22 + Math.sin(t) * 12); g.lineTo(32 + Math.cos(t) * 17, 22 + Math.sin(t) * 17); g.stroke();
  }
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i < 5 ? '#ffc73d' : '#3a3216';
    g.fillRect(12, 146 - i * 18, 40, 12);
  }
  return toTexture(c);
}

export function plateTexture(text, { bg = '#2b2a27', fg = '#e9e2cf', w = 256, h = 64, font = PIXEL } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = `700 ${Math.round(h * 0.62)}px ${font}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
  return toTexture(c);
}

export function spaceTexture() {
  const [c, g] = canvas(1024, 1024);
  const grad = g.createRadialGradient(400, 380, 40, 512, 512, 620);
  grad.addColorStop(0, '#1d2a5a');
  grad.addColorStop(0.55, '#0b1030');
  grad.addColorStop(1, '#03040c');
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 1024);
  // nebula smear
  const r = rng(19);
  for (let i = 0; i < 40; i++) {
    const x = 200 + r() * 500, y = 200 + r() * 300, s = 60 + r() * 160;
    const n = g.createRadialGradient(x, y, 0, x, y, s);
    n.addColorStop(0, `rgba(${180 + r() * 60},${60 + r() * 60},${200 + r() * 55},.08)`);
    n.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = n; g.fillRect(x - s, y - s, s * 2, s * 2);
  }
  for (let i = 0; i < 900; i++) {
    const s = r() < 0.94 ? 1 + r() * 1.4 : 2.2 + r() * 2;
    g.fillStyle = `rgba(255,${235 + r() * 20},${210 + r() * 45},${0.4 + r() * 0.6})`;
    g.beginPath(); g.arc(r() * 1024, r() * 1024, s, 0, Math.PI * 2); g.fill();
  }
  // a little blue planet
  const px = 700, py = 690, pr = 150;
  const pg = g.createRadialGradient(px - 60, py - 60, 10, px, py, pr);
  pg.addColorStop(0, '#9fe4ff'); pg.addColorStop(0.45, '#2f7fd8'); pg.addColorStop(1, '#0a1a44');
  g.fillStyle = pg; g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
  g.save(); g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.clip();
  g.fillStyle = 'rgba(120,200,90,.55)';
  for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(px - 100 + r() * 200, py - 100 + r() * 200, 20 + r() * 45, 10 + r() * 25, r() * 3, 0, Math.PI * 2); g.fill(); }
  const shade = g.createLinearGradient(px - pr, py - pr, px + pr, py + pr);
  shade.addColorStop(0.45, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,10,.75)');
  g.fillStyle = shade; g.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  g.restore();
  g.strokeStyle = 'rgba(160,220,255,.35)'; g.lineWidth = 6;
  g.beginPath(); g.arc(px, py, pr + 4, 0, Math.PI * 2); g.stroke();
  return toTexture(c);
}

export function corkTexture() {
  const [c, g] = canvas(512, 320);
  g.fillStyle = '#9c7347'; g.fillRect(0, 0, 512, 320);
  const r = rng(23);
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(70,45,20,${r() * 0.35})` : `rgba(210,170,110,${r() * 0.3})`;
    g.fillRect(r() * 512, r() * 320, 1 + r() * 2.5, 1 + r() * 2.5);
  }
  return toTexture(c);
}

export function noteTexture(lines, { bg = '#ffe680', ink = '#2a2622', size = 30, doodle = false } = {}) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255,255,255,.12)'); grad.addColorStop(1, 'rgba(0,0,0,.08)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  g.fillStyle = ink;
  g.font = `600 ${size}px ${PIXEL}`;
  g.textBaseline = 'top';
  lines.forEach((l, i) => g.fillText(l, 18, 22 + i * (size + 10)));
  if (doodle) {
    // a tiny robot doodle
    g.strokeStyle = ink; g.lineWidth = 4;
    g.strokeRect(150, 150, 70, 52); g.beginPath();
    g.arc(172, 176, 7, 0, Math.PI * 2); g.moveTo(205, 176); g.arc(198, 176, 7, 0, Math.PI * 2);
    g.moveTo(185, 150); g.lineTo(185, 132); g.stroke();
    g.beginPath(); g.arc(185, 127, 6, 0, Math.PI * 2); g.fill();
  }
  return toTexture(c);
}

export function bookCover(title, sub, author, { bg, fg, accent }) {
  const [c, g] = canvas(512, 384);
  g.fillStyle = bg; g.fillRect(0, 0, 512, 384);
  g.fillStyle = accent; g.fillRect(0, 280, 512, 104);
  g.fillStyle = fg;
  g.font = `700 40px ${MONO}`;
  g.textBaseline = 'top';
  title.forEach((t, i) => g.fillText(t, 34, 40 + i * 46));
  g.font = `500 24px ${MONO}`;
  g.globalAlpha = 0.8;
  g.fillText(sub, 34, 60 + title.length * 46);
  g.globalAlpha = 1;
  g.fillStyle = bg;
  g.font = `600 26px ${MONO}`;
  g.fillText(author, 34, 316);
  return toTexture(c);
}

export function pagesTexture() {
  const [c, g] = canvas(64, 64);
  g.fillStyle = '#efe8d6'; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 3) { g.fillStyle = 'rgba(120,100,70,.18)'; g.fillRect(0, y, 64, 1); }
  return toTexture(c);
}

export function trashTexture(seed) {
  const [c, g] = canvas(256, 256);
  const r = rng(seed);
  g.fillStyle = '#6b6156'; g.fillRect(0, 0, 256, 256);
  const cols = ['#8a7d6b', '#4f5a62', '#9a4b2c', '#c9b48a', '#3f4a3a', '#7a8691', '#b5793a', '#2f2b28', '#a9a196'];
  for (let i = 0; i < 160; i++) {
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    g.save(); g.translate(r() * 256, r() * 256); g.rotate((r() - 0.5) * 0.6);
    g.fillRect(-20, -6, 10 + r() * 50, 3 + r() * 14);
    g.restore();
  }
  for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.25})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
  return toTexture(c);
}

export function stickerTexture() {
  // a solved-ish puzzle cube face
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#111'; g.fillRect(0, 0, 128, 128);
  const cols = ['#5cc8ff', '#f2b630', '#ff6b5e', '#8fd14f', '#f5f1e6', '#b39ce6'];
  const r = rng(41);
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    g.beginPath(); g.roundRect(6 + x * 40, 6 + y * 40, 36, 36, 5); g.fill();
  }
  return toTexture(c);
}

export function keyboardTexture() {
  const [c, g] = canvas(512, 256);
  g.fillStyle = '#9ea3ab'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#26282d';
  g.fillRect(40, 18, 432, 150);
  g.fillStyle = '#3a3d44';
  for (let row = 0; row < 5; row++) {
    for (let k = 0; k < 14; k++) g.fillRect(46 + k * 30.6, 24 + row * 29, 26, 24);
  }
  g.fillStyle = '#868b93';
  g.fillRect(186, 186, 140, 56); // trackpad
  return toTexture(c);
}

// The laptop screen: a live training run of WALL·E's policy.
export function createTerminal() {
  const [c, g] = canvas(640, 400);
  const tex = toTexture(c);
  const lines = [];
  const returns = [];
  let ep = 1180;
  let ret = 40;
  const r = rng(77);

  function push(line, color = '#9ad1ff') {
    lines.push({ line, color });
    if (lines.length > 11) lines.shift();
  }
  push('$ python train.py --agent wall-e --env desk-v2', '#e9e4d7');
  push('loading world model ... ok', '#8fd14f');

  function step() {
    ep += 1;
    ret += (320 - ret) * 0.035 + (r() - 0.45) * 18;
    returns.push(ret);
    if (returns.length > 120) returns.shift();
    if (ep % 3 === 0) push(`ep ${String(ep).padStart(5, '0')}  return ${ret.toFixed(1).padStart(6)}  eps 0.0${(9 - (ep % 7)).toString()}`);
    draw();
  }

  function draw() {
    g.fillStyle = '#0b0f17'; g.fillRect(0, 0, 640, 400);
    g.fillStyle = '#1c2230'; g.fillRect(0, 0, 640, 30);
    ['#ff6b5e', '#f2b630', '#8fd14f'].forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(18 + i * 18, 15, 5, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = '#a9a8a0'; g.font = `500 15px ${MONO}`; g.fillText('train.py — wall-e', 78, 20);
    g.font = `500 15px ${MONO}`;
    lines.forEach((l, i) => { g.fillStyle = l.color; g.fillText(l.line, 16, 56 + i * 21); });
    // reward curve
    const x0 = 360, y0 = 250, w = 260, h = 130;
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.strokeRect(x0, y0, w, h);
    g.fillStyle = '#7f7e78'; g.font = `500 12px ${MONO}`; g.fillText('episode return', x0 + 6, y0 - 6);
    g.strokeStyle = '#f2b630'; g.lineWidth = 2.5; g.beginPath();
    returns.forEach((v, i) => {
      const x = x0 + (i / 119) * w, y = y0 + h - Math.max(0, Math.min(1, v / 360)) * h;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.stroke();
    g.fillStyle = (Math.floor(performance.now() / 500) % 2) ? '#e9e4d7' : 'transparent';
    g.fillRect(16, 56 + lines.length * 21 - 13, 9, 16);
    tex.needsUpdate = true;
  }
  for (let i = 0; i < 60; i++) step();
  return { texture: tex, step, push, draw };
}
