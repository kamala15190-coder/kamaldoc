import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Upload, LayoutDashboard, Archive, Menu, X, User, LogOut, DollarSign, Landmark, Stethoscope } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { isRtl } from './languages';
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
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 ml-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer bg-transparent border-none"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t('nav.logout')}
              </button>
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer bg-transparent border-none"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              <Menu className="w-6 h-6" />
            </button>
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

function AppContent() {
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-slate-50">
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
        <RtlWrapper>
          <AppContent />
        </RtlWrapper>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
