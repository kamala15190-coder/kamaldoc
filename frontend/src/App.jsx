import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  Upload, LayoutDashboard, Archive, Menu, X, User, LogOut, DollarSign,
  Landmark, Stethoscope, Zap, Rocket, Crown, Headphones, Shield, Lock,
  Plus, ChevronRight, Settings, Download
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { SubscriptionProvider, useSubscription } from './hooks/useSubscription.jsx';
import { PlanLimitProvider } from './hooks/usePlanLimit.jsx';
import { ThemeProvider } from './hooks/useTheme.jsx';
import { LANGUAGES, isRtl } from './languages';
import { supabase } from './supabaseClient';
import Dashboard from './pages/Dashboard';
import DocumentDetail from './pages/DocumentDetail';
import UploadPage from './pages/UploadPage';
import Archiv from './pages/Archiv';
import ProfilPage from './pages/ProfilPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ExpensesPage from './pages/ExpensesPage';
import BehoerdeAssistent from './pages/BehoerdeAssistent';
import BefundAssistent from './pages/BefundAssistent';
import PricingPage from './pages/PricingPage';
import DatenschutzPage from './pages/DatenschutzPage';
import NutzungsbedingungenPage from './pages/NutzungsbedingungenPage';
import AGBPage from './pages/AGBPage';
import ImpressumPage from './pages/ImpressumPage';
import SupportPage from './pages/SupportPage';
import AdminPage from './pages/AdminPage';
import SektorDetailPage from './pages/SektorDetailPage';
import DokumenteListe from './pages/DokumenteListe';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ScanPreviewPage from './pages/ScanPreviewPage';
import { checkAdmin, getTicketUnreadCount } from './api';
import IntroGuide from './components/IntroGuide';

const TAB_ITEMS = [
  { path: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/befund', labelKey: 'nav.befund', icon: Stethoscope },
  { path: '/upload', labelKey: 'nav.upload', icon: Plus, isCenter: true },
  { path: '/behoerde', labelKey: 'nav.behoerde', icon: Landmark },
  { path: '/profil', labelKey: 'nav.profile', icon: User },
];

const MORE_ITEMS = [
  { path: '/archiv', labelKey: 'nav.archive', icon: Archive },
  { path: '/ausgaben', labelKey: 'nav.expenses', icon: DollarSign },
  { path: '/support', labelKey: 'nav.support', icon: Headphones },
];

function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (user) {
      checkAdmin().then(d => setIsAdmin(d.is_admin)).catch(() => setIsAdmin(false));
    }
  }, [user]);
  return isAdmin;
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '3px solid rgba(139,92,246,0.2)',
            borderTopColor: 'var(--accent-solid)',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t('common.loading')}</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function BottomTabBar() {
  const location = useLocation();
  const { t } = useTranslation();
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="tab-bar-glass fixed bottom-0 left-0 right-0 z-50" style={{
      paddingBottom: 'var(--safe-area-bottom)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: 'var(--tab-bar-height)',
        maxWidth: 500,
        margin: '0 auto',
        padding: '0 4px',
      }}>
        {TAB_ITEMS.map(({ path, labelKey, icon: Icon, isCenter }) => {
          const active = isActive(path);

          if (isCenter) {
            return (
              <Link key={path} to={path} className="plus-button" onClick={() => { if (Capacitor.isNativePlatform()) { Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); } }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 52, height: 52, borderRadius: 16,
                background: 'var(--accent-gradient)',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.35)',
                textDecoration: 'none',
                transform: 'translateY(-8px)',
                transition: 'all 0.25s ease',
              }}>
                <Icon style={{ width: 24, height: 24, color: 'white', strokeWidth: 2.5 }} />
              </Link>
            );
          }

          return (
            <Link key={path} to={path} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: 12,
              transition: 'all 0.25s ease',
              minWidth: 56,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 10,
                background: active ? 'var(--accent-soft)' : 'transparent',
                transition: 'all 0.25s ease',
              }}>
                <Icon style={{
                  width: 20, height: 20,
                  color: active ? 'var(--accent-solid)' : 'var(--nav-inactive)',
                  opacity: active ? 1 : 'var(--nav-inactive-opacity)',
                  strokeWidth: active ? 2.2 : 1.8,
                  transition: 'all 0.25s ease',
                }} />
              </div>
              <span style={{
                fontSize: 10, fontWeight: active ? 600 : 500,
                color: active ? 'var(--accent-solid)' : 'var(--nav-inactive)',
                opacity: active ? 1 : 'var(--nav-inactive-opacity)',
                letterSpacing: '0.01em',
                transition: 'all 0.25s ease',
              }}>
                {t(labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function TopHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  const isAdmin = useIsAdmin();
  const { signOut } = useAuth();
  const { user } = useAuth();
  const [ticketBadge, setTicketBadge] = useState(0);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = moreOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [moreOpen]);

  useEffect(() => {
    if (!user) return;
    const fetchBadge = () => getTicketUnreadCount().then(d => setTicketBadge(d.count || 0)).catch(() => {});
    fetchBadge();
    const iv = setInterval(fetchBadge, 30000);
    return () => clearInterval(iv);
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    setMoreOpen(false);
  };

  const { plan: currentPlan, isPro, isBasic, isFree, isPaid, loading: subLoading } = useSubscription();

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--header-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-glass)',
        padding: '0 16px',
        paddingTop: 'var(--safe-area-top)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 56, maxWidth: 500, margin: '0 auto', position: 'relative',
        }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/KDoc_Appheader.png" alt="KamalDoc" style={{ height: 30, objectFit: 'contain' }} />
          </Link>

          {!subLoading && (
            <div onClick={() => navigate('/pricing')} style={{
              position: 'absolute', left: '50%', transform: 'translateX(-50%)',
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap',
              background: isPro ? 'rgba(99,89,255,0.12)' : isBasic ? 'rgba(245,158,11,0.10)' : 'rgba(255,255,255,0.05)',
              border: isPro ? '0.5px solid rgba(99,89,255,0.25)' : isBasic ? '0.5px solid rgba(245,158,11,0.20)' : '0.5px solid var(--border-glass)',
              color: isPro ? 'var(--accent-solid)' : isBasic ? 'var(--warning-text)' : 'var(--text-muted)',
            }}>
              <>
                {isPro && <Rocket style={{ width: 12, height: 12 }} />}
                {isBasic && <Zap style={{ width: 12, height: 12 }} />}
                {isFree && <Lock style={{ width: 12, height: 12 }} />}
              </>
              {isPro ? t('pricing.proActive') : isBasic ? t('pricing.basicActive') : t('pricing.upgradePlan')}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LanguageSwitcher />
            <button
              onClick={() => setMoreOpen(true)}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 10,
                background: 'transparent', border: 'none', cursor: 'pointer',
              }}
            >
              <Menu style={{ width: 20, height: 20, color: 'var(--text-secondary)' }} />
              {ticketBadge > 0 && <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: '#FF5F6D' }} />}
            </button>
          </div>
        </div>
      </header>

      {/* More menu overlay */}
      {moreOpen && (
        <div
          className="modal-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More menu drawer from right */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 70,
        width: 280, background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-glass)',
        transform: moreOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', paddingTop: 'calc(16px + var(--safe-area-top))',
          borderBottom: '1px solid var(--border-glass)',
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{t('nav.menu')}</span>
          <button
            onClick={() => setMoreOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--bg-glass)', border: 'none', cursor: 'pointer',
            }}
          >
            <X style={{ width: 18, height: 18, color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <div style={{ padding: 12, flex: 1, overflowY: 'auto' }}>
          {MORE_ITEMS.map(({ path, labelKey, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              onClick={() => { setMoreOpen(false); if (path === '/support') setTicketBadge(0); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 12, textDecoration: 'none',
                color: location.pathname === path ? 'var(--accent-solid)' : 'var(--text-primary)',
                background: location.pathname === path ? 'var(--accent-soft)' : 'transparent',
                marginBottom: 4,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ position: 'relative' }}>
                <Icon style={{ width: 20, height: 20, opacity: 0.8 }} />
                {path === '/support' && ticketBadge > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -6,
                    minWidth: 14, height: 14, borderRadius: 7,
                    background: '#FF5F6D', color: '#fff',
                    fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px',
                  }}>{ticketBadge}</span>
                )}
              </div>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{t(labelKey)}</span>
              <ChevronRight style={{ width: 16, height: 16, marginLeft: 'auto', opacity: 0.3 }} />
            </Link>
          ))}

          <Link
            to="/pricing"
            onClick={() => setMoreOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 12, textDecoration: 'none',
              color: 'var(--text-primary)', marginBottom: 4,
              background: location.pathname === '/pricing' ? 'var(--accent-soft)' : 'transparent',
            }}
          >
            <Zap style={{ width: 20, height: 20, opacity: 0.8 }} />
            <span style={{ fontSize: 15, fontWeight: 500 }}>{t('pricing.upgrade')}</span>
            <ChevronRight style={{ width: 16, height: 16, marginLeft: 'auto', opacity: 0.3 }} />
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMoreOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 12, textDecoration: 'none',
                color: 'var(--text-primary)', marginBottom: 4,
              }}
            >
              <Shield style={{ width: 20, height: 20, opacity: 0.8 }} />
              <span style={{ fontSize: 15, fontWeight: 500 }}>Admin</span>
              <ChevronRight style={{ width: 16, height: 16, marginLeft: 'auto', opacity: 0.3 }} />
            </Link>
          )}
        </div>

        <div style={{
          padding: '12px 16px 24px', paddingBottom: 'calc(24px + var(--safe-area-bottom))',
          borderTop: '1px solid var(--border-glass)',
        }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '14px 16px', borderRadius: 12,
              background: 'var(--danger-soft)', border: 'none',
              color: 'var(--danger)', fontSize: 15, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
          >
            <LogOut style={{ width: 18, height: 18 }} />
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </>
  );
}

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const handleChange = async (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('kamaldoc_language', langCode);
    setOpen(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          app_language: langCode,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Failed to save language to profile:', err);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        data-intro="language"
        onClick={() => setOpen(prev => !prev)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 10,
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: 18,
        }}
        title={currentLang.label}
      >
        <span role="img" aria-label={currentLang.label} style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>{currentLang.flag}</span>
      </button>
      {open && (
        <div className="modal-content" style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 8,
          background: 'var(--bg-secondary)', borderRadius: 14,
          border: '1px solid var(--border-glass-strong)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          padding: 6, zIndex: 100, maxHeight: 288, overflowY: 'auto', width: 200,
        }}>
          {LANGUAGES.slice(0, 2).map(lang => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, border: 'none',
                background: lang.code === i18n.language ? 'var(--accent-soft)' : 'transparent',
                color: lang.code === i18n.language ? 'var(--accent-solid)' : 'var(--text-primary)',
                fontWeight: lang.code === i18n.language ? 600 : 400,
                fontSize: 14, cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
            >
              <span role="img" aria-label={lang.label} style={{ fontSize: 16, fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
          <div style={{ height: 1, background: 'var(--border-glass)', margin: '4px 8px' }} />
          {LANGUAGES.slice(2).map(lang => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, border: 'none',
                background: lang.code === i18n.language ? 'var(--accent-soft)' : 'transparent',
                color: lang.code === i18n.language ? 'var(--accent-solid)' : 'var(--text-primary)',
                fontWeight: lang.code === i18n.language ? 600 : 400,
                fontSize: 14, cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
            >
              <span role="img" aria-label={lang.label} style={{ fontSize: 16, fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UpgradeButton({ mobile = false }) {
  const { isFree, isBasic, isPro, loading } = useSubscription();
  const { t } = useTranslation();

  if (loading) return null;

  if (isPro) {
    return (
      <Link
        to="/pricing"
        className="no-underline"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: mobile ? '100%' : 'auto',
          padding: mobile ? '14px 16px' : '6px 12px',
          borderRadius: 12,
          background: 'var(--accent-soft)',
          color: 'var(--accent-solid)',
          fontWeight: 600, fontSize: mobile ? 15 : 12,
          transition: 'all 0.2s ease',
        }}
      >
        <Crown style={{ width: mobile ? 20 : 14, height: mobile ? 20 : 14 }} />
        {t('pricing.managePlan')}
      </Link>
    );
  }

  if (isBasic) {
    return (
      <Link
        to="/pricing"
        className="no-underline"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: mobile ? '100%' : 'auto',
          padding: mobile ? '14px 16px' : '6px 12px',
          borderRadius: 12,
          background: 'var(--accent-soft)',
          color: 'var(--accent-solid)',
          fontWeight: 600, fontSize: mobile ? 15 : 12,
          transition: 'all 0.2s ease',
        }}
      >
        <Rocket style={{ width: mobile ? 20 : 14, height: mobile ? 20 : 14 }} />
        {t('pricing.upgradePro')}
      </Link>
    );
  }

  // Free
  return (
    <Link
      to="/pricing"
      className="no-underline"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: mobile ? '100%' : 'auto',
        padding: mobile ? '14px 16px' : '6px 12px',
        borderRadius: 12,
        background: 'var(--warning-soft)',
        color: 'var(--warning-text)',
        fontWeight: 600, fontSize: mobile ? 15 : 12,
        transition: 'all 0.2s ease',
      }}
    >
      <Zap style={{ width: mobile ? 20 : 14, height: mobile ? 20 : 14 }} />
      {t('pricing.upgrade')}
    </Link>
  );
}

function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // Don't show on native platform or if already installed as PWA
    if (Capacitor.isNativePlatform()) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (sessionStorage.getItem('pwa_banner_dismissed')) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', '1');
    setTimeout(() => setShow(false), 300);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '12px 16px',
      background: 'linear-gradient(135deg, rgba(139,92,246,0.95), rgba(99,102,241,0.95))',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', gap: 12,
      animation: dismissed ? 'slideUp 0.3s ease forwards' : 'slideDown 0.4s cubic-bezier(0.16,1,0.3,1)',
      boxShadow: '0 4px 24px rgba(139,92,246,0.3)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, overflow: 'hidden',
        background: 'rgba(255,255,255,0.15)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img src="/KDoc-Applogo.png" alt="" style={{ width: 32, height: 32, borderRadius: 6 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'white', margin: 0 }}>
          {t('pwa.installTitle', 'Install KamalDoc App')}
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', margin: '2px 0 0' }}>
          {t('pwa.installDesc', 'Add to home screen for quick access')}
        </p>
      </div>
      <button
        onClick={handleInstall}
        style={{
          padding: '8px 14px', borderRadius: 10,
          background: 'white', color: '#7c3aed',
          border: 'none', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 5,
        }}
      >
        <Download style={{ width: 14, height: 14 }} />
        {t('pwa.install', 'Install')}
      </button>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
          cursor: 'pointer', padding: 4, flexShrink: 0,
        }}
      >
        <X style={{ width: 16, height: 16 }} />
      </button>
      <style>{`
        @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-100%); opacity: 0; } }
      `}</style>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const isAuthPage = ['/login', '/register', '/datenschutz', '/nutzungsbedingungen', '/agb', '/impressum', '/forgot-password', '/reset-password'].includes(location.pathname);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <PWAInstallBanner />
      {!isAuthPage && <TopHeader />}
      <main style={!isAuthPage ? {
        maxWidth: 500, margin: '0 auto',
        padding: '16px 16px calc(var(--tab-bar-height) + var(--safe-area-bottom) + 16px)',
      } : {}}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/datenschutz" element={<DatenschutzPage />} />
          <Route path="/nutzungsbedingungen" element={<NutzungsbedingungenPage />} />
          <Route path="/agb" element={<AGBPage />} />
          <Route path="/impressum" element={<ImpressumPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/upload" element={<PrivateRoute><UploadPage /></PrivateRoute>} />
          <Route path="/ausgaben" element={<PrivateRoute><ExpensesPage /></PrivateRoute>} />
          <Route path="/behoerde" element={<PrivateRoute><BehoerdeAssistent /></PrivateRoute>} />
          <Route path="/befund" element={<PrivateRoute><BefundAssistent /></PrivateRoute>} />
          <Route path="/archiv" element={<PrivateRoute><Archiv /></PrivateRoute>} />
          <Route path="/profil" element={<PrivateRoute><ProfilPage /></PrivateRoute>} />
          <Route path="/pricing" element={<PrivateRoute><PricingPage /></PrivateRoute>} />
          <Route path="/documents/:id" element={<PrivateRoute><DocumentDetail /></PrivateRoute>} />
          <Route path="/support" element={<PrivateRoute><SupportPage /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
          <Route path="/dokumente" element={<PrivateRoute><DokumenteListe /></PrivateRoute>} />
          <Route path="/scan" element={<PrivateRoute><ScanPreviewPage /></PrivateRoute>} />
          <Route path="/sektor/:type" element={<PrivateRoute><SektorDetailPage /></PrivateRoute>} />
        </Routes>
      </main>
      {!isAuthPage && <BottomTabBar />}
      {!isAuthPage && <IntroGuide />}
    </div>
  );
}

function RtlWrapper({ children }) {
  const { i18n } = useTranslation();
  const rtl = isRtl(i18n.language);

  useEffect(() => {
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [rtl, i18n.language]);

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <PlanLimitProvider>
              <RtlWrapper>
                <AppContent />
              </RtlWrapper>
            </PlanLimitProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
