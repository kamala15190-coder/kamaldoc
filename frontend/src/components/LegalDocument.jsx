import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Generischer Renderer für Rechtstexte (Datenschutz, AGB, Nutzung, Widerruf, Impressum).
 * Inhalt kommt aus dem i18n-`legal`-Namespace (src/locales/<lang>/legal.json) und switcht
 * damit automatisch mit der aktiven App-Sprache. Block-basiert: h | h3 | p | ul | note.
 */
const toneStyle = {
  warning: { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', color: 'var(--warning-text)' },
  accent: { background: 'rgba(232,154,82,0.08)', border: '1px solid rgba(232,154,82,0.18)', color: 'var(--accent-solid)' },
  danger: { background: 'var(--danger-soft)', border: '1px solid rgba(239,68,68,0.15)', color: 'var(--danger)' },
};

export default function LegalDocument({ docKey }) {
  const navigate = useNavigate();
  const { t } = useTranslation('legal');

  const doc = t(docKey, { returnObjects: true }) || {};
  const blocks = Array.isArray(doc.blocks) ? doc.blocks : [];

  const h2Style = { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '18px 0 6px' };
  const h3Style = { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '12px 0 6px' };
  const pStyle = { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 6px', whiteSpace: 'pre-line' };
  const ulStyle = { paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 4 };
  const liStyle = { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: 20 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent-solid)', fontWeight: 600, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, padding: 0 }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} /> {t('back', 'Zurück')}
        </button>

        <div className="glass-card animate-fade-in-up" style={{ padding: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>{doc.title || ''}</h1>
          {doc.updated && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>{doc.updated}</p>}

          {/* Hinweis: deutsche Fassung rechtsverbindlich */}
          <div style={{ display: 'flex', gap: 8, padding: '10px 12px', marginBottom: 16, borderRadius: 10, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
            <Info style={{ width: 14, height: 14, color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.55, margin: 0 }}>{t('binding')}</p>
          </div>

          <div>
            {blocks.map((b, i) => {
              if (b.h) return <h2 key={i} style={h2Style}>{b.h}</h2>;
              if (b.h3) return <h3 key={i} style={h3Style}>{b.h3}</h3>;
              if (b.note) return (
                <p key={i} style={{ ...pStyle, padding: '10px 14px', borderRadius: 10, margin: '6px 0', ...(toneStyle[b.tone] || toneStyle.warning) }}>{b.note}</p>
              );
              if (Array.isArray(b.ul)) return (
                <ul key={i} style={ulStyle}>{b.ul.map((it, j) => <li key={j} style={liStyle}>{it}</li>)}</ul>
              );
              if (b.p) return <p key={i} style={pStyle}>{b.p}</p>;
              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
