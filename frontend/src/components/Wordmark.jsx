// The canonical kdoc wordmark: lowercase Instrument Serif + amber full-stop.
// Single source of truth so header, login and anywhere else stay identical
// (replaces the legacy blue "KDoc" raster logo).
export default function Wordmark({ size = 26, color = 'var(--text-primary)', style }) {
  return (
    <span
      aria-label="kdoc"
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: size,
        fontWeight: 400,
        letterSpacing: '-0.01em',
        lineHeight: 1,
        color,
        display: 'inline-flex',
        alignItems: 'baseline',
        userSelect: 'none',
        ...style,
      }}
    >
      kdoc<span style={{ color: 'var(--amber)' }}>.</span>
    </span>
  );
}
