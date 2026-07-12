/* EMBER & OAK — hero scrub, parallax, reveals, reservation form */
(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- header ---------- */
  const head = document.getElementById("siteHead");
  const onHeadScroll = () => {
    head.classList.toggle("solid", window.scrollY > window.innerHeight * 0.6);
  };
  window.addEventListener("scroll", onHeadScroll, { passive: true });
  onHeadScroll();

  /* ---------- hero scroll-scrub ---------- */
  const hero = document.getElementById("hero");
  const video = document.getElementById("heroVideo");

  // progress of the hero scroll container, 0..1
  const heroProgress = () => {
    const scrollable = hero.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return 0;
    return Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / scrollable));
  };

  // title choreography: tracking-in over the first quarter, tagline after
  const titleFX = (p) => {
    const tIn = Math.min(1, p / 0.22);               // 0..1 while title tracks in
    const ease = 1 - Math.pow(1 - tIn, 3);
    const track = 0.55 - 0.37 * ease;                 // 0.55em -> 0.18em
    hero.style.setProperty("--track", track.toFixed(4) + "em");
    hero.style.setProperty("--title-o", (0.08 + 0.92 * ease).toFixed(3));
    const tag = Math.min(1, Math.max(0, (p - 0.16) / 0.14));
    hero.style.setProperty("--tag-o", (1 - Math.pow(1 - tag, 3)).toFixed(3));
    hero.style.setProperty("--hint-o", p > 0.04 ? "0" : "1");
  };

  if (!reducedMotion) {
    let target = 0;
    let current = 0;
    let duration = 0;

    const ready = () => { duration = video.duration || 0; };
    video.addEventListener("loadedmetadata", ready);
    if (video.readyState >= 1) ready();
    video.pause();

    const tick = () => {
      const p = heroProgress();
      titleFX(p);
      if (duration) {
        // leave a hair of headroom so we never seek past the last frame
        target = p * (duration - 0.06);
        current += (target - current) * 0.14;
        if (Math.abs(target - current) < 0.002) current = target;
        if (Math.abs(video.currentTime - current) > 1 / 60 && video.seekable.length) {
          try { video.currentTime = current; } catch (_) { /* not seekable yet */ }
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } else {
    titleFX(1);
  }

  /* ---------- slow parallax on media sections ---------- */
  const parallaxEls = Array.from(document.querySelectorAll("[data-parallax]"));
  if (!reducedMotion && parallaxEls.length) {
    let rafPending = false;
    const applyParallax = () => {
      rafPending = false;
      const vh = window.innerHeight;
      for (const el of parallaxEls) {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        const centerOffset = (r.top + r.height / 2 - vh / 2) / vh; // -1..1
        el.style.transform = `translateY(${(centerOffset * -7).toFixed(2)}%)`;
      }
    };
    window.addEventListener("scroll", () => {
      if (!rafPending) { rafPending = true; requestAnimationFrame(applyParallax); }
    }, { passive: true });
    applyParallax();
  }

  /* ---------- reveal on scroll ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reducedMotion) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ---------- reservation form ---------- */
  const form = document.getElementById("reserveForm");
  const dateInput = document.getElementById("resDate");
  const partyInput = document.getElementById("resParty");
  const errorEl = document.getElementById("formError");
  const confirmBox = document.getElementById("reserveConfirm");
  const confirmText = document.getElementById("confirmText");

  // no tables in the past
  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  dateInput.min = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const fail = (msg) => {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const dateVal = dateInput.value;
    const partyVal = partyInput.value;

    if (!dateVal) return fail("Choose a date — the fire needs notice.");
    const chosen = new Date(dateVal + "T12:00:00");
    if (Number.isNaN(chosen.getTime()) || dateVal < dateInput.min) {
      return fail("We cannot seat you in the past. Choose a date to come.");
    }
    const day = chosen.getDay(); // 0 Sun .. 6 Sat
    if (day === 1 || day === 2) {
      return fail("The fire rests Monday and Tuesday. Choose Wednesday to Sunday.");
    }
    if (!partyVal) return fail("How many chairs shall we pull up?");

    const pretty = chosen.toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const guests = partyVal === "1" ? "one guest" : `${partyVal} guests`;
    confirmText.innerHTML =
      `A table for <strong>${guests}</strong> on <strong>${pretty}</strong>.`;

    form.hidden = true;
    confirmBox.hidden = false;
  });
})();
