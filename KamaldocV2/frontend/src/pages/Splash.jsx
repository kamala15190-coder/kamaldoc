import { useEffect, useState } from 'react';

const DURATION = 3700;

export default function Splash({ onDone }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), DURATION);
    const t2 = setTimeout(() => onDone?.(), DURATION + 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  const handleClick = () => {
    setLeaving(true);
    setTimeout(() => onDone?.(), 600);
  };

  return (
    <section
      className={`screen splash is-active ${leaving ? 'is-leaving' : ''}`}
      onClick={handleClick}
      aria-label="Begrüßung"
    >
      <div className="splash-bg" />
      <div className="splash-vignette" />
      <div className="splash-grain" />

      <div className="splash-stage">
        <div className="emblem">
          <svg className="orbit orbit-outer" viewBox="0 0 240 240" aria-hidden="true">
            <circle cx="120" cy="120" r="104" fill="none" stroke="#E89A52" strokeWidth="0.8"
              strokeDasharray="1.6 7" strokeLinecap="round" />
          </svg>

          <svg className="orbit orbit-inner" viewBox="0 0 240 240" aria-hidden="true">
            <circle cx="120" cy="120" r="78" fill="none" stroke="#E89A52" strokeWidth="1.1"
              strokeDasharray="4.5 11" strokeLinecap="round" />
          </svg>

          <svg className="orbit orbit-ticks" viewBox="0 0 240 240" aria-hidden="true">
            <line x1="120" y1="22" x2="120" y2="32" stroke="#E89A52" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="120" y1="218" x2="120" y2="208" stroke="#E89A52" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="22" y1="120" x2="32" y2="120" stroke="#E89A52" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="218" y1="120" x2="208" y2="120" stroke="#E89A52" strokeWidth="1.2" strokeLinecap="round" />
          </svg>

          <svg className="logomark" viewBox="0 0 120 120" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="copperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F6C58A" />
                <stop offset="55%" stopColor="#E89A52" />
                <stop offset="100%" stopColor="#A85B23" />
              </linearGradient>
              <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.4" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <circle className="ring" cx="60" cy="60" r="52" stroke="url(#copperGrad)" strokeWidth="0.6" strokeOpacity="0.35" />
            <circle className="ring-pulse" cx="60" cy="60" r="52" stroke="url(#copperGrad)" strokeWidth="0.4" strokeOpacity="0" fill="none" />

            <g filter="url(#softGlow)" stroke="url(#copperGrad)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path className="stroke s1" d="M40 28 V92" />
              <path className="stroke s2" d="M40 60 L78 28" />
              <path className="stroke s3" d="M40 60 L82 92" />
            </g>

            <path className="flap" d="M28 46 L60 66 L92 46" stroke="url(#copperGrad)"
              strokeWidth="0.8" strokeOpacity="0.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>

        <div className="wordmark">
          <span className="wm-letter">k</span>
          <span className="wm-letter">d</span>
          <span className="wm-letter">o</span>
          <span className="wm-letter">c</span>
          <span className="wm-dot" aria-hidden="true">.</span>
        </div>

        <p className="tagline">
          <span className="tl-line">Dein Postfach.</span>
          <span className="tl-line">Endlich aufgeräumt.</span>
        </p>
      </div>
    </section>
  );
}
