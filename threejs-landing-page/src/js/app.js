import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ===========================================================================
   AHMED KAMAL SOLUTIONS — "Across the Board"
   A cinematic flight low across a living circuit board: photoreal-ish PCB with
   glowing amber traces and travelling data pulses, real 3D components (chips,
   capacitors, LEDs) with PBR reflections, depth-of-field + bloom for a
   high-res "3D video" feel. A holographic AI head hovers above the central
   CPU, breathes, tracks the cursor, turns to hovered menu nodes, then
   dissolves as the camera warps to the chosen sub-page.
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

const FLOOR_Y = -4.2;
const COMP_RANGE = 380; // z length over which components recycle

const COL = {
  cyan: new THREE.Color('#19e3ff'),
  violet: new THREE.Color('#7c5cff'),
  amber: new THREE.Color('#ff8a1e'),
  gold: new THREE.Color('#ffc46b'),
};

/* ===========================================================================
   Photoreal-ish PCB shader (Manhattan traces, pads, vias, flowing data)
=========================================================================== */
const PCB_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vWorld;
  varying vec3 vViewDir;
  uniform float uTime, uScroll, uDim;
  uniform vec3 uBase, uSub, uTrace, uGlow;

  float hash21(vec2 p){ p = fract(p * vec2(123.34, 345.45)); p += dot(p, p + 34.345); return fract(p.x * p.y); }

  // one Manhattan trace layer at a given cell size
  float traceLayer(vec2 P, float cell, float w){
    vec2 g = P / cell; vec2 id = floor(g); vec2 f = fract(g);
    float vM = step(0.5, hash21(vec2(id.x, 7.3)));
    float hM = step(0.55, hash21(vec2(3.1, id.y)));
    float vL = vM * smoothstep(w, 0.0, abs(f.x - 0.5));
    float hL = hM * smoothstep(w, 0.0, abs(f.y - 0.5));
    return max(vL, hL);
  }

  void main(){
    vec2 P = vec2(vWorld.x, vWorld.z + uScroll);

    // copper traces at two scales
    float coarse = traceLayer(P, 2.2, 0.05);
    float fine   = traceLayer(P, 0.75, 0.03) * 0.6;
    float trace  = max(coarse, fine);

    // pads + via rings on the coarse grid
    vec2 g = P / 2.2; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
    float padM = step(0.80, hash21(id + 11.0));
    float pad  = padM * smoothstep(0.26, 0.17, length(f));
    float ring = padM * smoothstep(0.035, 0.0, abs(length(f) - 0.22));
    float copper = clamp(trace + pad + ring * 0.8, 0.0, 1.0);

    // substrate: dark solder mask with subtle blotchy variation
    float n = hash21(floor(P * 2.7));
    vec3 base = mix(uBase, uSub, n * 0.5);

    vec3 col = mix(base, uTrace, copper);
    col += uGlow * copper * 0.45;

    // travelling data pulses along the traces
    float pulse = 0.0;
    pulse += coarse * smoothstep(0.93, 1.0, sin(P.y * 1.15 - uTime * 4.0) * 0.5 + 0.5);
    pulse += coarse * smoothstep(0.93, 1.0, sin(P.x * 1.15 + uTime * 3.0) * 0.5 + 0.5);
    col += uGlow * pulse * 1.8;

    // grazing-angle copper sheen
    float fres = pow(1.0 - max(dot(normalize(vViewDir), vec3(0.0, 1.0, 0.0)), 0.0), 3.0);
    col += uTrace * copper * fres * 0.5;

    // depth fade: far end falls to near-black, foreground a touch dimmer
    float depth = smoothstep(-300.0, -20.0, vWorld.z);
    float nearFade = 1.0 - smoothstep(14.0, 30.0, vWorld.z);
    col *= mix(0.06, 1.0, depth) * nearFade * uDim;

    gl_FragColor = vec4(col, 1.0);
  }
`;
const PCB_VERT = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vViewDir;
  void main(){
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vViewDir = cameraPosition - wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

function createPCB(y, dim, scrollSign) {
  const geo = new THREE.PlaneGeometry(160, 560, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    vertexShader: PCB_VERT,
    fragmentShader: PCB_FRAG,
    uniforms: {
      uTime: { value: 0 }, uScroll: { value: 0 }, uDim: { value: dim },
      uBase: { value: new THREE.Color('#070b0a') },
      uSub: { value: new THREE.Color('#0e1512') },
      uTrace: { value: COL.amber },
      uGlow: { value: COL.gold },
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, y, -180);
  mesh.frustumCulled = false;
  mesh.userData.update = (t) => {
    mat.uniforms.uTime.value = t;
    mat.uniforms.uScroll.value = t * 22.0 * scrollSign; // flight speed
  };
  mesh.userData.mat = mat;
  return mesh;
}

/* ===========================================================================
   The hero CPU directly beneath the AI head
=========================================================================== */
function createHeroCPU() {
  const g = new THREE.Group();
  g.position.set(0, FLOOR_Y, 0);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.5, 5.2),
    new THREE.MeshStandardMaterial({ color: '#0a0c10', metalness: 0.9, roughness: 0.28 })
  );
  body.position.y = 0.25;
  g.add(body);

  // die / top plate (brushed metal)
  const die = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.08, 3.2),
    new THREE.MeshStandardMaterial({ color: '#1a1d24', metalness: 1.0, roughness: 0.18 })
  );
  die.position.y = 0.54;
  g.add(die);

  // glowing socket seam
  const seamMat = new THREE.MeshBasicMaterial({ color: '#ff9a32' });
  const seam = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.025, 8, 4), seamMat);
  seam.rotation.x = Math.PI / 2; seam.rotation.z = Math.PI / 4; seam.position.y = 0.52;
  g.add(seam);
  g.userData.seamMat = seamMat;

  // pin grid (emissive specks) via instancing
  const pins = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.06, 0.02, 0.06),
    new THREE.MeshBasicMaterial({ color: '#ffb455' }),
    24 * 24
  );
  const d = new THREE.Object3D(); let i = 0;
  for (let x = 0; x < 24; x++) for (let z = 0; z < 24; z++) {
    d.position.set((x - 11.5) * 0.13, 0.59, (z - 11.5) * 0.13);
    d.updateMatrix(); pins.setMatrixAt(i++, d.matrix);
  }
  g.add(pins);

  g.userData.update = (t) => {
    const p = 0.6 + Math.abs(Math.sin(t * 1.5)) * 0.6;
    seamMat.color.setRGB(p * 1.0, p * 0.55, p * 0.12);
  };
  return g;
}

/* ===========================================================================
   Scattered components (chips, capacitors, blinking LEDs) — flight recycling
=========================================================================== */
function createComponents() {
  const group = new THREE.Group();
  const wrap = (z, t, speed) => {
    let zz = (z + t * speed) % COMP_RANGE;
    if (zz < 0) zz += COMP_RANGE;
    return zz - COMP_RANGE + 40; // keep mostly ahead (negative z)
  };

  const chipMat = new THREE.MeshStandardMaterial({ color: '#0b0e14', metalness: 0.9, roughness: 0.3, emissive: new THREE.Color('#241402'), emissiveIntensity: 1.0 });
  const capMat = new THREE.MeshStandardMaterial({ color: '#14110c', metalness: 0.7, roughness: 0.4, emissive: new THREE.Color('#1a0f04') });

  const N_CHIP = 240, N_CAP = 130, N_LED = 260;
  const chips = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.3, 1), chipMat, N_CHIP);
  const caps = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.3, 1.1, 18), capMat, N_CAP);
  const leds = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshBasicMaterial({ color: '#ffd27a' }), N_LED);
  chips.frustumCulled = caps.frustumCulled = leds.frustumCulled = false;

  const rnd = (n, gen) => Array.from({ length: n }, gen);
  const lane = () => {
    // place either side of the central path, leaving a clear corridor
    const side = Math.random() < 0.5 ? -1 : 1;
    return side * (5 + Math.random() * 60);
  };
  const chipData = rnd(N_CHIP, () => ({ x: lane(), z: Math.random() * COMP_RANGE, w: 0.6 + Math.random() * 3.2, dep: 0.6 + Math.random() * 3.0, h: 0.2 + Math.random() * 0.5, rot: (Math.random() * 4 | 0) * Math.PI / 2 }));
  const capData = rnd(N_CAP, () => ({ x: lane(), z: Math.random() * COMP_RANGE, r: 0.2 + Math.random() * 0.5, h: 0.8 + Math.random() * 1.8 }));
  const ledData = rnd(N_LED, () => ({ x: lane(), z: Math.random() * COMP_RANGE, ph: Math.random() * 6.28, sp: 1 + Math.random() * 4 }));

  group.add(chips, caps, leds);
  const d = new THREE.Object3D();

  group.userData.update = (t, speed) => {
    for (let i = 0; i < N_CHIP; i++) {
      const c = chipData[i];
      d.position.set(c.x, FLOOR_Y + c.h / 2, wrap(c.z, t, speed));
      d.rotation.set(0, c.rot, 0);
      d.scale.set(c.w, c.h, c.dep);
      d.updateMatrix(); chips.setMatrixAt(i, d.matrix);
    }
    chips.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < N_CAP; i++) {
      const c = capData[i];
      d.position.set(c.x, FLOOR_Y + c.h / 2, wrap(c.z, t, speed));
      d.rotation.set(0, 0, 0); d.scale.set(c.r / 0.3, c.h / 1.1, c.r / 0.3);
      d.updateMatrix(); caps.setMatrixAt(i, d.matrix);
    }
    caps.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < N_LED; i++) {
      const c = ledData[i];
      const blink = 0.4 + Math.abs(Math.sin(t * c.sp + c.ph)) * 1.1;
      d.position.set(c.x, FLOOR_Y + 0.12, wrap(c.z, t, speed));
      d.rotation.set(0, 0, 0); d.scale.setScalar(blink);
      d.updateMatrix(); leds.setMatrixAt(i, d.matrix);
    }
    leds.instanceMatrix.needsUpdate = true;
  };
  return group;
}

/* ===========================================================================
   Warm atmospheric dust motes
=========================================================================== */
function createDust(count = 1400) {
  const pos = new Float32Array(count * 3);
  const rnd = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 120;
    pos[i * 3 + 1] = FLOOR_Y + Math.random() * 22;
    pos[i * 3 + 2] = Math.random() * COMP_RANGE;
    rnd[i] = 0.4 + Math.random() * 1.4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e3);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uSpeed: { value: 22 }, uRange: { value: COMP_RANGE },
      uSize: { value: 18 * Math.min(window.devicePixelRatio, 2) }, uCol: { value: COL.gold },
    },
    vertexShader: `
      uniform float uTime,uSpeed,uRange,uSize; attribute float aRnd; varying float vA;
      void main(){
        vec3 p = position;
        p.z = mod(p.z + uTime*uSpeed, uRange) - uRange + 40.0;
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        gl_PointSize = uSize*aRnd*(1.0/-mv.z);
        gl_Position = projectionMatrix*mv;
        vA = (1.0 - smoothstep(10.0,38.0,p.z)) * smoothstep(-280.0,-40.0,p.z);
      }`,
    fragmentShader: `
      uniform vec3 uCol; varying float vA;
      void main(){ float d=distance(gl_PointCoord,vec2(0.5)); gl_FragColor=vec4(uCol, smoothstep(0.5,0.0,d)*vA*0.5); }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.userData.update = (t) => { mat.uniforms.uTime.value = t; };
  return pts;
}

/* ===========================================================================
   The AI head — holographic likeness (bald + glasses + goatee), breathing
=========================================================================== */
const HEAD_R = 1.55;
const HEAD_SCALE = 1.7;
function warpHead(v) {
  let x = v.x, y = v.y, z = v.z;
  x *= 0.86; y *= 1.16; z *= 0.97;
  if (z < 0) z *= 0.9;
  if (y < 0.1) {
    const t = clamp((y + 1.0) / 1.1, 0, 1);
    const taper = 0.5 + 0.5 * t;
    x *= taper;
    if (z < 0) z *= 0.6 + 0.4 * t;
  }
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
  const pts = [];
  const hw = w / 2 - r, hh = h / 2 - r;
  const corners = [[hw, hh, 0], [-hw, hh, Math.PI / 2], [-hw, -hh, Math.PI], [hw, -hh, Math.PI * 1.5]];
  for (const [cx, cy, start] of corners)
    for (let i = 0; i <= 6; i++) {
      const a = start + (i / 6) * (Math.PI / 2);
      pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0));
    }
  return pts;
}

class AIHead {
  constructor() {
    this.group = new THREE.Group();
    this.inner = new THREE.Group();
    this.group.add(this.inner);
    this.gaze = new THREE.Vector2(0, 0);
    this.gazeForce = 0.34;
    this.standardMats = [];
    this._buildShell();
    this._buildNodes();
    this._buildLinks();
    this._buildCore();
    this._buildFace();
    this._buildRings();
  }
  _track(mat) { mat.transparent = true; this.standardMats.push({ mat, base: mat.opacity ?? 1 }); return mat; }

  _buildShell() {
    const base = new THREE.IcosahedronGeometry(1, 3);
    const bp = base.getAttribute('position');
    const v = new THREE.Vector3();
    for (let i = 0; i < bp.count; i++) { v.fromBufferAttribute(bp, i).normalize(); const p = warpHead(v); bp.setXYZ(i, p.x, p.y, p.z); }
    bp.needsUpdate = true;
    const mat = this._track(new THREE.LineBasicMaterial({ color: '#4a5cff', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.shell = new THREE.LineSegments(new THREE.WireframeGeometry(base), mat);
    this.inner.add(this.shell);
  }
  _buildNodes() {
    const src = new THREE.IcosahedronGeometry(1, 4);
    const sp = src.getAttribute('position');
    const n = sp.count;
    const positions = new Float32Array(n * 3), colors = new Float32Array(n * 3), beard = new Float32Array(n);
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(sp, i).normalize();
      const p = warpHead(v); positions.set([p.x, p.y, p.z], i * 3);
      const c = headColor(v); colors.set([c.r, c.g, c.b], i * 3);
      beard[i] = isBeardDir(v) ? 1 : 0;
    }
    this.nodeGeo = new THREE.BufferGeometry();
    this.nodeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.nodeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.nodeGeo.setAttribute('aBeard', new THREE.BufferAttribute(beard, 1));
    this.nodeMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uDisperse: { value: 0 }, uSize: { value: 12 * Math.min(window.devicePixelRatio, 2) } },
      vertexShader: `
        uniform float uTime, uSize, uDisperse; attribute float aBeard; varying vec3 vColor;
        void main(){ vColor=color; vec3 dir=normalize(position); vec3 pos=position+dir*uDisperse*2.6;
          vec4 mv=modelViewMatrix*vec4(pos,1.0); float tw=0.7+0.3*sin(uTime*3.0+position.y*6.0);
          gl_PointSize=uSize*(1.0+aBeard*1.1)*tw*(1.0/-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `
        uniform float uOpacity,uDisperse; varying vec3 vColor;
        void main(){ float d=distance(gl_PointCoord,vec2(0.5)); float a=smoothstep(0.5,0.0,d)*uOpacity*(1.0-uDisperse*0.6); gl_FragColor=vec4(vColor,a); }`,
    });
    this.nodes = new THREE.Points(this.nodeGeo, this.nodeMat);
    this.inner.add(this.nodes);
  }
  _buildLinks() {
    const pos = this.nodeGeo.getAttribute('position'); const pts = [];
    for (let i = 0; i < 70; i++) {
      const a = (Math.random() * pos.count) | 0, b = (Math.random() * pos.count) | 0;
      const pa = new THREE.Vector3().fromBufferAttribute(pos, a), pb = new THREE.Vector3().fromBufferAttribute(pos, b);
      if (pa.distanceTo(pb) > 1.5) continue;
      pts.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.linkMat = this._track(new THREE.LineBasicMaterial({ color: '#19e3ff', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.links = new THREE.LineSegments(g, this.linkMat);
    this.inner.add(this.links);
  }
  _buildCore() {
    const mat = this._track(new THREE.MeshStandardMaterial({ color: '#19e3ff', emissive: '#19e3ff', emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.1, transparent: true }));
    this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), mat);
    this.core.position.set(0, 0.05, -0.2); this.inner.add(this.core);
    this.coreLight = new THREE.PointLight('#19e3ff', 9, 14); this.coreLight.position.set(0, 0.1, 0.4); this.inner.add(this.coreLight);
  }
  _buildFace() {
    const glassMat = this._track(new THREE.LineBasicMaterial({ color: '#19e3ff', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    const eyeY = 0.2, lensZ = 1.22, lensX = 0.46;
    const lensPts = roundedRectPoints(0.62, 0.4, 0.13);
    const makeLens = (sign) => { const g = new THREE.BufferGeometry().setFromPoints(lensPts); const loop = new THREE.LineLoop(g, glassMat); loop.position.set(sign * lensX, eyeY, lensZ); loop.rotation.y = sign * -0.32; return loop; };
    const bridge = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-lensX + 0.22, eyeY + 0.04, lensZ + 0.02), new THREE.Vector3(lensX - 0.22, eyeY + 0.04, lensZ + 0.02)]);
    const templeL = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-lensX - 0.28, eyeY + 0.07, lensZ - 0.05), new THREE.Vector3(-1.05, eyeY + 0.12, -0.2)]);
    const templeR = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(lensX + 0.28, eyeY + 0.07, lensZ - 0.05), new THREE.Vector3(1.05, eyeY + 0.12, -0.2)]);
    const glasses = new THREE.Group();
    glasses.add(makeLens(-1), makeLens(1), new THREE.Line(bridge, glassMat), new THREE.Line(templeL, glassMat), new THREE.Line(templeR, glassMat));
    const eyeMat = this._track(new THREE.MeshBasicMaterial({ color: '#eaf6ff', transparent: true }));
    const eyeGeo = new THREE.SphereGeometry(0.07, 14, 14);
    this.eyeL = new THREE.Mesh(eyeGeo, eyeMat); this.eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeL.position.set(-lensX, eyeY, lensZ - 0.16); this.eyeR.position.set(lensX, eyeY, lensZ - 0.16);
    this.inner.add(glasses, this.eyeL, this.eyeR);
  }
  _buildRings() {
    this.rings = [];
    const specs = [{ r: 2.05, color: '#7c5cff', axis: 'y', speed: -0.3 }, { r: 2.4, color: '#19e3ff', axis: 'x', speed: 0.22 }];
    for (const s of specs) {
      const mat = this._track(new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(s.r, 0.01, 8, 120), mat);
      if (s.axis === 'x') ring.rotation.x = Math.PI / 2;
      ring.userData.speed = s.speed; ring.userData.axis = s.axis;
      this.rings.push(ring); this.group.add(ring);
    }
  }
  setGaze(x, y) { this.gaze.set(clamp(x, -1.4, 1.4), clamp(y, -1.4, 1.4)); }
  update(t) {
    this.nodeMat.uniforms.uTime.value = t;
    const ty = this.gaze.x * this.gazeForce * 2.2, tx = -this.gaze.y * this.gazeForce * 1.6;
    this.inner.rotation.y += (ty - this.inner.rotation.y) * 0.08;
    this.inner.rotation.x += (tx - this.inner.rotation.x) * 0.08;
    const breathe = 1 + Math.sin(t * 1.4) * 0.018;
    this.inner.scale.setScalar(breathe);
    this.inner.position.y = Math.sin(t * 1.2) * 0.05;
    const pulse = 1 + Math.sin(t * 3.0) * 0.08;
    this.core.scale.setScalar(pulse);
    this.core.material.emissiveIntensity = 0.5 + Math.sin(t * 3.0) * 0.25;
    this.coreLight.intensity = 7 + Math.sin(t * 3.0) * 3;
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
  {
    const g = new THREE.Group();
    const ico = new THREE.IcosahedronGeometry(2.1, 1);
    g.add(new THREE.LineSegments(new THREE.WireframeGeometry(ico), new THREE.LineBasicMaterial({ color: '#19e3ff', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })));
    g.add(new THREE.Points(ico, new THREE.PointsMaterial({ color: '#ff8a1e', size: 0.16, transparent: true, blending: THREE.AdditiveBlending })));
    g.userData.update = (t) => { g.rotation.y = t * 0.5; g.rotation.x = Math.sin(t * 0.3) * 0.3; };
    objs.solutions = g;
  }
  {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 2), new THREE.MeshBasicMaterial({ color: '#19e3ff' })));
    const orbits = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4 + i * 0.7, 0.015, 8, 120), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ff8a1e' : '#19e3ff', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }));
      ring.rotation.x = Math.PI / 2 + i * 0.4; ring.rotation.y = i * 0.5;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), new THREE.MeshBasicMaterial({ color: '#ffc46b' }));
      g.add(ring, m); orbits.push({ ring, m, r: 1.4 + i * 0.7, s: 0.6 + i * 0.3, off: i * 2 });
    }
    g.userData.update = (t) => { g.rotation.y = t * 0.15; orbits.forEach((o) => { o.m.position.set(Math.cos(t * o.s + o.off) * o.r, 0, Math.sin(t * o.s + o.off) * o.r); o.m.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), o.ring.rotation.x); }); };
    objs.about = g;
  }
  {
    const g = new THREE.Group();
    const count = 60;
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: '#0a1430', metalness: 0.6, roughness: 0.3, emissive: '#ff8a1e', emissiveIntensity: 0.5 }), count);
    const data = Array.from({ length: count }, () => ({ x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5, z: (Math.random() - 0.5) * 5, s: 0.4 + Math.random() * 1.4, sp: (Math.random() - 0.5) * 1.2, ph: Math.random() * 6 }));
    const d = new THREE.Object3D(); g.add(im);
    g.userData.update = (t) => { data.forEach((p, i) => { d.position.set(p.x, p.y + Math.sin(t * 0.6 + p.ph) * 0.3, p.z); d.rotation.set(t * p.sp, t * p.sp * 0.7, 0); d.scale.setScalar(p.s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.instanceMatrix.needsUpdate = true; g.rotation.y = t * 0.1; };
    objs.work = g;
  }
  {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 2), new THREE.MeshBasicMaterial({ color: '#19e3ff' }));
    g.add(core); const rings = [];
    for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 8, 120), new THREE.MeshBasicMaterial({ color: '#ff8a1e', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })); r.rotation.x = Math.PI / 2; g.add(r); rings.push({ r, off: i / 4 }); }
    g.userData.update = (t) => { core.scale.setScalar(1 + Math.sin(t * 4) * 0.12); rings.forEach((o) => { const k = (t * 0.4 + o.off) % 1; o.r.scale.setScalar(0.4 + k * 3.2); o.r.material.opacity = (1 - k) * 0.6; }); };
    objs.contact = g;
  }
  objs.home = null;
  return objs;
}

/* ===========================================================================
   Post FX — chromatic aberration + vignette + grain (DOF/bloom are passes)
=========================================================================== */
const PostFXShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAberration: { value: 0.0026 }, uBlur: { value: 0.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uAberration, uBlur; varying vec2 vUv;
    void main(){
      vec2 uv=vUv; vec2 dir=uv-0.5; float dist=length(dir);
      vec3 col=vec3(0.0);
      const int N=5;
      for(int i=0;i<N;i++){
        float k=float(i)/float(N-1);
        float scale=1.0-uBlur*dist*k;
        vec2 suv=0.5+dir*scale;
        float ab=uAberration*(0.4+dist*1.4);
        col.r+=texture2D(tDiffuse, suv-dir*ab).r;
        col.g+=texture2D(tDiffuse, suv).g;
        col.b+=texture2D(tDiffuse, suv+dir*ab).b;
      }
      col/=float(N);
      col*=mix(1.0, smoothstep(1.15,0.2,dist), 0.92);
      float grain=(fract(sin(dot(uv*(uTime+1.0),vec2(12.9898,78.233)))*43758.5453)-0.5)*0.04;
      gl_FragColor=vec4(col+grain,1.0);
    }`,
};

/* ===========================================================================
   World
=========================================================================== */
class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.pointer = new THREE.Vector2(0, 0);
    this.gazeTarget = new THREE.Vector2(0, 0);
    this.gazeLocked = false;
    this.fx = { speed: 1, aberration: 0.0026, blur: 0.0, fov: 55, bokeh: 0.6 };

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#05060a');
    this.scene.fog = new THREE.FogExp2('#06070c', 0.02);

    // PBR environment for metallic component reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 600);
    this.camera.position.set(0, 1.6, 9);
    this.scene.add(this.camera);

    // warm lighting
    this.scene.add(new THREE.AmbientLight('#46341f', 1.1));
    const key = new THREE.DirectionalLight('#ffe2b0', 2.4); key.position.set(6, 12, 5); this.scene.add(key);
    const fill = new THREE.PointLight('#ff9a3a', 90, 70); fill.position.set(0, 6, -6); this.scene.add(fill);
    const side = new THREE.PointLight('#ffb455', 50, 50); side.position.set(-14, 5, 2); this.scene.add(side);
    const cool = new THREE.PointLight('#3fa9ff', 22, 40); cool.position.set(0, 5, 7); this.scene.add(cool);

    // --- the board world ---
    this.floor = createPCB(FLOOR_Y, 1.0, 1);
    this.ceiling = createPCB(FLOOR_Y + 30, 0.13, -1); this.ceiling.rotation.z = Math.PI; // faint upper canopy
    this.heroCPU = createHeroCPU();
    this.components = createComponents();
    this.dust = createDust();
    this.scene.add(this.floor, this.ceiling, this.heroCPU, this.components, this.dust);

    // --- the head, hovering above the CPU ---
    this.head = new AIHead();
    this.head.group.scale.setScalar(HEAD_SCALE);
    this.head.group.position.set(0, 2.0, 0);
    this.scene.add(this.head.group);

    // --- page heroes ---
    this.pageObjects = buildPageObjects();
    for (const id in this.pageObjects) { const o = this.pageObjects[id]; if (o) { o.visible = false; o.scale.setScalar(0.001); o.position.set(0, 2.0, 0); this.scene.add(o); } }
    this.activePageObj = null;

    // --- the user's data point (rides with the camera) ---
    this.dataPoint = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#3fa9ff', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending }));
    this.dataPoint.scale.setScalar(0.7); this.dataPoint.position.set(0, -1.4, -4);
    this.camera.add(this.dataPoint);
    const dpLight = new THREE.PointLight('#3fa9ff', 10, 9); dpLight.position.copy(this.dataPoint.position); this.camera.add(dpLight);

    this._initPost();
    addEventListener('resize', () => this._resize());
    addEventListener('pointermove', (e) => { this.pointer.x = (e.clientX / innerWidth) * 2 - 1; this.pointer.y = -((e.clientY / innerHeight) * 2 - 1); });
  }

  _initPost() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.setSize(innerWidth, innerHeight);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bokeh = new BokehPass(this.scene, this.camera, { focus: 9.0, aperture: 0.0014, maxblur: 0.008, width: innerWidth, height: innerHeight });
    this.composer.addPass(this.bokeh);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.55, 0.18);
    this.composer.addPass(this.bloom);
    this.postfx = new ShaderPass(PostFXShader);
    this.composer.addPass(this.postfx);
    this.composer.addPass(new OutputPass());
  }

  setGaze(x, y, locked) { this.gazeTarget.set(x, y); this.gazeLocked = locked; }

  warp(on) {
    gsap.to(this.fx, { speed: on ? 4.0 : 1, aberration: on ? 0.011 : 0.0026, blur: on ? 0.55 : 0.0, fov: on ? 78 : 55, duration: on ? 0.9 : 1.2, ease: on ? 'power2.in' : 'power2.out' });
  }

  showPageObject(id) {
    if (this.activePageObj) { const prev = this.activePageObj; gsap.to(prev.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.5, ease: 'power2.in', onComplete: () => (prev.visible = false) }); }
    const o = this.pageObjects[id]; this.activePageObj = o || null;
    if (o) { o.visible = true; gsap.fromTo(o.scale, { x: 0.001, y: 0.001, z: 0.001 }, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'back.out(1.6)', delay: 0.2 }); }
  }
  hidePageObject() {
    if (this.activePageObj) { const prev = this.activePageObj; gsap.to(prev.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.5, ease: 'power2.in', onComplete: () => (prev.visible = false) }); this.activePageObj = null; }
  }

  start() { this.clock.start(); this._tick(); }

  _tick() {
    const t = this.clock.getElapsedTime();
    const spd = this.fx.speed;

    this.floor.userData.mat.uniforms.uScroll.value = t * 22.0 * spd;
    this.floor.userData.mat.uniforms.uTime.value = t;
    this.ceiling.userData.mat.uniforms.uScroll.value = t * 22.0 * spd;
    this.ceiling.userData.mat.uniforms.uTime.value = t;
    this.components.userData.update(t, 22.0 * spd);
    this.dust.userData.update(t);
    this.heroCPU.userData.update(t);

    if (!this.gazeLocked) this.gazeTarget.set(this.pointer.x * 0.5, this.pointer.y * 0.5);
    this.head.setGaze(this.gazeTarget.x, this.gazeTarget.y);
    this.head.update(t);
    if (this.activePageObj) this.activePageObj.userData.update(t);

    // cinematic banking flight; camera stays framing the head
    this.camera.position.x += (this.pointer.x * 1.3 + Math.sin(t * 0.25) * 0.6 - this.camera.position.x) * 0.04;
    this.camera.position.y += (2.1 + this.pointer.y * 0.5 + Math.sin(t * 0.4) * 0.25 - this.camera.position.y) * 0.04;
    this.camera.lookAt(0, 1.4, -7);
    this.camera.rotateZ(Math.sin(t * 0.35) * 0.04 + this.pointer.x * 0.05);

    if (Math.abs(this.camera.fov - this.fx.fov) > 0.01) { this.camera.fov += (this.fx.fov - this.camera.fov) * 0.1; this.camera.updateProjectionMatrix(); }

    this.postfx.uniforms.uTime.value = t;
    this.postfx.uniforms.uAberration.value = this.fx.aberration;
    this.postfx.uniforms.uBlur.value = this.fx.blur;

    this.composer.render();
    requestAnimationFrame(() => this._tick());
  }

  _resize() {
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setSize(innerWidth, innerHeight);
    this.bloom.setSize(innerWidth, innerHeight);
  }
}

/* ===========================================================================
   UI / Router
=========================================================================== */
class Hub {
  constructor(world) {
    this.world = world; this.busy = false;
    this.stage = document.getElementById('stage');
    this.pages = document.getElementById('pages');
    this.menuEl = document.getElementById('menu');
    this.chat = document.getElementById('chat');
    this.chatLog = document.getElementById('chat-log');
    this.promptEl = document.getElementById('chat-prompt');
    this.enterEl = document.getElementById('chat-enter');
    this.back = document.getElementById('back');
    this._buildMenu();
    this.back.addEventListener('click', () => this.goHub());
  }
  _buildMenu() {
    const n = MENU.length, R = 33;
    MENU.forEach((item, i) => {
      const angle = Math.PI / 2 - (i * 2 * Math.PI) / n;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      item.dir = { x: dx, y: dy };
      const el = document.createElement('button');
      el.className = 'menu-item';
      el.style.left = `calc(50% + ${dx * R}vmin)`;
      el.style.top = `calc(50% - ${dy * R}vmin)`;
      el.innerHTML = `<span class="menu-item__idx">0${i + 1}</span><span class="menu-item__label">${item.label}</span><span class="menu-item__node"></span>`;
      el.addEventListener('pointerenter', () => { if (this.busy) return; el.classList.add('is-active'); this.world.setGaze(dx, dy, true); });
      el.addEventListener('pointerleave', () => { if (this.busy) return; el.classList.remove('is-active'); this.world.setGaze(0, 0, false); });
      el.addEventListener('click', () => this.navigate(item, el));
      item.el = el; this.menuEl.appendChild(el);
    });
  }
  async navigate(item, el) {
    if (this.busy) return;
    this.busy = true;
    try {
      MENU.forEach((m) => m.el.classList.remove('is-active'));
      el.classList.add('is-active');
      this.world.setGaze(item.dir.x, item.dir.y, true);
      gsap.to(this.menuEl, { opacity: 0.2, duration: 0.5 });
      await wait(650);
      this.world.head.fadeOut();
      this._showChat();
      await wait(350);
      await this._type(`Navigiere zu ${item.label}`);
      await wait(260);
      this._pressEnter();
      this._bubble('user', `Navigiere zu ${item.label}`);
      this.promptEl.innerHTML = ''; this._caret(false);
      await wait(420);
      this._bubble('ai', `Verbindung hergestellt — Warp zu <b>${item.label}</b> …`);
      this.world.warp(true);
      await wait(750);
      await this._foldToPage(item.id);
      this.world.warp(false);
      this.world.showPageObject(item.id);
    } catch (err) {
      console.error('navigate failed:', err);
    } finally {
      this.busy = false;
    }
  }
  _showChat() {
    this.chatLog.innerHTML = ''; this.promptEl.innerHTML = '';
    this._caret(true); this.enterEl.classList.remove('is-pressed');
    gsap.killTweensOf(this.chat); this.chat.style.visibility = 'visible';
    gsap.fromTo(this.chat, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
  }
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
    if (this.busy) return;
    this.busy = true;
    this.back.classList.remove('is-shown');
    this.world.hidePageObject();
    const page = document.querySelector('.subpage.is-shown');
    if (page) { await this._tween(page, { duration: 0.8, rotationX: 85, y: 180, z: -500, opacity: 0, transformOrigin: '50% 100%', ease: 'power3.in' }); page.classList.remove('is-shown'); }
    this.pages.style.visibility = 'hidden'; this.pages.style.pointerEvents = 'none';
    this.world.head.reset();
    this.world.setGaze(0, 0, false);
    MENU.forEach((m) => m.el.classList.remove('is-active'));
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
