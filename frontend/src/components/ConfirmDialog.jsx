import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import { ConfirmDialogContext } from '../contexts/ConfirmDialogContext';

const VARIANT_COLOR = {
  danger: { fg: '#f87171', bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.35)' },
  warning: { fg: '#fbbf24', bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.35)' },
  info: { fg: '#a5b4fc', bg: 'rgba(99,102,241,0.18)', border: 'rgba(99,102,241,0.35)' },
};

const VARIANT_ICON = {
  danger: Trash2,
  warning: AlertTriangle,
  info: Info,
};

export function ConfirmDialogProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback((opts = {}) => new Promise((resolve) => {
    setState({
      title: opts.title || 'Bist du sicher?',
      message: opts.message || '',
      confirmLabel: opts.confirmLabel || 'Bestätigen',
      cancelLabel: opts.cancelLabel || 'Abbrechen',
      variant: opts.variant || 'danger',
      resolve,
    });
  }), []);

  const close = useCallback((result) => {
    setState((s) => {
      s?.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!state) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, close]);

  const color = state ? VARIANT_COLOR[state.variant] || VARIANT_COLOR.danger : null;
  const Icon = state ? VARIANT_ICON[state.variant] || AlertTriangle : null;

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={() => close(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'max(16px, env(safe-area-inset-bottom))',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            animation: 'fadeIn 150ms ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="confirm-dialog"
            style={{
              width: '100%', maxWidth: 400,
              background: 'var(--surface-elevated, var(--bg-secondary))',
              border: '1px solid var(--border-glass-strong)',
              borderRadius: 20,
              padding: 24,
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              animation: 'pop-in 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: color.bg, border: `1px solid ${color.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon style={{ width: 22, height: 22, color: color.fg }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 id="confirm-title" style={{
                  fontSize: 'var(--fs-title, 17px)', fontWeight: 700, color: 'var(--text-primary)',
                  margin: 0, marginBottom: 4,
                }}>
                  {state.title}
                </h3>
                {state.message && (
                  <p style={{
                    fontSize: 'var(--fs-body, 15px)', color: 'var(--text-secondary)',
                    margin: 0, lineHeight: 1.5,
                  }}>
                    {state.message}
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => close(false)}
                autoFocus
                style={{
                  padding: '10px 18px', minHeight: 44, borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid var(--border-glass-strong)',
                  color: 'var(--text-primary)', cursor: 'pointer',
                  fontSize: 'var(--fs-body, 15px)', fontWeight: 500,
                }}
              >
                {state.cancelLabel}
              </button>
              <button
                onClick={() => close(true)}
                style={{
                  padding: '10px 18px', minHeight: 44, borderRadius: 10,
                  background: state.variant === 'danger' ? '#ef4444' : 'var(--accent-solid)',
                  border: 'none', color: '#fff', cursor: 'pointer',
                  fontSize: 'var(--fs-body, 15px)', fontWeight: 600,
                }}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

