import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark, Upload, Loader2, FileText, Copy, Check,
  ChevronRight, AlertCircle, Globe, Scale, Shield
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { uploadDocument, getDocuments, getDocument, explainDocument, getLegalAssessment, getContestableElements, generateObjection, getBehoerdenResults } from '../api';
import { REPLY_LANGUAGES } from '../languages';
import { usePlanLimit } from '../hooks/usePlanLimit';

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
      if (!handleApiError(err)) setError(err.message || 'Erklärung fehlgeschlagen');
    } finally {
      setExplaining(false);
    }
  };

  const handleLegalAssessment = async () => {
    if (!selectedDoc) return;
    setAssessingLegal(true);
    setError(null);
    try {
      const result = await getLegalAssessment(selectedDoc.id);
      setLegalAssessment(result.assessment);
    } catch (err) {
      if (!handleApiError(err)) setError(err.message || 'Rechtseinschätzung fehlgeschlagen');
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
      const result = await getContestableElements(selectedDoc.id);
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
      const result = await generateObjection(selectedDoc.id, Array.from(selectedElements));
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
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-teal-100 rounded-lg">
          <Landmark className="w-6 h-6 text-teal-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('behoerde.title')}</h1>
          <p className="text-sm text-slate-500">{t('behoerde.subtitle')}</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-900 mb-3">{t('behoerde.uploadTitle')}</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1 flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-400 transition-colors">
            <Upload className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-slate-600 truncate">
              {file ? file.name : t('behoerde.chooseFile')}
            </span>
            <input
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={e => setFile(e.target.files[0] || null)}
            />
          </label>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '44px' }}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? t('behoerde.uploading') : t('behoerde.uploadButton')}
          </button>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Selected Document + Actions */}
      {selectedDoc && (
        <div className="space-y-5 mb-6">
          {/* Doc Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {selectedDoc.absender || selectedDoc.dateiname}
                </h2>
                {selectedDoc.zusammenfassung && (
                  <p className="text-sm text-slate-500 mt-1">{selectedDoc.zusammenfassung}</p>
                )}
              </div>
              <button
                onClick={() => navigate(`/documents/${selectedDoc.id}`)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 bg-transparent border-none cursor-pointer"
              >
                {t('document.original')} <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                <select
                  value={targetLang}
                  onChange={e => setTargetLang(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {REPLY_LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleExplain}
                disabled={explaining}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer border-none disabled:opacity-50"
                style={{ minHeight: '44px' }}
              >
                {explaining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Landmark className="w-4 h-4" />}
                {explaining ? t('behoerde.explaining') : t('behoerde.explainButton')}
              </button>
            </div>
          </div>

          {/* Explanation Result */}
          {erklaerung && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">{t('behoerde.explanationTitle')}</h3>
              <div className="relative bg-slate-50 rounded-lg p-4 border border-slate-200">
                <button
                  onClick={handleCopy}
                  className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer bg-transparent border-none"
                  title={t('document.copy')}
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap pr-10">
                  {erklaerung}
                </div>
              </div>
            </div>
          )}

          {/* Legal Assessment */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-semibold text-slate-900">{t('behoerde.legalAssessmentTitle')}</h3>
            </div>
            <button
              onClick={handleLegalAssessment}
              disabled={assessingLegal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors cursor-pointer border-none disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              {assessingLegal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
              {assessingLegal ? t('behoerde.analyzing') : t('behoerde.requestAssessment')}
            </button>

            {legalAssessment && (
              <>
                <div className="relative mt-4 bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <button
                    onClick={() => { navigator.clipboard.writeText(legalAssessment); setCopiedLegal(true); setTimeout(() => setCopiedLegal(false), 2000); }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer bg-transparent border-none"
                    title={t('document.copy')}
                  >
                    {copiedLegal ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </button>
                  <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap pr-10">
                    {legalAssessment}
                  </div>
                </div>
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    {t('behoerde.legalDisclaimer')}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Objection / Widerspruch */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-red-600" />
              <h3 className="text-sm font-semibold text-slate-900">{t('behoerde.objectionTitle')}</h3>
            </div>
            <button
              onClick={handleContestableElements}
              disabled={loadingElements}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer border-none disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              {loadingElements ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {loadingElements ? t('behoerde.analyzing') : t('behoerde.checkElements')}
            </button>

            {contestableElements.length > 0 && (
              <div className="mt-4">
                {/* Desktop: Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 border-b">{t('behoerde.elementHeader')}</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 border-b">{t('behoerde.descriptionHeader')}</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 border-b">{t('behoerde.reasonHeader')}</th>
                        <th className="px-3 py-2 text-xs font-medium text-slate-500 border-b w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {contestableElements.map(el => (
                        <tr key={el.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">{el.element}</td>
                          <td className="px-3 py-2 text-slate-600">{el.description}</td>
                          <td className="px-3 py-2 text-slate-500 text-xs">{el.reason}</td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={selectedElements.has(el.id)}
                              onChange={() => toggleElement(el.id)}
                              className="w-4 h-4 accent-red-600 cursor-pointer"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: Cards */}
                <div className="md:hidden space-y-3">
                  {contestableElements.map(el => (
                    <div
                      key={el.id}
                      onClick={() => toggleElement(el.id)}
                      className={`relative rounded-xl border p-4 cursor-pointer transition-all ${
                        selectedElements.has(el.id)
                          ? 'border-red-400 bg-red-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">{el.element}</p>
                          <p className="text-sm text-slate-600 mt-1">{el.description}</p>
                          <p className="text-xs text-slate-400 mt-2">{el.reason}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedElements.has(el.id)}
                          onChange={() => toggleElement(el.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 accent-red-600 cursor-pointer shrink-0 mt-0.5"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {selectedElements.size > 0 && (
                  <button
                    onClick={handleGenerateObjection}
                    disabled={generatingObjection}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800 transition-colors cursor-pointer border-none disabled:opacity-50"
                    style={{ minHeight: '44px' }}
                  >
                    {generatingObjection ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {generatingObjection ? t('behoerde.generating') : t('behoerde.generateObjection', { count: selectedElements.size, plural: selectedElements.size > 1 ? 'e' : '' })}
                  </button>
                )}
              </div>
            )}

            {objectionLetter && (
              <>
                <div className="relative mt-4 bg-red-50 rounded-lg p-4 border border-red-200">
                  <button
                    onClick={() => { navigator.clipboard.writeText(objectionLetter); setCopiedObjection(true); setTimeout(() => setCopiedObjection(false), 2000); }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-red-100 transition-colors cursor-pointer bg-transparent border-none"
                    title={t('document.copy')}
                  >
                    {copiedObjection ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </button>
                  <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap pr-10">
                    {objectionLetter}
                  </div>
                </div>
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    {t('behoerde.objectionDisclaimer')}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Previous Documents */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{t('behoerde.previousDocs')}</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Landmark className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{t('behoerde.noDocs')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {docs.map(doc => (
              <div
                key={doc.id}
                className={`px-5 py-3 hover:bg-indigo-50/50 cursor-pointer transition-colors flex items-center gap-3 ${
                  selectedDoc?.id === doc.id ? 'bg-indigo-50' : ''
                }`}
                onClick={() => selectDoc(doc)}
              >
                <FileText className="w-5 h-5 text-teal-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{doc.absender || doc.dateiname}</p>
                  {doc.datum && (
                    <p className="text-xs text-slate-500">{new Date(doc.datum).toLocaleDateString('de-DE')}</p>
                  )}
                </div>
                {doc.erklaerung && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
