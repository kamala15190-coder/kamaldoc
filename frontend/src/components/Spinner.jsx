/**
 * Shared Spinner – ersetzt inline-Spinner in Archiv, ExpensesPage,
 * Einstellungen, ProfilPage. Respektiert prefers-reduced-motion (index.css).
 */
export default function Spinner({ size = 32, color = 'var(--accent-solid)', label, fullscreen = false }) {
  const ring = (
    <span
      role={label ? 'status' : 'presentation'}
      aria-label={label || undefined}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `${Math.max(2, Math.round(size / 10))}px solid var(--border-glass)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spinner-rotate 0.9s linear infinite',
      }}
    />
  );
  if (!fullscreen && !label) return ring;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        minHeight: fullscreen ? 'calc(100dvh - 120px)' : undefined,
        padding: fullscreen ? '2rem' : undefined,
      }}
    >
      {ring}
      {label && (
        <span style={{ fontSize: 'var(--fs-body, 15px)', color: 'var(--text-secondary)' }}>{label}</span>
      )}
    </div>
  );
}
