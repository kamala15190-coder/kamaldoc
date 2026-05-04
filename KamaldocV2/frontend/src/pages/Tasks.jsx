import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { mockTasks } from '../lib/mock';
import { useToast } from '../components/Toast';

const FILTERS = ['Alle', 'Heute', 'Diese Woche', 'Überfällig'];

export default function Tasks() {
  const navigate = useNavigate();
  const toast = useToast();
  const [filter, setFilter] = useState('Alle');

  return (
    <section className="screen tasks is-active" aria-label="Aufgaben">
      <TopBar title="Aufgaben" transparent />

      <main className="tasks-scroll">
        <div className="reveal" style={{ '--d': '0ms' }}>
          <p className="kicker">3 offen · 28 erledigt</p>
          <h1 className="display sm">Was heute<br /><em>noch wartet.</em></h1>
        </div>

        <div className="filter-row reveal" style={{ '--d': '80ms' }}>
          {FILTERS.map((f) => (
            <button key={f} className={`filter ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>

        <ul className="task-list">
          {mockTasks.map((t, i) => (
            <li key={t.id} className="task reveal" style={{ '--d': `${140 + i*60}ms` }}
                onClick={() => navigate(`/detail/${t.id}`)}>
              <span className="task-icon" data-color={t.color}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  {t.icon === 'doc' && <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></>}
                  {t.icon === 'home' && <path d="M3 9l9-6 9 6v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />}
                  {t.icon === 'health' && <circle cx="12" cy="12" r="10" />}
                </svg>
              </span>
              <div className="task-body">
                <p className="task-title">{t.title}</p>
                <p className="task-sub">{t.sub}</p>
              </div>
              <button className="task-check" aria-label="Erledigt" onClick={(e) => {
                e.stopPropagation();
                e.currentTarget.classList.toggle('checked');
                toast.show('Erledigt · ins Archiv verschoben');
              }} />
            </li>
          ))}
        </ul>

        <div className="section-head reveal" style={{ '--d': '340ms' }}>
          <h3>Erledigt · diese Woche</h3>
        </div>

        <ul className="task-list muted">
          <li className="task done">
            <span className="task-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <div className="task-body"><p className="task-title">A1 · Mobilfunk</p><p className="task-sub">€ 29,90 · 02. Mai</p></div>
          </li>
        </ul>

        <div className="bottom-pad" />
      </main>
    </section>
  );
}
