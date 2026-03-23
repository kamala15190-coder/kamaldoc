import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X, PartyPopper } from 'lucide-react';
import { getIntroStatus, markIntroComplete } from '../api';

// Step definitions: each step has a route, a target selector, and i18n keys
const STEPS = [
  { route: '/',       target: '[data-intro="language"]',    titleKey: 'intro.step1Title', descKey: 'intro.step1Desc' },
  { route: '/befund', target: '[data-intro="befund"]',      titleKey: 'intro.step2Title', descKey: 'intro.step2Desc' },
  { route: '/behoerde', target: '[data-intro="behoerde"]',  titleKey: 'intro.step3Title', descKey: 'intro.step3Desc' },
  { route: '/upload', target: '[data-intro="upload"]',      titleKey: 'intro.step4Title', descKey: 'intro.step4Desc' },
  { route: '/profil', target: '[data-intro="darkmode"]',    titleKey: 'intro.step5Title', descKey: 'intro.step5Desc' },
  { route: '/profil', target: '[data-intro="absender"]',    titleKey: 'intro.step6Title', descKey: 'intro.step6Desc' },
];

export default function IntroGuide() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const checkedRef = useRef(false);

  // Check intro status on mount
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    getIntroStatus()
      .then(data => {
        if (!data.has_seen_intro) setShow(true);
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
  }, [step, show, finishing]);

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

    // Small delay for DOM to settle after navigation
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
    try { await markIntroComplete(); } catch {}
    setTimeout(() => {
      setShow(false);
      setConfetti(false);
      setFinishing(false);
      navigate('/');
    }, 2500);
  }, [navigate]);

  const handleSkip = useCallback(async () => {
    try { await markIntroComplete(); } catch {}
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

  if (!show) return null;

  // Confetti screen
  if (confetti) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        animation: 'introFadeIn 0.4s ease',
      }}>
        <div style={{ position: 'relative' }}>
          {/* Confetti particles */}
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: 8 + Math.random() * 8,
              height: 8 + Math.random() * 8,
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
            0% { transform: translate(0, 0) rotate(0deg) scale(0); opacity: 1; }
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

  // Calculate tooltip position
  let tooltipStyle = {
    position: 'fixed', zIndex: 10002,
    background: 'var(--bg-secondary, #1a1a2e)', borderRadius: 16,
    border: '1px solid rgba(99,89,255,0.3)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    padding: '20px 22px', maxWidth: 320, width: 'calc(100vw - 40px)',
  };

  if (targetRect) {
    const below = targetRect.top + targetRect.height + 16;
    const above = targetRect.top - 16;
    if (below + 200 < window.innerHeight) {
      tooltipStyle.top = below;
    } else {
      tooltipStyle.bottom = window.innerHeight - above;
    }
    tooltipStyle.left = Math.max(20, Math.min(targetRect.left, window.innerWidth - 340));
  } else {
    tooltipStyle.top = '50%';
    tooltipStyle.left = '50%';
    tooltipStyle.transform = 'translate(-50%, -50%)';
  }

  return (
    <>
      {/* Dark overlay with cutout for highlighted element */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        pointerEvents: 'auto',
      }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <mask id="intro-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 6}
                  y={targetRect.top - 6}
                  width={targetRect.width + 12}
                  height={targetRect.height + 12}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask="url(#intro-mask)" />
        </svg>

        {/* Pulsing ring around target */}
        {targetRect && (
          <div style={{
            position: 'fixed',
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            borderRadius: 14,
            border: '2px solid rgba(99,89,255,0.8)',
            boxShadow: '0 0 0 4px rgba(99,89,255,0.2), 0 0 20px rgba(99,89,255,0.3)',
            animation: 'introPulse 2s ease-in-out infinite',
            pointerEvents: 'none',
            zIndex: 10001,
          }} />
        )}
      </div>

      {/* Tooltip card */}
      <div style={tooltipStyle}>
        {/* Step indicator */}
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
          <span style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>
            {step + 1}/{STEPS.length}
          </span>
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, white)', margin: '0 0 6px' }}>
          {t(currentStep.titleKey)}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary, #aaa)', margin: '0 0 18px', lineHeight: 1.5 }}>
          {t(currentStep.descKey)}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            <button onClick={handleNext} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '8px 18px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6359FF, #8B5CF6)',
              border: 'none', color: 'white',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(99,89,255,0.3)',
            }}>
              {isLast ? t('intro.finish') : t('intro.next')} {!isLast && <ChevronRight style={{ width: 14, height: 14 }} />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes introPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(99,89,255,0.2), 0 0 20px rgba(99,89,255,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(99,89,255,0.1), 0 0 30px rgba(99,89,255,0.5); }
        }
      `}</style>
    </>
  );
}
