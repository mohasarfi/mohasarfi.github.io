import * as sound from './sound.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  sget(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  sset(k, v) { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } },
};

/* ------------------------------------------------------------------ loader */
// WALL·E's solar charge meter fills while the 3D desk loads.
const loader = (() => {
  const el = $('#loader');
  if (!el) return { charge() {}, done() {} };
  const bars = $$('.charge i', el);
  const pct = $('#loader-pct');
  let target = 8, shown = 0, finished = false, raf = 0;
  const skip = store.sget('booted') || reduced;

  function finish() {
    if (finished) return;
    finished = true;
    store.sset('booted', '1');
    el.classList.add('is-done');
    el.setAttribute('aria-busy', 'false');
    setTimeout(() => el.remove(), 800);
  }
  if (skip) { el.remove(); return { charge() {}, done() {} }; }
  el.setAttribute('aria-busy', 'true');
  el.addEventListener('click', finish);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(); });
  setTimeout(() => { target = 100; }, 7000); // never hold anyone hostage

  const started = performance.now();
  let last = started;
  function tick(now = performance.now()) {
    if (finished) return;
    // time-based, so a slow GPU can't make the meter crawl
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    shown = Math.min(target, shown + dt * (40 + (target - shown) * 3));
    const p = Math.round(shown);
    pct.textContent = String(p);
    bars.forEach((b, i) => b.classList.toggle('on', p >= (i + 1) * 10));
    if (p >= 100 && performance.now() - started > 1100) { setTimeout(finish, 260); return; }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  return {
    charge(p) { target = Math.max(target, p); },
    done() { target = 100; },
  };
})();

/* ------------------------------------------------------------------ basics */
$$('[data-year]').forEach((n) => { n.textContent = String(new Date().getFullYear()); });

// mobile menu
const menuBtn = $('.menu-btn');
const mnav = $('#mnav');
function setMenu(open) {
  menuBtn.setAttribute('aria-expanded', String(open));
  mnav.hidden = !open;
}
menuBtn?.addEventListener('click', () => setMenu(mnav.hidden));
mnav?.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && mnav && !mnav.hidden) { setMenu(false); menuBtn.focus(); } });

// sound toggle
const soundBtn = $('.sound');
function setSound(on, announce) {
  sound.setOn(on);
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
  store.set('sound', on ? '1' : '0');
  if (on && announce) sound.voice('walle');
}
soundBtn?.addEventListener('click', () => setSound(soundBtn.getAttribute('aria-pressed') !== 'true', true));
if (store.get('sound') === '1') {
  // browsers need a gesture before audio, so arm it on the first interaction
  soundBtn?.setAttribute('aria-pressed', 'true');
  addEventListener('pointerdown', () => setSound(true, false), { once: true });
}

// copy email
$$('[data-copy]').forEach((b) => {
  b.addEventListener('click', async () => {
    const label = b.textContent;
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      b.textContent = 'Copied!';
    } catch {
      b.textContent = 'Copy failed';
    }
    sound.blip();
    setTimeout(() => { b.textContent = label; }, 1600);
  });
});

// solar charge = scroll progress
const meterBars = $$('.meter-bars i');
let meterQueued = false;
function syncMeter() {
  meterQueued = false;
  const max = document.documentElement.scrollHeight - innerHeight;
  const p = max > 0 ? scrollY / max : 0;
  const n = Math.round(p * meterBars.length);
  meterBars.forEach((b, i) => b.classList.toggle('on', i < n));
}
addEventListener('scroll', () => { if (!meterQueued) { meterQueued = true; requestAnimationFrame(syncMeter); } }, { passive: true });
syncMeter();

// reveal on scroll
if ('IntersectionObserver' in window && !reduced) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach((el) => io.observe(el));
} else {
  $$('[data-reveal]').forEach((el) => el.classList.add('in'));
}

/* ------------------------------------------------------------------ placard */
const PLACARDS = {
  wide:   { k: 'On the desk', name: 'The crew', c: 'var(--walle)', line: 'The robots I grew up with, keeping me company while I train mine. Click anyone.' },
  baymax: { k: 'About', name: 'Baymax', c: 'var(--baymax)', line: 'Personal healthcare companion. The big, soft spark behind all of this.' },
  walle:  { k: 'Research', name: 'WALL·E', c: 'var(--walle)', line: 'Learns by poking at the world, one piece of trash at a time. Basically an RL agent with a compactor.' },
  buzz:   { k: 'Experience', name: 'Buzz Lightyear', c: 'var(--buzz)', line: 'Space ranger. Career path: a series of increasingly ambitious missions.' },
  eve:    { k: 'Publications', name: 'EVE', c: 'var(--eve)', line: 'Extraterrestrial Vegetation Evaluator. Also known as reviewer #2.' },
  laptop: { k: 'Projects', name: 'train.py', c: 'var(--eve)', line: 'Something is always training on this laptop. Right now: circuits and world models.' },
  arm:    { k: 'Robotics', name: 'ARM-01', c: 'var(--purple)', line: 'A small research arm running pick-and-place on loop. Sim-to-real, one cube at a time.' },
  plant:  { k: 'Playground', name: 'The plant', c: 'var(--buzz)', line: 'WALL·E’s directive. Teach him the way to it, right over there.' },
  space:  { k: 'Contact', name: 'To infinity…', c: 'var(--purple)', line: '…and beyond. Say hi, the crew will pass it on.' },
};
const placard = $('#placard');
let placardShot = 'wide';
// the header names the section you're reading; the body names what the camera is looking at
function sectionLabel() {
  const k = currentSection && currentSection.querySelector('.sec-k');
  return k ? k.textContent : 'On the desk';
}
function showPlacard(shot) {
  const p = PLACARDS[shot] || PLACARDS.wide;
  $('#placard-k').textContent = sectionLabel();
  if (shot === placardShot && placard.dataset.ready) return;
  placardShot = shot;
  placard.dataset.ready = '1';
  placard.style.setProperty('--c', p.c);
  $('#placard-name').textContent = p.name;
  $('#placard-line').textContent = p.line;
  placard.classList.remove('swap');
  void placard.offsetWidth;
  placard.classList.add('swap');
}

/* -------------------------------------------------------------- the stage */
let scene = null;
const queue = []; // calls made before the scene is ready

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

async function bootStage() {
  const stage = $('#stage');
  const fallback = $('#stage-fallback');
  if (!stage) { loader.done(); return; } // pages without the desk (blog)
  loader.charge(25);
  if (!webglOK()) {
    fallback.innerHTML = '<span class="stage-boot">The crew is resting.<br>This browser can’t show the 3D desk.</span>';
    loader.done();
    return;
  }
  try {
    // canvas textures need the fonts first
    await Promise.race([
      Promise.all([
        document.fonts.load('700 20px "Pixelify Sans"'),
        document.fonts.load('600 16px "Pixelify Sans"'),
        document.fonts.load('500 16px "IBM Plex Mono"'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    loader.charge(45);
    const { createScene } = await import('./scene.js');
    loader.charge(80);
    scene = await createScene(stage, {
      reduced,
      sound,
      onShot: showPlacard,
      onReady: () => { fallback.hidden = true; loader.done(); },
    });
    if (new URLSearchParams(location.search).has('debug')) window.__api = scene;
    queue.splice(0).forEach((fn) => fn());
  } catch (err) {
    console.error(err);
    fallback.innerHTML = '<span class="stage-boot">The crew is asleep.<br>The 3D desk failed to load.</span>';
    loader.done();
  }
}
const withScene = (fn) => (scene ? fn() : queue.push(fn));

// which section is in view decides the camera shot
const sections = $$('[data-shot]');
const navLinks = $$('a[data-nav]');
let currentSection = null;
function setSection(el) {
  if (el === currentSection) return;
  currentSection = el;
  const shot = el.dataset.shot;
  navLinks.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === `#${el.id}`)));
  $('#placard-k').textContent = sectionLabel();
  if (scene) scene.setShot(shot); else { showPlacard(shot); withScene(() => scene.setShot(currentSection.dataset.shot)); }
}
if ('IntersectionObserver' in window) {
  const so = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) setSection(en.target); });
  }, { rootMargin: '-42% 0px -52% 0px' });
  sections.forEach((s) => so.observe(s));
}

// hovering a card points the camera at its object on the desk
$$('[data-focus]').forEach((card) => {
  const name = card.dataset.focus;
  const on = () => withScene(() => scene.focus(name));
  const off = () => withScene(() => scene.unfocus());
  card.addEventListener('mouseenter', on);
  card.addEventListener('mouseleave', off);
  card.addEventListener('focusin', on);
  card.addEventListener('focusout', off);
});

// "Say hi" buttons
$$('[data-crew]').forEach((b) => {
  b.addEventListener('click', () => withScene(() => scene.poke(b.dataset.crew)));
});

/* ------------------------------------------------------------ playground */
const gw = $('#gridworld');
if (gw) {
  let started = false;
  const start = async () => {
    if (started) return;
    started = true;
    const { initGridworld } = await import('./gridworld.js');
    initGridworld(gw, {
      onStart: () => withScene(() => scene.log('> playground: q-learning started', '#8fd14f')),
      onGoal: (steps) => {
        sound.voice('win');
        withScene(() => {
          scene.log(`> wall-e reached the plant in ${steps} steps`, '#f2b630');
          scene.poke('walle', { line: `Plant found in ${steps} steps!` });
        });
      },
    });
  };
  if ('IntersectionObserver' in window) {
    const go = new IntersectionObserver((es) => { if (es[0].isIntersecting) { go.disconnect(); start(); } }, { rootMargin: '600px 0px' });
    go.observe(gw);
  } else start();
}

bootStage();
