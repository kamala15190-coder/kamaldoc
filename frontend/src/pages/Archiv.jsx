import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive, CheckCircle, Undo2, Loader2, ClipboardList
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getDocuments, updateDocument } from '../api';


const KATEGORIE_BADGE = {
  brief: 'badge-brief',
  rechnung: 'badge-rechnung',
  lohnzettel: 'badge-lohnzettel',
  kontoauszug: 'badge-kontoauszug',
  vertrag: 'badge-vertrag',
  behoerde: 'badge-behoerde',
  sonstiges: 'badge-sonstiges',
};

const KATEGORIE_COLORS = {
  brief: 'bg-blue-100 text-blue-700',
  rechnung: 'bg-amber-100 text-amber-700',
  lohnzettel: 'bg-green-100 text-green-700',
  kontoauszug: 'bg-purple-100 text-purple-700',
  vertrag: 'bg-rose-100 text-rose-700',
  behoerde: 'bg-teal-100 text-teal-700',
  sonstiges: 'bg-slate-100 text-slate-700',
};

export default function Archiv() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reopeningIds, setReopeningIds] = useState(new Set());

  const fetchArchiv = async () => {
    setLoading(true);
    try {
      const data = await getDocuments({ archiv: true });
      setDocs(data.documents || data);
    } catch (err) {
      console.error('Fehler beim Laden des Archivs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchiv();
  }, []);

  const handleReopen = async (docId) => {
    setReopeningIds(prev => new Set(prev).add(docId));
    try {
      await updateDocument(docId, { handlung_erledigt: false });
      setTimeout(() => {
        setDocs(prev => prev.filter(d => d.id !== docId));
        setReopeningIds(prev => { const s = new Set(prev); s.delete(docId); return s; });
      }, 500);
    } catch (err) {
      console.error(err);
      setReopeningIds(prev => { const s = new Set(prev); s.delete(docId); return s; });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid rgba(139,92,246,0.15)',
          borderTopColor: 'var(--accent-solid)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }} className="animate-fade-in">
        <Archive style={{ width: 48, height: 48, color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.4 }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: 16, margin: 0 }}>{t('archive.noItems')}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{t('archive.noItemsDesc')}</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }} className="animate-fade-in">
        <div style={{ padding: 8, borderRadius: 10, background: 'var(--success-soft)' }}>
          <Archive style={{ width: 18, height: 18, color: '#10b981' }} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('archive.title')}</h1>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
          background: 'var(--success-soft)', color: '#34d399',
        }}>
          {t('archive.doneCount', { count: docs.length })}
        </span>
      </div>

      {/* Mobile Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {docs.map((doc, idx) => (
          <div
            key={doc.id}
            className="glass-card animate-fade-in-up"
            style={{
              padding: 14, cursor: 'pointer',
              transition: 'all 0.3s ease',
              opacity: reopeningIds.has(doc.id) ? 0 : 1,
              transform: reopeningIds.has(doc.id) ? 'translateX(-30px)' : 'translateX(0)',
              animationDelay: `${Math.min(idx, 8) * 0.05}s`,
            }}
            onClick={() => navigate(`/documents/${doc.id}`)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.absender || '—'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0', textDecoration: 'line-through', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.handlung_beschreibung || '—'}
                </p>
              </div>
              <CheckCircle style={{ width: 18, height: 18, color: '#10b981', flexShrink: 0 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {doc.kategorie && (
                <span className={KATEGORIE_BADGE[doc.kategorie] || KATEGORIE_BADGE.sonstiges}
                  style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                  {t(`categories.${doc.kategorie}`, doc.kategorie)}
                </span>
              )}
              {doc.betrag != null && doc.betrag > 0 && (
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {Number(doc.betrag).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </span>
              )}
              {doc.erledigt_am && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(doc.erledigt_am).toLocaleDateString('de-DE')}
                </span>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleReopen(doc.id); }}
              disabled={reopeningIds.has(doc.id)}
              style={{
                width: '100%', marginTop: 10, padding: '10px 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontSize: 13, fontWeight: 600,
                background: 'var(--warning-soft)', color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: 10, cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: reopeningIds.has(doc.id) ? 0.5 : 1,
              }}
            >
              <Undo2 style={{ width: 14, height: 14 }} /> {t('archive.reopen')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
