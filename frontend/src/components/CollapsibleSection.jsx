import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CollapsibleSection({ title, subtitle, icon: Icon, children, defaultOpen = false, level = 1, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef(null);
  const [height, setHeight] = useState(defaultOpen ? 'auto' : 0);

  useEffect(() => {
    if (open) {
      const el = contentRef.current;
      if (el) {
        setHeight(el.scrollHeight);
        const timer = setTimeout(() => setHeight('auto'), 300);
        return () => clearTimeout(timer);
      }
    } else {
      const el = contentRef.current;
      if (el) {
        setHeight(el.scrollHeight);
        requestAnimationFrame(() => setHeight(0));
      }
    }
  }, [open]);

  const borderColor = level === 1 ? 'var(--accent-solid)' : 'var(--border-glass-strong)';

  return (
    <div style={{ position: 'relative' }}>
      {/* Vertical hierarchy line */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2,
        background: borderColor, opacity: open ? 1 : 0.4,
        transition: 'opacity 0.3s ease',
      }} />

      <div style={{ paddingLeft: 14 }}>
        {/* Header */}
        <div
          onClick={() => setOpen(prev => !prev)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            padding: '10px 0', userSelect: 'none',
          }}
        >
          {Icon && <Icon style={{ width: 16, height: 16, color: level === 1 ? 'var(--accent-solid)' : 'var(--text-muted)', flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: level === 1 ? 15 : 14, fontWeight: level === 1 ? 700 : 600,
                color: 'var(--text-primary)',
              }}>
                {title}
              </span>
              {badge && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                  background: 'var(--accent-soft)', color: 'var(--accent-solid)',
                }}>
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginTop: 1 }}>
                {subtitle}
              </span>
            )}
          </div>
          <ChevronDown style={{
            width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }} />
        </div>

        {/* Content with slide animation */}
        <div style={{
          height: height,
          overflow: 'hidden',
          transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: open ? 1 : 0,
        }}>
          <div ref={contentRef} style={{ paddingBottom: 8 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
