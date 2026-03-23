import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark, Upload, Loader2, FileText, Copy, Check,
  ChevronRight, AlertCircle, Globe, Scale, Shield, Share2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { uploadDocument, getDocuments, getDocument, explainDocument, getLegalAssessment, getContestableElements, generateObjection, getBehoerdenResults } from '../api';
import { REPLY_LANGUAGES } from '../languages';
import { usePlanLimit } from '../hooks/usePlanLimit';
import CollapsibleSection from '../components/CollapsibleSection';

export default function BehoerdeAssistent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [erklaerung, setErklaerung] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [targetLang, setTargetLang] = useState('de');
  const { handleApiError } = usePlanLimit();

  // Legal assessment state
  const [assessingLegal, setAssessingLegal] = useState(false);
  const [legalAssessment, setLegalAssessment] = useState('');
  const [copiedLegal, setCopiedLegal] = useState(false);

  // Objection state
  const [loadingElements, setLoadingElements] = useState(false);
  const [contestableElements, setContestableElements] = useState([]);
  const [selectedElements, setSelectedElements] = useState(new Set());
  const [generatingObjection, setGeneratingObjection] = useState(false);
  const [objectionLetter, setObjectionLetter] = useState('');
  const [copiedObjection, setCopiedObjection] = useState(false);
  const [objectionLang, setObjectionLang] = useState('de');

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const data = await getDocuments({ doc_type: 'behoerde' });
      setDocs((data.documents || data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadDocument(file, 'behoerde');
      setFile(null);
      let doc = result;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        doc = await getDocument(result.id);
        if (doc.status !== 'analyse_laeuft') break;
      }
      setSelectedDoc(doc);
      setErklaerung(doc.erklaerung || '');
      setLegalAssessment('');
      setContestableElements([]);
      setSelectedElements(new Set());
      setObjectionLetter('');
      // Load saved results for newly uploaded doc
      try {
        const saved = await getBehoerdenResults(doc.id);
        if (saved.erklaerung) setErklaerung(saved.erklaerung);
        if (saved.rechtseinschaetzung) setLegalAssessment(saved.rechtseinschaetzung);
        if (saved.anfechtbare_elemente) setContestableElements(saved.anfechtbare_elemente);
        if (saved.widerspruchsschreiben) setObjectionLetter(cleanObjectionText(saved.widerspruchsschreiben));
      } catch (_) {}
      fetchDocs();
    } catch (err) {
      if (!handleApiError(err)) setError(err.message || 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  };

  const handleExplain = async () => {
    if (!selectedDoc) return;
    setExplaining(true);
    setError(null);
    try {
      const result = await explainDocument(selectedDoc.id, targetLang);
      setErklaerung(result.erklaerung);
    } catch (err) {
      if (!handleApiError(err)) setError(err.message || 'Erklaerung fehlgeschlagen');
    } finally {
      setExplaining(false);
    }
  };

  const handleLegalAssessment = async () => {
    if (!selectedDoc) return;
    setAssessingLegal(true);
    setError(null);
    try {
      const result = await getLegalAssessment(selectedDoc.id, targetLang);
      setLegalAssessment(result.assessment);
    } catch (err) {
      if (!handleApiError(err)) setError(err.message || 'Rechtseinschaetzung fehlgeschlagen');
    } finally {
      setAssessingLegal(false);
    }
  };

  const handleContestableElements = async () => {
    if (!selectedDoc) return;
    setLoadingElements(true);
    setError(null);
    setSelectedElements(new Set());
    setObjectionLetter('');
    try {
      const result = await getContestableElements(selectedDoc.id, targetLang);
      setContestableElements(result.elements || []);
    } catch (err) {
      if (!handleApiError(err)) setError(err.message || 'Analyse fehlgeschlagen');
    } finally {
      setLoadingElements(false);
    }
  };

  const toggleElement = (id) => {
    setSelectedElements(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleGenerateObjection = async () => {
    if (!selectedDoc || selectedElements.size === 0) return;
    setGeneratingObjection(true);
    setError(null);
    try {
      const result = await generateObjection(selectedDoc.id, Array.from(selectedElements), objectionLang);
      setObjectionLetter(cleanObjectionText(result.letter));
    } catch (err) {
      if (!handleApiError(err)) setError(err.message || 'Widerspruch fehlgeschlagen');
    } finally {
      setGeneratingObjection(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(erklaerung);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Cleanup: strip AI meta-comments from objection letter
  const cleanObjectionText = (text) => {
    if (!text) return text;
    const cutPatterns = [
      /\n\s*Bitte beachten Sie, dass.*/s,
      /\n\s*Da .{0,40}nicht (definiert|spezifiziert|angegeben).*/s,
      /\n\s*Für weitere rechtliche Schritte.*/s,
      /\n\s*Hinweis:.*/s,
      /\n\s*Anmerkung:.*/s,
      /\n\s*Disclaimer:.*/s,
      /\n\s*Ich habe .{0,60}angefochten.*/s,
      /\n\s*\*\*Hinweis.*/s,
    ];
    let cleaned = text;
    for (const pattern of cutPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    return cleaned.trimEnd();
  };


  const shareText = async (text, title = 'KamalDoc') => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
      } else {
        window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`);
      }
    } catch (_) {}
  };
  const selectDoc = async (doc) => {
    const full = await getDocument(doc.id);
    setSelectedDoc(full);
    setErklaerung(full.erklaerung || '');
    setLegalAssessment('');
    setContestableElements([]);
    setSelectedElements(new Set());
    setObjectionLetter('');
    // Load saved results from behoerden_results table
    try {
      const saved = await getBehoerdenResults(doc.id);
      if (saved.erklaerung) setErklaerung(saved.erklaerung);
      if (saved.rechtseinschaetzung) setLegalAssessment(saved.rechtseinschaetzung);
      if (saved.anfechtbare_elemente) setContestableElements(saved.anfechtbare_elemente);
      if (saved.widerspruchsschreiben) setObjectionLetter(cleanObjectionText(saved.widerspruchsschreiben));
    } catch (_) { /* no saved results yet */ }
  };

  return (
    <div>
      <div data-intro="behoerde" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }} className="animate-fade-in">
        <div style={{ padding: 8, borderRadius: 10, background: 'rgba(20,184,166,0.1)' }}>
          <Landmark style={{ width: 18, height: 18, color: '#2dd4bf' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('behoerde.title')}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>{t('behoerde.subtitle')}</p>
        </div>
      </div>

      {/* Upload */}
      <div className="glass-card animate-fade-in-up" style={{ padding: 16, marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px' }}>{t('behoerde.uploadTitle')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '2px dashed var(--border-glass)', borderRadius: 10, cursor: 'pointer' }}>
            <Upload style={{ width: 18, height: 18, color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file ? file.name : t('behoerde.chooseFile')}</span>
            <input type="file" style={{ display: 'none' }} accept=".jpg,.jpeg,.png,.pdf" onChange={e => setFile(e.target.files[0] || null)} />
          </label>
          <button onClick={handleUpload} disabled={!file || uploading} className="btn-accent" style={{ width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (!file || uploading) ? 0.5 : 1 }}>
            {uploading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} /> : <Upload style={{ width: 16, height: 16 }} />}
            {uploading ? t('behoerde.uploading') : t('behoerde.uploadButton')}
          </button>
        </div>
        {error && <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--danger-text)' }}><AlertCircle style={{ width: 14, height: 14 }} />{error}</div>}
      </div>

      {selectedDoc && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
          {/* Doc Info */}
          <div className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{selectedDoc.absender || selectedDoc.dateiname}</h2>
                {selectedDoc.zusammenfassung && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>{selectedDoc.zusammenfassung}</p>}
              </div>
              <button onClick={() => navigate(`/documents/${selectedDoc.id}`)} style={{ fontSize: 12, color: 'var(--accent-solid)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                {t('document.original')} <ChevronRight style={{ width: 12, height: 12 }} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Globe style={{ width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0 }} />
                <select value={targetLang} onChange={e => setTargetLang(e.target.value)} className="input-dark" style={{ flex: 1, fontSize: 13 }}>
                  {REPLY_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
              <button onClick={handleExplain} disabled={explaining} className="btn-accent" style={{ padding: '10px 18px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: explaining ? 0.5 : 1 }}>
                {explaining ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <Landmark style={{ width: 14, height: 14 }} />}
                {explaining ? t('behoerde.explaining') : t('behoerde.explainButton')}
              </button>
            </div>
          </div>

          {/* Explanation (Collapsible Level 1) */}
          {erklaerung && (
            <div className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
              <CollapsibleSection title={t('behoerde.explanationTitle')} icon={Landmark} level={1} defaultOpen={true}>
                <div style={{ position: 'relative', padding: 14, borderRadius: 10, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
                  <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}>
                    <button onClick={handleCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      {copied ? <Check style={{ width: 14, height: 14, color: 'var(--success)' }} /> : <Copy style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />}
                    </button>
                    <button onClick={() => shareText(erklaerung, t('behoerde.explanationTitle'))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <Share2 style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
                    </button>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', paddingRight: 50 }}>{erklaerung}</div>
                </div>
              </CollapsibleSection>
            </div>
          )}

          {/* Legal Assessment (Collapsible Level 1) */}
          <div className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
            <CollapsibleSection title={t('behoerde.legalAssessmentTitle')} icon={Scale} level={1} defaultOpen={!!legalAssessment}>
              <button onClick={handleLegalAssessment} disabled={assessingLegal} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px',
                background: 'var(--warning-soft)', color: 'var(--warning-text)', border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: assessingLegal ? 0.5 : 1,
              }}>
                {assessingLegal ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <Scale style={{ width: 14, height: 14 }} />}
                {assessingLegal ? t('behoerde.analyzing') : t('behoerde.requestAssessment')}
              </button>
              {legalAssessment && (
                <>
                  <div style={{ position: 'relative', marginTop: 14, padding: 14, borderRadius: 10, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
                    <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}>
                      <button onClick={() => { navigator.clipboard.writeText(legalAssessment); setCopiedLegal(true); setTimeout(() => setCopiedLegal(false), 2000); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        {copiedLegal ? <Check style={{ width: 14, height: 14, color: 'var(--success)' }} /> : <Copy style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />}
                      </button>
                      <button onClick={() => shareText(legalAssessment, t('behoerde.legalAssessmentTitle'))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <Share2 style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', paddingRight: 50 }}>{legalAssessment}</div>
                  </div>
                  <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--warning-soft)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <p style={{ fontSize: 12, color: 'var(--warning-text)', margin: 0 }}>{t('behoerde.legalDisclaimer')}</p>
                  </div>
                </>
              )}
            </CollapsibleSection>
          </div>

          {/* Objection (Collapsible Level 1) */}
          <div className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
            <CollapsibleSection title={t('behoerde.objectionTitle')} icon={Shield} level={1} defaultOpen={!!objectionLetter || contestableElements.length > 0}>
              <button onClick={handleContestableElements} disabled={loadingElements} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px',
                background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: loadingElements ? 0.5 : 1,
              }}>
                {loadingElements ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <Shield style={{ width: 14, height: 14 }} />}
                {loadingElements ? t('behoerde.analyzing') : t('behoerde.checkElements')}
              </button>

              {contestableElements.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {contestableElements.map(el => (
                      <div
                        key={el.id}
                        onClick={() => toggleElement(el.id)}
                        style={{
                          position: 'relative', borderRadius: 10, padding: 14, cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          background: selectedElements.has(el.id) ? 'var(--danger-soft)' : 'var(--bg-glass)',
                          border: selectedElements.has(el.id) ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border-glass)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{el.element}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{el.description}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0' }}>{el.reason}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedElements.has(el.id)}
                            onChange={() => toggleElement(el.id)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: 18, height: 18, accentColor: '#ef4444', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedElements.size > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Globe style={{ width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0 }} />
                        <select value={objectionLang} onChange={e => setObjectionLang(e.target.value)} className="input-dark" style={{ flex: 1, fontSize: 13 }}>
                          {REPLY_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                        </select>
                      </div>
                      <button onClick={handleGenerateObjection} disabled={generatingObjection} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '12px 20px', background: '#ef4444', color: 'white',
                        border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        opacity: generatingObjection ? 0.5 : 1,
                      }}>
                        {generatingObjection ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <FileText style={{ width: 14, height: 14 }} />}
                        {generatingObjection ? t('behoerde.generating') : t('behoerde.generateObjection', { count: selectedElements.size, plural: selectedElements.size > 1 ? 'e' : '' })}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {objectionLetter && (
                <>
                  <div style={{ position: 'relative', marginTop: 14, padding: 14, borderRadius: 10, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
                    <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}>
                      <button onClick={() => { navigator.clipboard.writeText(objectionLetter); setCopiedObjection(true); setTimeout(() => setCopiedObjection(false), 2000); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        {copiedObjection ? <Check style={{ width: 14, height: 14, color: 'var(--success)' }} /> : <Copy style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />}
                      </button>
                      <button onClick={() => shareText(objectionLetter, t('behoerde.objectionTitle'))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <Share2 style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', paddingRight: 50 }}>{objectionLetter}</div>
                  </div>
                  <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--warning-soft)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <p style={{ fontSize: 12, color: 'var(--warning-text)', margin: 0 }}>{t('behoerde.objectionDisclaimer')}</p>
                  </div>
                </>
              )}
            </CollapsibleSection>
          </div>
        </div>
      )}

      {/* Previous Documents */}
      <div className="glass-card animate-fade-in-up" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-glass)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{t('behoerde.previousDocs')}</h2>
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(139,92,246,0.15)', borderTopColor: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Landmark style={{ width: 36, height: 36, color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{t('behoerde.noDocs')}</p>
          </div>
        ) : (
          <div>
            {docs.map((doc, idx) => (
              <div
                key={doc.id}
                style={{
                  padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  borderBottom: idx < docs.length - 1 ? '1px solid var(--border-glass)' : 'none',
                  background: selectedDoc?.id === doc.id ? 'var(--accent-soft)' : 'transparent',
                  transition: 'background 0.15s ease',
                }}
                onClick={() => selectDoc(doc)}
              >
                <FileText style={{ width: 18, height: 18, color: '#2dd4bf', flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.absender || doc.dateiname}</p>
                  {doc.datum && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{new Date(doc.datum).toLocaleDateString('de-DE')}</p>}
                </div>
                {doc.erklaerung && <Check style={{ width: 14, height: 14, color: 'var(--success)', flexShrink: 0 }} />}
                <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-muted)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
