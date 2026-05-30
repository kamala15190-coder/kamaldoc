import { Link } from 'react-router-dom';
import { Shield, FileText, ScrollText, RotateCcw, Building2, ChevronRight, Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ITEMS = [
  { to: '/datenschutz', key: 'datenschutz', icon: Shield },
  { to: '/agb', key: 'agb', icon: FileText },
  { to: '/nutzungsbedingungen', key: 'nutzung', icon: ScrollText },
  { to: '/widerruf', key: 'widerruf', icon: RotateCcw },
  { to: '/impressum', key: 'impressum', icon: Building2 },
];

export default function RechtlichesPage() {
  const { t } = useTranslation('legal');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }} className="animate-fade-in">
        <div style={{ padding: 8, borderRadius: 10, background: 'var(--accent-soft)' }}>
          <Scale style={{ width: 18, height: 18, color: 'var(--accent-solid)' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('overviewTitle', 'Rechtliches')}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>{t('overviewSubtitle', 'Datenschutz, Bedingungen und rechtliche Hinweise')}</p>
        </div>
      </div>

      <div className="glass-card animate-fade-in-up" style={{ overflow: 'hidden', padding: 0 }}>
        {ITEMS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '16px',
                textDecoration: 'none', color: 'var(--text-primary)',
                borderBottom: idx < ITEMS.length - 1 ? '1px solid var(--border-glass)' : 'none',
              }}
            >
              <Icon style={{ width: 19, height: 19, color: 'var(--accent-solid)', flexShrink: 0, opacity: 0.85 }} />
              <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{t(`links.${item.key}`)}</span>
              <ChevronRight style={{ width: 16, height: 16, color: 'var(--text-muted)', opacity: 0.4 }} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
