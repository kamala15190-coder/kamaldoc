import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';

export default function Profile() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState('Onyx');

  return (
    <section className="screen profile is-active" aria-label="Profil">
      <TopBar title="Profil" transparent />

      <main className="profile-scroll">
        <div className="profile-hero reveal" style={{ '--d': '0ms' }}>
          <div className="profile-avatar">K</div>
          <h2 className="display sm" style={{ marginTop: 18 }}>Kamal A.<em>.</em></h2>
          <p className="lede">kdoc Pro · seit März 2026</p>
        </div>

        <div className="profile-section reveal" style={{ '--d': '80ms' }}>
          <h3>Konto</h3>
          <ul className="row-list">
            <li className="row">
              <span className="row-icon">@</span>
              <div className="row-body">
                <p className="row-title">E-Mail</p>
                <p className="row-sub">kamal.a@kdoc.app</p>
              </div>
              <span className="row-chev">›</span>
            </li>
            <li className="row">
              <span className="row-icon">⌂</span>
              <div className="row-body">
                <p className="row-title">Absenderdaten</p>
                <p className="row-sub">Für Antwortbriefe</p>
              </div>
              <span className="row-chev">›</span>
            </li>
            <li className="row" onClick={() => navigate('/connectors')}>
              <span className="row-icon">@</span>
              <div className="row-body">
                <p className="row-title">Verbundene Konten</p>
                <p className="row-sub">Gmail · Outlook · IMAP</p>
              </div>
              <span className="row-chev">›</span>
            </li>
            <li className="row">
              <span className="row-icon">★</span>
              <div className="row-body">
                <p className="row-title">Abo verwalten</p>
                <p className="row-sub">Pro · jährlich</p>
              </div>
              <span className="row-chev">›</span>
            </li>
          </ul>
        </div>

        <div className="profile-section reveal" style={{ '--d': '160ms' }}>
          <h3>Erscheinungsbild</h3>
          <div className="theme-toggle">
            {['Onyx', 'Pearl', 'System'].map((t) => (
              <button key={t} className={`theme-opt ${theme === t ? 'active' : ''}`} onClick={() => setTheme(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="profile-section reveal" style={{ '--d': '240ms' }}>
          <h3>Mehr</h3>
          <ul className="row-list">
            <li className="row"><span className="row-icon">?</span><div className="row-body"><p className="row-title">Support</p></div><span className="row-chev">›</span></li>
            <li className="row"><span className="row-icon">⚖</span><div className="row-body"><p className="row-title">Datenschutz & AGB</p></div><span className="row-chev">›</span></li>
            <li className="row danger"><span className="row-icon">↗</span><div className="row-body"><p className="row-title">Abmelden</p></div></li>
          </ul>
        </div>

        <div className="bottom-pad" />
      </main>
    </section>
  );
}
