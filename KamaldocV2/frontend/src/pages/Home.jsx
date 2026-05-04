import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { mockTodayHero, mockTasks, mockDocs, mockStats } from '../lib/mock';
import { useToast } from '../components/Toast';
import api from '../lib/api';

const PLACEHOLDERS = [
  'in Dokumenten und E-Mails …',
  '„Stadtwerke Mai" …',
  '„Versicherungen 2026" …',
  'Frag nach Beträgen, Fristen, Absendern …',
];

export default function Home() {
  const navigate = useNavigate();
  const toast = useToast();
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [docs, setDocs] = useState(mockDocs);

  useEffect(() => {
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length), 3600);
    return () => clearInterval(id);
  }, []);

  // Try to load real docs from backend; fall back to mocks
  useEffect(() => {
    api.get('/documents?limit=4')
      .then((r) => {
        if (r.data?.documents?.length) {
          setDocs(r.data.documents.map((d) => ({
            id: d.id,
            name: d.sender || d.original_filename,
            meta: `${new Date(d.uploaded_at).toLocaleDateString('de-AT')} · ${d.category || 'Sonstiges'}`,
            chip: d.category || 'Sonstiges',
            chipClass: chipClassFor(d.category),
          })));
        }
      })
      .catch(() => { /* mock fallback */ });
  }, []);

  return (
    <section className="screen home is-active" aria-label="Übersicht">
      <header className="top-bar">
        <button className="icon-btn ghost" aria-label="Benachrichtigungen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a2 2 0 0 0 3.4 0" /></svg>
          <span className="ind-dot" />
        </button>
        <div className="top-brand"><span>kdoc<i>.</i></span></div>
        <button className="avatar" aria-label="Profil" onClick={() => navigate('/profile')}>
          <span>K</span>
        </button>
      </header>

      <main className="home-scroll">
        <div className="greeting reveal" style={{ '--d': '0ms' }}>
          <p className="kicker">Mittwoch · 5. Mai</p>
          <h1 className="display">Guten Abend,<br /><em>Kamal.</em></h1>
        </div>

        <button className="search-trigger reveal" style={{ '--d': '80ms' }} onClick={() => navigate('/search')}>
          <span className="st-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </span>
          <span className="st-text">
            <span className="st-label">Suche</span>
            <span className="st-placeholder">{PLACEHOLDERS[placeholderIdx]}</span>
          </span>
          <span className="st-shortcut">⌘K</span>
        </button>

        <article className="card hero reveal" style={{ '--d': '160ms' }} onClick={() => navigate('/detail/mock-1')}>
          <div className="hero-tag"><span className="pulse" />Heute fällig</div>
          <h2 className="hero-title">{mockTodayHero.title}<br />{mockTodayHero.subtitle}</h2>
          <div className="hero-meta">
            <span className="amount">€ {Math.floor(mockTodayHero.amount)}<small>,{String(Math.round((mockTodayHero.amount % 1) * 100)).padStart(2,'0')}</small></span>
            <span className="due">{mockTodayHero.due}</span>
          </div>
          <div className="hero-actions">
            <button className="btn-primary" onClick={(e) => { e.stopPropagation(); toast.show('Erledigt · ins Archiv verschoben'); }}>Erledigt markieren</button>
            <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); navigate('/detail/mock-1'); }}>
              Details
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div className="hero-orbit" aria-hidden="true" />
        </article>

        <div className="section-head reveal" style={{ '--d': '240ms' }}>
          <h3>Aufgaben</h3>
          <button className="link-btn" onClick={() => navigate('/tasks')}>Alle ansehen</button>
        </div>

        <ul className="task-list">
          {mockTasks.slice(1).map((t, i) => (
            <li key={t.id} className="task reveal" style={{ '--d': `${300 + i*60}ms` }}
                onClick={() => navigate(`/detail/${t.id}`)}>
              <span className="task-icon" data-color={t.color}>
                <TaskIcon name={t.icon} />
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

        <div className="section-head reveal" style={{ '--d': '440ms' }}>
          <h3>Werkzeuge</h3>
        </div>

        <div className="tools-row reveal" style={{ '--d': '500ms' }}>
          <button className="tool-pill" onClick={() => navigate('/phishing')}>
            <span className="tp-glyph rose">⚠︎</span>
            <span className="tp-name">Phishing prüfen</span>
            <span className="tp-badge">Neu</span>
          </button>
          <button className="tool-pill" onClick={() => navigate('/translate/mock-1')}>
            <span className="tp-glyph petrol">A↻</span>
            <span className="tp-name">Übersetzen</span>
          </button>
          <button className="tool-pill" onClick={() => navigate('/befund/mock-1')}>
            <span className="tp-glyph rose">+</span>
            <span className="tp-name">Befund</span>
          </button>
          <button className="tool-pill" onClick={() => navigate('/rechtshilfe/mock-1')}>
            <span className="tp-glyph amber">§</span>
            <span className="tp-name">Rechtshilfe</span>
          </button>
        </div>

        <div className="section-head reveal" style={{ '--d': '580ms' }}>
          <h3>kdoc-Dokumente</h3>
          <button className="link-btn" onClick={() => navigate('/folder')}>Alle ansehen</button>
        </div>

        <div className="doc-strip reveal" style={{ '--d': '640ms' }}>
          {docs.slice(0, 3).map((d) => (
            <button key={d.id} className="doc-tile" onClick={() => navigate(`/detail/${d.id}`)}>
              <div className="dt-thumb">
                <span className="dt-line w70" /><span className="dt-line w90" />
                <span className="dt-line w50" /><span className="dt-block" />
                <span className="dt-line w80" />
              </div>
              <span className="dt-name">{d.name}</span>
              <span className="dt-meta">{d.meta}</span>
            </button>
          ))}
          <button className="doc-tile" onClick={() => navigate('/folder')}>
            <div className="dt-thumb dt-more"><span className="dt-more-num">+{Math.max(0, mockStats.archived - 3)}</span></div>
            <span className="dt-name">Alle ansehen</span>
            <span className="dt-meta">Ordner öffnen</span>
          </button>
        </div>

        <div className="bottom-pad" />
      </main>
    </section>
  );
}

function TaskIcon({ name }) {
  const c = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (name === 'doc') return <svg viewBox="0 0 24 24" {...c}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>;
  if (name === 'home') return <svg viewBox="0 0 24 24" {...c}><path d="M3 9l9-6 9 6v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
  if (name === 'health') return <svg viewBox="0 0 24 24" {...c}><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /></svg>;
  return null;
}

function chipClassFor(cat) {
  if (!cat) return 'muted';
  if (cat === 'rechnung' || cat === 'lohnzettel') return 'amber';
  if (cat === 'behoerde' || cat === 'brief') return 'petrol';
  if (cat === 'befund') return 'rose';
  return 'muted';
}
