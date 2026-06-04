import * as THREE from 'three';
import { createParticleField } from './particles.js';

/**
 * Owns the WebGL world: renderer, camera, lights, floating geometry and the
 * particle field. Handles the render loop and mouse-parallax camera lean.
 */
export class Scene {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();

    // Pointer target (normalised -1..1) and the smoothed value we lerp toward.
    this.pointer = new THREE.Vector2(0, 0);
    this.parallax = new THREE.Vector2(0, 0);

    // Scroll progress 0..1, driven externally by the GSAP scroll module.
    this.scrollProgress = 0;

    this._initRenderer();
    this._initSceneGraph();
    this._initLights();
    this._initShapes();
    this._initParticles();
    this._bindEvents();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _initSceneGraph() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2('#05060d', 0.025);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 12);

    // Group holding all floating shapes so we can rotate them collectively.
    this.shapeGroup = new THREE.Group();
    this.scene.add(this.shapeGroup);
  }

  _initLights() {
    this.scene.add(new THREE.AmbientLight('#3a3f66', 1.2));

    const key = new THREE.DirectionalLight('#7b5cff', 2.2);
    key.position.set(5, 6, 8);
    this.scene.add(key);

    const rim = new THREE.PointLight('#22d3ee', 60, 60);
    rim.position.set(-8, -4, 4);
    this.scene.add(rim);
  }

  _initShapes() {
    const geometries = [
      new THREE.IcosahedronGeometry(1.2, 0),
      new THREE.TorusGeometry(0.9, 0.35, 16, 60),
      new THREE.OctahedronGeometry(1.3, 0),
      new THREE.DodecahedronGeometry(1.1, 0),
      new THREE.TorusKnotGeometry(0.7, 0.26, 90, 16),
      new THREE.ConeGeometry(1, 1.8, 6),
    ];

    this.shapes = [];

    geometries.forEach((geo, i) => {
      const material = new THREE.MeshStandardMaterial({
        color: i % 2 ? '#22d3ee' : '#7b5cff',
        metalness: 0.4,
        roughness: 0.25,
        flatShading: true,
      });

      const mesh = new THREE.Mesh(geo, material);

      // Scatter the shapes around the camera in a loose ring.
      const angle = (i / geometries.length) * Math.PI * 2;
      const dist = 6 + Math.random() * 2;
      mesh.position.set(
        Math.cos(angle) * dist,
        (Math.random() - 0.5) * 6,
        Math.sin(angle) * dist - 3
      );
      const s = 0.7 + Math.random() * 0.6;
      mesh.scale.setScalar(s);

      // Per-shape animation params for independent drift.
      mesh.userData = {
        floatSpeed: 0.4 + Math.random() * 0.6,
        floatRange: 0.4 + Math.random() * 0.5,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4
        ),
        baseY: mesh.position.y,
        phase: Math.random() * Math.PI * 2,
      };

      this.shapes.push(mesh);
      this.shapeGroup.add(mesh);
    });
  }

  _initParticles() {
    this.particles = createParticleField({ count: 3500, radius: 20 });
    this.scene.add(this.particles);
  }

  _bindEvents() {
    this._onResize = this._onResize.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    window.addEventListener('resize', this._onResize);
    window.addEventListener('pointermove', this._onPointerMove);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  _onPointerMove(e) {
    // Normalise to -1..1 with origin at screen centre.
    this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  }

  /** Called by the scroll module to feed in scroll progress (0..1). */
  setScrollProgress(p) {
    this.scrollProgress = p;
  }

  start() {
    const tick = () => {
      this._frame();
      this._raf = requestAnimationFrame(tick);
    };
    tick();
  }

  _frame() {
    const elapsed = this.clock.getElapsedTime();

    // Animate each floating shape: bob + spin.
    for (const mesh of this.shapes) {
      const u = mesh.userData;
      mesh.position.y =
        u.baseY + Math.sin(elapsed * u.floatSpeed + u.phase) * u.floatRange;
      mesh.rotation.x += u.rotSpeed.x * 0.01;
      mesh.rotation.y += u.rotSpeed.y * 0.01;
      mesh.rotation.z += u.rotSpeed.z * 0.01;
    }

    // Slow overall drift of the whole shape group.
    this.shapeGroup.rotation.y = elapsed * 0.04;

    this.particles.userData.update(elapsed);

    // Smooth (inertia) mouse parallax — camera leans toward the pointer.
    this.parallax.x += (this.pointer.x - this.parallax.x) * 0.05;
    this.parallax.y += (this.pointer.y - this.parallax.y) * 0.05;

    // Scroll pushes the camera deeper and slightly down through the scene.
    const targetZ = 12 - this.scrollProgress * 6;
    this.camera.position.x += (this.parallax.x * 1.6 - this.camera.position.x) * 0.06;
    this.camera.position.y +=
      (this.parallax.y * 1.2 - this.scrollProgress * 3 - this.camera.position.y) * 0.06;
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.06;
    this.camera.lookAt(0, -this.scrollProgress * 1.5, 0);

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointermove', this._onPointerMove);
  }
}
