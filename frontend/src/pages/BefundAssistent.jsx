import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope, Upload, Loader2, FileText, Copy, Check,
  ChevronRight, AlertCircle, Globe, ArrowRight, Share2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { uploadDocument, getDocuments, getDocument, simplifyDocument, translateDocument } from '../api';
import { REPLY_LANGUAGES } from '../languages';
import { usePlanLimit } from '../hooks/usePlanLimit';
import CollapsibleSection from '../components/CollapsibleSection';
import { formatLocalDate } from '../utils/dateUtils';

export default function BefundAssistent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100, ~analyse_laeuft Progress
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [simplifying, setSimplifying] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [vereinfacht, setVereinfacht] = useState('');
  const [translated, setTranslated] = useState('');
  const [copiedSimple, setCopiedSimple] = useState(false);
  const [copiedTranslated, setCopiedTranslated] = useState(false);
  const [error, setError] = useState(null);
  const [targetLang, setTargetLang] = useState('de');
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  const { handleApiError } = usePlanLimit();

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const data = await getDocuments({ doc_type: 'befund' });
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
    setUploadProgress(5);
    setError(null);
    try {
      const result = await uploadDocument(file, 'befund');
      setFile(null);
      if (!mountedRef.current) return;
      setUploadProgress(20);
      let doc = result;
      const maxAttempts = 30;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 2000));
        if (!mountedRef.current) return;
        doc = await getDocument(result.id);
        if (!mountedRef.current) return;
        // 20% Upload + 80% Analyse
        setUploadProgress(Math.min(95, 20 + Math.round(((i + 1) / maxAttempts) * 75)));
        if (doc.status !== 'analyse_laeuft') break;
      }
      if (!mountedRef.current) return;
      setUploadProgress(100);
      setSelectedDoc(doc);
      setVereinfacht(doc.vereinfacht || '');
      setTranslated('');
      fetchDocs();
    } catch (err) {
      if (!mountedRef.current) return;
      if (!handleApiError(err)) setError(err.message || 'Upload fehlgeschlagen');
    } finally {
      if (mountedRef.current) {
        setUploading(false);
        setUploadProgress(0);
      }
    }
  };

  const handleSimplify = async () => {
    if (!selectedDoc) return;
    setSimplifying(true);
    setError(null);
    setTranslated('');
    try {
      const result = await simplifyDocument(selectedDoc.id);
      setVereinfacht(result.vereinfacht);
    } catch (err) {
      if (!handleApiError(err)) setError(err.message || 'Vereinfachung fehlgeschlagen');
    } finally {
      setSimplifying(false);
    }
  };

  const handleTranslate = async () => {
    if (!selectedDoc || !vereinfacht) return;
    setTranslating(true);
    setError(null);
    try {
      const result = await translateDocument(selectedDoc.id, targetLang);
      setTranslated(result.translated);
    } catch (err) {
      if (!handleApiError(err)) setError(err.message || 'Uebersetzung fehlgeschlagen');
    } finally {
      setTranslating(false);
    }
  };

  const handleCopySimple = () => {
    navigator.clipboard.writeText(vereinfacht);
    setCopiedSimple(true);
    setTimeout(() => setCopiedSimple(false), 2000);
  };

  const handleCopyTranslated = () => {
    navigator.clipboard.writeText(translated);
    setCopiedTranslated(true);
    setTimeout(() => setCopiedTranslated(false), 2000);
  };


  const shareText = async (text, title = 'KamalDoc') => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
      } else {
        window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`);
      }
    } catch { /* ignore */ }
  };
  const selectDoc = async (doc) => {
    const full = await getDocument(doc.id);
    setSelectedDoc(full);
    setVereinfacht(full.vereinfacht || '');
    setTranslated('');
  };

  return (
    <div>
      <div data-intro="befund" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }} className="animate-fade-in">
        <div style={{ padding: 8, borderRadius: 10, background: 'rgba(244,63,94,0.1)' }}>
          <Stethoscope style={{ width: 18, height: 18, color: '#fb7185' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('befund.title')}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>{t('befund.subtitle')}</p>
        </div>
      </div>

      {/* Upload */}
      <div className="glass-card animate-fade-in-up" style={{ padding: 16, marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px' }}>{t('befund.uploadTitle')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '2px dashed var(--border-glass)', borderRadius: 10, cursor: 'pointer', transition: 'border-color 0.15s' }}>
            <Upload style={{ width: 18, height: 18, color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file ? file.name : t('befund.chooseFile')}</span>
            <input type="file" style={{ display: 'none' }} accept=".jpg,.jpeg,.png,.pdf" onChange={e => setFile(e.target.files[0] || null)} />
          </label>
          <button onClick={handleUpload} disabled={!file || uploading} className="btn-accent" style={{ width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (!file || uploading) ? 0.5 : 1 }}>
            {uploading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} /> : <Upload style={{ width: 16, height: 16 }} />}
            {uploading ? t('befund.uploading') : t('befund.uploadButton')}
          </button>
          {uploading && (
            <div style={{ marginTop: 2 }}>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--progress-track)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--accent-gradient)', transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>
                {uploadProgress < 20 ? t('befund.uploading') : uploadProgress < 95 ? t('befund.analyzing', 'Wird analysiert...') : t('befund.finishing', 'Fast fertig...')}
              </div>
            </div>
          )}
        </div>
        {error && <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--danger-text)' }}><AlertCircle style={{ width: 14, height: 14 }} />{error}</div>}
      </div>

      {selectedDoc && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
          <div className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{selectedDoc.absender || selectedDoc.dateiname}</h2>
                {selectedDoc.zusammenfassung && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>{selectedDoc.zusammenfassung}</p>}
              </div>
              <button onClick={() => navigate(`/documents/${selectedDoc.id}`)} style={{ fontSize: 12, color: 'var(--accent-solid)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                {t('document.original')} <ChevronRight style={{ width: 12, height: 12 }} />
              </button>
            </div>
          </div>

          {/* Step 1: Simplify (Collapsible Level 1) */}
          <div className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
            <CollapsibleSection title={t('befund.step1Title')} icon={Stethoscope} level={1} defaultOpen={true}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px' }}>{t('befund.step1Desc')}</p>
              <button onClick={handleSimplify} disabled={simplifying} className="btn-accent" style={{ padding: '10px 18px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: simplifying ? 0.5 : 1 }}>
                {simplifying ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <Stethoscope style={{ width: 14, height: 14 }} />}
                {simplifying ? t('befund.simplifying') : t('befund.simplifyButton')}
              </button>
              {vereinfacht && (
                <div style={{ position: 'relative', marginTop: 14, padding: 14, borderRadius: 10, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
                  <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}>
                    <button onClick={handleCopySimple} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      {copiedSimple ? <Check style={{ width: 14, height: 14, color: 'var(--success)' }} /> : <Copy style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />}
                    </button>
                    <button onClick={() => shareText(vereinfacht, t('befund.step1Title'))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <Share2 style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
                    </button>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', paddingRight: 50 }}>{vereinfacht}</div>
                </div>
              )}
            </CollapsibleSection>
          </div>

          {/* Step 2: Translate (Collapsible Level 1) */}
          {vereinfacht && (
            <div className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
              <CollapsibleSection title={t('befund.step2Title')} icon={Globe} level={1} defaultOpen={true}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px' }}>{t('befund.step2Desc')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Globe style={{ width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0 }} />
                    <select value={targetLang} onChange={e => setTargetLang(e.target.value)} className="input-dark" style={{ flex: 1, fontSize: 13 }}>
                      {REPLY_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                  </div>
                  <button onClick={handleTranslate} disabled={translating || targetLang === 'de'} className="btn-accent" style={{ padding: '10px 18px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: (translating || targetLang === 'de') ? 0.5 : 1 }}>
                    {translating ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <Globe style={{ width: 14, height: 14 }} />}
                    {translating ? t('befund.translating') : t('befund.translateButton')}
                  </button>
                </div>
                {translated && (
                  <div style={{ position: 'relative', marginTop: 14, padding: 14, borderRadius: 10, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
                    <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}>
                      <button onClick={handleCopyTranslated} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        {copiedTranslated ? <Check style={{ width: 14, height: 14, color: 'var(--success)' }} /> : <Copy style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />}
                      </button>
                      <button onClick={() => shareText(translated, t('befund.step2Title'))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <Share2 style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', paddingRight: 50 }}>{translated}</div>
                  </div>
                )}
              </CollapsibleSection>
            </div>
          )}
        </div>
      )}

      {/* Previous Documents */}
      <div className="glass-card animate-fade-in-up" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-glass)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{t('befund.previousDocs')}</h2>
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.15)', borderTopColor: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Stethoscope style={{ width: 36, height: 36, color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{t('befund.noDocs')}</p>
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
                <FileText style={{ width: 18, height: 18, color: '#fb7185', flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.absender || doc.dateiname}</p>
                  {doc.datum && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{formatLocalDate(doc.datum)}</p>}
                </div>
                {doc.vereinfacht && <Check style={{ width: 14, height: 14, color: 'var(--success)', flexShrink: 0 }} />}
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
