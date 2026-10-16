// The desk: renderer, lights, camera shots, picking, and speech bubbles.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildEve, buildWallE, buildBaymax, buildBuzz } from './crew.js';
import { buildRoom, buildLamp, buildLaptop, buildArm, buildPlantBoot, buildTrash, buildBooks, buildBall, buildDust } from './props.js';
import { damp, clamp } from './kit.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Where things live on the desk (x: left/right, z: back/front).
const LAYOUT = {
  lamp: [-3.6, 0, -2.0],
  arm: [-2.45, 0, -0.95],
  armSpots: [[-1.95, 0.06, -0.42], [-2.9, 0.06, -0.32]],
  walle: [-1.25, 0, 0.55, 0.4],
  plant: [-0.45, 0, 1.3, 0.3],
  eve: [-0.15, 0, -0.05, -0.12],
  laptop: [1.05, 0, -1.2, -0.18],
  books: [0.95, 0, 1.25, 0.22],
  baymax: [2.05, 0, -0.35, -0.28],
  buzz: [3.05, 0, 0.6, -0.42],
  trash: [-2.35, 0, 1.15],
  ball: [-3.35, 0, 0.75],
};

// Camera shots: look at `t`, from direction `d`, framing at least `w` × `h` world units.
const SHOTS = {
  wide:   { t: V(0.2, 0.85, 0.3),   d: V(0, 0.46, 1),       w: 3.1, h: 1.75 },
  walle:  { t: V(-1.3, 0.52, 0.5),  d: V(-0.12, 0.3, 1),    w: 1.1, h: 0.85 },
  eve:    { t: V(-0.2, 0.95, 0),    d: V(-0.2, 0.18, 1),    w: 1.0, h: 1.12 },
  baymax: { t: V(2.0, 0.72, -0.3),  d: V(-0.35, 0.2, 1),    w: 1.0, h: 0.95 },
  buzz:   { t: V(3.0, 0.62, 0.55),  d: V(-0.6, 0.16, 1),    w: 0.8, h: 0.8 },
  arm:    { t: V(-2.4, 0.45, -0.55), d: V(0.45, 0.45, 1),   w: 1.15, h: 0.85 },
  laptop: { t: V(1.0, 0.5, -1.05),  d: V(0.05, 0.42, 1),    w: 1.15, h: 0.8 },
  plant:  { t: V(-0.85, 0.4, 0.9),  d: V(0.15, 0.55, 1),    w: 1.25, h: 0.85 },
  space:  { t: V(2.5, 1.55, -1.2),  d: V(-0.28, -0.12, 1),  w: 1.9, h: 1.6 },
};
for (const s of Object.values(SHOTS)) s.d.normalize();

function makeEnvironment(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: 0x0b0d16, side: THREE.BackSide })));
  const panel = (hex, k, pos, size) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(pos[0], pos[1], pos[2]);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  panel(0xffd7a0, 5, [-8, 9, 2], [6, 4]);     // the lamp
  panel(0x7fb0ff, 3, [8, 7, -8], [5, 5]);     // the porthole
  panel(0xffffff, 1.1, [2, 4, 12], [10, 4]);  // soft front fill
  panel(0x5cc8ff, 0.5, [0, -6, 6], [12, 3]);  // bounce off the blue mat
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(s, 0.02).texture;
  pm.dispose();
  return env;
}

export async function createScene(stage, { reduced = false, onShot, onReady, sound } = {}) {
  const small = Math.min(innerWidth, innerHeight) < 700 || matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d14);
  scene.fog = new THREE.Fog(0x0b0d14, 13, 26);
  scene.environment = makeEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  // lights
  scene.add(new THREE.HemisphereLight(0x6f80b8, 0x1d140c, 0.55));
  const moon = new THREE.DirectionalLight(0x8fb4ff, 1.1);
  moon.position.set(3, 5, -4);
  scene.add(moon);
  const fill = new THREE.DirectionalLight(0xc8d2ff, 0.35);
  fill.position.set(4, 3, 7);
  scene.add(fill);
  const portGlow = new THREE.PointLight(0x5c8cff, 6, 7, 2);
  portGlow.position.set(2.35, 2.5, -2.0);
  scene.add(portGlow);

  // room + props
  buildRoom(scene);
  const lamp = buildLamp(scene, LAYOUT.lamp, [-0.8, 0, 0.35]);
  lamp.spot.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  const laptop = buildLaptop(scene, LAYOUT.laptop.slice(0, 3), LAYOUT.laptop[3]);
  const arm = buildArm(scene, LAYOUT.arm, LAYOUT.armSpots);
  buildPlantBoot(scene, LAYOUT.plant.slice(0, 3), LAYOUT.plant[3]);
  buildTrash(scene, LAYOUT.trash);
  buildBooks(scene, LAYOUT.books.slice(0, 3), LAYOUT.books[3]);
  const ball = buildBall(scene, LAYOUT.ball);
  const dust = buildDust(scene, small ? 120 : 220);

  // the crew
  const crew = {
    walle: buildWallE(),
    eve: buildEve(),
    baymax: buildBaymax(),
    buzz: buildBuzz(),
  };
  for (const [name, c] of Object.entries(crew)) {
    const [x, y, z, ry] = LAYOUT[name];
    c.root.position.set(x, y, z);
    c.root.rotation.y = ry;
    scene.add(c.root);
  }

  // glow rings on the mat, one per character
  const rings = {};
  const ringColors = { walle: 0xf2b630, eve: 0x5cc8ff, baymax: 0xff6b5e, buzz: 0x8fd14f, arm: 0xb39ce6, laptop: 0x5cc8ff };
  const ringFor = (name, pos, r) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.93, r, 64), new THREE.MeshBasicMaterial({
      color: new THREE.Color(ringColors[name]).multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false, toneMapped: false,
    }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos[0], 0.008, pos[2]);
    scene.add(m);
    rings[name] = m;
  };
  for (const name of Object.keys(crew)) ringFor(name, LAYOUT[name], crew[name].ring);
  ringFor('arm', LAYOUT.arm, 0.42);
  ringFor('laptop', [LAYOUT.laptop[0], 0, LAYOUT.laptop[2] + 0.1], 0.85);

  // post-processing: a gentle bloom so LEDs and screens glow
  let composer = null;
  if (!small) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.45, 0.95));
    composer.addPass(new OutputPass());
  }

  // ------------------------------------------------------------------ camera
  let sectionShot = 'wide';
  let focusShot = null;
  let focusUntil = 0;
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  let first = true;

  function shotPose(name, out) {
    const s = SHOTS[name] || SHOTS.wide;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const aspect = camera.aspect;
    const wFit = aspect < 1 ? s.w * (0.72 + 0.28 * aspect) : s.w;
    const dist = Math.max(s.h / tan, wFit / (tan * aspect));
    out.pos.copy(s.t).addScaledVector(s.d, dist);
    out.target.copy(s.t);
    return out;
  }
  const want = { pos: new THREE.Vector3(), target: new THREE.Vector3() };

  function activeShot(now) {
    if (focusShot && focusUntil !== 0 && now >= focusUntil) focusShot = null;
    return focusShot || sectionShot;
  }
  let lastShot = null;

  // ----------------------------------------------------------------- picking
  const pickables = [...Object.values(crew).map((c) => c.root), arm.root, laptop.root, ball.root];
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(-10, -10);
  let pointerInside = false;
  let hovered = null;
  const lookPoint = new THREE.Vector3(0, 1, 6);
  const lookGoal = new THREE.Vector3(0, 1, 6);
  const lookPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -1.6);
  const parallax = new THREE.Vector2();

  const bubble = stage.querySelector('#bubble');
  const placard = stage.querySelector('#placard');
  const tag = stage.querySelector('#tag');
  const canvas = renderer.domElement;

  function crewOf(obj) {
    while (obj) {
      if (obj.userData.crew) return obj.userData.crew;
      obj = obj.parent;
    }
    return null;
  }

  function setPointer(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  canvas.addEventListener('pointermove', (e) => { setPointer(e); pointerInside = e.pointerType === 'mouse'; wake(); });
  canvas.addEventListener('pointerleave', () => { pointerInside = false; ndc.set(-10, -10); });
  // pick on click directly, so taps work without a hover first
  canvas.addEventListener('click', (e) => {
    setPointer(e);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pickables, true);
    const name = hits.length ? crewOf(hits[0].object) : null;
    if (name) poke(name, { fromScene: true });
  });

  const names = { walle: 'WALL·E', eve: 'EVE', baymax: 'Baymax', buzz: 'Buzz', arm: 'ARM-01', laptop: 'train.py', ball: 'the ball' };
  const tagColors = { walle: 'var(--walle)', eve: 'var(--eve)', baymax: 'var(--baymax)', buzz: 'var(--buzz)', arm: 'var(--purple)', laptop: 'var(--eve)', ball: 'var(--walle)' };

  // ----------------------------------------------------------------- speech
  let speaking = null;
  let speakUntil = 0;
  let typeTimer = 0;
  function say(name, text) {
    if (!text) return;
    speaking = name;
    const now = performance.now();
    speakUntil = now + 2200 + text.length * 45;
    bubble.style.setProperty('--c', tagColors[name]);
    bubble.textContent = '';
    bubble.classList.add('show');
    clearInterval(typeTimer);
    let i = 0;
    if (reduced) { bubble.textContent = text; return; }
    typeTimer = setInterval(() => {
      bubble.textContent = text.slice(0, ++i);
      if (i >= text.length) clearInterval(typeTimer);
    }, 24);
  }

  function anchorOf(name) {
    if (crew[name]) return crew[name].anchor;
    if (name === 'arm') return arm.anchor;
    if (name === 'laptop') return laptop.screen;
    if (name === 'ball') return ball.root;
    return null;
  }

  function poke(name, { fromScene = false, line } = {}) {
    let text = line;
    if (crew[name]) { const said = crew[name].act(); text = line || said; }
    else if (name === 'arm') text = line || arm.act();
    else if (name === 'ball') { ball.act(); text = null; }
    else if (name === 'laptop') { laptop.term.push('> poked by a visitor. reward +1', '#f2b630'); text = line || 'train.py: reward +1. Thanks for the poke.'; }
    sound?.voice(name);
    say(name, text);
    if (!fromScene && SHOTS[name]) { focusShot = name; focusUntil = performance.now() + 4200; }
    wake();
  }

  function project(obj, out) {
    obj.getWorldPosition(tmp);
    tmp.project(camera);
    out.x = (tmp.x * 0.5 + 0.5) * width;
    out.y = (-tmp.y * 0.5 + 0.5) * height;
    out.visible = tmp.z < 1 && out.x > -40 && out.x < width + 40 && out.y > 0 && out.y < height + 40;
    return out;
  }
  const scr = { x: 0, y: 0, visible: false };

  // ------------------------------------------------------------- size + loop
  let width = 1, height = 1;
  let visible = true;
  let running = false;
  const clock = new THREE.Clock();
  function resize() {
    const r = stage.getBoundingClientRect();
    width = Math.max(1, Math.round(r.width));
    height = Math.max(1, Math.round(r.height));
    renderer.setSize(width, height, false);
    composer?.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    wake();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) wake(); }, { threshold: 0 }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

  function wake() {
    if (!running && visible && !document.hidden) {
      running = true;
      clock.getDelta();
      requestAnimationFrame(frame);
    }
  }

  let t = 0;
  let termAcc = 0;
  let readyFired = false;

  function frame() {
    if (!visible || document.hidden) { running = false; return; }
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    const now = performance.now();

    // camera
    const shot = activeShot(now);
    if (shot !== lastShot) { lastShot = shot; onShot?.(shot); }
    shotPose(shot, want);
    if (first || reduced) { camPos.copy(want.pos); camTarget.copy(want.target); first = false; }
    camPos.x = damp(camPos.x, want.pos.x, 2.2, dt);
    camPos.y = damp(camPos.y, want.pos.y, 2.2, dt);
    camPos.z = damp(camPos.z, want.pos.z, 2.2, dt);
    camTarget.x = damp(camTarget.x, want.target.x, 2.6, dt);
    camTarget.y = damp(camTarget.y, want.target.y, 2.6, dt);
    camTarget.z = damp(camTarget.z, want.target.z, 2.6, dt);
    const px = pointerInside && !reduced ? ndc.x : 0;
    const py = pointerInside && !reduced ? ndc.y : 0;
    parallax.x = damp(parallax.x, px, 3, dt);
    parallax.y = damp(parallax.y, py, 3, dt);
    const dist = camPos.distanceTo(camTarget);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
    camera.updateMatrixWorld();
    tmp.set(parallax.x * dist * 0.04, parallax.y * dist * 0.025, 0).applyQuaternion(camera.quaternion);
    camera.position.add(tmp);
    camera.lookAt(camTarget);

    // what is the pointer over?
    let hit = null;
    if (pointerInside) {
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(pickables, true);
      if (hits.length) hit = crewOf(hits[0].object);
      if (raycaster.ray.intersectPlane(lookPlane, lookGoal)) lookGoal.y = clamp(lookGoal.y, 0.2, 3);
    } else {
      lookGoal.copy(camera.position);
    }
    lookPoint.lerp(lookGoal, 1 - Math.exp(-4 * dt));
    if (hit !== hovered) {
      hovered = hit;
      canvas.style.cursor = hit ? 'pointer' : '';
      if (hit) { tag.textContent = names[hit]; tag.style.setProperty('--c', tagColors[hit]); }
      tag.classList.toggle('show', !!hit);
    }

    // animate
    const calm = reduced;
    for (const c of Object.values(crew)) c.update(t, dt, lookPoint, calm);
    arm.update(reduced ? dt * 0.5 : dt);
    ball.update(dt);
    if (!reduced) dust(t);
    termAcc += dt;
    if (termAcc > 0.35) { termAcc = 0; laptop.term.step(); }

    // rings: hovered or focused things glow
    const lit = hovered || focusShot || (crew[sectionShot] || sectionShot === 'arm' || sectionShot === 'laptop' ? sectionShot : null);
    for (const [name, ring] of Object.entries(rings)) {
      const goal = name === lit ? 0.6 : 0;
      ring.material.opacity = damp(ring.material.opacity, goal, 6, dt);
      ring.scale.setScalar(1 + Math.sin(t * 3) * 0.02);
    }

    // html overlays follow their 3D anchors
    if (speaking && now > speakUntil) { speaking = null; bubble.classList.remove('show'); }
    if (speaking) {
      project(anchorOf(speaking), scr);
      // never cover the placard: slide right of it, or drop below it if there's no room
      const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
      let x = clamp(scr.x, bw / 2 + 12, width - bw / 2 - 12);
      let y = Math.max(scr.y, bh + 24);
      if (placard) {
        const pr = placard.offsetLeft + placard.offsetWidth, pb = placard.offsetTop + placard.offsetHeight;
        const overlaps = y - bh - 14 < pb + 8 && x - bw / 2 < pr + 8;
        if (overlaps) {
          if (pr + bw + 24 < width) x = Math.max(x, pr + bw / 2 + 16);
          else y = Math.max(y, pb + bh + 26);
        }
      }
      bubble.style.left = `${x}px`;
      bubble.style.top = `${Math.min(y, height)}px`;
    }
    if (hovered && hovered !== speaking) {
      project(anchorOf(hovered), scr);
      tag.style.left = `${clamp(scr.x, 60, width - 60)}px`;
      tag.style.top = `${clamp(scr.y - 8, 30, height)}px`;
    } else if (hovered) tag.classList.remove('show');

    if (composer) composer.render(dt); else renderer.render(scene, camera);
    if (!readyFired) { readyFired = true; onReady?.(); }
  }

  wake();
  if (new URLSearchParams(location.search).has('debug')) window.__desk = { scene, camera, crew, renderer };

  return {
    setShot(name) { sectionShot = SHOTS[name] ? name : 'wide'; wake(); },
    focus(name) { if (SHOTS[name]) { focusShot = name; focusUntil = 0; wake(); } },
    unfocus() { if (focusUntil === 0) focusShot = null; },
    poke,
    log(text, color) { laptop.term.push(text, color); },
  };
}
