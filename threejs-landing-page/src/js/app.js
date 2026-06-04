import * as THREE from 'three';
import { gsap } from 'gsap';

/* ===========================================================================
   AHMED KAMAL SOLUTIONS — futuristic AI hub
   A glowing AI head sits at the centre. Menu items orbit around it; the head
   turns to look at whichever item you hover. Clicking an item fades the head
   away, an AI chat types "Navigiere zu X", presses Enter, and the whole stage
   folds away in 3D to reveal the chosen sub-page.
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

/* ===========================================================================
   Particle nebula behind everything
=========================================================================== */
function createParticleField({ count = 4200, radius = 26 } = {}) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const cA = new THREE.Color('#7c5cff');
  const cB = new THREE.Color('#19e3ff');

  for (let i = 0; i < count; i++) {
    const r = radius * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions.set(
      [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ],
      i * 3
    );
    const mixed = cA.clone().lerp(cB, Math.random());
    colors.set([mixed.r, mixed.g, mixed.b], i * 3);
    scales[i] = Math.random() * 1.5 + 0.4;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 7.0 * Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: `
      uniform float uTime; uniform float uSize;
      attribute float aScale; varying vec3 vColor;
      void main(){
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.6 + 0.4 * sin(uTime * 1.6 + aScale * 12.0);
        gl_PointSize = uSize * aScale * tw * (1.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vColor;
      void main(){
        float d = distance(gl_PointCoord, vec2(0.5));
        gl_FragColor = vec4(vColor, smoothstep(0.5, 0.0, d));
      }`,
  });

  const points = new THREE.Points(geometry, material);
  points.userData.update = (t) => {
    material.uniforms.uTime.value = t;
    points.rotation.y = t * 0.02;
    points.rotation.x = Math.sin(t * 0.04) * 0.08;
  };
  return points;
}

/* ===========================================================================
   The AI head — a glowing neural orb with a clear gaze direction (eyes/visor)
=========================================================================== */
class AIHead {
  constructor() {
    this.group = new THREE.Group();        // whole head (rotates to gaze)
    this.inner = new THREE.Group();         // idle bob / breathing
    this.group.add(this.inner);

    this.gaze = new THREE.Vector2(0, 0);    // desired look direction (-1..1)
    this.gazeForce = 0.32;                  // how far it turns
    this.standardMats = [];                 // {mat, base} for fade

    this._buildShell();
    this._buildNodes();
    this._buildLinks();
    this._buildCore();
    this._buildFace();
    this._buildRings();
  }

  _track(mat) {
    mat.transparent = true;
    this.standardMats.push({ mat, base: mat.opacity ?? 1 });
    return mat;
  }

  _buildShell() {
    const geo = new THREE.IcosahedronGeometry(1.55, 2);
    const wire = new THREE.WireframeGeometry(geo);
    const mat = this._track(
      new THREE.LineBasicMaterial({ color: '#3a4cff', transparent: true, opacity: 0.5 })
    );
    this.shell = new THREE.LineSegments(wire, mat);
    this.inner.add(this.shell);
  }

  _buildNodes() {
    // Surface "neurons" sampled from a denser icosphere, dispersible on exit.
    const src = new THREE.IcosahedronGeometry(1.55, 4);
    this.nodeGeo = new THREE.BufferGeometry();
    this.nodeGeo.setAttribute('position', src.getAttribute('position').clone());

    this.nodeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1 },
        uDisperse: { value: 0 },
        uSize: { value: 11 * Math.min(window.devicePixelRatio, 2) },
        uColorA: { value: new THREE.Color('#19e3ff') },
        uColorB: { value: new THREE.Color('#ff4ecd') },
      },
      vertexShader: `
        uniform float uTime; uniform float uSize; uniform float uDisperse;
        varying float vMix;
        void main(){
          vec3 p = normalize(position);
          float n = sin(p.x*4.0 + uTime) * cos(p.y*4.0 - uTime*0.7);
          vMix = 0.5 + 0.5 * n;
          // explode outward along the normal when dispersing
          vec3 pos = position * (1.0 + uDisperse * 2.6) + p * uDisperse * 1.5;
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          float tw = 0.7 + 0.3 * sin(uTime*3.0 + position.x*8.0);
          gl_PointSize = uSize * tw * (1.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uOpacity; uniform float uDisperse;
        uniform vec3 uColorA; uniform vec3 uColorB;
        varying float vMix;
        void main(){
          float d = distance(gl_PointCoord, vec2(0.5));
          float a = smoothstep(0.5, 0.0, d) * uOpacity * (1.0 - uDisperse * 0.6);
          gl_FragColor = vec4(mix(uColorA, uColorB, vMix), a);
        }`,
    });

    this.nodes = new THREE.Points(this.nodeGeo, this.nodeMat);
    this.inner.add(this.nodes);
  }

  _buildLinks() {
    // A few synapse lines flickering between random surface points.
    const pos = this.nodeGeo.getAttribute('position');
    const pts = [];
    for (let i = 0; i < 60; i++) {
      const a = (Math.random() * pos.count) | 0;
      const b = (Math.random() * pos.count) | 0;
      const pa = new THREE.Vector3().fromBufferAttribute(pos, a);
      const pb = new THREE.Vector3().fromBufferAttribute(pos, b);
      if (pa.distanceTo(pb) > 1.6) continue;
      pts.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.linkMat = this._track(
      new THREE.LineBasicMaterial({
        color: '#19e3ff',
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.links = new THREE.LineSegments(g, this.linkMat);
    this.inner.add(this.links);
  }

  _buildCore() {
    const mat = this._track(
      new THREE.MeshStandardMaterial({
        color: '#19e3ff',
        emissive: '#19e3ff',
        emissiveIntensity: 2.4,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
      })
    );
    this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 2), mat);
    this.inner.add(this.core);

    this.coreLight = new THREE.PointLight('#19e3ff', 40, 14);
    this.inner.add(this.coreLight);
  }

  _buildFace() {
    // Two glowing eyes + a visor bar at the front (+Z) so the gaze is legible.
    const eyeMat = this._track(
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true })
    );
    const eyeGeo = new THREE.SphereGeometry(0.12, 16, 16);
    this.eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeL.position.set(-0.42, 0.18, 1.45);
    this.eyeR.position.set(0.42, 0.18, 1.45);

    const visorMat = this._track(
      new THREE.MeshBasicMaterial({
        color: '#19e3ff',
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      })
    );
    this.visor = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 8, 40, Math.PI), visorMat);
    this.visor.position.set(0, 0.12, 1.32);
    this.visor.rotation.z = Math.PI;

    this.inner.add(this.eyeL, this.eyeR, this.visor);
  }

  _buildRings() {
    this.rings = [];
    const specs = [
      { r: 2.1, color: '#7c5cff', axis: 'x', speed: 0.5 },
      { r: 2.45, color: '#19e3ff', axis: 'y', speed: -0.35 },
      { r: 2.75, color: '#ff4ecd', axis: 'z', speed: 0.22 },
    ];
    for (const s of specs) {
      const mat = this._track(
        new THREE.MeshBasicMaterial({
          color: s.color,
          transparent: true,
          opacity: 0.4,
          blending: THREE.AdditiveBlending,
        })
      );
      const ring = new THREE.Mesh(new THREE.TorusGeometry(s.r, 0.012, 8, 120), mat);
      if (s.axis === 'x') ring.rotation.x = Math.PI / 2;
      if (s.axis === 'z') ring.rotation.y = Math.PI / 2;
      ring.userData.speed = s.speed;
      ring.userData.axis = s.axis;
      this.rings.push(ring);
      this.group.add(ring); // rings hang on the outer group, not the gazing inner
    }
  }

  setGaze(x, y) {
    this.gaze.set(clamp(x, -1.4, 1.4), clamp(y, -1.4, 1.4));
  }

  update(t) {
    this.nodeMat.uniforms.uTime.value = t;

    // Smoothly turn the head toward the gaze target.
    const ty = this.gaze.x * this.gazeForce * 2.2;   // yaw
    const tx = -this.gaze.y * this.gazeForce * 1.6;  // pitch
    this.inner.rotation.y += (ty - this.inner.rotation.y) * 0.08;
    this.inner.rotation.x += (tx - this.inner.rotation.x) * 0.08;

    // Breathing bob + core pulse.
    this.inner.position.y = Math.sin(t * 1.2) * 0.06;
    const pulse = 1 + Math.sin(t * 3.0) * 0.08;
    this.core.scale.setScalar(pulse);
    this.core.material.emissiveIntensity = 2.0 + Math.sin(t * 3.0) * 0.8;
    this.coreLight.intensity = 30 + Math.sin(t * 3.0) * 14;

    // Flicker synapses.
    this.linkMat.opacity = 0.18 + Math.abs(Math.sin(t * 2.0)) * 0.35;

    // Gyroscope rings.
    for (const ring of this.rings) {
      ring.rotation[ring.userData.axis] += ring.userData.speed * 0.01;
    }
    this.shell.rotation.y = -t * 0.05;
  }

  /** Disperse + fade the head (returns a gsap timeline). */
  fadeOut() {
    const tl = gsap.timeline();
    tl.to(this.nodeMat.uniforms.uDisperse, { value: 1, duration: 1.1, ease: 'power2.in' }, 0);
    tl.to(this.nodeMat.uniforms.uOpacity, { value: 0, duration: 1.1, ease: 'power2.in' }, 0);
    for (const { mat } of this.standardMats) {
      tl.to(mat, { opacity: 0, duration: 0.8, ease: 'power2.in' }, 0);
    }
    tl.to(this.group.scale, { x: 1.35, y: 1.35, z: 1.35, duration: 1.1, ease: 'power2.in' }, 0);
    return tl;
  }

  /** Reassemble the head (used when returning to the hub). */
  reset() {
    const tl = gsap.timeline();
    tl.to(this.nodeMat.uniforms.uDisperse, { value: 0, duration: 0.9, ease: 'power2.out' }, 0);
    tl.to(this.nodeMat.uniforms.uOpacity, { value: 1, duration: 0.9 }, 0);
    for (const { mat, base } of this.standardMats) {
      tl.to(mat, { opacity: base, duration: 0.9, ease: 'power2.out' }, 0);
    }
    tl.to(this.group.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'power2.out' }, 0);
    return tl;
  }
}

/* ===========================================================================
   World — renderer, camera, lights, the head, particles, parallax, loop
=========================================================================== */
class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.pointer = new THREE.Vector2(0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2('#04050c', 0.02);

    this.camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 100);
    this.camera.position.set(0, 0, 8.5);

    this.scene.add(new THREE.AmbientLight('#2a3060', 1.4));
    const key = new THREE.DirectionalLight('#7c5cff', 2.0);
    key.position.set(5, 6, 8);
    const rim = new THREE.PointLight('#19e3ff', 50, 50);
    rim.position.set(-8, -3, 4);
    this.scene.add(key, rim);

    this.head = new AIHead();
    this.scene.add(this.head.group);

    this.particles = createParticleField();
    this.scene.add(this.particles);

    this._buildBackdropShapes();

    addEventListener('resize', () => this._resize());
    addEventListener('pointermove', (e) => {
      this.pointer.x = (e.clientX / innerWidth) * 2 - 1;
      this.pointer.y = -((e.clientY / innerHeight) * 2 - 1);
    });

    // Gaze state: where the head should look. Idle => follows pointer.
    this.gazeTarget = new THREE.Vector2(0, 0);
    this.gazeLocked = false;
  }

  _buildBackdropShapes() {
    this.shapes = new THREE.Group();
    const geos = [
      new THREE.OctahedronGeometry(0.6),
      new THREE.TetrahedronGeometry(0.7),
      new THREE.TorusGeometry(0.5, 0.18, 12, 32),
      new THREE.IcosahedronGeometry(0.6, 0),
    ];
    for (let i = 0; i < 9; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: i % 2 ? '#19e3ff' : '#7c5cff',
        metalness: 0.5, roughness: 0.3, flatShading: true,
        transparent: true, opacity: 0.55,
      });
      const m = new THREE.Mesh(geos[i % geos.length], mat);
      const a = Math.random() * Math.PI * 2;
      const d = 7 + Math.random() * 6;
      m.position.set(Math.cos(a) * d, (Math.random() - 0.5) * 10, Math.sin(a) * d - 6);
      m.scale.setScalar(0.6 + Math.random());
      m.userData = {
        rs: new THREE.Vector3(Math.random() * 0.4, Math.random() * 0.4, Math.random() * 0.4),
        by: m.position.y, fs: 0.3 + Math.random() * 0.5, ph: Math.random() * 6,
      };
      this.shapes.add(m);
    }
    this.scene.add(this.shapes);
  }

  setGaze(x, y, locked) {
    this.gazeTarget.set(x, y);
    this.gazeLocked = locked;
  }

  start() { this.clock.start(); this._tick(); }

  _tick() {
    const t = this.clock.getElapsedTime();

    // Idle gaze follows the pointer unless locked onto a menu item.
    if (!this.gazeLocked) this.gazeTarget.set(this.pointer.x * 0.5, this.pointer.y * 0.5);
    this.head.setGaze(this.gazeTarget.x, this.gazeTarget.y);
    this.head.update(t);

    this.particles.userData.update(t);

    for (const m of this.shapes.children) {
      const u = m.userData;
      m.position.y = u.by + Math.sin(t * u.fs + u.ph) * 0.5;
      m.rotation.x += u.rs.x * 0.01;
      m.rotation.y += u.rs.y * 0.01;
    }

    // Subtle camera parallax.
    this.camera.position.x += (this.pointer.x * 0.6 - this.camera.position.x) * 0.04;
    this.camera.position.y += (this.pointer.y * 0.4 - this.camera.position.y) * 0.04;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this._tick());
  }

  _resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
}

/* ===========================================================================
   UI / Router — orbiting menu, gaze hand-off, chat sequence, 3D page fold
=========================================================================== */
class Hub {
  constructor(world) {
    this.world = world;
    this.busy = false;

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
    const n = MENU.length;
    const R = 34; // vmin radius
    MENU.forEach((item, i) => {
      const angle = Math.PI / 2 - (i * 2 * Math.PI) / n; // start at top, go clockwise
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      item.dir = { x: dx, y: dy };

      const el = document.createElement('button');
      el.className = 'menu-item';
      el.style.left = `calc(50% + ${dx * R}vmin)`;
      el.style.top = `calc(50% - ${dy * R}vmin)`;
      el.innerHTML = `<span class="menu-item__idx">0${i + 1}</span>
                      <span class="menu-item__label">${item.label}</span>`;

      el.addEventListener('pointerenter', () => {
        if (this.busy) return;
        el.classList.add('is-active');
        this.world.setGaze(dx, dy, true);
      });
      el.addEventListener('pointerleave', () => {
        if (this.busy) return;
        el.classList.remove('is-active');
        this.world.setGaze(0, 0, false);
      });
      el.addEventListener('click', () => this.navigate(item, el));

      item.el = el;
      this.menuEl.appendChild(el);
    });
  }

  async navigate(item, el) {
    if (this.busy) return;
    this.busy = true;

    // 1. Lock the head's gaze onto the chosen item and let it turn.
    MENU.forEach((m) => m.el.classList.remove('is-active'));
    el.classList.add('is-active');
    this.world.setGaze(item.dir.x, item.dir.y, true);
    gsap.to(this.menuEl, { opacity: 0.25, duration: 0.5 });
    await wait(650);

    // 2. Fade the head away + reveal the chat.
    this.world.head.fadeOut();
    this._showChat();
    await wait(350);

    // 3. Type the navigation prompt, then "press" Enter.
    await this._type(`Navigiere zu ${item.label}`);
    await wait(280);
    this._pressEnter();
    this._bubble('user', `Navigiere zu ${item.label}`);
    this.promptEl.innerHTML = '';
    this._caret(false);
    await wait(450);
    this._bubble('ai', `Verstanden — öffne <b>${item.label}</b> …`);
    await wait(750);

    // 4. Fold the whole stage away in 3D and unfold the sub-page.
    await this._foldToPage(item.id);
    this.busy = false;
  }

  /* ----------------------------- chat bits ------------------------------ */
  _showChat() {
    this.chatLog.innerHTML = '';
    this.promptEl.innerHTML = '';
    this._caret(true);
    this.enterEl.classList.remove('is-pressed');
    gsap.killTweensOf(this.chat);
    this.chat.style.visibility = 'visible';
    gsap.fromTo(
      this.chat,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
    );
  }
  _hideChat() {
    gsap.to(this.chat, {
      opacity: 0, y: 20, duration: 0.4,
      onComplete: () => { this.chat.style.visibility = 'hidden'; this.chatLog.innerHTML = ''; },
    });
  }
  _caret(on) {
    this.promptEl.querySelector('.chat__caret')?.remove();
    if (on) {
      const c = document.createElement('span');
      c.className = 'chat__caret';
      this.promptEl.appendChild(c);
    }
  }
  async _type(text) {
    const caret = this.promptEl.querySelector('.chat__caret');
    for (const ch of text) {
      this.promptEl.insertBefore(document.createTextNode(ch), caret || null);
      await wait(40 + Math.random() * 35);
    }
  }
  _pressEnter() {
    this.enterEl.classList.add('is-pressed');
    setTimeout(() => this.enterEl.classList.remove('is-pressed'), 220);
  }
  _bubble(kind, html) {
    const b = document.createElement('div');
    b.className = `bubble bubble--${kind}`;
    b.innerHTML = html;
    this.chatLog.appendChild(b);
    gsap.from(b, { opacity: 0, y: 12, duration: 0.35, ease: 'power2.out' });
  }

  /* --------------------------- 3D page fold ----------------------------- */
  async _foldToPage(pageId) {
    this._hideChat();

    await gsap.to(this.stage, {
      duration: 0.9, rotationX: -88, y: -180, z: -500, opacity: 0,
      transformOrigin: '50% 0%', ease: 'power3.in',
    });
    this.stage.style.visibility = 'hidden';

    // Activate the target sub-page and unfold it toward the viewer.
    document.querySelectorAll('.subpage').forEach((p) => p.classList.remove('is-shown'));
    const page = document.querySelector(`.subpage[data-page="${pageId}"]`);
    this.pages.style.visibility = 'visible';
    this.pages.style.pointerEvents = 'auto';
    page.classList.add('is-shown');
    this.back.classList.add('is-shown');

    gsap.set(page, { rotationX: 80, y: 160, z: -400, opacity: 0, transformOrigin: '50% 100%' });
    await gsap.to(page, {
      duration: 1.0, rotationX: 0, y: 0, z: 0, opacity: 1, ease: 'power3.out',
    });
  }

  async goHub() {
    if (this.busy) return;
    this.busy = true;
    this.back.classList.remove('is-shown');

    const page = document.querySelector('.subpage.is-shown');
    if (page) {
      await gsap.to(page, {
        duration: 0.8, rotationX: 85, y: 180, z: -400, opacity: 0,
        transformOrigin: '50% 100%', ease: 'power3.in',
      });
      page.classList.remove('is-shown');
    }
    this.pages.style.visibility = 'hidden';
    this.pages.style.pointerEvents = 'none';

    // Rebuild the head while the stage folds back in.
    this.world.head.reset();
    this.world.setGaze(0, 0, false);
    MENU.forEach((m) => m.el.classList.remove('is-active'));

    this.stage.style.visibility = 'visible';
    gsap.set(this.stage, { rotationX: 70, y: -160, z: -500, opacity: 0, transformOrigin: '50% 0%' });
    gsap.to(this.menuEl, { opacity: 1, duration: 0.8 });
    await gsap.to(this.stage, {
      duration: 1.0, rotationX: 0, y: 0, z: 0, opacity: 1, ease: 'power3.out',
    });
    this.busy = false;
  }
}

/* ===========================================================================
   Boot
=========================================================================== */
const world = new World(document.getElementById('webgl'));
const hub = new Hub(world);

const loader = document.getElementById('loader');
addEventListener('load', () => {
  setTimeout(() => {
    loader.classList.add('hidden');
    world.start();
  }, 700);
});
