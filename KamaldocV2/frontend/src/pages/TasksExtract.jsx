import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { mockExtractTasks } from '../lib/mock';
import { useToast } from '../components/Toast';

export default function TasksExtract() {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState(mockExtractTasks);

  const toggle = (id) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, selected: !it.selected } : it));
  };
  const toggleBell = (id) => {
    setItems((prev) => prev.map((it) => {
      if (it.id !== id || it.bell === 'locked') return it;
      return { ...it, bell: it.bell === 'on' ? 'off' : 'on' };
    }));
  };

  const selected = items.filter((it) => it.selected).length;

  const save = () => {
    toast.show('Aufgaben übernommen · Erinnerungen gesetzt');
    setTimeout(() => navigate('/home'), 700);
  };

  return (
    <section className="screen tasks-extract is-active" aria-label="Aufgaben übernehmen">
      <TopBar title="Aufgaben" />

      <main className="tasks-extract-scroll">
        <div className="reveal" style={{ '--d': '0ms' }}>
          <p className="kicker amber">{items.length} Aufgaben erkannt</p>
          <h1 className="display sm">Was soll<br /><em>auf deine Liste?</em></h1>
          <p className="lede">Wähle aus, setze Deadlines und aktiviere Erinnerungen.</p>
        </div>

        <ul className="extract-list">
          {items.map((it, i) => (
            <li
              key={it.id}
              className={`extract-item ${it.selected ? 'is-selected' : ''} reveal`}
              style={{ '--d': `${120 + i*80}ms` }}
            >
              <button
                className={`ex-check ${it.selected ? 'active' : ''}`}
                onClick={() => toggle(it.id)}
                aria-label="Auswählen"
              >
                {it.selected && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
              </button>
              <div className="ex-body">
                <p className="ex-title">{it.title}</p>
                <p className="ex-sub">{it.sub}</p>
                <div className="ex-row">
                  <div className={`ex-deadline ${it.deadline ? '' : 'empty'}`}>
                    <span className="ex-row-label">Deadline</span>
                    <span className="ex-row-value">{it.deadline || 'Tippen, um zu setzen'}</span>
                  </div>
                  <button
                    className={`ex-bell ${it.bell === 'on' ? 'active' : ''} ${it.bell === 'locked' ? 'locked' : ''}`}
                    onClick={() => toggleBell(it.id)}
                    aria-label="Erinnerung"
                  >
                    {it.bell === 'locked' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a2 2 0 0 0 3.4 0" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="extract-pro reveal" style={{ '--d': '340ms' }}>
          <span className="ep-glyph">★</span>
          <div>
            <p className="ep-title">Push-Erinnerungen für jede Aufgabe</p>
            <p className="ep-sub">Mit kdoc Pro · ab € 4,90 / Monat</p>
          </div>
          <button className="link-btn">Upgrade</button>
        </div>

        <div className="bottom-pad" />
      </main>

      <div className="sticky-bar reveal" style={{ '--d': '400ms' }}>
        <button className="btn-primary lg" onClick={save}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          {selected} {selected === 1 ? 'Aufgabe' : 'Aufgaben'} übernehmen
        </button>
      </div>
    </section>
  );
}
