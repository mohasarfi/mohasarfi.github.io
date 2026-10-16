// Everything on (and around) the desk that isn't a crew member.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mesh, group, rod, led, smooth, lerp, clamp } from './kit.js';
import {
  woodTexture, matTexture, wallTexture, spaceTexture, corkTexture, noteTexture, bookCover, pagesTexture,
  trashTexture, stickerTexture, keyboardTexture, createTerminal,
} from './textures.js';

const box = (w, h, d, r = 0.02, s = 3) => new RoundedBoxGeometry(w, h, d, s, r);

export function buildRoom(scene) {
  const wood = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.62, metalness: 0.05, envMapIntensity: 0.4 });
  const desk = mesh(new THREE.BoxGeometry(14, 0.3, 5.6), wood, { pos: [0, -0.15, 0.2] });
  scene.add(desk);

  const mat = mesh(new THREE.PlaneGeometry(7.6, 3.8), new THREE.MeshStandardMaterial({ map: matTexture(), roughness: 0.85, envMapIntensity: 0.3 }), { pos: [0, 0.003, 0.45], rot: [-Math.PI / 2, 0, 0], cast: false });
  scene.add(mat);

  const wall = mesh(new THREE.PlaneGeometry(40, 16), new THREE.MeshStandardMaterial({ map: wallTexture(), roughness: 0.95, envMapIntensity: 0.2 }), { pos: [0, 6, -2.6], cast: false });
  scene.add(wall);

  // porthole to space
  const port = group(scene, [2.35, 2.55, -2.56]);
  const space = new THREE.MeshBasicMaterial({ map: spaceTexture(), color: new THREE.Color(1.15, 1.15, 1.2) });
  port.add(mesh(new THREE.CircleGeometry(0.86, 64), space, { cast: false }));
  const steel = new THREE.MeshStandardMaterial({ color: 0x5c6470, roughness: 0.35, metalness: 0.85, envMapIntensity: 1 });
  port.add(mesh(new THREE.TorusGeometry(0.9, 0.1, 20, 80), steel));
  port.add(mesh(new THREE.TorusGeometry(1.06, 0.04, 12, 80), steel));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    port.add(mesh(new THREE.SphereGeometry(0.035, 10, 8), steel, { pos: [Math.cos(a) * 1.04, Math.sin(a) * 1.04, 0.05] }));
  }

  // pinboard with research notes
  const board = group(scene, [-1.45, 2.3, -2.56]);
  board.add(mesh(box(2.0, 1.22, 0.06, 0.02), new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 0.7 })));
  board.add(mesh(new THREE.PlaneGeometry(1.88, 1.1), new THREE.MeshStandardMaterial({ map: corkTexture(), roughness: 0.95 }), { pos: [0, 0, 0.032], cast: false }));
  const notes = [
    { lines: ['Q(s,a) ←', 'r + γ·max Q'], bg: '#ffe680', pos: [-0.58, 0.18], rot: 0.06 },
    { lines: ['reward =', 'curiosity?'], bg: '#ffb3c7', pos: [0.02, 0.24], rot: -0.08 },
    { lines: ['sim → real', '(be brave)'], bg: '#a8dcff', pos: [0.6, 0.12], rot: 0.05 },
    { lines: ['v0.1'], bg: '#c9f2a1', pos: [-0.2, -0.28], rot: -0.04, doodle: true },
    { lines: ['imagine', 'then act'], bg: '#ffffff', pos: [0.45, -0.3], rot: 0.09 },
  ];
  const pin = new THREE.MeshStandardMaterial({ color: 0xd8322b, roughness: 0.3 });
  notes.forEach((n, i) => {
    const m = mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshStandardMaterial({ map: noteTexture(n.lines, { bg: n.bg, doodle: n.doodle }), roughness: 0.9 }), { pos: [n.pos[0], n.pos[1], 0.04 + i * 0.002], rot: [0, 0, n.rot], cast: false });
    board.add(m);
    board.add(mesh(new THREE.SphereGeometry(0.025, 10, 8), pin, { pos: [n.pos[0], n.pos[1] + 0.17, 0.07] }));
  });

  return { desk, mat };
}

/* ------------------------------------------------------------------------ */
/*  A Luxo-style desk lamp (and its light)                                  */
/* ------------------------------------------------------------------------ */
export function buildLamp(scene, at, aimAt) {
  const root = group(scene, at);
  const metal = new THREE.MeshStandardMaterial({ color: 0xd9dbdd, roughness: 0.32, metalness: 0.65, envMapIntensity: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.4, metalness: 0.6 });
  root.add(mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.06, 32), metal, { pos: [0, 0.03, 0] }));
  const dir = new THREE.Vector3(aimAt[0] - at[0], 0, aimAt[2] - at[2]).normalize();
  const p0 = new THREE.Vector3(0, 0.08, 0);
  const p1 = new THREE.Vector3().copy(dir).multiplyScalar(-0.25).setY(1.45);
  const p2 = new THREE.Vector3().copy(dir).multiplyScalar(0.8).setY(2.15);
  [p0, p1, p2].forEach((p) => root.add(mesh(new THREE.SphereGeometry(0.05, 14, 10), dark, { pos: [p.x, p.y, p.z] })));
  for (const off of [-0.035, 0.035]) {
    const o = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(off);
    root.add(rod(p0.clone().add(o), p1.clone().add(o), 0.016, metal));
    root.add(rod(p1.clone().add(o), p2.clone().add(o), 0.016, metal));
  }
  // springs
  root.add(rod(p0.clone().lerp(p1, 0.15).setY(0.35), p0.clone().lerp(p1, 0.75), 0.022, dark));

  const target = new THREE.Vector3(aimAt[0] - at[0], aimAt[1] - at[1], aimAt[2] - at[2]);
  const lightDir = target.clone().sub(p2).normalize();
  const shade = group(root, [p2.x, p2.y, p2.z]);
  shade.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), lightDir);
  const coneGeo = new THREE.CylinderGeometry(0.1, 0.32, 0.38, 40, 1, true);
  coneGeo.translate(0, -0.19, 0);
  shade.add(mesh(coneGeo, new THREE.MeshStandardMaterial({ color: 0xd9dbdd, roughness: 0.3, metalness: 0.6, side: THREE.DoubleSide })));
  shade.add(mesh(new THREE.SphereGeometry(0.11, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), metal, { pos: [0, 0.02, 0] }));
  shade.add(mesh(new THREE.SphereGeometry(0.085, 20, 14), led(0xffe2b0, 3), { pos: [0, -0.2, 0], cast: false, receive: false }));

  const bulb = new THREE.Vector3(0, -0.24, 0);
  shade.updateMatrixWorld(true);
  const spot = new THREE.SpotLight(0xffd29a, 34, 0, 0.8, 0.6, 1.5);
  spot.position.copy(shade.localToWorld(bulb.clone()));
  spot.target.position.set(aimAt[0], aimAt[1], aimAt[2]);
  spot.castShadow = true;
  spot.shadow.bias = -0.0004;
  spot.shadow.normalBias = 0.02;
  scene.add(spot, spot.target);
  return { root, spot };
}

/* ------------------------------------------------------------------------ */
/*  Laptop with a live training run                                         */
/* ------------------------------------------------------------------------ */
export function buildLaptop(scene, at, rotY) {
  const root = group(scene, at, [0, rotY, 0]);
  root.userData.crew = 'laptop';
  const alu = new THREE.MeshStandardMaterial({ color: 0xb9bdc4, roughness: 0.32, metalness: 0.85, envMapIntensity: 0.9 });
  root.add(mesh(box(1.36, 0.05, 0.92, 0.02), alu, { pos: [0, 0.025, 0] }));
  root.add(mesh(new THREE.PlaneGeometry(1.24, 0.62), new THREE.MeshStandardMaterial({ map: keyboardTexture(), roughness: 0.6, metalness: 0.3 }), { pos: [0, 0.051, 0.06], rot: [-Math.PI / 2, 0, 0], cast: false }));
  const lid = group(root, [0, 0.05, -0.45], [-0.28, 0, 0]);
  lid.add(mesh(box(1.36, 0.9, 0.035, 0.02), alu, { pos: [0, 0.45, -0.018] }));
  const term = createTerminal();
  const screen = mesh(new THREE.PlaneGeometry(1.24, 0.775), new THREE.MeshBasicMaterial({ map: term.texture, color: new THREE.Color(1.25, 1.25, 1.25) }), { pos: [0, 0.465, 0.001], cast: false });
  lid.add(screen);
  const glow = new THREE.PointLight(0x8fbaff, 2.2, 3.2, 2);
  glow.position.set(0, 0.5, 0.45);
  lid.add(glow);
  return { root, term, screen };
}

/* ------------------------------------------------------------------------ */
/*  ARM-01: a small white research arm doing pick-and-place on loop         */
/* ------------------------------------------------------------------------ */
export function buildArm(scene, at, spots) {
  const root = group(scene, at);
  root.userData.crew = 'arm';
  const white = new THREE.MeshPhysicalMaterial({ color: 0xe4e4e0, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.35, envMapIntensity: 0.6 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.45, metalness: 0.3 });
  const L1 = 0.56, L2 = 0.5, G = 0.15, H0 = 0.31;

  root.add(mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.07, 36), black, { pos: [0, 0.035, 0] }));
  const yaw = group(root, [0, 0.07, 0]);
  yaw.add(mesh(new THREE.CylinderGeometry(0.115, 0.135, 0.18, 32), white, { pos: [0, 0.09, 0] }));
  yaw.add(mesh(new THREE.TorusGeometry(0.12, 0.008, 8, 48), led(0x5cc8ff, 2), { pos: [0, 0.03, 0], rot: [Math.PI / 2, 0, 0], cast: false }));
  const shoulder = group(yaw, [0, H0 - 0.07, 0]);
  shoulder.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.17, 28), black, { rot: [Math.PI / 2, 0, 0] }));
  shoulder.add(mesh(box(L1, 0.09, 0.1, 0.035), white, { pos: [L1 / 2, 0, 0] }));
  const elbow = group(shoulder, [L1, 0, 0]);
  elbow.add(mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.15, 28), black, { rot: [Math.PI / 2, 0, 0] }));
  elbow.add(mesh(box(L2, 0.075, 0.085, 0.03), white, { pos: [L2 / 2, 0, 0] }));
  const wrist = group(elbow, [L2, 0, 0]);
  wrist.add(mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.12, 24), black, { rot: [Math.PI / 2, 0, 0] }));
  wrist.add(mesh(box(0.07, 0.06, 0.12, 0.015), black, { pos: [0.06, 0, 0] }));
  const fingers = [-1, 1].map((s) => {
    const f = mesh(box(0.07, 0.022, 0.022, 0.006), white, { pos: [0.125, 0, 0.04 * s] });
    wrist.add(f);
    return f;
  });
  const tip = group(wrist, [G, 0, 0]);

  const cube = mesh(box(0.12, 0.12, 0.12, 0.012), new THREE.MeshStandardMaterial({ map: stickerTexture(), roughness: 0.35 }));
  scene.add(cube);

  const base = new THREE.Vector3(at[0], at[1], at[2]);
  const A = new THREE.Vector3(...spots[0]);
  const B = new THREE.Vector3(...spots[1]);
  const home = A.clone().lerp(B, 0.5).lerp(base, 0.25).setY(0.55);
  cube.position.copy(A);

  function solve(p, grip) {
    const dx = p.x - base.x, dz = p.z - base.z;
    const r = Math.hypot(dx, dz);
    yaw.rotation.y = Math.atan2(-dz, dx);
    const wx = r, wy = p.y - base.y - H0 + G;
    const d = Math.min(Math.hypot(wx, wy), L1 + L2 - 1e-3);
    const a2 = -Math.acos(clamp((d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1));
    const a1 = Math.atan2(wy, wx) - Math.atan2(L2 * Math.sin(a2), L1 + L2 * Math.cos(a2));
    shoulder.rotation.z = a1;
    elbow.rotation.z = a2;
    wrist.rotation.z = -Math.PI / 2 - a1 - a2;
    fingers.forEach((f, i) => { f.position.z = (i ? 1 : -1) * lerp(0.085, 0.07, grip); });
  }

  // a looping script of straight-line moves
  let from = A, to = B;
  let k = 0, t = 0;
  let holding = false;
  const up = (v) => v.clone().setY(0.42);
  function plan() {
    return [
      { d: 1.0, a: home, b: up(from), g: [0, 0] },
      { d: 0.6, a: up(from), b: from, g: [0, 0] },
      { d: 0.35, a: from, b: from, g: [0, 1], end: 'grab' },
      { d: 0.6, a: from, b: up(from), g: [1, 1] },
      { d: 1.3, a: up(from), b: up(to), g: [1, 1] },
      { d: 0.6, a: up(to), b: to, g: [1, 1] },
      { d: 0.35, a: to, b: to, g: [1, 0], end: 'drop' },
      { d: 0.6, a: to, b: up(to), g: [0, 0] },
      { d: 1.0, a: up(to), b: home, g: [0, 0] },
      { d: 1.4, a: home, b: home, g: [0, 0], end: 'swap' },
    ];
  }
  let steps = plan();
  const p = new THREE.Vector3();
  let speed = 1;
  solve(home, 0);

  function update(dt) {
    t += dt * speed;
    let s = steps[k];
    while (t >= s.d) {
      t -= s.d;
      solve(s.b, s.g[1]);
      root.updateMatrixWorld(true);
      if (s.end === 'grab') { tip.attach(cube); holding = true; }
      if (s.end === 'drop') { scene.attach(cube); holding = false; cube.position.y = A.y; }
      if (s.end === 'swap') { [from, to] = [to, from]; steps = plan(); }
      k = (k + 1) % steps.length;
      s = steps[k];
    }
    const e = smooth(t / s.d);
    p.copy(s.a).lerp(s.b, e);
    solve(p, lerp(s.g[0], s.g[1], e));
  }
  return {
    root, anchor: tip, update,
    act() { speed = 2.4; setTimeout(() => { speed = 1; }, 2600); return holding ? 'ARM-01: cube secured. Sim-to-real gap: 0.3 mm.' : 'ARM-01: pick, place, repeat.'; },
  };
}

/* ------------------------------------------------------------------------ */
/*  Small stuff                                                             */
/* ------------------------------------------------------------------------ */
export function buildPlantBoot(scene, at, rotY = 0) {
  const root = group(scene, at, [0, rotY, 0]);
  root.scale.setScalar(1.25);
  const leather = new THREE.MeshStandardMaterial({ color: 0x5b3920, roughness: 0.75 });
  const sole = new THREE.MeshStandardMaterial({ color: 0x241811, roughness: 0.9 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x6fbf3a, roughness: 0.55, emissive: 0x112a05 });
  root.add(mesh(box(0.2, 0.04, 0.34, 0.015), sole, { pos: [0, 0.02, 0.03] }));
  root.add(mesh(box(0.19, 0.13, 0.3, 0.05), leather, { pos: [0, 0.1, 0.04] }));
  root.add(mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.27, 24), leather, { pos: [0, 0.26, -0.05] }));
  root.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 20), sole, { pos: [0, 0.39, -0.05] }));
  root.add(mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.16, 8), leaf, { pos: [0, 0.47, -0.05] }));
  root.add(mesh(new THREE.SphereGeometry(1, 16, 10), leaf, { pos: [0.04, 0.53, -0.05], rot: [0, 0, -0.5], scale: [0.05, 0.012, 0.03] }));
  root.add(mesh(new THREE.SphereGeometry(1, 16, 10), leaf, { pos: [-0.035, 0.55, -0.05], rot: [0, 0.3, 0.6], scale: [0.045, 0.011, 0.028] }));
  return root;
}

export function buildTrash(scene, at) {
  const root = group(scene, at, [0, 0.4, 0]);
  const s = 0.3;
  const mats = [3, 8, 13].map((seed) => new THREE.MeshStandardMaterial({ map: trashTexture(seed), roughness: 0.85, metalness: 0.2 }));
  root.add(mesh(box(s, s, s, 0.02), mats[0], { pos: [0, s / 2, 0] }));
  root.add(mesh(box(s, s, s, 0.02), mats[1], { pos: [s + 0.02, s / 2, 0.04], rot: [0, 0.2, 0] }));
  root.add(mesh(box(s, s, s, 0.02), mats[2], { pos: [0.16, s * 1.5, 0.02], rot: [0, -0.3, 0] }));
  return root;
}

export function buildBooks(scene, at, rotY) {
  const root = group(scene, at, [0, rotY, 0]);
  const pages = new THREE.MeshStandardMaterial({ map: pagesTexture(), roughness: 0.9 });
  const make = (w, h, d, cover, spine) => {
    const coverMat = new THREE.MeshStandardMaterial({ map: cover, roughness: 0.6 });
    const spineMat = new THREE.MeshStandardMaterial({ color: spine, roughness: 0.6 });
    return mesh(new THREE.BoxGeometry(w, h, d), [pages, spineMat, coverMat, spineMat, pages, pages]);
  };
  const rl = make(0.95, 0.1, 0.72, bookCover(['REINFORCEMENT', 'LEARNING'], 'an introduction', 'SUTTON & BARTO', { bg: '#1d3557', fg: '#f1faee', accent: '#e9c46a' }), 0x1d3557);
  rl.position.y = 0.05;
  root.add(rl);
  const pr = make(0.86, 0.09, 0.64, bookCover(['PROBABILISTIC', 'ROBOTICS'], '', 'THRUN · BURGARD · FOX', { bg: '#7a1f1f', fg: '#fff6e6', accent: '#e8e4da' }), 0x7a1f1f);
  pr.position.set(0.03, 0.145, -0.02);
  pr.rotation.y = 0.18;
  root.add(pr);
  return root;
}

// the bouncing ball from the lamp short, because of course
export function buildBall(scene, at) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#f5c518'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#2f6fd1'; g.fillRect(0, 56, 256, 16);
  g.fillStyle = '#d8322b';
  const star = (cx, cy, r) => {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.5);
    }
    g.fill();
  };
  star(64, 30, 26); star(192, 30, 26);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const r = 0.14;
  const ball = mesh(new THREE.SphereGeometry(r, 32, 24), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.25, clearcoat: 0.8 }), { pos: [at[0], r, at[2]] });
  ball.userData.crew = 'ball';
  scene.add(ball);
  let t = Infinity;
  return {
    root: ball,
    act() { t = 0; return null; },
    update(dt) {
      t += dt;
      const bounce = t < 2.4 ? Math.abs(Math.sin(t * 5.2)) * 0.5 * Math.exp(-t * 1.3) : 0;
      ball.position.y = r + bounce;
      ball.rotation.z -= t < 2.4 ? dt * 4 : 0;
      ball.position.x = at[0] + (t < 2.4 ? Math.sin(t * 1.2) * 0.12 : ball.position.x - at[0]);
    },
  };
}

export function buildDust(scene, count = 220) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = -3.4 + Math.random() * 3.6;
    pos[i * 3 + 1] = 0.2 + Math.random() * 2.2;
    pos[i * 3 + 2] = -1.4 + Math.random() * 2.8;
    seed[i] = Math.random() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffd9a0, size: 0.018, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  const base = pos.slice();
  return (t) => {
    for (let i = 0; i < count; i++) {
      const s = seed[i];
      pos[i * 3] = base[i * 3] + Math.sin(t * 0.13 + s) * 0.18;
      pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.09 + s * 1.7) * 0.22;
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.11 + s) * 0.16;
    }
    geo.attributes.position.needsUpdate = true;
  };
}
