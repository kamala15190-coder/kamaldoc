import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { mockDocs } from '../lib/mock';

const CHIPS = ['Alle', 'Rechnung', 'Behörde', 'Befund', 'Vertrag', 'Sonstiges'];

export default function Folder() {
  const navigate = useNavigate();
  const [active, setActive] = useState('Alle');

  const filtered = active === 'Alle' ? mockDocs : mockDocs.filter((d) => d.chip === active);

  return (
    <section className="screen folder is-active" aria-label="kdoc-Dokumente">
      <TopBar title="kdoc-Dokumente" />

      <main className="folder-scroll">
        <div className="reveal" style={{ '--d': '0ms' }}>
          <p className="kicker">{mockDocs.length} Dokumente · 412 MB</p>
          <h1 className="display sm">Dein digitales<br /><em>Archiv.</em></h1>
          <p className="lede">In Originalqualität gespeichert. Volltext-durchsuchbar. Privat.</p>
        </div>

        <div className="folder-filters reveal" style={{ '--d': '80ms' }}>
          {CHIPS.map((c) => (
            <button key={c} className={`filter ${active === c ? 'active' : ''}`} onClick={() => setActive(c)}>
              {c}
            </button>
          ))}
        </div>

        <div className="folder-grid">
          {filtered.map((d, i) => (
            <button
              key={d.id}
              className="folder-tile reveal"
              style={{ '--d': `${140 + i*60}ms` }}
              onClick={() => navigate(`/detail/${d.id}`)}
            >
              <div className="ft-thumb">
                <span className="dt-line w70" /><span className="dt-line w90" />
                <span className="dt-block" /><span className="dt-line w50" />
              </div>
              <span className={`ft-chip ${d.chipClass}`}>{d.chip}</span>
              <span className="ft-name">{d.name}</span>
              <span className="ft-meta">{d.meta}</span>
            </button>
          ))}
        </div>

        <div className="bottom-pad" />
      </main>
    </section>
  );
}
