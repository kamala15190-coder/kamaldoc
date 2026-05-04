import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockDokaInitialMessages, mockDokaPrompts } from '../lib/mock';
import api from '../lib/api';

export default function Doka() {
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState(mockDokaInitialMessages);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    api.post('/doka/conversations')
      .then((r) => setConversationId(r.data?.id))
      .catch(() => { /* ok in mock mode */ });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  const send = async (text) => {
    const content = text || input;
    if (!content.trim()) return;

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content }]);
    setInput('');
    setBusy(true);

    try {
      if (conversationId) {
        const r = await api.post(`/doka/conversations/${conversationId}/messages`, { content });
        const aiMsg = r.data?.find((m) => m.role === 'assistant');
        if (aiMsg) {
          setMessages((prev) => [...prev, aiMsg]);
        }
      } else {
        // Mock fallback — show a structured insurance card after thinking
        setTimeout(() => {
          setMessages((prev) => [...prev, {
            id: `a-${Date.now()}`,
            role: 'assistant',
            kind: 'rich-insurance',
            content: '',
          }]);
          setBusy(false);
        }, 900);
        return;
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: '(Demo) Mistral nicht konfiguriert — sobald `MISTRAL_API_KEY` gesetzt ist, antworte ich richtig.',
      }]);
    }
    setBusy(false);
  };

  return (
    <section className="screen doka is-active" aria-label="Doka KI-Chat">
      <header className="top-bar">
        <button className="icon-btn ghost" onClick={() => navigate(-1)} aria-label="Zurück">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <div className="doka-titlewrap">
          <span className="doka-title">Doka<i>.</i></span>
          <span className="doka-sub">Dein KI-Begleiter</span>
        </div>
        <button className="icon-btn ghost" aria-label="Verlauf">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9" /><path d="M3 4v5h5" /><path d="M12 8v4l3 2" /></svg>
        </button>
      </header>

      {messages.length <= 1 && (
        <div className="doka-prompts reveal" style={{ '--d': '0ms' }}>
          {mockDokaPrompts.map((p) => (
            <button key={p} className="doka-chip" onClick={() => send(p)}>{p}</button>
          ))}
        </div>
      )}

      <main className="doka-scroll" ref={scrollRef}>
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'msg-user' : 'msg-ai'}>
            <div className={`msg-bubble ${m.kind === 'rich-insurance' ? 'msg-rich' : ''}`}>
              {m.kind === 'rich-insurance' ? <InsuranceAnswer /> : <p>{m.content}</p>}
            </div>
          </div>
        ))}
        {busy && (
          <div className="msg-ai">
            <div className="msg-bubble msg-thinking">
              <span className="dot" /><span className="dot" /><span className="dot" />
              <span className="thinking-text">Durchsuche deine Dokumente …</span>
            </div>
          </div>
        )}
      </main>

      <div className="doka-input">
        <button className="di-attach" aria-label="Datei">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m21 15-7 7a5.66 5.66 0 0 1-8-8l9-9a4 4 0 0 1 6 6l-9 9a2 2 0 0 1-3-3l8-8" /></svg>
        </button>
        <input
          className="di-field"
          placeholder="Frag Doka …"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
        />
        <button className="di-send" aria-label="Senden" onClick={() => send()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4z" /></svg>
        </button>
      </div>
    </section>
  );
}

function InsuranceAnswer() {
  return (
    <>
      <p><strong>Ja</strong> — gedeckt durch deine <strong>Haushaltsversicherung</strong>.</p>
      <div className="msg-card">
        <div className="mc-row"><span className="mc-key">Polizze</span><span className="mc-val">UNIQA · 1.842.391-K</span></div>
        <div className="mc-row"><span className="mc-key">Glasbruch</span><span className="mc-val">enthalten</span></div>
        <div className="mc-row"><span className="mc-key">Selbstbehalt</span><span className="mc-val">€ 100,—</span></div>
        <div className="mc-row"><span className="mc-key">Maximal</span><span className="mc-val">€ 5.000,—</span></div>
      </div>
      <p className="msg-foot">Soll ich den Schadensfall vorbereiten?</p>
      <div className="msg-actions">
        <button className="btn-primary sm">Schadenmeldung schreiben</button>
        <button className="btn-ghost sm">Polizze öffnen</button>
      </div>
    </>
  );
}
