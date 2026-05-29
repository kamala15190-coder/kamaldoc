/**
 * Skeleton – Loading-Placeholder mit Shimmer-Animation.
 * Respektiert prefers-reduced-motion (via .skeleton::after in index.css).
 */
export default function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  style,
  className = '',
}) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{
        display: 'block',
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

/** DocumentRow-Skeleton: matches 40x52 thumb + 2 text rows */
export function DocumentRowSkeleton() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 12,
      background: 'var(--bg-glass)', marginBottom: 8,
    }}>
      <Skeleton width={40} height={52} radius={8} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton width="65%" height={14} />
        <Skeleton width="40%" height={11} />
      </div>
      <Skeleton width={48} height={18} radius={9} />
    </div>
  );
}

/** Dashboard-Skeleton: hero card placeholder */
export function CardSkeleton({ rows = 3 }) {
  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <Skeleton width="50%" height={20} style={{ marginBottom: 14 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <DocumentRowSkeleton key={i} />
      ))}
    </div>
  );
}
