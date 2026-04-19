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
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.15)', borderTopColor: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }} className="animate-fade-in">
        <div style={{ padding: 8, borderRadius: 10, background: 'var(--accent-soft)' }}>
          <Settings style={{ width: 18, height: 18, color: 'var(--accent-solid)' }} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Einstellungen</h1>
      </div>

      {isEmpty && (
        <div className="glass-card animate-fade-in" style={{ padding: 14, marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 10, border: '1px solid rgba(245,158,11,0.15)' }}>
          <User style={{ width: 18, height: 18, color: 'var(--warning-text)', marginTop: 1, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--warning-text)', margin: 0 }}>Absenderdaten fehlen</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Bitte hinterlege deine Absenderdaten, damit sie automatisch in generierten Antwortbriefen verwendet werden.
            </p>
          </div>
        </div>
      )}

      <div className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px' }}>Absenderdaten</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
          Diese Daten werden beim Generieren von Antwortbriefen als Absender verwendet.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FIELDS.filter(f => f.key === 'vorname' || f.key === 'nachname').map(field => (
              <div key={field.key}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{field.label}</label>
                <input type="text" value={form[field.key] || ''} onChange={e => handleChange(field.key, e.target.value)} placeholder={field.placeholder} className="input-dark" />
              </div>
            ))}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Adresse</label>
            <input type="text" value={form.adresse || ''} onChange={e => handleChange('adresse', e.target.value)} placeholder="Musterstraße 1" className="input-dark" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>PLZ</label>
              <input type="text" value={form.plz || ''} onChange={e => handleChange('plz', e.target.value)} placeholder="12345" className="input-dark" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Ort</label>
              <input type="text" value={form.ort || ''} onChange={e => handleChange('ort', e.target.value)} placeholder="Berlin" className="input-dark" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>E-Mail</label>
              <input type="email" value={form.email || ''} onChange={e => handleChange('email', e.target.value)} placeholder="max@beispiel.de" className="input-dark" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Telefon</label>
              <input type="tel" value={form.telefon || ''} onChange={e => handleChange('telefon', e.target.value)} placeholder="+49 123 456789" className="input-dark" />
            </div>
          </div>
        </div>

        {saved && <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }} className="animate-fade-in"><CheckCircle style={{ width: 14, height: 14, color: 'var(--success)' }} /><span style={{ fontSize: 13, color: 'var(--success-text)', fontWeight: 600 }}>Einstellungen gespeichert!</span></div>}
        {error && <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle style={{ width: 14, height: 14, color: 'var(--danger)' }} /><span style={{ fontSize: 13, color: 'var(--danger-text)' }}>{error}</span></div>}

        <button onClick={handleSave} disabled={saving} className="btn-accent" style={{
          width: '100%', marginTop: 14, padding: '12px 0', fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.5 : 1,
        }}>
          {saving ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} /> : <Save style={{ width: 16, height: 16 }} />}
          Speichern
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
