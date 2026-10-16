// Tiny synthesized voices for the crew. Off until the visitor turns it on.
let ctx = null;
let on = false;

export const isOn = () => on;

export function setOn(v) {
  on = v;
  if (on && !ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { on = false; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function tone({ f0, f1 = f0, dur = 0.12, type = 'square', vol = 0.05, delay = 0 }) {
  if (!on || !ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}

export function blip() { tone({ f0: 880, f1: 1320, dur: 0.05, vol: 0.02 }); }

export function voice(name) {
  switch (name) {
    case 'walle':
      tone({ f0: 260, f1: 560, dur: 0.18, vol: 0.035 });
      tone({ f0: 560, f1: 330, dur: 0.24, delay: 0.19, vol: 0.035 });
      break;
    case 'eve':
      tone({ f0: 900, f1: 1700, dur: 0.14, type: 'sine', vol: 0.06 });
      tone({ f0: 1250, f1: 2300, dur: 0.12, type: 'sine', delay: 0.16, vol: 0.05 });
      break;
    case 'baymax':
      tone({ f0: 330, dur: 0.26, type: 'triangle', vol: 0.08 });
      tone({ f0: 247, dur: 0.36, type: 'triangle', delay: 0.28, vol: 0.08 });
      break;
    case 'buzz':
      tone({ f0: 1800, f1: 160, dur: 0.38, type: 'sawtooth', vol: 0.03 });
      break;
    case 'arm':
      tone({ f0: 140, f1: 240, dur: 0.3, type: 'sawtooth', vol: 0.02 });
      tone({ f0: 240, f1: 150, dur: 0.3, type: 'sawtooth', delay: 0.32, vol: 0.02 });
      break;
    case 'ball':
      tone({ f0: 180, f1: 560, dur: 0.14, type: 'sine', vol: 0.08 });
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, dur: 0.12, type: 'square', vol: 0.03, delay: i * 0.09 }));
      break;
    default:
      blip();
  }
}
