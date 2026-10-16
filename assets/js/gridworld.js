// Playground: tabular Q-learning. WALL·E learns his way to the plant.
const W = 11, H = 7, A = 4, CELL = 56;
const MOVES = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up, right, down, left
const START = [0, 3], GOAL = [10, 3];
const DEFAULT_TRASH = [[3, 1], [3, 2], [3, 3], [3, 4], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6], [8, 0], [8, 1], [8, 2]];
const MAX_STEPS = 250;

// 12 × 12 pixel sprites
const SPRITES = {
  walle: [
    '............',
    '.GGG....GGG.',
    'GKKWG..GKKWG',
    'GKKKG..GKKKG',
    '.GGG.GG.GGG.',
    '.....GG.....',
    '.YYYYYYYYYY.',
    '.YdYYYYYYYY.',
    '.YdYYoooYYY.',
    '.YYYYYYYYYY.',
    'TTTTTTTTTTTT',
    'TtTtTtTtTtTT',
  ],
  plant: [
    '.......L....',
    '....LL.LLL..',
    '.....LLLL...',
    '.......L....',
    '.......L....',
    '....BBBBB...',
    '....BbBBB...',
    '....BbBBB...',
    '....BBBBB...',
    '....BBBBBBB.',
    '...BBBBBBBBB',
    '...SSSSSSSSS',
  ],
  trash: [
    '............',
    '.CCCCCCCCCC.',
    '.CaaCCbCCaC.',
    '.CCCCbbCCCC.',
    '.CbCCCCaaCC.',
    '.CCCaCCCCbC.',
    '.CCCCCbCCCC.',
    '.CaCCCCCCaC.',
    '.CCbbCaCCCC.',
    '.CCCCCCCbCC.',
    '.CCCCCCCCCC.',
    '............',
  ],
};
const PAL = {
  G: '#a2a6ab', K: '#101114', W: '#ffffff', Y: '#f2b630', d: '#4a3a10', o: '#2c2a26', T: '#3b3c3f', t: '#6b6c70',
  L: '#7fd04a', B: '#7a4a26', b: '#a26a3c', S: '#2a1a10',
  C: '#7a6e60', a: '#a0522d',
};
const TRASH_PAL = { ...PAL, b: '#4f5a62' };

function drawSprite(g, rows, x, y, scale = 4, pal = PAL) {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const ch = rows[r][c];
      if (ch === '.') continue;
      g.fillStyle = pal[ch];
      g.fillRect(x + c * scale, y + r * scale, scale, scale);
    }
  }
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const BASE = [16, 21, 34], MID = [31, 111, 158], HOT = [242, 182, 48];

export function initGridworld(root, { onGoal, onStart } = {}) {
  const cv = root.querySelector('#gw-canvas');
  const g = cv.getContext('2d');
  const curve = root.querySelector('#gw-curve');
  const cg = curve.getContext('2d');
  const $ = (id) => root.querySelector(id);
  const ui = { ep: $('#gw-ep'), steps: $('#gw-steps'), eps: $('#gw-eps'), best: $('#gw-best'), mode: $('#gw-mode') };
  const btn = (k) => root.querySelector(`[data-gw="${k}"]`);

  const trash = new Uint8Array(W * H);
  DEFAULT_TRASH.forEach(([x, y]) => { trash[y * W + x] = 1; });
  let Q = new Float32Array(W * H * A);
  let visited = new Uint8Array(W * H);
  let eps = 0.3;
  const alpha = 0.5, gamma = 0.95;
  let pos = [...START], steps = 0, episode = 0, best = null;
  const history = [];
  let mode = 'idle'; // idle | train | watch
  let turbo = false, arrows = true;
  let trail = [];
  let watchClock = 0;
  let celebrate = 0;

  const isGoal = (x, y) => x === GOAL[0] && y === GOAL[1];
  const isStart = (x, y) => x === START[0] && y === START[1];

  function envStep(x, y, a) {
    const nx = x + MOVES[a][0], ny = y + MOVES[a][1];
    if (nx < 0 || ny < 0 || nx >= W || ny >= H || trash[ny * W + nx]) return { x, y, r: -0.05, done: false };
    if (isGoal(nx, ny)) return { x: nx, y: ny, r: 1, done: true };
    return { x: nx, y: ny, r: -0.01, done: false };
  }

  function greedy(s) {
    let best = -Infinity, pick = [];
    for (let a = 0; a < A; a++) {
      const q = Q[s * A + a];
      if (q > best + 1e-9) { best = q; pick = [a]; } else if (Math.abs(q - best) <= 1e-9) pick.push(a);
    }
    return pick[(Math.random() * pick.length) | 0];
  }
  const maxQ = (s) => Math.max(Q[s * A], Q[s * A + 1], Q[s * A + 2], Q[s * A + 3]);

  function trainStep() {
    const s = pos[1] * W + pos[0];
    const a = Math.random() < eps ? (Math.random() * A) | 0 : greedy(s);
    const res = envStep(pos[0], pos[1], a);
    const s2 = res.y * W + res.x;
    const target = res.r + (res.done ? 0 : gamma * maxQ(s2));
    Q[s * A + a] += alpha * (target - Q[s * A + a]);
    visited[s] = 1;
    pos = [res.x, res.y];
    steps++;
    if (res.done || steps >= MAX_STEPS) endEpisode(res.done);
  }

  function greedyPath() {
    let x = START[0], y = START[1];
    const seen = new Set();
    for (let i = 0; i < 80; i++) {
      const s = y * W + x;
      if (seen.has(s) || !visited[s]) return null;
      seen.add(s);
      const res = envStep(x, y, greedyDet(s));
      if (res.done) return i + 1;
      x = res.x; y = res.y;
    }
    return null;
  }
  function greedyDet(s) {
    let b = 0;
    for (let a = 1; a < A; a++) if (Q[s * A + a] > Q[s * A + b]) b = a;
    return b;
  }

  function endEpisode(success) {
    episode++;
    if (history.length < 20000) history.push(success ? steps : MAX_STEPS);
    eps = Math.max(0.03, eps * 0.97);
    best = greedyPath(); // length of the route WALL·E would take right now, if he has one
    pos = [...START];
    steps = 0;
    syncStats(success ? history[history.length - 1] : null);
  }

  function syncStats(lastSteps) {
    ui.ep.textContent = String(episode);
    if (lastSteps !== undefined) ui.steps.textContent = lastSteps === null ? 'timed out' : String(lastSteps);
    ui.eps.textContent = eps.toFixed(2);
    ui.best.textContent = best === null ? '—' : `${best} steps`;
  }

  function setMode(m, label) {
    mode = m;
    ui.mode.textContent = label || (m === 'train' ? 'training…' : m === 'watch' ? 'watching' : 'idle');
    btn('train').setAttribute('aria-pressed', String(m === 'train'));
    btn('train').innerHTML = m === 'train' ? '&#10074;&#10074; Pause' : '&#9654; Train';
    if (m !== 'idle') { onStart?.(); loop(); }
  }

  // ---------------------------------------------------------------- drawing
  function draw() {
    g.imageSmoothingEnabled = false;
    g.fillStyle = 'rgb(16,21,34)';
    g.fillRect(0, 0, cv.width, cv.height);
    let vmax = 0.0001;
    for (let s = 0; s < W * H; s++) if (visited[s]) vmax = Math.max(vmax, maxQ(s));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const s = y * W + x;
        const px = x * CELL, py = y * CELL;
        if (visited[s] && !trash[s]) {
          const v = Math.max(0, maxQ(s)) / vmax;
          const col = v < 0.5 ? mix(BASE, MID, v * 2) : mix(MID, HOT, (v - 0.5) * 2);
          g.fillStyle = `rgb(${col})`;
          g.fillRect(px, py, CELL, CELL);
        }
        g.strokeStyle = 'rgba(255,255,255,.07)';
        g.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);
        if (trash[s]) drawSprite(g, SPRITES.trash, px + 4, py + 4, 4, TRASH_PAL);
        else if (arrows && visited[s] && !isGoal(x, y)) drawArrow(px, py, greedyDet(s));
      }
    }
    // start pad
    g.strokeStyle = 'rgba(242,182,48,.7)';
    g.setLineDash([4, 4]);
    g.strokeRect(START[0] * CELL + 3.5, START[1] * CELL + 3.5, CELL - 7, CELL - 7);
    g.setLineDash([]);
    // trail while watching
    if (trail.length > 1) {
      g.strokeStyle = 'rgba(255,255,255,.55)';
      g.lineWidth = 3;
      g.beginPath();
      trail.forEach(([x, y], i) => { const cx = x * CELL + CELL / 2, cy = y * CELL + CELL / 2; i ? g.lineTo(cx, cy) : g.moveTo(cx, cy); });
      g.stroke();
      g.lineWidth = 1;
    }
    const bob = celebrate > 0 ? Math.round(Math.abs(Math.sin(celebrate * 18)) * -6) : 0;
    drawSprite(g, SPRITES.plant, GOAL[0] * CELL + 4, GOAL[1] * CELL + 4 + (celebrate > 0 ? bob : 0));
    drawSprite(g, SPRITES.walle, pos[0] * CELL + 4, pos[1] * CELL + 4 + bob);
    if (celebrate > 0) {
      g.fillStyle = '#ffe680';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + celebrate * 3, r = 24 + (1 - celebrate) * 30;
        g.fillRect(GOAL[0] * CELL + CELL / 2 + Math.cos(a) * r - 3, GOAL[1] * CELL + CELL / 2 + Math.sin(a) * r - 3, 6, 6);
      }
    }
    drawCurve();
  }

  function drawArrow(px, py, a) {
    const cx = px + CELL / 2, cy = py + CELL / 2;
    g.save();
    g.translate(cx, cy);
    g.rotate((a * Math.PI) / 2);
    g.fillStyle = 'rgba(255,255,255,.5)';
    g.beginPath();
    g.moveTo(0, -10); g.lineTo(7, 2); g.lineTo(2, 2); g.lineTo(2, 9); g.lineTo(-2, 9); g.lineTo(-2, 2); g.lineTo(-7, 2);
    g.closePath();
    g.fill();
    g.restore();
  }

  function drawCurve() {
    const w = curve.width, h = curve.height;
    cg.fillStyle = '#fff';
    cg.fillRect(0, 0, w, h);
    cg.strokeStyle = '#e4dfd2';
    for (let y = 16; y < h; y += 16) { cg.beginPath(); cg.moveTo(0, y + 0.5); cg.lineTo(w, y + 0.5); cg.stroke(); }
    cg.fillStyle = '#4d4c47';
    cg.font = '600 11px "IBM Plex Mono", monospace';
    cg.fillText('steps to plant per episode ↓ is better', 8, 13);
    if (history.length < 2) return;
    // average into buckets so the whole run fits, from the clueless start to now
    const n = Math.min(history.length, 150);
    const per = history.length / n;
    const max = Math.log(MAX_STEPS + 1);
    cg.strokeStyle = '#7a5200';
    cg.lineWidth = 2;
    cg.beginPath();
    for (let b = 0; b < n; b++) {
      const from = Math.floor(b * per), to = Math.max(from + 1, Math.floor((b + 1) * per));
      let sum = 0;
      for (let i = from; i < to; i++) sum += history[i];
      const v = sum / (to - from);
      const x = (b / Math.max(1, n - 1)) * (w - 12) + 6;
      const y = 18 + (Math.log(v + 1) / max) * (h - 24);
      b ? cg.lineTo(x, y) : cg.moveTo(x, y);
    }
    cg.stroke();
  }

  // ------------------------------------------------------------------- loop
  let raf = 0, last = 0, onScreen = true;
  function loop() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (mode === 'train') {
      const n = turbo ? 800 : 2;
      for (let i = 0; i < n; i++) trainStep();
    } else if (mode === 'watch') {
      watchClock += dt;
      if (watchClock > 0.12) {
        watchClock = 0;
        const s = pos[1] * W + pos[0];
        const res = envStep(pos[0], pos[1], visited[s] ? greedyDet(s) : (Math.random() * A) | 0);
        pos = [res.x, res.y];
        trail.push([...pos]);
        if (res.done) {
          celebrate = 1;
          setMode('idle', 'plant found!');
          onGoal?.(trail.length - 1);
        } else if (trail.length > 60) {
          setMode('idle', 'lost. train me more!');
        }
      }
    }
    if (celebrate > 0) celebrate = Math.max(0, celebrate - dt * 0.8);
    draw();
    if (onScreen && (mode !== 'idle' || celebrate > 0)) raf = requestAnimationFrame(frame);
  }

  new IntersectionObserver((es) => {
    onScreen = es[0].isIntersecting;
    if (onScreen && mode !== 'idle') loop();
  }).observe(root);

  // ------------------------------------------------------------------- input
  btn('train').addEventListener('click', () => {
    if (mode === 'train') { setMode('idle', 'paused'); return; }
    trail = [];
    pos = [...START];
    steps = 0;
    setMode('train');
  });
  btn('watch').addEventListener('click', () => {
    pos = [...START];
    steps = 0;
    trail = [[...pos]];
    watchClock = 0;
    setMode('watch');
  });
  btn('speed').addEventListener('click', () => {
    turbo = !turbo;
    btn('speed').setAttribute('aria-pressed', String(turbo));
  });
  btn('arrows').addEventListener('click', () => {
    arrows = !arrows;
    btn('arrows').setAttribute('aria-pressed', String(arrows));
    draw();
  });
  btn('reset').addEventListener('click', () => {
    Q = new Float32Array(W * H * A);
    visited = new Uint8Array(W * H);
    eps = 0.3; episode = 0; best = null; history.length = 0; trail = [];
    pos = [...START]; steps = 0;
    ui.steps.textContent = '—';
    syncStats();
    setMode('idle', 'fresh start');
    draw();
  });

  let paint = null;
  function cellAt(e) {
    const r = cv.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * W);
    const y = Math.floor(((e.clientY - r.top) / r.height) * H);
    return x >= 0 && y >= 0 && x < W && y < H ? [x, y] : null;
  }
  function toggle(c, value) {
    const [x, y] = c;
    if (isStart(x, y) || isGoal(x, y)) return;
    const s = y * W + x;
    if (trash[s] === value) return;
    trash[s] = value;
    eps = Math.max(eps, 0.2); // the world changed: explore a bit again
    best = null;
    syncStats();
    draw();
  }
  cv.addEventListener('pointerdown', (e) => {
    const c = cellAt(e);
    if (!c) return;
    paint = trash[c[1] * W + c[0]] ? 0 : 1;
    cv.setPointerCapture(e.pointerId);
    toggle(c, paint);
  });
  cv.addEventListener('pointermove', (e) => { if (paint !== null) { const c = cellAt(e); if (c) toggle(c, paint); } });
  cv.addEventListener('pointerup', () => { paint = null; });
  cv.addEventListener('pointercancel', () => { paint = null; });

  syncStats();
  draw();
}
