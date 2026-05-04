import { useNavigate } from 'react-router-dom';

export default function TopBar({ title, transparent = false, dark = false, onBack, right = null }) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  return (
    <header className={`top-bar ${transparent ? 'transparent' : ''} ${dark ? 'dark' : ''}`}>
      <button
        className={`icon-btn ghost ${dark ? 'light' : ''}`}
        onClick={handleBack}
        aria-label="Zurück"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <span className={`top-title ${dark ? 'light' : ''}`}>{title}</span>
      {right || <span style={{ width: 42 }} />}
    </header>
  );
}
