import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, ShieldQuestion, Paperclip, X, Loader2, Flag, RotateCcw, AlertTriangle, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { checkPhishing } from '../api';
import { useAttachmentPicker } from '../components/AttachmentPicker';

const VERDICTS = {
  safe: { color: 'var(--success)', soft: 'var(--success-soft)', Icon: ShieldCheck, key: 'verdictSafe', fallback: 'Sicher' },
  suspicious: { color: 'var(--amber)', soft: 'var(--amber-soft)', Icon: ShieldQuestion, key: 'verdictSuspicious', fallback: 'Verdächtig' },
  phishing: { color: 'var(--danger)', soft: 'var(--danger-bg)', Icon: ShieldAlert, key: 'verdictPhishing', fallback: 'Phishing' },
};

export default function Phishing() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [animScore, setAnimScore] = useState(0);
  const { openPicker, picker } = useAttachmentPicker({ onFile: setFile });

  const run = async ({ message, attachedFile, documentId } = {}) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await checkPhishing({
        message, file: attachedFile, documentId, language: i18n.language,
      });
      setResult(res);
    } catch (e) {
      if (e?.response?.status === 403) {
        setError(e?.response?.data?.detail?.message || t('phishing.limitReached', { defaultValue: 'Limit erreicht. Bitte upgraden.' }));
      } else {
        setError(t('phishing.error', { defaultValue: 'Prüfung fehlgeschlagen. Bitte erneut versuchen.' }));
      }
    } finally {
      setLoading(false);
    }
  };

  // Entry from a document (e.g. Doka): ?document_id=123 → auto-check.
  useEffect(() => {
    const docId = searchParams.get('document_id');
    if (docId) run({ documentId: Number(docId) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate the score/needle whenever a result arrives (rAF count-up).
  useEffect(() => {
    if (!result) { setAnimScore(0); return; }
    const target = result.risk_score;
    const start = performance.now();
    const dur = 1400;
    let raf;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimScore(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result]);

  const reset = () => { setResult(null); setText(''); setFile(null); setError(null); };

  const reportPhishing = () => {
    const addr = i18n.language === 'de' ? 'report-phishing@bsi.de' : 'report-phishing@apwg.org';
    const subject = encodeURIComponent(t('phishing.reportSubject', { defaultValue: 'Phishing-Meldung' }));
    const body = encodeURIComponent((text || '').slice(0, 2000));
    window.location.href = `mailto:${addr}?subject=${subject}&body=${body}`;
  };

  const verdict = result ? (VERDICTS[result.verdict] || VERDICTS.suspicious) : null;

  return (
    <div className="animate-fade-in" data-intro="phishing">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(216,126,120,0.14)', border: '1px solid rgba(216,126,120,0.25)' }}>
          <ShieldAlert style={{ width: 19, height: 19, color: 'var(--rose)' }} />
        </div>
        <div>
          <p className="kicker" style={{ margin: 0, color: 'var(--rose)' }}>{t('phishing.kicker', { defaultValue: 'Sicherheits-Check' })}</p>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{t('phishing.title', { defaultValue: 'Phishing-Prüfung' })}</h1>
        </div>
      </div>

      {/* Input phase */}
      {!result && !loading && (
        <div className="glass-card" style={{ padding: 18 }}>
          <p className="lede" style={{ margin: '0 0 14px', color: 'var(--text-secondary)' }}>
            {t('phishing.intro', { defaultValue: 'Füge eine verdächtige Nachricht ein oder lade einen Screenshot/ein PDF hoch.' })}
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('phishing.placeholder', { defaultValue: 'Verdächtige E-Mail oder SMS hier einfügen …' })}
            className="input-dark"
            rows={6}
            style={{ width: '100%', resize: 'vertical', padding: '12px 14px', borderRadius: 14, fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}
          />
          {file && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', borderRadius: 10, background: 'var(--amber-soft)', border: '1px solid var(--accent-soft-border)', fontSize: 13, color: 'var(--text-secondary)' }}>
              <Paperclip style={{ width: 14, height: 14, color: 'var(--amber)' }} />
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
              <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X style={{ width: 15, height: 15 }} /></button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={openPicker} className="btn-ghost" aria-label={t('attach.title', { defaultValue: 'Anhang hinzufügen' })}
              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 14px' }}>
              <Paperclip style={{ width: 17, height: 17 }} />
            </button>
            <button onClick={() => run({ message: text, attachedFile: file })} disabled={!text.trim() && !file}
              className="btn-accent" style={{ flex: 1, padding: '9px 16px', fontSize: 13.5, opacity: (!text.trim() && !file) ? 0.6 : 1 }}>
              {t('phishing.check', { defaultValue: 'Jetzt prüfen' })}
            </button>
          </div>
          {error && <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--danger-text)' }}>{error}</p>}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
          <Loader2 style={{ width: 30, height: 30, color: 'var(--amber)', animation: 'spin 0.9s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>{t('phishing.analyzing', { defaultValue: 'Analysiere …' })}</p>
        </div>
      )}

      {/* Result phase */}
      {result && !loading && verdict && (
        <div>
          {/* Meter */}
          <div className="glass-card" style={{ padding: '20px 18px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 9px', borderRadius: 999, background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                <ShieldAlert style={{ width: 13, height: 13 }} /> {t('phishing.scaleRisk', { defaultValue: 'Phishing' })}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 9px', borderRadius: 999, background: 'var(--success-soft)', color: 'var(--success)' }}>
                {t('phishing.scaleSafe', { defaultValue: 'Sicher' })} <ShieldCheck style={{ width: 13, height: 13 }} />
              </span>
            </div>
            <div style={{ position: 'relative', height: 14, borderRadius: 7, border: '1px solid var(--border-glass)' }}>
              <div style={{ position: 'absolute', inset: 1, borderRadius: 6,
                background: 'linear-gradient(90deg, #E15F5F 0%, #E89A52 35%, #F5C56A 50%, #B7C794 70%, #94B89A 100%)' }} />
              {/* needle: risk 0 = right (safe), 100 = left (phishing) */}
              <div style={{ position: 'absolute', top: -7, bottom: -7, width: 3, background: 'var(--text-primary)', borderRadius: 2,
                boxShadow: '0 0 10px rgba(0,0,0,0.4)', left: `${100 - animScore}%`, transform: 'translateX(-50%)', transition: 'left 0.05s linear' }}>
                <div style={{ position: 'absolute', top: -46, left: '50%', transform: 'translateX(-50%)', padding: '5px 11px', borderRadius: 999,
                  background: verdict.color, color: '#fff', whiteSpace: 'nowrap', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.85 }}>{t(`phishing.${verdict.key}`, { defaultValue: verdict.fallback })}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, lineHeight: 1 }}>{animScore}%</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10, color: 'var(--text-muted)' }}>
              <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
            </div>
          </div>

          {/* Reasoning flags */}
          {result.reasoning?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p className="kicker" style={{ margin: '0 0 10px' }}>{t('phishing.whyTitle', { defaultValue: 'So kam die Einschätzung zustande' })}</p>
              {result.reasoning.map((flag, i) => {
                const red = flag.type === 'red';
                return (
                  <div key={i} style={{ display: 'flex', gap: 11, padding: '11px 13px', marginBottom: 8, borderRadius: 'var(--radius-md)',
                    background: red ? 'var(--danger-bg)' : 'var(--success-soft)', border: `1px solid ${red ? 'var(--danger-border)' : 'var(--success-border)'}` }}>
                    <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: red ? 'var(--danger)' : 'var(--success)', color: '#fff' }}>
                      {red ? <AlertTriangle style={{ width: 13, height: 13 }} /> : <Check style={{ width: 13, height: 13 }} />}
                    </div>
                    <div>
                      {flag.title && <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{flag.title}</p>}
                      {flag.text && <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{flag.text}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={reset} className="btn-ghost" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <RotateCcw style={{ width: 16, height: 16 }} /> {t('phishing.newCheck', { defaultValue: 'Neu' })}
            </button>
            {result.verdict !== 'safe' && (
              <button onClick={reportPhishing} className="btn-accent" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Flag style={{ width: 16, height: 16 }} /> {t('phishing.report', { defaultValue: 'Als Phishing melden' })}
              </button>
            )}
          </div>
        </div>
      )}
      {picker}
    </div>
  );
}
