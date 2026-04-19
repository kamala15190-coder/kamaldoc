import { Component } from 'react';

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
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'var(--bg-primary, #f8fafc)',
        color: 'var(--text-primary, #0f172a)',
      }}>
        <div style={{
          maxWidth: 480,
          background: 'var(--bg-secondary, #fff)',
          borderRadius: 16,
          padding: '2rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Etwas ist schiefgelaufen.
          </h1>
          <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 20 }}>
            Die App konnte diese Ansicht nicht rendern. Bitte lade die Seite neu.
            Wenn der Fehler bleibt, kontaktiere den Support.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              background: '#2563eb',
              color: '#fff',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            Neu laden
          </button>
        </div>
      </div>
    );
  }
}
