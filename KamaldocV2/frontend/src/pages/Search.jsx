import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { mockSearchResults } from '../lib/mock';

const FILTERS = [
  { key: 'all', label: 'Alle', count: 14 },
  { key: 'documents', label: 'Dokumente', count: 8 },
  { key: 'emails', label: 'E-Mails', count: 4 },
  { key: 'tasks', label: 'Aufgaben', count: 2 },
];

export default function Search() {
  const navigate = useNavigate();
  const [q, setQ] = useState('Stadtwerke');
  const [filter, setFilter] = useState('all');

  return (
    <section className="screen search-screen is-active" aria-label="Suche">
      <TopBar title="SUCHE" />

      <div className="search-input-wrap reveal" style={{ '--d': '0ms' }}>
        <span className="si-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        </span>
        <input
          className="si-input"
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Suche nach Dokumenten, E-Mails …"
          autoFocus
        />
        {q && (
          <button className="si-clear" onClick={() => setQ('')} aria-label="Löschen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      <div className="search-filters reveal" style={{ '--d': '80ms' }}>
        {FILTERS.map((f) => (
          <button key={f.key} className={`filter ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label} <span className="f-count">{f.count}</span>
          </button>
        ))}
      </div>

      <main className="search-scroll">
        <p className="search-section-title reveal" style={{ '--d': '120ms' }}>
          {mockSearchResults.length} Treffer · sortiert nach Relevanz
        </p>

        <ul className="search-results">
          {mockSearchResults.map((r, i) => (
            <li
              key={i}
              className="result reveal"
              style={{ '--d': `${180 + i*60}ms` }}
              onClick={() => navigate(`/detail/${i}`)}
            >
              <span className={`r-icon ${r.iconClass}`}>
                <ResIcon name={r.icon} />
              </span>
              <div className="r-body">
                <p className="r-title" dangerouslySetInnerHTML={{ __html: hl(r.title, r.highlight) }} />
                <p className="r-snippet" dangerouslySetInnerHTML={{ __html: hl(r.snippet, r.highlight) }} />
                <span className="r-source">{r.source}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="bottom-pad" />
      </main>
    </section>
  );
}

function hl(text, term) {
  if (!term) return text;
  const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark>$1</mark>');
}

function ResIcon({ name }) {
  const c = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (name === 'doc') return <svg viewBox="0 0 24 24" {...c}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>;
  if (name === 'mail') return <svg viewBox="0 0 24 24" {...c}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><path d="m22 6-10 7L2 6" /></svg>;
  if (name === 'flag') return <svg viewBox="0 0 24 24" {...c}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
  return null;
}
