import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { ToastContext } from '../contexts/ToastContext';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: { bg: 'rgba(16,185,129,0.18)', border: 'rgba(16,185,129,0.4)', fg: '#34d399' },
  error: { bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.4)', fg: '#f87171' },
  warning: { bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.4)', fg: '#fbbf24' },
  info: { bg: 'rgba(99,102,241,0.18)', border: 'rgba(99,102,241,0.4)', fg: '#a5b4fc' },
};

let _id = 0;
const nextId = () => ++_id;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback((opts) => {
    const id = nextId();
    const toast = {
      id,
      type: opts.type || 'info',
      message: opts.message || '',
      title: opts.title,
      duration: opts.duration ?? 4000,
      action: opts.action,
    };
    setToasts((prev) => [...prev, toast]);
    if (toast.duration > 0) {
      const timer = setTimeout(() => dismiss(id), toast.duration);
      timers.current.set(id, timer);
    }
    return id;
  }, [dismiss]);

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const api = {
    show,
    dismiss,
    success: (message, opts = {}) => show({ ...opts, type: 'success', message }),
    error: (message, opts = {}) => show({ ...opts, type: 'error', message }),
    warning: (message, opts = {}) => show({ ...opts, type: 'warning', message }),
    info: (message, opts = {}) => show({ ...opts, type: 'info', message }),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'fixed',
          top: 'max(16px, env(safe-area-inset-top))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          width: 'min(420px, calc(100vw - 32px))',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const Icon = ICONS[toast.type] || Info;
  const color = COLORS[toast.type] || COLORS.info;
  return (
    <div
      role="status"
      className="toast-item"
      style={{
        background: 'var(--surface-elevated, var(--bg-secondary))',
        border: `1px solid ${color.border}`,
        borderLeft: `3px solid ${color.fg}`,
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        color: 'var(--text-primary)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        pointerEvents: 'auto',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon style={{ width: 18, height: 18, color: color.fg }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div style={{ fontSize: 'var(--fs-body, 15px)', fontWeight: 600, marginBottom: 2 }}>{toast.title}</div>
        )}
        <div style={{ fontSize: 'var(--fs-body-sm, 13px)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {toast.message}
        </div>
        {toast.action && (
          <button
            onClick={() => { toast.action.onClick(); onDismiss(); }}
            style={{
              marginTop: 8,
              background: 'transparent',
              border: 'none',
              color: color.fg,
              fontWeight: 600,
              fontSize: 'var(--fs-body-sm, 13px)',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Schließen"
        className="no-touch-min"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          borderRadius: 6,
        }}
      >
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}

