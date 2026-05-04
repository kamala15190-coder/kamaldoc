import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';

export default function Scan() {
  const navigate = useNavigate();
  const toast = useToast();

  const capture = () => {
    toast.show('Aufnahme erfasst · Analyse läuft …');
    setTimeout(() => navigate('/detail/new'), 700);
  };

  return (
    <section className="screen scan is-active" aria-label="Scannen">
      <header className="top-bar transparent dark">
        <button className="icon-btn ghost light" onClick={() => navigate(-1)} aria-label="Schließen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        <span className="top-title light">Dokument scannen</span>
        <button className="icon-btn ghost light" aria-label="Blitz">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
        </button>
      </header>

      <div className="scan-stage">
        <div className="scan-frame" aria-hidden="true">
          <span className="corner tl" /><span className="corner tr" />
          <span className="corner bl" /><span className="corner br" />
          <div className="scan-laser" />
        </div>
        <div className="scan-paper">
          <span /><span /><span /><span /><span />
        </div>
        <p className="scan-hint">Brief im Rahmen platzieren · automatisch erkannt</p>
      </div>

      <div className="scan-controls">
        <button className="scan-side" aria-label="Galerie">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>
        </button>
        <button className="shutter" aria-label="Aufnehmen" onClick={capture}>
          <span className="shutter-ring" />
          <span className="shutter-core" />
        </button>
        <button className="scan-side" aria-label="PDF">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
        </button>
      </div>
    </section>
  );
}
