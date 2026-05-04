import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { useToast } from '../components/Toast';

const TOPICS = [
  'Tarif-Wechsel anfragen',
  'Ratenzahlung beantragen',
  'Lastschrift widerrufen',
  'Adresse ändern',
  'Verbrauch reklamieren',
];

export default function Reply() {
  const navigate = useNavigate();
  const toast = useToast();
  const [selected, setSelected] = useState(new Set([TOPICS[0]]));
  const [instruction, setInstruction] = useState('Bitte freundlich nach Tarif-Wechsel zum 01. Juni fragen, höflich und kompakt.');

  const toggle = (t) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  return (
    <section className="screen tool-reply is-active" aria-label="Antwort">
      <TopBar title="Antwort" />

      <main className="tool-scroll">
        <div className="reveal" style={{ '--d': '0ms' }}>
          <p className="kicker amber">Tool · KI-Antwort</p>
          <h1 className="display sm">Worauf<br /><em>antworten?</em></h1>
          <p className="lede">Wähle Themen aus dem Brief — oder gib der KI eine eigene Anweisung.</p>
        </div>

        <div className="reveal" style={{ '--d': '80ms' }}>
          <p className="section-title-inline">Erkannte Themen</p>
        </div>

        <div className="reply-chips reveal" style={{ '--d': '140ms' }}>
          {TOPICS.map((t) => (
            <button key={t} className={`reply-chip ${selected.has(t) ? 'active' : ''}`} onClick={() => toggle(t)}>
              {t}
            </button>
          ))}
        </div>

        <div className="reveal" style={{ '--d': '200ms' }}>
          <p className="section-title-inline">Eigene Anweisung an die KI</p>
        </div>

        <div className="reply-prompt reveal" style={{ '--d': '260ms' }}>
          <textarea
            rows={4}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="z. B. „Bitte freundlich um Stundung bis 30. Juni …"
          />
          <div className="rp-foot">
            <span className="rp-tone">Ton: <strong>Höflich</strong></span>
            <span className="rp-len">Länge: <strong>Kompakt</strong></span>
          </div>
        </div>

        <div className="bottom-pad" />
      </main>

      <div className="sticky-bar reveal" style={{ '--d': '340ms' }}>
        <button className="btn-primary lg" onClick={() => { toast.show('Antwortbrief wird generiert …'); setTimeout(() => navigate(-1), 900); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4z" /></svg>
          Antwort generieren
        </button>
      </div>
    </section>
  );
}
