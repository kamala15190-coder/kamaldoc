/* AURUM & NOIR — Eclipse. Scroll direction: Lenis; scrub engine: GSAP ScrollTrigger;
   imagery: pre-rendered webp frame sequences drawn to canvas. */
(() => {
  'use strict';
  gsap.registerPlugin(ScrollTrigger);

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ———————————————— frame scrubber ———————————————— */
  class Scrubber {
    constructor(canvas, dir, count) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.dir = dir;
      this.count = count;
      this.images = new Array(count);
      this.loaded = 0;
      this.index = -1;
      this.onProgress = null;
      this.resize();
    }
    src(i) { return `assets/frames/${this.dir}/frame_${String(i).padStart(3, '0')}.webp`; }
    load() {
      if (this._loading) return this._loading;
      this._loading = new Promise(resolve => {
        let done = 0;
        for (let i = 0; i < this.count; i++) {
          const img = new Image();
          img.decoding = 'async';
          img.onload = img.onerror = () => {
            this.images[i] = img.naturalWidth ? img : null;
            this.loaded = ++done;
            this.onProgress && this.onProgress(done / this.count);
            if (this.index === i || (this.index === -1 && i === 0)) this.draw(Math.max(0, this.index));
            if (done === this.count) resolve();
          };
          img.src = this.src(i);
        }
      });
      return this._loading;
    }
    resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = this.canvas.clientWidth || innerWidth;
      const h = this.canvas.clientHeight || innerHeight;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      if (this.index >= 0) this.draw(this.index, true);
    }
    nearest(i) {
      if (this.images[i]) return this.images[i];
      for (let d = 1; d < this.count; d++) {
        if (this.images[i - d]) return this.images[i - d];
        if (this.images[i + d]) return this.images[i + d];
      }
      return null;
    }
    draw(i, force) {
      i = Math.max(0, Math.min(this.count - 1, Math.round(i)));
      if (i === this.index && !force) return;
      this.index = i;
      const img = this.nearest(i);
      if (!img) return;
      const { width: W, height: H } = this.canvas;
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      this.ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    }
    bind(trigger) {
      ScrollTrigger.create({
        trigger,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: self => this.draw(self.progress * (this.count - 1)),
        onRefresh: self => this.draw(self.progress * (this.count - 1), true),
      });
    }
  }

  const orbit = new Scrubber(document.getElementById('orbitCanvas'), 'orbit', 160);
  const macro = new Scrubber(document.getElementById('macroCanvas'), 'macro', 120);
  const exploded = new Scrubber(document.getElementById('explodedCanvas'), 'exploded', 120);
  addEventListener('resize', () => { orbit.resize(); macro.resize(); exploded.resize(); });

  /* ———————————————— smooth scroll ———————————————— */
  const lenis = new Lenis({ duration: 1.25, smoothWheel: !reduceMotion });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ———————————————— preloader ———————————————— */
  const loader = document.getElementById('loader');
  const loaderBar = document.getElementById('loaderBar');
  const loaderPct = document.getElementById('loaderPct');
  lenis.stop();

  orbit.onProgress = p => {
    loaderBar.style.width = `${p * 100}%`;
    loaderPct.textContent = Math.round(p * 100);
  };
  orbit.load().then(() => {
    loader.classList.add('done');
    lenis.start();
    intro();
    macro.load();
    exploded.load();
    setTimeout(() => loader.remove(), 1200);
  });

  /* ———————————————— intro (wordmark tracks in) ———————————————— */
  function intro() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo('#wordmark',
      { opacity: 0, letterSpacing: '1.1em' },
      { opacity: 1, letterSpacing: '0.28em', duration: 2.6 })
      .to('#heroSub', { opacity: 1, duration: 1.4 }, '-=1.6')
      .to('#topbar', { opacity: 1, duration: 1.2 }, '-=1.0');
  }

  /* ———————————————— scroll choreography ———————————————— */
  // page progress hairline
  gsap.to('#progressBar', {
    scaleX: 1, ease: 'none',
    scrollTrigger: { trigger: '#main', start: 'top top', end: 'bottom bottom', scrub: 0.3 },
  });

  // 1 · hero: orbit scrub + copy in/out along the turn
  orbit.bind('#hero');
  gsap.timeline({
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: true },
    defaults: { ease: 'none' },
  })
    .to('#scrollCue', { opacity: 0, duration: 0.04 }, 0.01)
    .to('#wordmark', { opacity: 0, y: -60, letterSpacing: '0.45em', duration: 0.16 }, 0.06)
    .to('#heroSub', { opacity: 0, y: -30, duration: 0.10 }, 0.06)
    .fromTo('#heroLine1', { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.32)
    .to('#heroLine1', { opacity: 0, duration: 0.08 }, 0.48)
    .fromTo('#heroLine2', { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.66)
    .to('#heroLine2', { opacity: 0, duration: 0.08 }, 0.84);

  // 2 · story: pinned lines reveal one by one
  {
    const items = gsap.utils.toArray('[data-story]');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '#story', start: 'top top', end: 'bottom bottom', scrub: true },
      defaults: { ease: 'none' },
    });
    tl.to('#storyGlow', { opacity: 1, duration: 0.5 }, 0)
      .to('#storyGlow', { opacity: 0.25, duration: 0.4 }, 0.6);
    items.forEach((el, i) => {
      tl.fromTo(el, { opacity: 0, y: 44 }, { opacity: 1, y: 0, duration: 0.11 }, 0.06 + i * 0.14);
    });
    tl.to('.story-copy', { opacity: 0, y: -60, duration: 0.12 }, 0.88);
  }

  // 3 · macro: scrub + captions at waypoints
  macro.bind('#macro');
  {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '#macro', start: 'top top', end: 'bottom bottom', scrub: true },
      defaults: { ease: 'none' },
    });
    [['#cap1', 0.08, 0.30], ['#cap2', 0.40, 0.62], ['#cap3', 0.72, 0.94]].forEach(([sel, a, b]) => {
      tl.fromTo(sel, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.07 }, a)
        .to(sel, { opacity: 0, y: -20, duration: 0.06 }, b);
    });
  }

  // 4 · engineering: exploded scrub + spec callouts as it assembles
  exploded.bind('#engineering');
  {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '#engineering', start: 'top top', end: 'bottom bottom', scrub: true },
      defaults: { ease: 'none' },
    });
    [['#spec1', 0.10, 0.34], ['#spec2', 0.38, 0.60], ['#spec3', 0.62, 0.82]].forEach(([sel, a, b]) => {
      tl.fromTo(sel, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.08 }, a)
        .to(sel, { opacity: 0, y: -24, duration: 0.06 }, b);
    });
    tl.fromTo('#assemblyLine', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.08 }, 0.88);
  }

  // 5 · edition: slow settle of the atmosphere still + copy reveal
  gsap.fromTo('#editionBg', { scale: 1.12 }, {
    scale: 1.0, ease: 'none',
    scrollTrigger: { trigger: '#edition', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.fromTo('[data-ed]', { opacity: 0, y: 40 }, {
    opacity: 1, y: 0, duration: 1.4, stagger: 0.18, ease: 'power3.out',
    scrollTrigger: { trigger: '#edition', start: 'top 55%', toggleActions: 'play none none reverse' },
  });

  // 6 · waitlist reveal
  gsap.fromTo('[data-wl]', { opacity: 0, y: 34 }, {
    opacity: 1, y: 0, duration: 1.2, stagger: 0.14, ease: 'power3.out',
    scrollTrigger: { trigger: '#waitlist', start: 'top 60%', toggleActions: 'play none none reverse' },
  });

  /* ———————————————— smoke (edition section) ———————————————— */
  const smoke = document.getElementById('smokeCanvas');
  {
    const ctx = smoke.getContext('2d');
    let running = false, raf = 0, t = 0;
    const puffs = Array.from({ length: 14 }, (_, i) => ({
      x: 0.35 + (i * 0.043) % 0.35, y: 1.1 - (i * 0.117) % 1.0,
      r: 0.10 + (i * 0.037) % 0.16, v: 0.00035 + (i % 5) * 0.00012,
      drift: (i % 2 ? 1 : -1) * (0.0002 + (i % 3) * 0.0001), o: 0.05 + (i % 4) * 0.015,
    }));
    function size() { smoke.width = smoke.clientWidth; smoke.height = smoke.clientHeight; }
    size(); addEventListener('resize', size);
    function frame() {
      if (!running) return;
      t++;
      const { width: W, height: H } = smoke;
      ctx.clearRect(0, 0, W, H);
      for (const p of puffs) {
        p.y -= p.v; p.x += p.drift * Math.sin(t / 90 + p.r * 40);
        if (p.y < -0.25) { p.y = 1.2; }
        const R = p.r * W * 0.5;
        const g = ctx.createRadialGradient(p.x * W, p.y * H, 0, p.x * W, p.y * H, R);
        g.addColorStop(0, `rgba(214,196,150,${p.o})`);
        g.addColorStop(1, 'rgba(214,196,150,0)');
        ctx.fillStyle = g;
        ctx.fillRect(p.x * W - R, p.y * H - R, R * 2, R * 2);
      }
      raf = requestAnimationFrame(frame);
    }
    new IntersectionObserver(([e]) => {
      running = e.isIntersecting && !reduceMotion;
      if (running) frame(); else cancelAnimationFrame(raf);
    }).observe(smoke);
  }

  /* ———————————————— waitlist form ———————————————— */
  document.getElementById('waitlistForm').addEventListener('submit', e => {
    e.preventDefault();
    e.currentTarget.style.display = 'none';
    document.querySelector('.waitlist-note').style.display = 'none';
    document.getElementById('waitlistDone').style.display = 'block';
  });

  /* ———————————————— test hooks ———————————————— */
  window.__eclipse = { lenis, orbit, macro, exploded, ScrollTrigger };
})();
