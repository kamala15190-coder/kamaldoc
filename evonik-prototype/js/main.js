/* SEPURAN® Green — Evonik Konzeptstudie.
   Lenis smooth scroll + GSAP ScrollTrigger + canvas frame scrubbing + scroll-driven mist. */
(() => {
  'use strict';
  gsap.registerPlugin(ScrollTrigger);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ———— frame scrubber (identisch zum Eclipse-Prinzip) ———— */
  class Scrubber {
    constructor(canvas, dir, count) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      this.dir = dir; this.count = count;
      this.images = new Array(count); this.loaded = 0; this.index = -1;
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
      this.canvas.width = Math.round((this.canvas.clientWidth || innerWidth) * dpr);
      this.canvas.height = Math.round((this.canvas.clientHeight || innerHeight) * dpr);
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
      this.ctx.drawImage(img, (W - img.naturalWidth*s)/2, (H - img.naturalHeight*s)/2,
        img.naturalWidth*s, img.naturalHeight*s);
    }
    bind(trigger, onUpdate) {
      ScrollTrigger.create({
        trigger, start: 'top top', end: 'bottom bottom', scrub: true,
        onUpdate: self => { this.draw(self.progress * (this.count - 1)); onUpdate && onUpdate(self.progress); },
        onRefresh: self => { this.draw(self.progress * (this.count - 1), true); onUpdate && onUpdate(self.progress); },
      });
    }
  }

  const orbit = new Scrubber(document.getElementById('orbitCanvas'), 'orbit', 160);
  const assembly = new Scrubber(document.getElementById('assemblyCanvas'), 'assembly', 160);
  addEventListener('resize', () => { orbit.resize(); assembly.resize(); });

  /* ———— smooth scroll ———— */
  const lenis = new Lenis({ duration: 1.25, smoothWheel: !reduceMotion });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ———— mist: rises from below during the orbit, sinks & fades at the end ———— */
  const mist = (() => {
    const cv = document.getElementById('mistCanvas');
    const ctx = cv.getContext('2d');
    let level = 0, target = 0, sink = 0, raf = 0, running = false, t = 0;
    const puffs = Array.from({ length: 22 }, (_, i) => ({
      x: (i * 0.089) % 1, y: 0.15 + (i * 0.137) % 0.7,
      r: 0.16 + (i * 0.053) % 0.22, v: 0.00022 + (i % 5) * 0.00008,
      drift: (i % 2 ? 1 : -1) * (0.00016 + (i % 3) * 0.00008), o: 0.16 + (i % 4) * 0.05,
    }));
    function size() { cv.width = cv.clientWidth; cv.height = cv.clientHeight; }
    size(); addEventListener('resize', size);
    function frame() {
      if (!running) return;
      t++;
      level += (target - level) * 0.06;
      const { width: W, height: H } = cv;
      ctx.clearRect(0, 0, W, H);
      if (level > 0.005) {
        const band = H * 0.42;                       // mist lives in the bottom band
        const sinkPx = sink * H * 0.28;              // extra sag while fading out
        for (const p of puffs) {
          p.y -= p.v; p.x += p.drift * Math.sin(t / 110 + p.r * 30);
          if (p.y < -0.15) p.y = 0.85;
          const px = ((p.x % 1) + 1) % 1 * W;
          const py = H - band * p.y + sinkPx;
          const R = p.r * W * 0.5;
          const g = ctx.createRadialGradient(px, py, 0, px, py, R);
          g.addColorStop(0, `rgba(196,180,235,${(p.o * level).toFixed(3)})`);
          g.addColorStop(1, 'rgba(196,180,235,0)');
          ctx.fillStyle = g;
          ctx.fillRect(px - R, py - R, R * 2, R * 2);
        }
      }
      raf = requestAnimationFrame(frame);
    }
    new IntersectionObserver(([e]) => {
      running = e.isIntersecting && !reduceMotion;
      if (running) frame(); else cancelAnimationFrame(raf);
    }).observe(cv);
    return {
      set(progress) {           // hero progress 0..1
        if (progress < 0.72) { target = Math.min(1, progress / 0.12); sink = 0; }
        else {                  // sequence done -> mist sinks down and fades out
          const f = Math.min(1, (progress - 0.72) / 0.2);
          target = 1 - f; sink = f;
        }
      },
      level: () => level,
    };
  })();

  /* ———— preloader ———— */
  const loader = document.getElementById('loader');
  lenis.stop();
  orbit.onProgress = p => {
    document.getElementById('loaderBar').style.width = `${p * 100}%`;
    document.getElementById('loaderPct').textContent = Math.round(p * 100);
  };
  orbit.load().then(() => {
    loader.classList.add('done');
    lenis.start();
    intro();
    assembly.load();
    setTimeout(() => loader.remove(), 1100);
  });

  function intro() {
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo('#wordmark', { opacity: 0, y: 40, letterSpacing: '0.18em' },
        { opacity: 1, y: 0, letterSpacing: '0.02em', duration: 1.8 })
      .to('#heroEyebrow', { opacity: 1, duration: 1 }, '-=1.2')
      .to('#heroSub', { opacity: 1, duration: 1 }, '-=0.8')
      .to('#topbar', { opacity: 1, duration: 0.9 }, '-=0.6');
  }

  /* ———— page progress ———— */
  gsap.to('#progressBar', {
    scaleX: 1, ease: 'none',
    scrollTrigger: { trigger: '#main', start: 'top top', end: 'bottom bottom', scrub: 0.3 },
  });

  /* ———— 1 · hero: orbit scrub + mist choreography + copy ———— */
  orbit.bind('#hero', p => mist.set(p));
  gsap.timeline({
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: true },
    defaults: { ease: 'none' },
  })
    .to('#scrollCue', { opacity: 0, duration: 0.04 }, 0.01)
    .to('.hero-center', { opacity: 0, y: -70, duration: 0.14 }, 0.05)
    .fromTo('#heroLine1', { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.30)
    .to('#heroLine1', { opacity: 0, duration: 0.07 }, 0.45)
    .fromTo('#heroLine2', { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.56)
    .to('#heroLine2', { opacity: 0, duration: 0.07 }, 0.70);

  /* ———— 2 · explainer: pinned line-by-line reveal ———— */
  {
    const items = gsap.utils.toArray('[data-ex]');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '#explainer', start: 'top top', end: 'bottom bottom', scrub: true },
      defaults: { ease: 'none' },
    });
    items.forEach((el, i) => {
      tl.fromTo(el, { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: 0.12 }, 0.05 + i * 0.15);
    });
    tl.to('.explainer-copy', { opacity: 0, y: -50, duration: 0.1 }, 0.9);
  }

  /* ———— 3 · assembly: scrub + component callouts ———— */
  assembly.bind('#assembly');
  {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '#assembly', start: 'top top', end: 'bottom bottom', scrub: true },
      defaults: { ease: 'none' },
    });
    [['#co1', 0.02, 0.16], ['#co2', 0.16, 0.30], ['#co3', 0.34, 0.52],
     ['#co4', 0.56, 0.72], ['#co5', 0.76, 0.90]].forEach(([sel, a, b]) => {
      tl.fromTo(sel, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.06 }, a)
        .to(sel, { opacity: 0, y: -22, duration: 0.05 }, b);
    });
    tl.fromTo('#assemblyEnd', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.07 }, 0.92);
  }

  /* ———— 4 · impact: video if present, aurora fallback + reveal ———— */
  {
    const video = document.getElementById('impactVideo');
    // Set window.__IMPACT = 'assets/impact.mp4' once the Higgsfield clip is in place.
    // Left null it stays silent (no 404) and the aurora fallback below runs.
    const impactSrc = window.__IMPACT || null;
    if (impactSrc) {
      video.src = impactSrc;
      video.style.display = 'block';
      const play = () => video.play().catch(() => {});
      new IntersectionObserver(([e]) => e.isIntersecting ? play() : video.pause())
        .observe(video);
    }

    // aurora fallback: soft drifting purple/green light bands
    const cv = document.getElementById('auroraCanvas');
    const ctx = cv.getContext('2d');
    let raf = 0, running = false, t = 0;
    function size() { cv.width = cv.clientWidth; cv.height = cv.clientHeight; }
    size(); addEventListener('resize', size);
    const bands = [
      { c: '138,92,245', y: 0.30, amp: 0.10, w: 0.34, sp: 0.0016 },
      { c: '63,174,76',  y: 0.55, amp: 0.13, w: 0.30, sp: 0.0011 },
      { c: '183,154,239',y: 0.75, amp: 0.08, w: 0.26, sp: 0.0021 },
    ];
    function frame() {
      if (!running) return;
      t++;
      const { width: W, height: H } = cv;
      ctx.fillStyle = '#1c0d33'; ctx.fillRect(0, 0, W, H);
      for (const b of bands) {
        const cy = H * (b.y + Math.sin(t * b.sp) * b.amp);
        const g = ctx.createRadialGradient(W/2, cy, 0, W/2, cy, W * b.w);
        g.addColorStop(0, `rgba(${b.c},0.20)`); g.addColorStop(1, `rgba(${b.c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      raf = requestAnimationFrame(frame);
    }
    new IntersectionObserver(([e]) => {
      running = e.isIntersecting && !reduceMotion;
      if (running) frame(); else cancelAnimationFrame(raf);
    }).observe(cv);
  }
  gsap.fromTo('[data-im]', { opacity: 0, y: 40 }, {
    opacity: 1, y: 0, duration: 1.3, stagger: 0.16, ease: 'power3.out',
    scrollTrigger: { trigger: '#impact', start: 'top 58%', toggleActions: 'play none none reverse' },
  });

  /* ———— test hooks ———— */
  window.__evonik = { lenis, orbit, assembly, ScrollTrigger, mistLevel: () => mist.level() };
})();
