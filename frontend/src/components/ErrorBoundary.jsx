import { Component } from 'react';
import i18n from '../i18n';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Bewusst console.error: Sentry/Backend-Crash-Logging wird in Wave 4 ergaenzt.
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReload = () => {
    try { window.location.reload(); } catch { /* no-op */ }
  };

  render() {
    if (!this.state.error) return this.props.children;
    // Lives outside the i18n provider tree, so translate via the instance directly
    // (defaultValue keeps it readable even if i18n hasn't initialised yet).
    const t = (key, def) => i18n.t(key, { defaultValue: def });
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'var(--bg-primary, #0E0F12)',
        color: 'var(--text-primary, #F1ECE3)',
      }}>
        <div style={{
          maxWidth: 480,
          background: 'var(--bg-secondary, #16181D)',
          border: '1px solid var(--border-glass, rgba(241,236,227,0.07))',
          borderRadius: 16,
          padding: '2rem',
          boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            {t('errorBoundary.title', 'Etwas ist schiefgelaufen.')}
          </h1>
          <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 20, lineHeight: 1.55 }}>
            {t('errorBoundary.message', 'Die App konnte diese Ansicht nicht rendern. Bitte lade die Seite neu. Wenn der Fehler bleibt, kontaktiere den Support.')}
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '11px 22px',
              borderRadius: 12,
              background: 'var(--accent-solid, #E89A52)',
              color: 'var(--text-on-accent, #fff)',
              fontWeight: 600,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            {t('errorBoundary.reload', 'Neu laden')}
          </button>
        </div>
      </div>
    );
  }
}
