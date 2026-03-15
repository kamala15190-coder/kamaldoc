import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Upload, LayoutDashboard, Archive, Menu, X, User, LogOut, DollarSign, Landmark, Stethoscope, Zap, Rocket, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { SubscriptionProvider, useSubscription } from './hooks/useSubscription.jsx';
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

const NAV_ITEMS = [
  { path: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/upload', labelKey: 'nav.upload', icon: Upload },
  { path: '/ausgaben', labelKey: 'nav.expenses', icon: DollarSign },
  { path: '/behoerde', labelKey: 'nav.behoerde', icon: Landmark },
  { path: '/befund', labelKey: 'nav.befund', icon: Stethoscope },
  { path: '/archiv', labelKey: 'nav.archive', icon: Archive },
  { path: '/profil', labelKey: 'nav.profile', icon: User },
];

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">{t('common.loading')}</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function NavBar() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await signOut();
    setDrawerOpen(false);
  };

  // Drawer schließen bei Routenwechsel
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Body scroll sperren wenn Drawer offen
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  return (
    <>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            <Link to="/" className="flex items-center gap-2 no-underline">
              <img src="/KDoc_Logo.png" alt="KamalDoc" className="h-9 object-contain" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-0.5">
              {NAV_ITEMS.map(({ path, labelKey, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium no-underline transition-colors whitespace-nowrap ${
                    isActive(path) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t(labelKey)}
                </Link>
              ))}
              <UpgradeButton />
              <LanguageSwitcher />
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 ml-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer bg-transparent border-none"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t('nav.logout')}
              </button>
            </div>

            {/* Mobile: Language + Hamburger */}
            <div className="lg:hidden flex items-center gap-1">
              <LanguageSwitcher />
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer bg-transparent border-none"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-60 bg-black/40 transition-opacity duration-300"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-70 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-out ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <img src="/KDoc_Logo.png" alt="KamalDoc" className="h-8 object-contain" />
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer bg-transparent border-none"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map(({ path, labelKey, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium no-underline transition-all ${
                isActive(path)
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
              style={{ minHeight: '48px' }}
            >
              <Icon className="w-5 h-5" />
              {t(labelKey)}
            </Link>
          ))}
          
          {/* Upgrade Button (Mobile) */}
          <div className="px-3 pt-2">
            <UpgradeButton mobile />
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 transition-all cursor-pointer bg-transparent border-none"
            style={{ minHeight: '48px' }}
          >
            <LogOut className="w-5 h-5" />
            {t('nav.logout')}
          </button>
        </nav>
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
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer bg-transparent border-none text-lg"
        title={currentLang.label}
        style={{ minHeight: '36px', minWidth: '36px' }}
      >
        {currentLang.flag}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-[100] max-h-72 overflow-y-auto w-52">
          {LANGUAGES.slice(0, 2).map(lang => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors cursor-pointer bg-transparent border-none ${
                lang.code === i18n.language ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
          <div className="border-t border-slate-100 my-1" />
          {LANGUAGES.slice(2).map(lang => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors cursor-pointer bg-transparent border-none ${
                lang.code === i18n.language ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UpgradeButton({ mobile = false }) {
  const { isFree, isBasic, isPro } = useSubscription();
  const { t } = useTranslation();

  if (isPro) {
    return (
      <Link
        to="/pricing"
        className={`flex items-center gap-1.5 no-underline font-semibold transition-all ${
          mobile
            ? 'w-full px-4 py-3 rounded-xl text-base bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            : 'px-2.5 py-1.5 ml-1 rounded-lg text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
        }`}
        style={mobile ? { minHeight: '48px' } : {}}
      >
        <Crown className={mobile ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
        {t('pricing.managePlan')}
      </Link>
    );
  }

  if (isBasic) {
    return (
      <Link
        to="/pricing"
        className={`flex items-center gap-1.5 no-underline font-semibold transition-all ${
          mobile
            ? 'w-full px-4 py-3 rounded-xl text-base bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            : 'px-2.5 py-1.5 ml-1 rounded-lg text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
        }`}
        style={mobile ? { minHeight: '48px' } : {}}
      >
        <Rocket className={mobile ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
        {t('pricing.upgradePro')}
      </Link>
    );
  }

  // Free
  return (
    <Link
      to="/pricing"
      className={`flex items-center gap-1.5 no-underline font-semibold transition-all ${
        mobile
          ? 'w-full px-4 py-3 rounded-xl text-base bg-amber-50 text-amber-700 hover:bg-amber-100'
          : 'px-2.5 py-1.5 ml-1 rounded-lg text-xs bg-amber-50 text-amber-700 hover:bg-amber-100'
      }`}
      style={mobile ? { minHeight: '48px' } : {}}
    >
      <Zap className={mobile ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
      {t('pricing.upgrade')}
    </Link>
  );
}

function NativeStatusBar() {
  const { isPro } = useSubscription();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        StatusBar.setBackgroundColor({ color: '#1F2937' }).catch(() => {});
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      });
    }
  }, []);

  return (
    <div style={{
      backgroundColor: '#1F2937',
      height: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      {isPro ? (
        <span style={{ color: 'white', fontSize: '12px' }}>
          {t('pricing.proActive')}
        </span>
      ) : (
        <span
          onClick={() => navigate('/pricing')}
          style={{ color: 'white', fontSize: '12px', cursor: 'pointer' }}
        >
          {t('pricing.upgradePlan')}
        </span>
      )}
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-slate-50">
      {!isAuthPage && <NativeStatusBar />}
      {!isAuthPage && <NavBar />}
      <main className={!isAuthPage ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6" : ""}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/upload" element={<PrivateRoute><UploadPage /></PrivateRoute>} />
          <Route path="/ausgaben" element={<PrivateRoute><ExpensesPage /></PrivateRoute>} />
          <Route path="/behoerde" element={<PrivateRoute><BehoerdeAssistent /></PrivateRoute>} />
          <Route path="/befund" element={<PrivateRoute><BefundAssistent /></PrivateRoute>} />
          <Route path="/archiv" element={<PrivateRoute><Archiv /></PrivateRoute>} />
          <Route path="/profil" element={<PrivateRoute><ProfilPage /></PrivateRoute>} />
          <Route path="/pricing" element={<PrivateRoute><PricingPage /></PrivateRoute>} />
          <Route path="/documents/:id" element={<PrivateRoute><DocumentDetail /></PrivateRoute>} />
        </Routes>
      </main>
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
      <AuthProvider>
        <SubscriptionProvider>
          <RtlWrapper>
            <AppContent />
          </RtlWrapper>
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
