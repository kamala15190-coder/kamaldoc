import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope, Upload, Loader2, FileText, Copy, Check,
  ChevronRight, AlertCircle, Globe, ArrowRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { uploadDocument, getDocuments, getDocument, simplifyDocument, translateDocument } from '../api';
import { REPLY_LANGUAGES } from '../languages';
import { usePlanLimit } from '../hooks/usePlanLimit';

export default function BefundAssistent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
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
    setError(null);
    try {
      const result = await uploadDocument(file, 'befund');
      setFile(null);
      let doc = result;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        doc = await getDocument(result.id);
        if (doc.status !== 'analyse_laeuft') break;
      }
      setSelectedDoc(doc);
      setVereinfacht(doc.vereinfacht || '');
      setTranslated('');
      fetchDocs();
    } catch (err) {
      if (!handleApiError(err)) setError(err.message || 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
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
      if (!handleApiError(err)) setError(err.message || 'Übersetzung fehlgeschlagen');
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

  const selectDoc = async (doc) => {
    const full = await getDocument(doc.id);
    setSelectedDoc(full);
    setVereinfacht(full.vereinfacht || '');
    setTranslated('');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-rose-100 rounded-lg">
          <Stethoscope className="w-6 h-6 text-rose-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('befund.title')}</h1>
          <p className="text-sm text-slate-500">{t('befund.subtitle')}</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-900 mb-3">{t('befund.uploadTitle')}</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1 flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-400 transition-colors">
            <Upload className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-slate-600 truncate">
              {file ? file.name : t('befund.chooseFile')}
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
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '44px' }}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? t('befund.uploading') : t('befund.uploadButton')}
          </button>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Selected Document */}
      {selectedDoc && (
        <div className="space-y-5 mb-6">
          {/* Doc Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-start justify-between">
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
          </div>

          {/* Step 1: Simplify */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">1</span>
              <h3 className="text-sm font-semibold text-slate-900">{t('befund.step1Title')}</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">{t('befund.step1Desc')}</p>
            <button
              onClick={handleSimplify}
              disabled={simplifying}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors cursor-pointer border-none disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              {simplifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4" />}
              {simplifying ? t('befund.simplifying') : t('befund.simplifyButton')}
            </button>

            {vereinfacht && (
              <div className="relative mt-4 bg-rose-50 rounded-lg p-4 border border-rose-200">
                <button
                  onClick={handleCopySimple}
                  className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer bg-transparent border-none"
                  title={t('document.copy')}
                >
                  {copiedSimple ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap pr-10">
                  {vereinfacht}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Translate */}
          {vereinfacht && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">2</span>
                <h3 className="text-sm font-semibold text-slate-900">{t('befund.step2Title')}</h3>
              </div>
              <p className="text-xs text-slate-500 mb-3">{t('befund.step2Desc')}</p>
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
                  onClick={handleTranslate}
                  disabled={translating || targetLang === 'de'}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer border-none disabled:opacity-50"
                  style={{ minHeight: '44px' }}
                >
                  {translating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  {translating ? t('befund.translating') : t('befund.translateButton')}
                </button>
              </div>

              {translated && (
                <div className="relative mt-4 bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <button
                    onClick={handleCopyTranslated}
                    className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer bg-transparent border-none"
                    title={t('document.copy')}
                  >
                    {copiedTranslated ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </button>
                  <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap pr-10">
                    {translated}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Previous Documents */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{t('befund.previousDocs')}</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Stethoscope className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{t('befund.noDocs')}</p>
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
                <FileText className="w-5 h-5 text-rose-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{doc.absender || doc.dateiname}</p>
                  {doc.datum && (
                    <p className="text-xs text-slate-500">{new Date(doc.datum).toLocaleDateString('de-DE')}</p>
                  )}
                </div>
                {doc.vereinfacht && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
