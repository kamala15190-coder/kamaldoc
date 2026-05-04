/* kdoc · Click-Prototyp — navigation + interactions */

(() => {
  'use strict';

  const SPLASH_DURATION_MS = 2700;

  const screens = Array.from(document.querySelectorAll('.screen'));
  const navItems = Array.from(document.querySelectorAll('[data-nav]'));
  const toastEl = document.getElementById('toast');

  let currentScreen = 'splash';
  let toastTimer;

  /* ---------- core navigation ---------- */

  function showScreen(name, { skipAnimation = false } = {}) {
    if (currentScreen === name) return;

    const next = screens.find(s => s.dataset.screen === name);
    const prev = screens.find(s => s.dataset.screen === currentScreen);
    if (!next) return;

    if (prev) {
      prev.classList.remove('is-active');
    }
    next.classList.add('is-active');

    // reset reveal animations on the next screen
    if (!skipAnimation) {
      next.querySelectorAll('.reveal').forEach(el => {
        el.style.animation = 'none';
        // force reflow
        void el.offsetWidth;
        el.style.animation = '';
      });
      // scroll inner scrollers to top
      next.querySelectorAll('[class*="-scroll"]').forEach(el => {
        el.scrollTop = 0;
      });
    }

    currentScreen = name;
    updateNavActive(name);

    // Haptic-like cue (visual only)
    if (window.navigator.vibrate) {
      try { window.navigator.vibrate(8); } catch { /* noop */ }
    }
  }

  function updateNavActive(name) {
    document.querySelectorAll('.bottom-nav .nav-item, .bottom-nav .nav-fab').forEach(btn => {
      const target = btn.dataset.nav;
      if (!target) return;
      btn.classList.toggle('active', target === name);
    });
  }

  /* ---------- splash flow ---------- */

  function dismissSplash() {
    const splash = screens.find(s => s.dataset.screen === 'splash');
    if (!splash || !splash.classList.contains('is-active')) return;

    splash.classList.add('is-leaving');
    setTimeout(() => {
      splash.classList.remove('is-active', 'is-leaving');
      const home = screens.find(s => s.dataset.screen === 'home');
      home.classList.add('is-active');
      currentScreen = 'home';
      updateNavActive('home');
    }, 600);
  }

  /* ---------- toast ---------- */

  function showToast(text) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.textContent = text;
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  /* ---------- bind ---------- */

  function bindEvents() {
    navItems.forEach(el => {
      el.addEventListener('click', evt => {
        const target = el.dataset.nav;
        if (!target) return;
        evt.stopPropagation();
        showScreen(target);
      });
    });

    // task checks
    document.addEventListener('click', evt => {
      const check = evt.target.closest('.task-check');
      if (!check) return;
      evt.stopPropagation();
      const becameChecked = !check.classList.contains('checked');
      check.classList.toggle('checked');
      if (becameChecked) {
        showToast('Erledigt · ins Archiv verschoben');
        // little celebratory pulse on the row
        const task = check.closest('.task');
        if (task) {
          task.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          task.style.opacity = '0.4';
        }
      }
    });

    // shutter button
    document.querySelector('[data-action="capture"]')?.addEventListener('click', () => {
      showToast('Aufnahme erfasst · Analyse läuft …');
      setTimeout(() => showScreen('detail'), 700);
    });

    // splash: tap to skip
    const splash = screens.find(s => s.dataset.screen === 'splash');
    splash?.addEventListener('click', () => dismissSplash());

    // theme toggle on profile
    document.querySelectorAll('.theme-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // filter row on tasks
    document.querySelectorAll('.filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // search button → toast
    document.querySelector('[data-action="open-search"]')?.addEventListener('click', () => {
      showToast('Suche · Demo-Modus');
    });
  }

  /* ---------- boot ---------- */

  function boot() {
    // start on splash
    const splash = screens.find(s => s.dataset.screen === 'splash');
    splash?.classList.add('is-active');

    bindEvents();

    setTimeout(dismissSplash, SPLASH_DURATION_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
