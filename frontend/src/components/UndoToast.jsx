import { useEffect, useRef, useState } from 'react';
import { Undo2, X } from 'lucide-react';

export default function UndoToast({ message, duration = 5000, onUndo, onDismiss }) {
  const [progress, setProgress] = useState(100);
  const startRef = useRef(0);

  useEffect(() => {
    startRef.current = Date.now();
    let raf;
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining > 0) raf = requestAnimationFrame(tick);
      else onDismiss?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, onDismiss]);

  return (
    <div className="undo-toast" role="status">
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: 'var(--border-glass)' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-solid)', transition: 'width 0.1s linear' }} />
      </div>
      <span style={{ fontSize: 'var(--fs-body)', color: 'var(--text-primary)', fontWeight: 500 }}>{message}</span>
      <button className="undo-toast-btn" onClick={onUndo}>
        <Undo2 style={{ width: 13, height: 13, verticalAlign: -2, marginRight: 4 }} />
        Rückgängig
      </button>
      <button
        onClick={onDismiss}
        aria-label="Schließen"
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex' }}
      >
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}
