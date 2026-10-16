// The crew: WALL·E, EVE, Baymax and Buzz, built from primitives as little desk figures.
// Each one is a fan-made homage, not an official model.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  mesh, group, lathe, ellipsoidPatch, recenter, led, aim, envelope, springy, damp, smooth, lerp,
} from './kit.js';
import { rustTexture, treadTexture, chargeMeterTexture, plateTexture } from './textures.js';

const box = (w, h, d, r = 0.02, s = 3) => new RoundedBoxGeometry(w, h, d, s, r);
const sphere = (r = 1, w = 40, h = 28) => new THREE.SphereGeometry(r, w, h);

class Crew {
  constructor(name, lines) {
    this.name = name;
    this.lines = lines;
    this.lineIdx = 0;
    this.actT = 1e6; // seconds since the last click (finite: sin(Infinity) is NaN)
    this.look = {};
    this.root = new THREE.Group();
    this.root.userData.crew = name;
    this.anchor = new THREE.Object3D(); // where speech bubbles point
  }
  act() {
    this.actT = 0;
    const line = this.lines[this.lineIdx % this.lines.length];
    this.lineIdx++;
    return line;
  }
  tick(dt) { this.actT += dt; }
}

/* ======================================================================== */
/*  EVE                                                                     */
/* ======================================================================== */
export function buildEve() {
  const c = new Crew('eve', [
    'Directive?',
    'Wall·e!',
    'Scanning… plant detected.',
    'Extraterrestrial Vegetation Evaluator, at your service.',
  ]);
  const white = new THREE.MeshPhysicalMaterial({
    color: 0xf7f7f4, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x020306, roughness: 0.06, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.3,
  });
  const eyeMat = led(0x6fdcff, 2.6);
  const happyMat = led(0x8fd14f, 2.6);

  const float = group(c.root);
  const body = mesh(lathe([
    [0, 0], [0.07, 0.035], [0.16, 0.14], [0.235, 0.3], [0.272, 0.47], [0.272, 0.6],
    [0.24, 0.69], [0.165, 0.752], [0.06, 0.783], [0, 0.79],
  ]), white);
  float.add(body);

  // head floats just above the body, like the real thing
  const head = group(float, [0, 1.0, 0]);
  const HR = [0.25, 0.2, 0.235];
  head.add(mesh(sphere(1, 64, 48), white, { scale: HR }));
  const visor = mesh(ellipsoidPatch(HR[0] * 1.006, HR[1] * 1.006, HR[2] * 1.006,
    (x, y, z) => z > 0.1 && (x / 0.82) ** 2 + ((y + 0.04) / 0.64) ** 2 < 1), glass, { cast: false });
  head.add(visor);

  const eyes = [];
  for (const s of [-1, 1]) {
    const cx = 0.34 * s, ang = 0.16 * -s;
    const geo = ellipsoidPatch(HR[0] * 1.014, HR[1] * 1.014, HR[2] * 1.014, (x, y, z) => {
      if (z < 0.3) return false;
      const dx = x - cx, dy = y - 0.03;
      const u = dx * Math.cos(ang) + dy * Math.sin(ang);
      const v = -dx * Math.sin(ang) + dy * Math.cos(ang);
      return (u / 0.2) ** 2 + (v / 0.12) ** 2 < 1;
    }, 160, 120);
    const center = recenter(geo);
    const e = mesh(geo, eyeMat, { cast: false, receive: false });
    e.position.copy(center);
    head.add(e);
    eyes.push(e);
  }

  // arms: long floating petals
  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = group(float, [0.318 * s, 0.68, 0]);
    pivot.add(mesh(sphere(1, 32, 24), white, { pos: [0.02 * s, -0.25, 0], rot: [0, 0, 0.05 * s], scale: [0.058, 0.27, 0.105] }));
    arms.push(pivot);
  }

  // scanner beam
  const beamPivot = group(head, [0, -0.02, 0.18]);
  const beamGeo = new THREE.ConeGeometry(0.42, 1.3, 40, 1, true);
  beamGeo.translate(0, -0.65, 0);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x5cc8ff, transparent: true, opacity: 0, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const beam = mesh(beamGeo, beamMat, { cast: false, receive: false });
  beamPivot.add(beam);
  beamPivot.rotation.x = -1.05;
  beam.visible = false;

  c.anchor.position.set(0, 1.32, 0);
  float.add(c.anchor);
  c.ring = 0.5;
  c.focusY = 0.9;

  let blinkAt = 2;
  c.update = (t, dt, target, calm) => {
    c.tick(dt);
    const a = c.actT;
    const amp = calm ? 0.2 : 1;
    float.position.y = 0.17 + Math.sin(t * 1.4) * 0.035 * amp + envelope(a, 0, 0.35, 1.4, 0.6) * 0.18;
    float.rotation.z = Math.sin(t * 0.9) * 0.03 * amp;
    // a happy twirl when poked
    float.rotation.y = smooth(a / 1.3) < 1 ? smooth(a / 1.3) * Math.PI * 2 : 0;
    arms.forEach((p, i) => {
      const s = i ? 1 : -1;
      const wave = envelope(a, 0.05, 0.3, 1.2, 0.5);
      p.rotation.x = Math.sin(t * 1.4 + i) * 0.06 * amp - wave * 0.3;
      p.rotation.z = s * (0.03 + Math.sin(t * 1.1 + i * 2) * 0.03 * amp + wave * 0.55);
    });
    aim(head, target, c.look, dt, { yaw: 0.55, pitch: 0.3, speed: 3 });
    // blink, or squint happily after a poke
    const happy = envelope(a, 0.2, 0.2, 2.2, 0.3);
    if (t > blinkAt) blinkAt = t + 2.5 + Math.random() * 3;
    const toBlink = blinkAt - t;
    const open = toBlink < 0.14 ? Math.abs(toBlink - 0.07) / 0.07 : 1;
    const found = c.lineIdx % c.lines.length === 3 && happy > 0.5; // "plant detected" glows green
    eyes.forEach((e) => {
      e.scale.y = lerp(Math.max(0.1, open), 0.45, happy);
      e.material = found ? happyMat : eyeMat;
    });
    // scan sweep
    const scan = envelope(a, 0.5, 0.25, 1.9, 0.3);
    beam.visible = scan > 0.01;
    beamMat.opacity = scan * 0.16;
    beamPivot.rotation.y = Math.sin(a * 5) * 0.35;
  };
  return c;
}

/* ======================================================================== */
/*  WALL·E                                                                  */
/* ======================================================================== */
export function buildWallE() {
  const c = new Crew('walle', [
    'Waaall·eee!',
    'Eee-vah?',
    '*whirr* …found a spork.',
    'Directive: find the plant. Help me in the Playground!',
  ]);
  const rust = new THREE.MeshStandardMaterial({ map: rustTexture(5), roughness: 0.7, metalness: 0.25, envMapIntensity: 0.5 });
  const hatch = new THREE.MeshStandardMaterial({ map: rustTexture(9), color: 0xd8c6a6, roughness: 0.78, metalness: 0.2, envMapIntensity: 0.4 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x9a9ea3, roughness: 0.38, metalness: 0.85, envMapIntensity: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.5, metalness: 0.7, envMapIntensity: 0.6 });
  const treadMat = new THREE.MeshStandardMaterial({ map: treadTexture(), roughness: 0.92, metalness: 0.1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x050507, roughness: 0.05, metalness: 0.3, clearcoat: 1, envMapIntensity: 1.4 });
  const iris = new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.3, metalness: 0.6 });

  // treads: an extruded side profile, one per side
  const shape = new THREE.Shape();
  shape.moveTo(-0.33, 0.05); shape.lineTo(0.33, 0.05); shape.lineTo(0.24, 0.27); shape.lineTo(-0.25, 0.34); shape.closePath();
  const tg = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.04, bevelSegments: 4, curveSegments: 6 });
  tg.rotateY(-Math.PI / 2);
  tg.computeBoundingBox();
  tg.translate(-(tg.boundingBox.min.x + tg.boundingBox.max.x) / 2, 0, 0);
  for (const s of [-1, 1]) {
    c.root.add(mesh(tg, treadMat, { pos: [0.36 * s, 0, 0] }));
    for (const [z, y, r] of [[-0.21, 0.13, 0.075], [0.02, 0.11, 0.068], [0.22, 0.12, 0.06], [-0.18, 0.28, 0.05]]) {
      c.root.add(mesh(new THREE.CylinderGeometry(r, r, 0.02, 22), metal, { pos: [0.435 * s, y, z], rot: [0, 0, Math.PI / 2] }));
    }
  }

  const body = group(c.root, [0, 0.13, 0]);
  body.add(mesh(box(0.58, 0.5, 0.5, 0.035), rust, { pos: [0, 0.25, 0] }));
  body.add(mesh(box(0.46, 0.27, 0.03, 0.01), hatch, { pos: [0, 0.18, 0.255] }));
  body.add(mesh(box(0.42, 0.012, 0.02, 0.004), dark, { pos: [0, 0.18, 0.272] }));
  const meter = new THREE.MeshStandardMaterial({ map: chargeMeterTexture(), emissiveMap: chargeMeterTexture(), emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.4 });
  body.add(mesh(new THREE.PlaneGeometry(0.065, 0.16), meter, { pos: [-0.2, 0.39, 0.252], cast: false }));
  const plate = new THREE.MeshStandardMaterial({ map: plateTexture('WALL·E', { bg: '#2c2a26', fg: '#e8dfc6' }), roughness: 0.5, metalness: 0.3 });
  body.add(mesh(new THREE.PlaneGeometry(0.2, 0.05), plate, { pos: [0.06, 0.41, 0.252], cast: false }));

  // arms
  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = group(body, [0.315 * s, 0.33, 0.06]);
    pivot.add(mesh(box(0.05, 0.06, 0.24, 0.012), dark, { pos: [0, 0, 0.11] }));
    pivot.add(mesh(box(0.03, 0.02, 0.07, 0.006), metal, { pos: [0, 0.018, 0.25] }));
    pivot.add(mesh(box(0.03, 0.02, 0.07, 0.006), metal, { pos: [0, -0.018, 0.25] }));
    pivot.rotation.x = 0.55;
    arms.push(pivot);
  }

  // neck and binocular head
  const neckBase = group(body, [0, 0.5, -0.08]);
  neckBase.add(mesh(box(0.11, 0.05, 0.09, 0.012), dark, { pos: [0, 0.02, 0] }));
  const neck = group(neckBase, [0, 0.04, 0]);
  neck.add(mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.24, 14), metal, { pos: [0, 0.12, 0] }));
  neck.add(mesh(sphere(0.034, 16, 12), dark, { pos: [0, 0.245, 0] }));
  const head = group(neck, [0, 0.27, 0.0]);
  head.add(mesh(box(0.06, 0.05, 0.07, 0.012), dark, { pos: [0, 0.0, -0.02] }));
  head.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.06, 10), dark, { pos: [0, 0.045, -0.01], rot: [0, 0, Math.PI / 2] }));
  const eyes = [];
  for (const s of [-1, 1]) {
    const eye = group(head, [0.088 * s, 0.06, 0.02], [0, 0, -0.17 * s]);
    eye.add(mesh(box(0.14, 0.12, 0.17, 0.03), metal));
    eye.add(mesh(new THREE.TorusGeometry(0.047, 0.011, 10, 32), dark, { pos: [0, 0, 0.088] }));
    eye.add(mesh(new THREE.CircleGeometry(0.047, 32), glass, { pos: [0, 0, 0.087], cast: false }));
    eye.add(mesh(new THREE.RingGeometry(0.015, 0.026, 28), iris, { pos: [0, 0, 0.089], cast: false }));
    eye.add(mesh(new THREE.CircleGeometry(0.008, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }), { pos: [0.017, 0.017, 0.09], cast: false }));
    eyes.push(eye);
  }

  c.anchor.position.set(0, 0.62, 0);
  head.add(c.anchor);
  c.ring = 0.52;
  c.focusY = 0.5;

  let quirkAt = 3, quirkEye = 0;
  c.update = (t, dt, target, calm) => {
    c.tick(dt);
    const a = c.actT;
    const cheer = envelope(a, 0, 0.25, 1.6, 0.5);
    const amp = calm ? 0.2 : 1;
    body.position.y = 0.13 + Math.abs(Math.sin(t * 3.2)) * 0.004 * amp + Math.abs(Math.sin(a * 14)) * 0.02 * cheer;
    c.root.rotation.z = Math.sin(a * 18) * 0.03 * cheer;
    neck.position.y = 0.04 + cheer * 0.07;
    neck.rotation.x = 0.18 - cheer * 0.1;
    arms.forEach((p) => { p.rotation.x = lerp(0.55, -1.9, cheer); });
    aim(head, target, c.look, dt, { yaw: 0.7, pitch: 0.35, speed: 4, pitchOffset: -0.18 + cheer * -0.25 });
    // the occasional curious eye tilt
    if (t > quirkAt) { quirkAt = t + 3 + Math.random() * 4; quirkEye = Math.random() < 0.5 ? 0 : 1; }
    const q = envelope(quirkAt - t, 0, 0.2, 0.8, 0.2);
    eyes.forEach((e, i) => {
      const s = i ? 1 : -1;
      e.rotation.z = -0.17 * s + (i === quirkEye ? q * 0.25 * s : 0) + cheer * 0.2 * s;
      e.position.y = 0.06 + (i === quirkEye ? q * 0.02 : 0) + cheer * 0.015;
    });
  };
  return c;
}

/* ======================================================================== */
/*  Baymax                                                                  */
/* ======================================================================== */
export function buildBaymax() {
  const c = new Crew('baymax', [
    'Hello. I am Baymax, your personal research companion.',
    'On a scale of 1 to 10, how would you rate your loss?',
    'I am not fast.',
    'Are you satisfied with your care?',
  ]);
  const soft = new THREE.MeshPhysicalMaterial({
    color: 0xf4f2ee, roughness: 0.48, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffffff),
    clearcoat: 0.25, clearcoatRoughness: 0.45, envMapIntensity: 0.7,
  });
  const black = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.3 });

  const torso = group(c.root);
  torso.add(mesh(lathe([
    [0, 0.1], [0.18, 0.118], [0.31, 0.18], [0.39, 0.29], [0.42, 0.43], [0.405, 0.58],
    [0.355, 0.71], [0.28, 0.82], [0.19, 0.9], [0.09, 0.95], [0, 0.965],
  ]), soft));

  // head with the famous dot-line-dot face
  const head = group(c.root, [0, 1.035, 0.01]);
  const skull = group(head);
  skull.scale.set(1.22, 0.8, 1.0);
  skull.add(mesh(sphere(0.13, 48, 32), soft));
  const R = 0.1308, half = 0.33;
  const line = new THREE.TorusGeometry(R, 0.005, 6, 40, half * 2);
  line.rotateX(Math.PI / 2);
  line.rotateY(half - Math.PI / 2);
  skull.add(mesh(line, black, { cast: false }));
  for (const s of [-1, 1]) {
    const e = mesh(sphere(0.021, 20, 14), black, { cast: false });
    e.position.set(-Math.sin(half) * R * s, 0, Math.cos(half) * R);
    e.scale.set(1 / 1.22, 1 / 0.8, 0.6);
    skull.add(e);
  }

  // puffy arms
  const armGeo = lathe([[0, -0.53], [0.065, -0.515], [0.083, -0.43], [0.098, -0.26], [0.112, -0.11], [0.1, -0.015], [0, 0.03]]);
  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = group(c.root, [0.285 * s, 0.82, 0]);
    pivot.add(mesh(armGeo, soft));
    pivot.add(mesh(sphere(1, 28, 20), soft, { pos: [0, -0.55, 0.005], scale: [0.072, 0.085, 0.062] }));
    pivot.add(mesh(sphere(1, 16, 12), soft, { pos: [-0.05 * s, -0.51, 0.03], scale: [0.026, 0.04, 0.026] }));
    pivot.rotation.z = 0.33 * s;
    arms.push(pivot);
  }
  // stubby legs
  for (const s of [-1, 1]) {
    c.root.add(mesh(new THREE.CapsuleGeometry(0.1, 0.08, 8, 20), soft, { pos: [0.15 * s, 0.15, 0.02] }));
    c.root.add(mesh(sphere(1, 24, 16), soft, { pos: [0.155 * s, 0.045, 0.06], scale: [0.11, 0.05, 0.14] }));
  }

  c.anchor.position.set(0, 1.24, 0);
  c.root.add(c.anchor);
  c.ring = 0.62;
  c.focusY = 0.7;

  let tiltAt = 4;
  c.update = (t, dt, target, calm) => {
    c.tick(dt);
    const a = c.actT;
    const amp = calm ? 0.3 : 1;
    const breath = Math.sin(t * 1.25);
    torso.scale.set(1 + breath * 0.012 * amp, 1 + breath * 0.006 * amp, 1 + breath * 0.012 * amp);
    // wave hello with the right arm
    const wave = envelope(a, 0, 0.5, 2.6, 0.6);
    arms[1].rotation.z = lerp(0.33, 2.55, wave) + Math.sin(a * 9) * 0.22 * wave;
    arms[1].rotation.x = -0.25 * wave;
    arms[0].rotation.z = -0.33 + Math.sin(t * 1.25) * 0.015 * amp;
    // the curious head tilt
    if (t > tiltAt) tiltAt = t + 5 + Math.random() * 4;
    const tilt = Math.max(envelope(tiltAt - t, 0, 0.45, 1.3, 0.45), envelope(a, 0.1, 0.4, 2.6, 0.5));
    aim(head, target, c.look, dt, { yaw: 0.45, pitch: 0.25, speed: 2 });
    head.rotation.z = tilt * 0.3;
    head.position.y = 1.035 + breath * 0.004 * amp;
  };
  return c;
}

/* ======================================================================== */
/*  Buzz Lightyear                                                          */
/* ======================================================================== */
export function buildBuzz() {
  const c = new Crew('buzz', [
    'To infinity and beyond!',
    'This isn’t flying. This is falling, with style.',
    'Buzz Lightyear to Star Command: new research directive received.',
  ]);
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf2f2ef, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.9 });
  const purple = new THREE.MeshStandardMaterial({ color: 0x6a4cab, roughness: 0.45, envMapIntensity: 0.6 });
  const lime = new THREE.MeshStandardMaterial({ color: 0x86c440, roughness: 0.4, envMapIntensity: 0.6 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x8d939c, roughness: 0.35, metalness: 0.6 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xf0c39a, roughness: 0.62 });
  const darkInk = new THREE.MeshStandardMaterial({ color: 0x241a33, roughness: 0.4 });
  const red = new THREE.MeshStandardMaterial({ color: 0xe0352b, roughness: 0.3, emissive: 0x400000 });
  const btn = (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.3, emissive: hex, emissiveIntensity: 0.15 });
  const dome = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, transparent: true, opacity: 0.14, roughness: 0.02, metalness: 0, clearcoat: 1,
    envMapIntensity: 2.2, depthWrite: false,
  });

  const hips = group(c.root, [0, 0.5, 0]);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = group(hips, [0.072 * s, 0, 0]);
    leg.add(mesh(new THREE.CapsuleGeometry(0.058, 0.1, 6, 16), white, { pos: [0, -0.1, 0] }));
    leg.add(mesh(sphere(0.05, 18, 12), lime, { pos: [0, -0.215, 0.028], scale: [1, 0.8, 0.9] }));
    leg.add(mesh(new THREE.CapsuleGeometry(0.055, 0.1, 6, 16), white, { pos: [0, -0.31, 0] }));
    leg.add(mesh(box(0.12, 0.09, 0.17, 0.03), white, { pos: [0, -0.42, 0.02] }));
    leg.add(mesh(box(0.122, 0.05, 0.06, 0.02), lime, { pos: [0, -0.43, 0.085] }));
    leg.add(mesh(box(0.13, 0.03, 0.18, 0.012), purple, { pos: [0, -0.48, 0.02] }));
    legs.push(leg);
  }
  hips.add(mesh(box(0.23, 0.1, 0.15, 0.04), white, { pos: [0, 0.03, 0] }));
  hips.add(mesh(box(0.24, 0.035, 0.16, 0.015), lime, { pos: [0, 0.085, 0] }));

  const torso = group(hips, [0, 0.1, 0]);
  torso.add(mesh(box(0.2, 0.12, 0.14, 0.04), purple, { pos: [0, 0.05, 0] }));
  torso.add(mesh(box(0.42, 0.28, 0.27, 0.08, 4), white, { pos: [0, 0.22, 0] }));
  torso.add(mesh(box(0.425, 0.03, 0.275, 0.014), lime, { pos: [0, 0.095, 0] }));
  torso.add(mesh(box(0.15, 0.09, 0.02, 0.01), grey, { pos: [0.075, 0.21, 0.136] }));
  [[0.04, 0xd8322b], [0.075, 0x37b34a], [0.11, 0x2f7fd8]].forEach(([x, hex]) => {
    torso.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.014, 14), btn(hex), { pos: [x, 0.21, 0.149], rot: [Math.PI / 2, 0, 0] }));
  });
  torso.add(mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.01, 24), lime, { pos: [-0.09, 0.245, 0.137], rot: [Math.PI / 2, 0, 0] }));
  torso.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 20), purple, { pos: [-0.09, 0.245, 0.142], rot: [Math.PI / 2, 0, 0] }));
  torso.add(mesh(new THREE.TorusGeometry(0.085, 0.03, 12, 32), lime, { pos: [0, 0.37, 0], rot: [Math.PI / 2, 0, 0] }));
  torso.add(mesh(box(0.28, 0.27, 0.1, 0.04), white, { pos: [0, 0.22, -0.17] }));
  torso.add(mesh(box(0.282, 0.04, 0.102, 0.015), purple, { pos: [0, 0.33, -0.17] }));

  // arms
  const arms = [];
  for (const s of [-1, 1]) {
    torso.add(mesh(sphere(0.075, 24, 16), white, { pos: [0.23 * s, 0.29, 0] }));
    const shoulder = group(torso, [0.245 * s, 0.29, 0]);
    shoulder.add(mesh(new THREE.CapsuleGeometry(0.048, 0.1, 6, 14), white, { pos: [0, -0.09, 0] }));
    const elbow = group(shoulder, [0, -0.19, 0]);
    elbow.add(mesh(new THREE.CapsuleGeometry(0.052, 0.08, 6, 14), white, { pos: [0, -0.075, 0] }));
    elbow.add(mesh(new THREE.TorusGeometry(0.048, 0.014, 8, 20), lime, { pos: [0, -0.135, 0], rot: [Math.PI / 2, 0, 0] }));
    if (s < 0) {
      elbow.add(mesh(box(0.05, 0.055, 0.03, 0.01), grey, { pos: [0, -0.07, 0.05] }));
      elbow.add(mesh(sphere(0.009, 10, 8), red, { pos: [0.012, -0.06, 0.066] }));
    }
    elbow.add(mesh(sphere(1, 20, 14), purple, { pos: [0, -0.19, 0], scale: [0.05, 0.06, 0.045] }));
    elbow.add(mesh(sphere(1, 12, 10), purple, { pos: [-0.035 * s, -0.17, 0.03], scale: [0.018, 0.03, 0.018] }));
    shoulder.rotation.z = 0.2 * s;
    elbow.rotation.x = -0.3;
    arms.push({ shoulder, elbow });
  }

  // head: purple hood, face, a big chin, and the bubble helmet
  const head = group(torso, [0, 0.47, 0]);
  head.add(mesh(sphere(0.1, 32, 24), purple, { scale: [0.95, 1.05, 1] }));
  head.add(mesh(sphere(0.075, 32, 24), skin, { pos: [0, -0.012, 0.046], scale: [0.85, 1, 0.75] }));
  head.add(mesh(sphere(0.04, 24, 16), skin, { pos: [0, -0.055, 0.074], scale: [1.1, 0.85, 0.9] }));
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.0105, 12, 10), darkInk, { pos: [0.026 * s, 0.012, 0.1], cast: false }));
    head.add(mesh(new THREE.BoxGeometry(0.03, 0.007, 0.008), darkInk, { pos: [0.027 * s, 0.034, 0.098], rot: [0, 0, 0.12 * s], cast: false }));
  }
  head.add(mesh(new THREE.BoxGeometry(0.03, 0.005, 0.006), new THREE.MeshStandardMaterial({ color: 0xa0524a }), { pos: [0, -0.035, 0.102], cast: false }));
  const helmet = mesh(new THREE.SphereGeometry(0.152, 48, 32, 0, Math.PI * 2, 0, 2.15), dome, { pos: [0, 0.004, 0.01], cast: false, receive: false });
  helmet.renderOrder = 10;
  head.add(helmet);

  // wings spring out of the backpack
  const ws = new THREE.Shape();
  ws.moveTo(0, -0.03); ws.lineTo(0.36, -0.045); ws.quadraticCurveTo(0.44, -0.045, 0.45, 0);
  ws.lineTo(0.42, 0.05); ws.lineTo(0.06, 0.06); ws.quadraticCurveTo(0, 0.045, 0, -0.03);
  const wingGeo = new THREE.ExtrudeGeometry(ws, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 });
  wingGeo.translate(0, 0, -0.006);
  const wings = [];
  for (const s of [-1, 1]) {
    const pivot = group(torso, [0.04 * s, 0.24, -0.2]);
    pivot.scale.x = s;
    const w = group(pivot);
    w.add(mesh(wingGeo, white));
    w.add(mesh(box(0.075, 0.075, 0.02, 0.012), red, { pos: [0.41, 0.003, 0] }));
    w.add(mesh(box(0.22, 0.014, 0.02, 0.006), lime, { pos: [0.21, 0.008, 0] }));
    wings.push({ pivot, w, s });
  }

  c.anchor.position.set(0, 0.62, 0);
  torso.add(c.anchor);
  c.ring = 0.5;
  c.focusY = 0.65;

  // laser from the wrist communicator
  const laserMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3b30).multiplyScalar(3), toneMapped: false, transparent: true, opacity: 0.9 });
  const laser = mesh(new THREE.CylinderGeometry(0.006, 0.006, 2.4, 8), laserMat, { cast: false, receive: false });
  laser.geometry.translate(0, -1.2, 0);
  laser.visible = false;
  arms[0].elbow.add(laser);
  laser.position.set(0, -0.08, 0.06);
  c.laser = new THREE.PointLight(0xff3b30, 0, 1.6, 2);
  arms[0].elbow.add(c.laser);
  c.laser.position.set(0, -0.2, 0.08);

  let mode = 0;
  const baseAct = c.act.bind(c);
  c.act = () => { mode = c.lineIdx % c.lines.length; return baseAct(); };

  c.update = (t, dt, target, calm) => {
    c.tick(dt);
    const a = c.actT;
    const amp = calm ? 0.2 : 1;
    const show = envelope(a, 0, 0.12, 2.6, 0.5);
    // the pivot is mirrored per side, so one angle works for both wings
    const deploy = a < 2.6 ? springy(a / 0.6) : 1 - smooth((a - 2.6) / 0.5);
    const d = mode === 2 ? 0 : Math.max(0, deploy);
    wings.forEach(({ w }) => {
      w.rotation.z = lerp(-1.5, 0.14, d);
      w.scale.setScalar(lerp(0.18, 1, Math.min(1, d)));
      w.position.set(lerp(0.0, 0.02, d), 0, 0);
    });
    // pose: right arm to the sky for "infinity", left arm forward for the wrist laser
    const point = mode !== 2 ? show : 0;
    const fire = mode === 2 ? show : 0;
    arms[1].shoulder.rotation.z = lerp(0.2 + Math.sin(t * 1.2) * 0.02 * amp, 2.85, point);
    arms[1].elbow.rotation.x = lerp(-0.3, 0, point);
    arms[0].shoulder.rotation.x = lerp(0, -1.45, fire);
    arms[0].shoulder.rotation.z = lerp(-0.2, -0.05, fire);
    arms[0].elbow.rotation.x = lerp(-0.3, -0.05, fire);
    const pew = fire > 0.9 && Math.sin(a * 20) > -0.2;
    laser.visible = pew;
    c.laser.intensity = pew ? 3 : 0;
    // a little hop, then the heroic stance
    c.root.position.y = Math.max(0, Math.sin(Math.min(a, 0.5) / 0.5 * Math.PI)) * 0.08 * point;
    hips.rotation.y = Math.sin(t * 0.6) * 0.05 * amp;
    torso.rotation.x = -0.05 * point;
    aim(head, target, c.look, dt, { yaw: 0.6, pitch: 0.3, speed: 3, pitchOffset: -0.35 * point });
    legs[0].rotation.z = -0.04;
    legs[1].rotation.z = 0.04;
  };
  return c;
}
