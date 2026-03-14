import { useState, useEffect } from 'react';
import { User, Save, Loader2, CheckCircle, AlertCircle, Lock, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getEinstellungen, saveEinstellungen } from '../api';
import { supabase } from '../supabaseClient';
import { LANGUAGES } from '../languages';

export default function ProfilPage() {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState(null);

  // Language state
  const [selectedLang, setSelectedLang] = useState(i18n.language);

  useEffect(() => {
    (async () => {
      try {
        const data = await getEinstellungen();
        setForm(data || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const data = await saveEinstellungen(form);
      setForm(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || t('profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwError(null);
    if (newPassword.length < 6) {
      setPwError(t('auth.passwordTooShort'));
      return;
    }
    if (newPassword !== repeatPassword) {
      setPwError(t('auth.passwordMismatch'));
      return;
    }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwSuccess(true);
      setNewPassword('');
      setRepeatPassword('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err) {
      setPwError(err.message || t('profile.passwordChangeFailed'));
    } finally {
      setPwSaving(false);
    }
  };

  const handleLanguageChange = async (langCode) => {
    setSelectedLang(langCode);
    i18n.changeLanguage(langCode);
    localStorage.setItem('kamaldoc_language', langCode);
    // Save to Supabase profile
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <User className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-slate-900">{t('profile.title')}</h1>
      </div>

      {/* Section 1: Absenderdaten */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">{t('profile.senderData')}</h2>
        <p className="text-sm text-slate-500 mb-5">{t('profile.senderDesc')}</p>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.firstName')}</label>
              <input type="text" value={form.vorname || ''} onChange={e => handleChange('vorname', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.lastName')}</label>
              <input type="text" value={form.nachname || ''} onChange={e => handleChange('nachname', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.street')}</label>
            <input type="text" value={form.adresse || ''} onChange={e => handleChange('adresse', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.zip')}</label>
              <input type="text" value={form.plz || ''} onChange={e => handleChange('plz', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.city')}</label>
              <input type="text" value={form.ort || ''} onChange={e => handleChange('ort', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.country')}</label>
            <input type="text" value={form.land || ''} onChange={e => handleChange('land', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.emailLabel')}</label>
              <input type="email" value={form.email || ''} onChange={e => handleChange('email', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.phoneLabel')}</label>
              <input type="tel" value={form.telefon || ''} onChange={e => handleChange('telefon', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
            </div>
          </div>
        </div>

        {saved && (
          <div className="mt-4 flex items-center gap-2 text-green-600" style={{ animation: 'fadeInUp 0.2s ease-out' }}>
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{t('profile.saved')}</span>
          </div>
        )}
        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <button onClick={handleSave} disabled={saving}
          className="w-full md:w-auto mt-5 flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer border-none disabled:opacity-50 transition-colors"
          style={{ minHeight: '44px' }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('profile.saveButton')}
        </button>
      </div>

      {/* Section 2: Passwort ändern */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">{t('profile.changePassword')}</h2>
        </div>

        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.newPassword')}</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.repeatPassword')}</label>
            <input type="password" value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
          </div>
        </div>

        {pwSuccess && (
          <div className="mt-4 flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{t('profile.passwordChanged')}</span>
          </div>
        )}
        {pwError && (
          <div className="mt-4 flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{pwError}</span>
          </div>
        )}

        <button onClick={handlePasswordChange} disabled={pwSaving || !newPassword}
          className="w-full md:w-auto mt-5 flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 cursor-pointer border-none disabled:opacity-50 transition-colors"
          style={{ minHeight: '44px' }}>
          {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          {t('profile.changePasswordButton')}
        </button>
      </div>

      {/* Section 3: App-Sprache */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">{t('profile.appLanguage')}</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">{t('profile.appLanguageDesc')}</p>

        <select
          value={selectedLang}
          onChange={e => handleLanguageChange(e.target.value)}
          className="w-full md:w-80 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          style={{ minHeight: '44px' }}
        >
          {LANGUAGES.slice(0, 2).map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.label}
            </option>
          ))}
          <option disabled>──────────</option>
          {LANGUAGES.slice(2).map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
