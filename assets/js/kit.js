// Small helpers shared by the crew and the props.
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
// frame-rate independent easing toward a target
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

// 0 → 1 over [a, a+rise], hold, then 1 → 0 over [b, b+fall]
export function envelope(t, a, rise, b, fall = rise) {
  if (t < a) return 0;
  if (t < a + rise) return smooth((t - a) / rise);
  if (t < b) return 1;
  if (t < b + fall) return 1 - smooth((t - b) / fall);
  return 0;
}

// overshooting spring-ish ease for things that pop out (wings, arms)
export function springy(t) {
  t = clamp(t, 0, 1);
  return 1 - Math.exp(-6 * t) * Math.cos(9 * t);
}

export function mesh(geo, mat, { pos, rot, scale, cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  if (scale) typeof scale === 'number' ? m.scale.setScalar(scale) : m.scale.set(scale[0], scale[1], scale[2]);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

export function group(parent, pos, rot) {
  const g = new THREE.Group();
  if (pos) g.position.set(pos[0], pos[1], pos[2]);
  if (rot) g.rotation.set(rot[0], rot[1], rot[2]);
  if (parent) parent.add(g);
  return g;
}

// Revolve a smooth profile of [radius, height] pairs (listed bottom → top).
export function lathe(pts, segments = 56, samples = 72) {
  const curve = new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y)));
  const p = curve.getPoints(samples).map((v) => new THREE.Vector2(Math.max(0.0001, v.x), v.y));
  if (pts[0][0] === 0) p[0].x = 0;
  if (pts[pts.length - 1][0] === 0) p[p.length - 1].x = 0;
  return new THREE.LatheGeometry(p, segments);
}

// A patch of an ellipsoid surface, kept where mask(u, v, w) is true on the unit sphere.
// Used for visors and LED eyes that need to hug a curved head.
export function ellipsoidPatch(rx, ry, rz, mask, wSeg = 120, hSeg = 90) {
  const src = new THREE.SphereGeometry(1, wSeg, hSeg).toNonIndexed();
  const p = src.attributes.position;
  const pos = [], nor = [];
  const n = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    let keep = true;
    for (let k = 0; k < 3 && keep; k++) keep = mask(p.getX(i + k), p.getY(i + k), p.getZ(i + k));
    if (!keep) continue;
    for (let k = 0; k < 3; k++) {
      const u = p.getX(i + k), v = p.getY(i + k), w = p.getZ(i + k);
      pos.push(u * rx, v * ry, w * rz);
      n.set(u / rx, v / ry, w / rz).normalize();
      nor.push(n.x, n.y, n.z);
    }
  }
  src.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

// Re-centre a geometry on its bounding box and return the old centre,
// so the mesh can scale (blink, squash) around its own middle.
export function recenter(geo) {
  geo.computeBoundingBox();
  const c = new THREE.Vector3();
  geo.boundingBox.getCenter(c);
  geo.translate(-c.x, -c.y, -c.z);
  return c;
}

// A cylinder stretched between two points.
export function rod(a, b, radius, mat, radialSegments = 14) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = mesh(new THREE.CylinderGeometry(radius, radius, len, radialSegments), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

export function led(hex, boost = 2.4) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(boost), toneMapped: false });
}

// Make a head turn toward a world point, smoothly and within limits.
const _v = new THREE.Vector3();
export function aim(obj, worldTarget, state, dt, { yaw = 0.6, pitch = 0.35, speed = 5, yawOffset = 0, pitchOffset = 0 } = {}) {
  if (!obj.parent) return;
  _v.copy(worldTarget);
  obj.parent.worldToLocal(_v);
  _v.sub(obj.position);
  const ty = clamp(Math.atan2(_v.x, _v.z), -yaw, yaw) + yawOffset;
  const tp = clamp(-Math.atan2(_v.y, Math.hypot(_v.x, _v.z)), -pitch, pitch) + pitchOffset;
  state.yaw = damp(state.yaw ?? 0, ty, speed, dt);
  state.pitch = damp(state.pitch ?? 0, tp, speed, dt);
  obj.rotation.order = 'YXZ';
  obj.rotation.y = state.yaw;
  obj.rotation.x = state.pitch;
}
