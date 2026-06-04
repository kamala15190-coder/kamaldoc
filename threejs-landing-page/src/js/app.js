import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ===========================================================================
   AHMED KAMAL SOLUTIONS — "Through the Network"
   The whole background is a journey: a fast blue data-point races ahead
   through a 3D web of glowing orange conduits (a neural / fibre-optic net),
   and the camera chases it with dynamic, counter-banking moves. A holographic
   AI head floats in front (locked to the camera), breathes, tracks the cursor
   and turns to hovered menu nodes, then dissolves as we warp to a sub-page.
=========================================================================== */

const MENU = [
  { id: 'home', label: 'Home' },
  { id: 'solutions', label: 'Solutions' },
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'contact', label: 'Contact' },
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const COL = {
  amber: new THREE.Color('#ff7a16'),
  gold: new THREE.Color('#ffb14a'),
  ember: new THREE.Color('#ff4d0a'),
  blue: new THREE.Color('#37b6ff'),
  cyan: new THREE.Color('#19e3ff'),
  violet: new THREE.Color('#7c5cff'),
};

/* ===========================================================================
   The flight path — a smooth closed loop that weaves up/down through space
=========================================================================== */
function makeLoop() {
  const pts = [];
  const N = 16;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const R = 62 + Math.sin(a * 3.0) * 20 + Math.cos(a * 2.0) * 10;
    pts.push(new THREE.Vector3(
      Math.cos(a) * R,
      Math.sin(a * 2.0) * 24 + Math.cos(a * 3.0) * 12,
      Math.sin(a) * R * 1.15
    ));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
  curve.arcLengthDivisions = 600;
  return curve;
}

/* ===========================================================================
   The conduit network — glowing orange tubes, nodes, chips + flowing pulses
=========================================================================== */
function createNetwork(curve) {
  const group = new THREE.Group();

  // node cloud: dense near the flight path so there's always wiring around us
  const NODES = 700;
  const nodes = [];
  for (let i = 0; i < NODES; i++) {
    if (i < NODES * 0.7) {
      // hug the path
      const t = Math.random();
      const base = curve.getPointAt(t);
      nodes.push(base.add(new THREE.Vector3((Math.random() - 0.5) * 36, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 36)));
    } else {
      nodes.push(new THREE.Vector3((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 110, (Math.random() - 0.5) * 220));
    }
  }

  // edges: connect each node to its 2 nearest neighbours (Manhattan-ish wiring)
  const edges = [];
  const maxD = 26, maxD2 = maxD * maxD;
  for (let i = 0; i < NODES; i++) {
    const best = [];
    for (let j = 0; j < NODES; j++) {
      if (i === j) continue;
      const d2 = nodes[i].distanceToSquared(nodes[j]);
      if (d2 < maxD2) { best.push([d2, j]); }
    }
    best.sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < Math.min(2, best.length); k++) {
      const j = best[k][1];
      if (i < j) edges.push([i, j]);
    }
  }

  // tubes (instanced cylinders) — self-lit so they glow as neon wiring
  const tubeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
  const tubes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.18, 1, 6, 1, true), tubeMat, edges.length);
  tubes.frustumCulled = false;
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const d = new THREE.Object3D();
  const ca = COL.amber, cb = COL.ember;
  for (let e = 0; e < edges.length; e++) {
    const A = nodes[edges[e][0]], B = nodes[edges[e][1]];
    dir.subVectors(B, A); const len = dir.length(); dir.normalize();
    mid.addVectors(A, B).multiplyScalar(0.5);
    q.setFromUnitVectors(up, dir);
    d.position.copy(mid); d.quaternion.copy(q); d.scale.set(1, len, 1); d.updateMatrix();
    tubes.setMatrixAt(e, d.matrix);
    tubes.setColorAt(e, Math.random() < 0.25 ? cb : ca);
  }
  tubes.instanceColor.needsUpdate = true;
  group.add(tubes);

  // nodes (instanced glowing spheres)
  const nodeMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshBasicMaterial({ color: COL.gold }), NODES);
  nodeMesh.frustumCulled = false;
  for (let i = 0; i < NODES; i++) { d.position.copy(nodes[i]); d.quaternion.identity(); d.scale.setScalar(0.5 + Math.random()); d.updateMatrix(); nodeMesh.setMatrixAt(i, d.matrix); }
  group.add(nodeMesh);

  // chips at some junctions (dark metal, env-lit) for the circuit feel
  const N_CHIP = 60;
  const chips = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.25, 1), new THREE.MeshStandardMaterial({ color: '#0c0a08', metalness: 0.85, roughness: 0.35, emissive: new THREE.Color('#2a1505'), emissiveIntensity: 1 }), N_CHIP);
  chips.frustumCulled = false;
  for (let i = 0; i < N_CHIP; i++) { const n = nodes[(Math.random() * NODES) | 0]; d.position.copy(n); d.rotation.set(0, Math.random() * 6.28, 0); d.scale.set(1 + Math.random() * 3, 1, 1 + Math.random() * 3); d.updateMatrix(); chips.setMatrixAt(i, d.matrix); d.rotation.set(0, 0, 0); }
  group.add(chips);

  // flowing data pulses that race along edges (orange)
  const N_PULSE = 120;
  const pulsePos = new Float32Array(N_PULSE * 3);
  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3));
  pulseGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e3);
  const pulseMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uSize: { value: 30 * Math.min(window.devicePixelRatio, 2) }, uCol: { value: COL.gold } },
    vertexShader: `uniform float uSize; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=uSize*(1.0/-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uCol; void main(){ float d=distance(gl_PointCoord,vec2(0.5)); gl_FragColor=vec4(uCol, smoothstep(0.5,0.0,d)); }`,
  });
  const pulses = new THREE.Points(pulseGeo, pulseMat);
  pulses.frustumCulled = false;
  group.add(pulses);
  const pData = Array.from({ length: N_PULSE }, () => ({ e: (Math.random() * edges.length) | 0, t: Math.random(), sp: 0.4 + Math.random() * 1.2 }));

  group.userData.update = (dt) => {
    for (let i = 0; i < N_PULSE; i++) {
      const p = pData[i];
      p.t += dt * p.sp;
      if (p.t > 1) { p.t = 0; p.e = (Math.random() * edges.length) | 0; }
      const A = nodes[edges[p.e][0]], B = nodes[edges[p.e][1]];
      pulsePos[i * 3] = A.x + (B.x - A.x) * p.t;
      pulsePos[i * 3 + 1] = A.y + (B.y - A.y) * p.t;
      pulsePos[i * 3 + 2] = A.z + (B.z - A.z) * p.t;
    }
    pulseGeo.attributes.position.needsUpdate = true;
  };
  return group;
}

/* ===========================================================================
   AI head — holographic likeness (bald + glasses + goatee), breathing
=========================================================================== */
const HEAD_R = 1.55;
const HEAD_SCALE = 1.7;
function warpHead(v) {
  let x = v.x, y = v.y, z = v.z;
  x *= 0.86; y *= 1.16; z *= 0.97;
  if (z < 0) z *= 0.9;
  if (y < 0.1) { const t = clamp((y + 1.0) / 1.1, 0, 1); const taper = 0.5 + 0.5 * t; x *= taper; if (z < 0) z *= 0.6 + 0.4 * t; }
  return new THREE.Vector3(x * HEAD_R, y * HEAD_R, z * HEAD_R);
}
function isBeardDir(v) {
  const jaw = v.y < -0.06 && v.y > -0.82 && v.z > 0.12 && Math.abs(v.x) < 0.78;
  const moustache = v.y < 0.04 && v.y > -0.14 && v.z > 0.55 && Math.abs(v.x) < 0.42;
  return jaw || moustache;
}
function headColor(v) {
  if (isBeardDir(v)) return new THREE.Color('#9fb4ff');
  if (v.y > 0.34) return COL.cyan.clone();
  return COL.violet.clone();
}
function roundedRectPoints(w, h, r) {
  const pts = []; const hw = w / 2 - r, hh = h / 2 - r;
  const corners = [[hw, hh, 0], [-hw, hh, Math.PI / 2], [-hw, -hh, Math.PI], [hw, -hh, Math.PI * 1.5]];
  for (const [cx, cy, start] of corners) for (let i = 0; i <= 6; i++) { const a = start + (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0)); }
  return pts;
}
class AIHead {
  constructor() {
    this.group = new THREE.Group(); this.inner = new THREE.Group(); this.group.add(this.inner);
    this.gaze = new THREE.Vector2(0, 0); this.gazeForce = 0.34; this.standardMats = [];
    this._buildShell(); this._buildNodes(); this._buildLinks(); this._buildCore(); this._buildFace(); this._buildRings();
  }
  _track(mat) { mat.transparent = true; this.standardMats.push({ mat, base: mat.opacity ?? 1 }); return mat; }
  _buildShell() {
    const base = new THREE.IcosahedronGeometry(1, 3); const bp = base.getAttribute('position'); const v = new THREE.Vector3();
    for (let i = 0; i < bp.count; i++) { v.fromBufferAttribute(bp, i).normalize(); const p = warpHead(v); bp.setXYZ(i, p.x, p.y, p.z); }
    bp.needsUpdate = true;
    const mat = this._track(new THREE.LineBasicMaterial({ color: '#4a5cff', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.shell = new THREE.LineSegments(new THREE.WireframeGeometry(base), mat); this.inner.add(this.shell);
  }
  _buildNodes() {
    const src = new THREE.IcosahedronGeometry(1, 4); const sp = src.getAttribute('position'); const n = sp.count;
    const positions = new Float32Array(n * 3), colors = new Float32Array(n * 3), beard = new Float32Array(n); const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) { v.fromBufferAttribute(sp, i).normalize(); const p = warpHead(v); positions.set([p.x, p.y, p.z], i * 3); const c = headColor(v); colors.set([c.r, c.g, c.b], i * 3); beard[i] = isBeardDir(v) ? 1 : 0; }
    this.nodeGeo = new THREE.BufferGeometry();
    this.nodeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.nodeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.nodeGeo.setAttribute('aBeard', new THREE.BufferAttribute(beard, 1));
    this.nodeMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uDisperse: { value: 0 }, uSize: { value: 12 * Math.min(window.devicePixelRatio, 2) } },
      vertexShader: `uniform float uTime,uSize,uDisperse; attribute float aBeard; varying vec3 vColor;
        void main(){ vColor=color; vec3 dir=normalize(position); vec3 pos=position+dir*uDisperse*2.6; vec4 mv=modelViewMatrix*vec4(pos,1.0);
        float tw=0.7+0.3*sin(uTime*3.0+position.y*6.0); gl_PointSize=uSize*(1.0+aBeard*1.1)*tw*(1.0/-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float uOpacity,uDisperse; varying vec3 vColor;
        void main(){ float d=distance(gl_PointCoord,vec2(0.5)); float a=smoothstep(0.5,0.0,d)*uOpacity*(1.0-uDisperse*0.6); gl_FragColor=vec4(vColor,a); }`,
    });
    this.nodes = new THREE.Points(this.nodeGeo, this.nodeMat); this.inner.add(this.nodes);
  }
  _buildLinks() {
    const pos = this.nodeGeo.getAttribute('position'); const pts = [];
    for (let i = 0; i < 70; i++) { const a = (Math.random() * pos.count) | 0, b = (Math.random() * pos.count) | 0; const pa = new THREE.Vector3().fromBufferAttribute(pos, a), pb = new THREE.Vector3().fromBufferAttribute(pos, b); if (pa.distanceTo(pb) > 1.5) continue; pts.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.linkMat = this._track(new THREE.LineBasicMaterial({ color: '#19e3ff', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.links = new THREE.LineSegments(g, this.linkMat); this.inner.add(this.links);
  }
  _buildCore() {
    const mat = this._track(new THREE.MeshStandardMaterial({ color: '#19e3ff', emissive: '#19e3ff', emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.1, transparent: true }));
    this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), mat); this.core.position.set(0, 0.05, -0.2); this.inner.add(this.core);
    this.coreLight = new THREE.PointLight('#19e3ff', 9, 14); this.coreLight.position.set(0, 0.1, 0.4); this.inner.add(this.coreLight);
  }
  _buildFace() {
    const glassMat = this._track(new THREE.LineBasicMaterial({ color: '#19e3ff', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    const eyeY = 0.2, lensZ = 1.22, lensX = 0.46; const lensPts = roundedRectPoints(0.62, 0.4, 0.13);
    const makeLens = (s) => { const g = new THREE.BufferGeometry().setFromPoints(lensPts); const l = new THREE.LineLoop(g, glassMat); l.position.set(s * lensX, eyeY, lensZ); l.rotation.y = s * -0.32; return l; };
    const bridge = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-lensX + 0.22, eyeY + 0.04, lensZ + 0.02), new THREE.Vector3(lensX - 0.22, eyeY + 0.04, lensZ + 0.02)]);
    const templeL = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-lensX - 0.28, eyeY + 0.07, lensZ - 0.05), new THREE.Vector3(-1.05, eyeY + 0.12, -0.2)]);
    const templeR = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(lensX + 0.28, eyeY + 0.07, lensZ - 0.05), new THREE.Vector3(1.05, eyeY + 0.12, -0.2)]);
    const glasses = new THREE.Group(); glasses.add(makeLens(-1), makeLens(1), new THREE.Line(bridge, glassMat), new THREE.Line(templeL, glassMat), new THREE.Line(templeR, glassMat));
    const eyeMat = this._track(new THREE.MeshBasicMaterial({ color: '#eaf6ff', transparent: true })); const eyeGeo = new THREE.SphereGeometry(0.07, 14, 14);
    this.eyeL = new THREE.Mesh(eyeGeo, eyeMat); this.eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeL.position.set(-lensX, eyeY, lensZ - 0.16); this.eyeR.position.set(lensX, eyeY, lensZ - 0.16);
    this.inner.add(glasses, this.eyeL, this.eyeR);
  }
  _buildRings() {
    this.rings = [];
    for (const s of [{ r: 2.05, color: '#7c5cff', axis: 'y', speed: -0.3 }, { r: 2.4, color: '#19e3ff', axis: 'x', speed: 0.22 }]) {
      const mat = this._track(new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(s.r, 0.01, 8, 120), mat);
      if (s.axis === 'x') ring.rotation.x = Math.PI / 2; ring.userData.speed = s.speed; ring.userData.axis = s.axis; this.rings.push(ring); this.group.add(ring);
    }
  }
  setGaze(x, y) { this.gaze.set(clamp(x, -1.4, 1.4), clamp(y, -1.4, 1.4)); }
  update(t) {
    this.nodeMat.uniforms.uTime.value = t;
    const ty = this.gaze.x * this.gazeForce * 2.2, tx = -this.gaze.y * this.gazeForce * 1.6;
    this.inner.rotation.y += (ty - this.inner.rotation.y) * 0.08; this.inner.rotation.x += (tx - this.inner.rotation.x) * 0.08;
    this.inner.scale.setScalar(1 + Math.sin(t * 1.4) * 0.018); this.inner.position.y = Math.sin(t * 1.2) * 0.05;
    this.core.scale.setScalar(1 + Math.sin(t * 3.0) * 0.08); this.core.material.emissiveIntensity = 0.5 + Math.sin(t * 3.0) * 0.25; this.coreLight.intensity = 7 + Math.sin(t * 3.0) * 3;
    this.linkMat.opacity = 0.18 + Math.abs(Math.sin(t * 2.0)) * 0.35;
    for (const ring of this.rings) ring.rotation[ring.userData.axis] += ring.userData.speed * 0.01;
    this.shell.rotation.y = -t * 0.05;
  }
  fadeOut() {
    const tl = gsap.timeline();
    tl.to(this.nodeMat.uniforms.uDisperse, { value: 1, duration: 1.1, ease: 'power2.in' }, 0);
    tl.to(this.nodeMat.uniforms.uOpacity, { value: 0, duration: 1.1, ease: 'power2.in' }, 0);
    for (const { mat } of this.standardMats) tl.to(mat, { opacity: 0, duration: 0.8, ease: 'power2.in' }, 0);
    tl.to(this.group.scale, { x: HEAD_SCALE * 1.35, y: HEAD_SCALE * 1.35, z: HEAD_SCALE * 1.35, duration: 1.1, ease: 'power2.in' }, 0);
    return tl;
  }
  reset() {
    const tl = gsap.timeline();
    tl.to(this.nodeMat.uniforms.uDisperse, { value: 0, duration: 0.9, ease: 'power2.out' }, 0);
    tl.to(this.nodeMat.uniforms.uOpacity, { value: 1, duration: 0.9 }, 0);
    for (const { mat, base } of this.standardMats) tl.to(mat, { opacity: base, duration: 0.9, ease: 'power2.out' }, 0);
    tl.to(this.group.scale, { x: HEAD_SCALE, y: HEAD_SCALE, z: HEAD_SCALE, duration: 0.9, ease: 'power2.out' }, 0);
    return tl;
  }
}

/* ===========================================================================
   Per-subpage 3D hero objects
=========================================================================== */
function buildPageObjects() {
  const objs = {};
  { const g = new THREE.Group(); const ico = new THREE.IcosahedronGeometry(2.1, 1);
    g.add(new THREE.LineSegments(new THREE.WireframeGeometry(ico), new THREE.LineBasicMaterial({ color: '#19e3ff', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })));
    g.add(new THREE.Points(ico, new THREE.PointsMaterial({ color: '#ff7a16', size: 0.16, transparent: true, blending: THREE.AdditiveBlending })));
    g.userData.update = (t) => { g.rotation.y = t * 0.5; g.rotation.x = Math.sin(t * 0.3) * 0.3; }; objs.solutions = g; }
  { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 2), new THREE.MeshBasicMaterial({ color: '#19e3ff' }))); const orbits = [];
    for (let i = 0; i < 3; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4 + i * 0.7, 0.015, 8, 120), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ff7a16' : '#19e3ff', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending })); ring.rotation.x = Math.PI / 2 + i * 0.4; ring.rotation.y = i * 0.5; const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), new THREE.MeshBasicMaterial({ color: '#ffb14a' })); g.add(ring, m); orbits.push({ ring, m, r: 1.4 + i * 0.7, s: 0.6 + i * 0.3, off: i * 2 }); }
    g.userData.update = (t) => { g.rotation.y = t * 0.15; orbits.forEach((o) => { o.m.position.set(Math.cos(t * o.s + o.off) * o.r, 0, Math.sin(t * o.s + o.off) * o.r); o.m.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), o.ring.rotation.x); }); }; objs.about = g; }
  { const g = new THREE.Group(); const count = 60; const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: '#0a1430', metalness: 0.6, roughness: 0.3, emissive: '#ff7a16', emissiveIntensity: 0.5 }), count);
    const data = Array.from({ length: count }, () => ({ x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5, z: (Math.random() - 0.5) * 5, s: 0.4 + Math.random() * 1.4, sp: (Math.random() - 0.5) * 1.2, ph: Math.random() * 6 })); const d = new THREE.Object3D(); g.add(im);
    g.userData.update = (t) => { data.forEach((p, i) => { d.position.set(p.x, p.y + Math.sin(t * 0.6 + p.ph) * 0.3, p.z); d.rotation.set(t * p.sp, t * p.sp * 0.7, 0); d.scale.setScalar(p.s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.instanceMatrix.needsUpdate = true; g.rotation.y = t * 0.1; }; objs.work = g; }
  { const g = new THREE.Group(); const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 2), new THREE.MeshBasicMaterial({ color: '#19e3ff' })); g.add(core); const rings = [];
    for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 8, 120), new THREE.MeshBasicMaterial({ color: '#ff7a16', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })); r.rotation.x = Math.PI / 2; g.add(r); rings.push({ r, off: i / 4 }); }
    g.userData.update = (t) => { core.scale.setScalar(1 + Math.sin(t * 4) * 0.12); rings.forEach((o) => { const k = (t * 0.4 + o.off) % 1; o.r.scale.setScalar(0.4 + k * 3.2); o.r.material.opacity = (1 - k) * 0.6; }); }; objs.contact = g; }
  objs.home = null;
  return objs;
}

/* ===========================================================================
   Post FX — crisp chromatic aberration + vignette + grain (no blur)
=========================================================================== */
const PostFXShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAberration: { value: 0.0016 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uAberration; varying vec2 vUv;
    void main(){
      vec2 uv=vUv; vec2 dir=uv-0.5; float dist=length(dir);
      float ab=uAberration*(0.35+dist*1.3);
      vec3 col; col.r=texture2D(tDiffuse,uv-dir*ab).r; col.g=texture2D(tDiffuse,uv).g; col.b=texture2D(tDiffuse,uv+dir*ab).b;
      col*=mix(1.0, smoothstep(1.25,0.25,dist), 0.8);
      float grain=(fract(sin(dot(uv*(uTime+1.0),vec2(12.9898,78.233)))*43758.5453)-0.5)*0.025;
      gl_FragColor=vec4(col+grain,1.0);
    }`,
};

/* ===========================================================================
   World — builds the network, drives the chase camera + render loop
=========================================================================== */
class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.pointer = new THREE.Vector2(0, 0);
    this.gazeTarget = new THREE.Vector2(0, 0);
    this.gazeLocked = false;
    this.fx = { speed: 1, aberration: 0.0016, fov: 62, headDist: 7 };
    this.progress = 0; // 0..1 along the loop

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#05040a');
    this.scene.fog = new THREE.FogExp2('#0a0604', 0.011);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 600);
    this.scene.add(this.camera);

    this.scene.add(new THREE.AmbientLight('#40301c', 1.1));
    const key = new THREE.PointLight('#ff8a2a', 80, 80); key.position.set(0, 0, 0); this.camera.add(key); // travels with us

    // --- the journey ---
    this.curve = makeLoop();
    this.frames = this.curve.computeFrenetFrames(800, true);
    this.network = createNetwork(this.curve);
    this.scene.add(this.network);

    // the blue data-point that leads us through the conduits
    this.blue = new THREE.Sprite(new THREE.SpriteMaterial({ color: COL.blue, transparent: true, blending: THREE.AdditiveBlending }));
    this.blue.scale.setScalar(3.0); this.scene.add(this.blue);
    this.blueCore = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#dff3ff', transparent: true, blending: THREE.AdditiveBlending }));
    this.blueCore.scale.setScalar(1.2); this.scene.add(this.blueCore);
    this.blueLight = new THREE.PointLight('#37b6ff', 16, 18); this.scene.add(this.blueLight);
    this.blueTrail = [];
    for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ color: COL.blue, transparent: true, opacity: 0.5 - i * 0.07, blending: THREE.AdditiveBlending })); s.scale.setScalar(2.0 - i * 0.22); this.scene.add(s); this.blueTrail.push(s); }

    // --- head locked in front of the camera (stable while we fly) ---
    this.head = new AIHead();
    this.head.group.scale.setScalar(HEAD_SCALE);
    this.head.group.position.set(0, 0, -this.fx.headDist);
    this.camera.add(this.head.group);

    // --- page heroes (also locked to the camera) ---
    this.pageObjects = buildPageObjects();
    for (const id in this.pageObjects) { const o = this.pageObjects[id]; if (o) { o.visible = false; o.scale.setScalar(0.001); o.position.set(0, 0, -this.fx.headDist); this.camera.add(o); } }
    this.activePageObj = null;

    this._initPost();
    addEventListener('resize', () => this._resize());
    addEventListener('pointermove', (e) => { this.pointer.x = (e.clientX / innerWidth) * 2 - 1; this.pointer.y = -((e.clientY / innerHeight) * 2 - 1); });

    this._tmp = { pos: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3(), bias: new THREE.Vector3() };
  }

  _initPost() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.setSize(innerWidth, innerHeight);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.4, 0.0);
    this.composer.addPass(this.bloom);
    this.postfx = new ShaderPass(PostFXShader);
    this.composer.addPass(this.postfx);
    this.composer.addPass(new OutputPass());
  }

  setGaze(x, y, locked) { this.gazeTarget.set(x, y); this.gazeLocked = locked; }
  warp(on) { gsap.to(this.fx, { speed: on ? 4.5 : 1, aberration: on ? 0.006 : 0.0016, fov: on ? 88 : 62, duration: on ? 0.9 : 1.2, ease: on ? 'power2.in' : 'power2.out' }); }
  showPageObject(id) {
    if (this.activePageObj) { const prev = this.activePageObj; gsap.to(prev.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.5, ease: 'power2.in', onComplete: () => (prev.visible = false) }); }
    const o = this.pageObjects[id]; this.activePageObj = o || null;
    if (o) { o.visible = true; gsap.fromTo(o.scale, { x: 0.001, y: 0.001, z: 0.001 }, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'back.out(1.6)', delay: 0.2 }); }
  }
  hidePageObject() { if (this.activePageObj) { const prev = this.activePageObj; gsap.to(prev.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.5, ease: 'power2.in', onComplete: () => (prev.visible = false) }); this.activePageObj = null; } }

  start() { this.clock.start(); this._tick(); }

  _frameAt(t) {
    const i = Math.floor(((t % 1) + 1) % 1 * 800) % 801;
    return this.frames.normals[i];
  }

  _tick() {
    const t = this.clock.getElapsedTime();
    const dt = Math.min(this.clock.getDelta(), 0.05);

    // advance along the loop
    this.progress = (this.progress + dt * 0.015 * this.fx.speed) % 1;
    const tp = this.progress;

    this.network.userData.update(dt);

    // --- blue point leads ahead on the path ---
    const lead = 0.03;
    const bluePos = this.curve.getPointAt((tp + lead) % 1);
    this.blue.position.copy(bluePos);
    this.blueCore.position.copy(bluePos);
    this.blueLight.position.copy(bluePos);
    for (let i = 0; i < this.blueTrail.length; i++) {
      this.blueTrail[i].position.copy(this.curve.getPointAt((tp + lead - (i + 1) * 0.004 + 1) % 1));
    }

    // --- chase camera: ride the conduit, look toward the blue point ---
    const camPos = this.curve.getPointAt(tp);
    const tan = this.curve.getTangentAt(tp);
    this.camera.position.lerp(camPos, 0.18);
    // stable up from Frenet frame avoids gimbal flips on steep climbs
    this._tmp.up.copy(this._frameAt(tp));
    this.camera.up.lerp(this._tmp.up, 0.12);
    // counter-pan: when the path climbs, aim a touch lower (and vice-versa)
    this._tmp.look.copy(bluePos);
    this._tmp.look.y -= tan.y * 6.0;
    this.camera.lookAt(this._tmp.look);
    // gentle banking into horizontal turns
    this.camera.rotateZ(Math.sin(t * 0.6) * 0.02 - tan.x * 0.15);

    if (Math.abs(this.camera.fov - this.fx.fov) > 0.01) { this.camera.fov += (this.fx.fov - this.camera.fov) * 0.1; this.camera.updateProjectionMatrix(); }

    // head gaze + breathing (head rides the camera, stays centred)
    if (!this.gazeLocked) this.gazeTarget.set(this.pointer.x * 0.5, this.pointer.y * 0.5);
    this.head.setGaze(this.gazeTarget.x, this.gazeTarget.y);
    this.head.update(t);
    if (this.activePageObj) this.activePageObj.userData.update(t);

    this.postfx.uniforms.uTime.value = t;
    this.postfx.uniforms.uAberration.value = this.fx.aberration;
    this.composer.render();
    requestAnimationFrame(() => this._tick());
  }

  _resize() {
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight); this.composer.setSize(innerWidth, innerHeight); this.bloom.setSize(innerWidth, innerHeight);
  }
}

/* ===========================================================================
   UI / Router
=========================================================================== */
class Hub {
  constructor(world) {
    this.world = world; this.busy = false;
    this.stage = document.getElementById('stage'); this.pages = document.getElementById('pages');
    this.menuEl = document.getElementById('menu'); this.chat = document.getElementById('chat');
    this.chatLog = document.getElementById('chat-log'); this.promptEl = document.getElementById('chat-prompt');
    this.enterEl = document.getElementById('chat-enter'); this.back = document.getElementById('back');
    this._buildMenu(); this.back.addEventListener('click', () => this.goHub());
  }
  _buildMenu() {
    const n = MENU.length, R = 33;
    MENU.forEach((item, i) => {
      const angle = Math.PI / 2 - (i * 2 * Math.PI) / n; const dx = Math.cos(angle), dy = Math.sin(angle); item.dir = { x: dx, y: dy };
      const el = document.createElement('button'); el.className = 'menu-item';
      el.style.left = `calc(50% + ${dx * R}vmin)`; el.style.top = `calc(50% - ${dy * R}vmin)`;
      el.innerHTML = `<span class="menu-item__idx">0${i + 1}</span><span class="menu-item__label">${item.label}</span><span class="menu-item__node"></span>`;
      el.addEventListener('pointerenter', () => { if (this.busy) return; el.classList.add('is-active'); this.world.setGaze(dx, dy, true); });
      el.addEventListener('pointerleave', () => { if (this.busy) return; el.classList.remove('is-active'); this.world.setGaze(0, 0, false); });
      el.addEventListener('click', () => this.navigate(item, el));
      item.el = el; this.menuEl.appendChild(el);
    });
  }
  async navigate(item, el) {
    if (this.busy) return; this.busy = true;
    try {
      MENU.forEach((m) => m.el.classList.remove('is-active')); el.classList.add('is-active');
      this.world.setGaze(item.dir.x, item.dir.y, true);
      gsap.to(this.menuEl, { opacity: 0.2, duration: 0.5 }); await wait(650);
      this.world.head.fadeOut(); this._showChat(); await wait(350);
      await this._type(`Navigiere zu ${item.label}`); await wait(260);
      this._pressEnter(); this._bubble('user', `Navigiere zu ${item.label}`); this.promptEl.innerHTML = ''; this._caret(false); await wait(420);
      this._bubble('ai', `Verbindung hergestellt — Warp zu <b>${item.label}</b> …`); this.world.warp(true); await wait(750);
      await this._foldToPage(item.id); this.world.warp(false); this.world.showPageObject(item.id);
    } catch (err) { console.error('navigate failed:', err); } finally { this.busy = false; }
  }
  _showChat() { this.chatLog.innerHTML = ''; this.promptEl.innerHTML = ''; this._caret(true); this.enterEl.classList.remove('is-pressed'); gsap.killTweensOf(this.chat); this.chat.style.visibility = 'visible'; gsap.fromTo(this.chat, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' }); }
  _hideChat() { gsap.to(this.chat, { opacity: 0, scale: 0.95, duration: 0.4, onComplete: () => { this.chat.style.visibility = 'hidden'; this.chatLog.innerHTML = ''; } }); }
  _caret(on) { this.promptEl.querySelector('.chat__caret')?.remove(); if (on) { const c = document.createElement('span'); c.className = 'chat__caret'; this.promptEl.appendChild(c); } }
  async _type(text) { const caret = this.promptEl.querySelector('.chat__caret'); for (const ch of text) { this.promptEl.insertBefore(document.createTextNode(ch), caret || null); await wait(38 + Math.random() * 34); } }
  _pressEnter() { this.enterEl.classList.add('is-pressed'); setTimeout(() => this.enterEl.classList.remove('is-pressed'), 220); }
  _bubble(kind, html) { const b = document.createElement('div'); b.className = `bubble bubble--${kind}`; b.innerHTML = html; this.chatLog.appendChild(b); gsap.from(b, { opacity: 0, y: 12, duration: 0.35, ease: 'power2.out' }); }
  _tween(target, vars) { return new Promise((res) => gsap.to(target, { ...vars, onComplete: res })); }
  async _foldToPage(pageId) {
    this._hideChat();
    await this._tween(this.stage, { duration: 0.9, rotationX: -88, y: -180, z: -600, opacity: 0, transformOrigin: '50% 0%', ease: 'power3.in' });
    this.stage.style.visibility = 'hidden';
    document.querySelectorAll('.subpage').forEach((p) => p.classList.remove('is-shown'));
    const page = document.querySelector(`.subpage[data-page="${pageId}"]`);
    this.pages.style.visibility = 'visible'; this.pages.style.pointerEvents = 'auto';
    page.classList.add('is-shown'); this.back.classList.add('is-shown');
    gsap.set(page, { rotationX: 82, y: 170, z: -500, opacity: 0, transformOrigin: '50% 100%' });
    await this._tween(page, { duration: 1.0, rotationX: 0, y: 0, z: 0, opacity: 1, ease: 'power3.out' });
  }
  async goHub() {
    if (this.busy) return; this.busy = true;
    this.back.classList.remove('is-shown'); this.world.hidePageObject();
    const page = document.querySelector('.subpage.is-shown');
    if (page) { await this._tween(page, { duration: 0.8, rotationX: 85, y: 180, z: -500, opacity: 0, transformOrigin: '50% 100%', ease: 'power3.in' }); page.classList.remove('is-shown'); }
    this.pages.style.visibility = 'hidden'; this.pages.style.pointerEvents = 'none';
    this.world.head.reset(); this.world.setGaze(0, 0, false); MENU.forEach((m) => m.el.classList.remove('is-active'));
    this.stage.style.visibility = 'visible';
    gsap.set(this.stage, { rotationX: 70, y: -160, z: -600, opacity: 0, transformOrigin: '50% 0%' });
    gsap.to(this.menuEl, { opacity: 1, duration: 0.8 });
    await this._tween(this.stage, { duration: 1.0, rotationX: 0, y: 0, z: 0, opacity: 1, ease: 'power3.out' });
    this.busy = false;
  }
}

/* ===========================================================================
   Boot
=========================================================================== */
const world = new World(document.getElementById('webgl'));
const hub = new Hub(world);
const loader = document.getElementById('loader');
addEventListener('load', () => { setTimeout(() => { loader.classList.add('hidden'); world.start(); }, 600); });
