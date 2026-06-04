import { Scene } from './scene.js';
import { initScroll } from './scroll.js';

/* -------------------------------------------------------------------------
   Entry point — boots the WebGL scene, scroll choreography and the loader.
------------------------------------------------------------------------- */

const canvas = document.getElementById('webgl');
const loader = document.getElementById('loader');
const progressEl = document.getElementById('loader-progress');

// Build the 3D world.
const scene = new Scene(canvas);

// Hook GSAP scroll progress into the camera.
initScroll((progress) => scene.setScrollProgress(progress));

// Fake-but-smooth loader sweep, then reveal the experience.
function runLoader() {
  let p = 0;
  const id = setInterval(() => {
    p = Math.min(100, p + Math.random() * 22);
    progressEl.style.width = `${p}%`;
    if (p >= 100) {
      clearInterval(id);
      requestAnimationFrame(() => {
        loader.classList.add('hidden');
        scene.start();
      });
    }
  }, 140);
}

// Wait for the first paint before kicking things off.
window.addEventListener('load', runLoader);
