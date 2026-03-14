import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, CheckCircle, AlertCircle, User } from 'lucide-react';
import { getEinstellungen, saveEinstellungen } from '../api';

const FIELDS = [
  { key: 'vorname', label: 'Vorname', placeholder: 'Max' },
  { key: 'nachname', label: 'Nachname', placeholder: 'Mustermann' },
  { key: 'adresse', label: 'Adresse', placeholder: 'Musterstraße 1' },
  { key: 'plz', label: 'PLZ', placeholder: '12345', type: 'short' },
  { key: 'ort', label: 'Ort', placeholder: 'Berlin', type: 'short' },
  { key: 'email', label: 'E-Mail', placeholder: 'max@beispiel.de' },
  { key: 'telefon', label: 'Telefon', placeholder: '+49 123 456789' },
];

export default function Einstellungen() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

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
      setError(err.response?.data?.detail || err.message || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const isEmpty = !form.vorname && !form.nachname;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-slate-900">Einstellungen</h1>
      </div>

      {/* Hinweis wenn leer */}
      {isEmpty && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <User className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Absenderdaten fehlen</p>
            <p className="text-sm text-amber-600 mt-0.5">
              Bitte hinterlege deine Absenderdaten, damit sie automatisch in generierten Antwortbriefen verwendet werden.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Absenderdaten</h2>
        <p className="text-sm text-slate-500 mb-5">
          Diese Daten werden beim Generieren von Antwortbriefen als Absender verwendet.
        </p>

        <div className="space-y-4">
          {/* Vorname + Nachname nebeneinander */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FIELDS.filter(f => f.key === 'vorname' || f.key === 'nachname').map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-slate-500 mb-1">{field.label}</label>
                <input
                  type="text"
                  value={form[field.key] || ''}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ minHeight: '44px' }}
                />
              </div>
            ))}
          </div>

          {/* Adresse */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Adresse</label>
            <input
              type="text"
              value={form.adresse || ''}
              onChange={e => handleChange('adresse', e.target.value)}
              placeholder="Musterstraße 1"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ minHeight: '44px' }}
            />
          </div>

          {/* PLZ + Ort nebeneinander */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">PLZ</label>
              <input
                type="text"
                value={form.plz || ''}
                onChange={e => handleChange('plz', e.target.value)}
                placeholder="12345"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ minHeight: '44px' }}
              />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="block text-xs font-medium text-slate-500 mb-1">Ort</label>
              <input
                type="text"
                value={form.ort || ''}
                onChange={e => handleChange('ort', e.target.value)}
                placeholder="Berlin"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ minHeight: '44px' }}
              />
            </div>
          </div>

          {/* E-Mail + Telefon nebeneinander */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">E-Mail</label>
              <input
                type="email"
                value={form.email || ''}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="max@beispiel.de"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ minHeight: '44px' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Telefon</label>
              <input
                type="tel"
                value={form.telefon || ''}
                onChange={e => handleChange('telefon', e.target.value)}
                placeholder="+49 123 456789"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ minHeight: '44px' }}
              />
            </div>
          </div>
        </div>

        {/* Erfolg */}
        {saved && (
          <div className="mt-4 flex items-center gap-2 text-green-600" style={{ animation: 'fadeInUp 0.2s ease-out' }}>
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Einstellungen gespeichert!</span>
          </div>
        )}

        {/* Fehler */}
        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full md:w-auto mt-5 flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer border-none disabled:opacity-50 transition-colors"
          style={{ minHeight: '44px' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Speichern
        </button>
      </div>
    </div>
  );
}
