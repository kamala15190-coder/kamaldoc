import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X, PartyPopper, Sun, Moon } from 'lucide-react';
import { getIntroStatus, markIntroComplete, saveEinstellungen, getEinstellungen } from '../api';
import { useTheme } from '../hooks/useTheme';
import { LANGUAGES } from '../languages';

// Step definitions: each step has a route, a target selector, and i18n keys
// Interactive steps (step 0, 4, 5) render custom content inside the tooltip.
const STEPS = [
  { route: '/',         target: '[data-intro="language"]',   titleKey: 'intro.step1Title', descKey: 'intro.step1Desc',   interactive: 'language' },
  { route: '/befund',   target: '[data-intro="befund"]',     titleKey: 'intro.step2Title', descKey: 'intro.step2Desc' },
  { route: '/behoerde', target: '[data-intro="behoerde"]',   titleKey: 'intro.step3Title', descKey: 'intro.step3Desc' },
  { route: '/upload',   target: '[data-intro="upload"]',     titleKey: 'intro.step4Title', descKey: 'intro.step4Desc' },
  { route: '/profil',   target: '[data-intro="darkmode"]',   titleKey: 'intro.step5Title', descKey: 'intro.step5Desc',   interactive: 'theme' },
  { route: '/profil',   target: '[data-intro="absender"]',   titleKey: 'intro.step6Title', descKey: 'intro.step6Desc',   interactive: 'absender' },
];

export default function IntroGuide() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const checkedRef = useRef(false);

  // Absenderdaten form state (step 6)
  const [senderForm, setSenderForm] = useState({ vorname: '', nachname: '', adresse: '', plz: '', ort: '', email: '', telefon: '' });
  const [savingSender, setSavingSender] = useState(false);
  const [senderSaved, setSenderSaved] = useState(false);

  // Check intro status on mount, pre-load existing Absenderdaten
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    getIntroStatus()
      .then(data => {
        if (!data.has_seen_intro) {
          setShow(true);
          // Pre-fill sender form with existing data
          getEinstellungen().then(existing => {
            if (existing) setSenderForm(prev => ({ ...prev, ...existing }));
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // Navigate to the correct route for the current step
  useEffect(() => {
    if (!show || finishing) return;
    const s = STEPS[step];
    if (s && location.pathname !== s.route) {
      navigate(s.route);
    }
  }, [step, show, finishing, location.pathname, navigate]);

  // Find and highlight the target element after navigation
  useEffect(() => {
    if (!show || finishing) return;
    const s = STEPS[step];
    if (!s) return;

    const findTarget = () => {
      const el = document.querySelector(s.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
      } else {
        setTargetRect(null);
      }
    };

    const timer = setTimeout(findTarget, 400);
    window.addEventListener('resize', findTarget);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', findTarget);
    };
  }, [step, show, finishing, location.pathname]);

  const handleComplete = useCallback(async () => {
    setConfetti(true);
    setFinishing(true);
    try { await markIntroComplete(); } catch { /* ignore */ }
    setTimeout(() => {
      setShow(false);
      setConfetti(false);
      setFinishing(false);
      navigate('/');
    }, 2500);
  }, [navigate]);

  const handleSkip = useCallback(async () => {
    try { await markIntroComplete(); } catch { /* ignore */ }
    setShow(false);
    navigate('/');
  }, [navigate]);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      handleComplete();
    }
  }, [step, handleComplete]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  // Save Absenderdaten and proceed
  const handleSaveSender = useCallback(async () => {
    setSavingSender(true);
    try {
      await saveEinstellungen(senderForm);
      setSenderSaved(true);
      setTimeout(() => handleNext(), 600);
    } catch { /* ignore */ }
    finally { setSavingSender(false); }
  }, [senderForm, handleNext]);

  if (!show) return null;

  // ─── Confetti screen ────────────────────────────────────────────────────────
  if (confetti) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        animation: 'introFadeIn 0.4s ease',
      }}>
        <div style={{ position: 'relative' }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: 8 + Math.random() * 8, height: 8 + Math.random() * 8,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              background: ['#6359FF', '#FF5F6D', '#FFD700', '#10B981', '#60A5FA', '#F472B6', '#FBBF24'][i % 7],
              top: '50%', left: '50%',
              animation: `confettiBurst 1.8s ease-out ${Math.random() * 0.3}s forwards`,
              '--cx': `${(Math.random() - 0.5) * 300}px`,
              '--cy': `${-100 - Math.random() * 200}px`,
              opacity: 0,
            }} />
          ))}
          <PartyPopper style={{ width: 64, height: 64, color: '#FFD700', animation: 'introPop 0.6s ease' }} />
        </div>
        <h2 style={{ color: 'white', fontSize: 24, fontWeight: 800, marginTop: 24, textAlign: 'center' }}>
          {t('intro.completeTitle')}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
          {t('intro.completeDesc')}
        </p>
        <button onClick={() => { setShow(false); setConfetti(false); navigate('/'); }} style={{
          marginTop: 28, padding: '14px 36px', borderRadius: 14,
          background: 'linear-gradient(135deg, #6359FF, #8B5CF6)',
          color: 'white', border: 'none', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,89,255,0.4)',
        }}>
          {t('intro.letsGo')}
        </button>
        <style>{`
          @keyframes confettiBurst {
            0% { transform: translate(0,0) rotate(0deg) scale(0); opacity: 1; }
            100% { transform: translate(var(--cx), var(--cy)) rotate(720deg) scale(1); opacity: 0; }
          }
          @keyframes introPop {
            0% { transform: scale(0) rotate(-20deg); }
            60% { transform: scale(1.2) rotate(5deg); }
            100% { transform: scale(1) rotate(0deg); }
          }
          @keyframes introFadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    );
  }

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // ─── Tooltip positioning ────────────────────────────────────────────────────
  let tooltipStyle = {
    position: 'fixed', zIndex: 10002,
    background: 'var(--bg-secondary, #1a1a2e)', borderRadius: 16,
    border: '1px solid rgba(99,89,255,0.3)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    padding: '20px 22px', maxWidth: 340, width: 'calc(100vw - 40px)',
  };

  if (targetRect) {
    const below = targetRect.top + targetRect.height + 16;
    const above = targetRect.top - 16;
    if (below + 250 < window.innerHeight) {
      tooltipStyle.top = below;
    } else {
      tooltipStyle.bottom = window.innerHeight - above;
    }
    tooltipStyle.left = Math.max(20, Math.min(targetRect.left, window.innerWidth - 360));
  } else {
    tooltipStyle.top = '50%';
    tooltipStyle.left = '50%';
    tooltipStyle.transform = 'translate(-50%, -50%)';
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Dark overlay with spotlight cutout */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'auto' }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <mask id="intro-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 6} y={targetRect.top - 6}
                  width={targetRect.width + 12} height={targetRect.height + 12}
                  rx="12" fill="black"
                />
              )}
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask="url(#intro-mask)" />
        </svg>

        {/* Pulsing ring */}
        {targetRect && (
          <div style={{
            position: 'fixed',
            top: targetRect.top - 8, left: targetRect.left - 8,
            width: targetRect.width + 16, height: targetRect.height + 16,
            borderRadius: 14,
            border: '2px solid rgba(99,89,255,0.8)',
            boxShadow: '0 0 0 4px rgba(99,89,255,0.2), 0 0 20px rgba(99,89,255,0.3)',
            animation: 'introPulse 2s ease-in-out infinite',
            pointerEvents: 'none', zIndex: 10001,
          }} />
        )}
      </div>

      {/* Tooltip card */}
      <div style={tooltipStyle}>
        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 20 : 8, height: 4, borderRadius: 2,
                background: i === step ? '#6359FF' : i < step ? 'rgba(99,89,255,0.5)' : 'rgba(255,255,255,0.15)',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>{step + 1}/{STEPS.length}</span>
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, white)', margin: '0 0 6px' }}>
          {t(currentStep.titleKey)}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary, #aaa)', margin: '0 0 14px', lineHeight: 1.5 }}>
          {t(currentStep.descKey)}
        </p>

        {/* ── INTERACTIVE: Step 1 – Language selector ──────────────────────────── */}
        {currentStep.interactive === 'language' && (
          <LanguageSelector currentLang={i18n.language} onChange={code => {
            i18n.changeLanguage(code);
            localStorage.setItem('kamaldoc_language', code);
          }} />
        )}

        {/* ── INTERACTIVE: Step 5 – Theme toggle ───────────────────────────────── */}
        {currentStep.interactive === 'theme' && (
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} t={t} />
        )}

        {/* ── INTERACTIVE: Step 6 – Absenderdaten form ─────────────────────────── */}
        {currentStep.interactive === 'absender' && (
          <AbsenderForm
            form={senderForm}
            onChange={(key, val) => setSenderForm(prev => ({ ...prev, [key]: val }))}
            t={t}
          />
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <button onClick={handleSkip} style={{
            background: 'none', border: 'none', color: 'var(--text-muted, #666)',
            fontSize: 12, cursor: 'pointer', padding: '6px 0',
          }}>
            {t('intro.skip')}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button onClick={handleBack} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px',
                borderRadius: 10, background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary, white)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                <ChevronLeft style={{ width: 14, height: 14 }} /> {t('intro.back')}
              </button>
            )}
            {/* Step 6: show Save & Continue instead of Next */}
            {currentStep.interactive === 'absender' ? (
              <>
                <button onClick={handleNext} style={{
                  padding: '8px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-muted, #aaa)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  {t('intro.step6Skip')}
                </button>
                <button onClick={handleSaveSender} disabled={savingSender || senderSaved} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '8px 18px',
                  borderRadius: 10, background: senderSaved ? '#10B981' : 'linear-gradient(135deg, #6359FF, #8B5CF6)',
                  border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(99,89,255,0.3)',
                  opacity: savingSender ? 0.7 : 1,
                }}>
                  {senderSaved ? '✓' : t('intro.step6Save')}
                </button>
              </>
            ) : (
              <button onClick={handleNext} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '8px 18px',
                borderRadius: 10, background: 'linear-gradient(135deg, #6359FF, #8B5CF6)',
                border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 2px 12px rgba(99,89,255,0.3)',
              }}>
                {isLast ? t('intro.finish') : t('intro.next')}
                {!isLast && <ChevronRight style={{ width: 14, height: 14 }} />}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes introPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(99,89,255,0.2), 0 0 20px rgba(99,89,255,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(99,89,255,0.1), 0 0 30px rgba(99,89,255,0.5); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

/** Step 1: Scrollbare Sprachliste mit Flaggen */
function LanguageSelector({ currentLang, onChange }) {
  const { t } = useTranslation();
  // Show top 12 most common languages first, then the rest
  const topCodes = ['de', 'en', 'tr', 'ar', 'bs', 'hr', 'sr', 'pl', 'ru', 'uk', 'ro', 'hu'];
  const topLangs = topCodes.map(c => LANGUAGES.find(l => l.code === c)).filter(Boolean);
  const otherLangs = LANGUAGES.filter(l => !topCodes.includes(l.code));
  const allSorted = [...topLangs, ...otherLangs];

  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted, #888)', margin: '0 0 8px' }}>
        {t('intro.step1SelectLang')}
      </p>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
        maxHeight: 180, overflowY: 'auto', paddingRight: 2,
      }}>
        {allSorted.map(lang => {
          const isActive = currentLang === lang.code || currentLang.startsWith(lang.code);
          return (
            <button
              key={lang.code}
              onClick={() => onChange(lang.code)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '6px 4px', borderRadius: 8, cursor: 'pointer',
                background: isActive ? 'rgba(99,89,255,0.25)' : 'rgba(255,255,255,0.06)',
                border: isActive ? '1px solid rgba(99,89,255,0.6)' : '1px solid rgba(255,255,255,0.08)',
                transition: 'all 0.15s ease',
              }}
              title={lang.label}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{lang.flag}</span>
              <span style={{ fontSize: 9, color: isActive ? '#a78bfa' : 'var(--text-muted, #888)', fontWeight: isActive ? 700 : 400 }}>
                {lang.code.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Step 5: Hell / Dunkel Toggle */
function ThemeToggle({ theme, toggleTheme, t }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
      <button
        onClick={() => theme === 'dark' && toggleTheme()}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '10px 0', borderRadius: 10, cursor: 'pointer',
          background: theme === 'light' ? 'rgba(255,200,50,0.2)' : 'rgba(255,255,255,0.06)',
          border: theme === 'light' ? '2px solid rgba(255,200,50,0.6)' : '1px solid rgba(255,255,255,0.1)',
          color: theme === 'light' ? '#FBBF24' : 'var(--text-secondary, #aaa)',
          fontWeight: 700, fontSize: 13, transition: 'all 0.2s ease',
        }}
      >
        <Sun style={{ width: 16, height: 16 }} /> {t('intro.step5Light')}
      </button>
      <button
        onClick={() => theme === 'light' && toggleTheme()}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '10px 0', borderRadius: 10, cursor: 'pointer',
          background: theme === 'dark' ? 'rgba(99,89,255,0.2)' : 'rgba(255,255,255,0.06)',
          border: theme === 'dark' ? '2px solid rgba(99,89,255,0.6)' : '1px solid rgba(255,255,255,0.1)',
          color: theme === 'dark' ? '#a78bfa' : 'var(--text-secondary, #aaa)',
          fontWeight: 700, fontSize: 13, transition: 'all 0.2s ease',
        }}
      >
        <Moon style={{ width: 16, height: 16 }} /> {t('intro.step5Dark')}
      </button>
    </div>
  );
}

/** Step 6: Kompaktes Absenderdaten-Formular */
function AbsenderForm({ form, onChange, t }) {
  const fields = [
    { key: 'vorname',  labelKey: 'intro.step6FirstName' },
    { key: 'nachname', labelKey: 'intro.step6LastName' },
    { key: 'adresse',  labelKey: 'intro.step6Address' },
    { key: 'email',    labelKey: 'intro.step6Email',   type: 'email' },
    { key: 'telefon',  labelKey: 'intro.step6Phone',   type: 'tel' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted, #888)', margin: 0 }}>
        {t('intro.step6Hint')}
      </p>
      {fields.map(({ key, labelKey, type }) => (
        <div key={key}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted, #888)', marginBottom: 3 }}>
            {t(labelKey)}
          </label>
          <input
            type={type || 'text'}
            value={form[key] || ''}
            onChange={e => onChange(key, e.target.value)}
            style={{
              width: '100%', padding: '7px 10px', borderRadius: 8, boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text-primary, white)', fontSize: 12, outline: 'none',
            }}
          />
        </div>
      ))}
    </div>
  );
}
