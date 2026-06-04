import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/**
 * Wires up GSAP-driven scroll behaviour:
 *  - reveal-on-enter for every [data-fade] element
 *  - anchor links smooth-scroll instead of jumping
 *  - reports overall scroll progress (0..1) back to the 3D scene
 *
 * @param {(progress:number)=>void} onProgress
 */
export function initScroll(onProgress) {
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // Reveal animations for fade-in elements.
  gsap.utils.toArray('[data-fade]').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: reduceMotion ? 0 : 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      },
    });
  });

  // Smooth-scroll for in-page anchor links.
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      gsap.to(window, {
        duration: reduceMotion ? 0 : 1.1,
        ease: 'power2.inOut',
        scrollTo: { y: target, autoKill: true },
      });
    });
  });

  // Feed normalised scroll progress to the WebGL scene every frame it moves.
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => onProgress(self.progress),
  });
}
