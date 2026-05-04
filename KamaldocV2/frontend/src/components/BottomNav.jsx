import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { path: '/home', label: 'Übersicht', icon: 'home' },
  { path: '/tasks', label: 'Aufgaben', icon: 'tasks' },
  { path: '/scan', label: 'Scan', icon: 'fab' },
  { path: '/doka', label: 'Doka', icon: 'doka' },
  { path: '/profile', label: 'Profil', icon: 'profile' },
];

function Icon({ name }) {
  const stroke = 'none';
  const common = { fill: stroke, stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home':
      return <svg viewBox="0 0 24 24" {...common}><path d="M3 9l9-6 9 6v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
    case 'tasks':
      return <svg viewBox="0 0 24 24" {...common}><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
    case 'doka':
      return <svg viewBox="0 0 24 24" {...common}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>;
    case 'profile':
      return <svg viewBox="0 0 24 24" {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
    case 'fab':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="fab-icon">
          <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    default:
      return null;
  }
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      {TABS.map((tab) => {
        const isFab = tab.icon === 'fab';
        const active = location.pathname === tab.path;
        if (isFab) {
          return (
            <button
              key={tab.path}
              className="nav-fab"
              onClick={() => navigate(tab.path)}
              aria-label="Dokument scannen"
            >
              <span className="fab-rim" aria-hidden="true" />
              <span className="fab-aura" aria-hidden="true" />
              <Icon name="fab" />
            </button>
          );
        }
        return (
          <button
            key={tab.path}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <Icon name={tab.icon} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
