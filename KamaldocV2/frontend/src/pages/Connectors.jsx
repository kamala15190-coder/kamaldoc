import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar';
import { useToast } from '../components/Toast';
import api from '../lib/api';

const PROVIDERS = [
  { type: 'gmail', name: 'Gmail', glyph: '@', color: 'rose' },
  { type: 'outlook', name: 'Outlook', glyph: '◉', color: 'petrol' },
  { type: 'icloud', name: 'iCloud Mail', glyph: '☁', color: 'petrol' },
  { type: 'gmx', name: 'GMX', glyph: 'G', color: 'amber' },
  { type: 'yahoo', name: 'Yahoo Mail', glyph: 'Y', color: 'amber' },
  { type: 'imap', name: 'IMAP / Sonstige', glyph: '✉', color: 'muted' },
];

const MOCK_ACCOUNTS = [
  { id: 'a1', connector_type: 'gmail', display_name: 'Privat', remote_account_id: 'kamal.privat@gmail.com', status: 'active' },
  { id: 'a2', connector_type: 'gmail', display_name: 'Arbeit', remote_account_id: 'kamal@kanzlei.at', status: 'active' },
  { id: 'a3', connector_type: 'outlook', display_name: 'Hauptmail', remote_account_id: 'kamal@outlook.at', status: 'active' },
];

export default function Connectors() {
  const toast = useToast();
  const [accounts, setAccounts] = useState(MOCK_ACCOUNTS);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.get('/connectors/accounts')
      .then((r) => { if (r.data?.length) setAccounts(r.data); })
      .catch(() => { /* mock */ });
  }, []);

  const startAdd = (provider) => {
    setShowAdd(false);
    toast.show(`OAuth für ${provider.name} würde jetzt starten …`);
    // In V1: window.location = (await api.post(`/connectors/${provider.type}/oauth/start`)).data.url
  };

  const remove = (id) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    toast.show('Konto getrennt');
    api.delete(`/connectors/accounts/${id}`).catch(() => {});
  };

  return (
    <section className="screen connectors-screen is-active" aria-label="Verbundene Konten">
      <TopBar title="Verbundene Konten" />

      <main className="profile-scroll">
        <div className="reveal" style={{ '--d': '0ms' }}>
          <p className="kicker amber">{accounts.length} verbunden</p>
          <h1 className="display sm">Deine<br /><em>Postfächer.</em></h1>
          <p className="lede">Verbinde mehrere E-Mail-Konten — auch mehrere Gmail-Adressen gleichzeitig. Doka durchsucht alle.</p>
        </div>

        <ul className="row-list reveal" style={{ '--d': '80ms' }}>
          {accounts.map((a) => (
            <li key={a.id} className="row">
              <span className="row-icon">{glyphFor(a.connector_type)}</span>
              <div className="row-body">
                <p className="row-title">{a.display_name}</p>
                <p className="row-sub">{a.remote_account_id} · {labelFor(a.connector_type)}</p>
              </div>
              <button className="link-btn" onClick={() => remove(a.id)}>Trennen</button>
            </li>
          ))}
        </ul>

        <button
          className="btn-ghost lg reveal"
          style={{ '--d': '160ms', marginTop: 16 }}
          onClick={() => setShowAdd(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Konto hinzufügen
        </button>

        <div className="bottom-pad" />
      </main>

      {showAdd && (
        <>
          <div className="modal-overlay" onClick={() => setShowAdd(false)} />
          <div className="add-sheet">
            <p className="kicker amber">Anbieter wählen</p>
            <h3 className="display sm" style={{ margin: '4px 0 16px' }}>Welcher Postfach-<em>Anbieter</em>?</h3>
            <p className="lede">Du kannst mehrere Konten desselben Anbieters verbinden.</p>
            <div className="provider-grid">
              {PROVIDERS.map((p) => (
                <button key={p.type} className="provider-tile" onClick={() => startAdd(p)}>
                  <span className={`tp-glyph ${p.color}`}>{p.glyph}</span>
                  <span className="tp-name">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function glyphFor(t) {
  return PROVIDERS.find((p) => p.type === t)?.glyph || '@';
}
function labelFor(t) {
  return PROVIDERS.find((p) => p.type === t)?.name || t;
}
