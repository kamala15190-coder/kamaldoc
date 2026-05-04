/* kdoc · Click-Prototyp — navigation + interactions */

(() => {
  'use strict';

  const SPLASH_DURATION_MS = 3700;

  const screens = Array.from(document.querySelectorAll('.screen'));
  const navItems = Array.from(document.querySelectorAll('[data-nav]'));
  const toastEl = document.getElementById('toast');

  let currentScreen = 'splash';
  let toastTimer;

  /* ---------- core navigation ---------- */

  function showScreen(name) {
    if (currentScreen === name) return;

    const next = screens.find(s => s.dataset.screen === name);
    const prev = screens.find(s => s.dataset.screen === currentScreen);
    if (!next) return;

    if (prev) prev.classList.remove('is-active');
    next.classList.add('is-active');

    next.querySelectorAll('[class*="-scroll"]').forEach(el => { el.scrollTop = 0; });

    currentScreen = name;
    updateNavActive(name);

    if (name === 'phishing') runPhishingAnimation();

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

  /* ---------- search-trigger placeholder rotator ---------- */

  function rotatePlaceholder() {
    const el = document.getElementById('st-rotate');
    if (!el) return;
    const lines = [
      'in Dokumenten und E-Mails …',
      '„Stadtwerke Mai" …',
      '„Versicherungen 2026" …',
      'Frag nach Beträgen, Fristen, Absendern …',
    ];
    let i = 0;
    setInterval(() => {
      i = (i + 1) % lines.length;
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        el.textContent = lines[i];
        el.style.opacity = '0.85';
      }, 300);
    }, 3600);
  }

  /* ---------- phishing meter animation ---------- */

  function runPhishingAnimation() {
    const needle = document.getElementById('meterNeedle');
    const scoreEl = document.getElementById('meterScore');
    const labelEl = document.getElementById('meterLabel');
    const alertEl = document.getElementById('phishingAlert');
    if (!needle || !scoreEl) return;

    // 18% on the bar = "wahrscheinlich Phishing" — far on red side
    const targetPos = 18;
    const targetScore = 18;

    needle.style.setProperty('--needle-pos', targetPos + '%');

    // animate score counter
    let frame = 0;
    const dur = 1600;
    const start = performance.now();

    function tick(now) {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(targetScore * eased);
      scoreEl.textContent = val;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    if (labelEl) labelEl.textContent = 'Wahrscheinlich Phishing';
  }

  /* ---------- task check toggle ---------- */

  function bindEvents() {
    navItems.forEach(el => {
      el.addEventListener('click', evt => {
        const target = el.dataset.nav;
        if (!target) return;
        evt.stopPropagation();
        showScreen(target);
      });
    });

    document.addEventListener('click', evt => {
      const check = evt.target.closest('.task-check');
      if (!check) return;
      evt.stopPropagation();
      const becameChecked = !check.classList.contains('checked');
      check.classList.toggle('checked');
      if (becameChecked) {
        showToast('Erledigt · ins Archiv verschoben');
        const task = check.closest('.task');
        if (task) {
          task.style.transition = 'opacity 0.5s ease';
          task.style.opacity = '0.4';
        }
      }
    });

    // extract-list multi-select
    document.addEventListener('click', evt => {
      const check = evt.target.closest('.ex-check');
      if (!check || check.classList.contains('locked')) return;
      evt.stopPropagation();
      check.classList.toggle('active');
      const item = check.closest('.extract-item');
      if (item) item.classList.toggle('is-selected', check.classList.contains('active'));

      // update count on save button
      const sel = document.querySelectorAll('.ex-check.active').length;
      const saveBtn = document.querySelector('[data-action="extract-save"]');
      if (saveBtn) saveBtn.textContent = '';
      if (saveBtn) {
        saveBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> ${sel} ${sel === 1 ? 'Aufgabe' : 'Aufgaben'} übernehmen`;
      }
    });

    // bell toggle
    document.addEventListener('click', evt => {
      const bell = evt.target.closest('.ex-bell');
      if (!bell || bell.classList.contains('locked')) return;
      evt.stopPropagation();
      bell.classList.toggle('active');
    });

    document.querySelector('[data-action="capture"]')?.addEventListener('click', () => {
      showToast('Aufnahme erfasst · Analyse läuft …');
      setTimeout(() => showScreen('detail'), 700);
    });

    document.querySelector('[data-action="extract-save"]')?.addEventListener('click', () => {
      showToast('Aufgaben übernommen · Erinnerungen gesetzt');
      setTimeout(() => showScreen('home'), 700);
    });

    document.querySelector('[data-action="task-done"]')?.addEventListener('click', evt => {
      evt.stopPropagation();
      showToast('Erledigt · ins Archiv verschoben');
    });

    const splash = screens.find(s => s.dataset.screen === 'splash');
    splash?.addEventListener('click', () => dismissSplash());

    document.querySelectorAll('.theme-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.querySelectorAll('.filter').forEach(btn => {
      btn.addEventListener('click', evt => {
        const row = btn.closest('.filter-row, .search-filters, .folder-filters');
        if (!row) return;
        row.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.querySelectorAll('.lang-tile').forEach(btn => {
      btn.addEventListener('click', () => {
        const grid = btn.closest('.lang-grid');
        if (!grid) return;
        grid.querySelectorAll('.lang-tile').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.querySelectorAll('.country-tile').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.country-tile').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.querySelectorAll('.reply-chip').forEach(btn => {
      btn.addEventListener('click', () => btn.classList.toggle('active'));
    });

    document.querySelectorAll('.doka-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = document.querySelector('.di-field');
        if (field) field.value = btn.textContent;
      });
    });

    // si-clear
    document.querySelector('.si-clear')?.addEventListener('click', () => {
      const input = document.querySelector('.si-input');
      if (input) { input.value = ''; input.focus(); }
    });
  }

  /* ---------- boot ---------- */

  function boot() {
    const splash = screens.find(s => s.dataset.screen === 'splash');
    splash?.classList.add('is-active');

    bindEvents();
    rotatePlaceholder();

    setTimeout(dismissSplash, SPLASH_DURATION_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
