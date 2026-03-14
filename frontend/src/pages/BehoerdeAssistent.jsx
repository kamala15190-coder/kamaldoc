import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark, Upload, Loader2, FileText, Copy, Check,
  ChevronRight, AlertCircle, Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { uploadDocument, getDocuments, getDocument, explainDocument, getThumbnailUrl } from '../api';
import { REPLY_LANGUAGES } from '../languages';

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
      // Poll for analysis completion
      let doc = result;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        doc = await getDocument(result.id);
        if (doc.status !== 'analyse_laeuft') break;
      }
      setSelectedDoc(doc);
      setErklaerung(doc.erklaerung || '');
      fetchDocs();
    } catch (err) {
      setError(err.message || 'Upload fehlgeschlagen');
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
      setError(err.message || 'Erklärung fehlgeschlagen');
    } finally {
      setExplaining(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(erklaerung);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectDoc = async (doc) => {
    const full = await getDocument(doc.id);
    setSelectedDoc(full);
    setErklaerung(full.erklaerung || '');
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

      {/* Selected Document + Explanation */}
      {selectedDoc && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
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

          {/* Language + Generate */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer border-none disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              {explaining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Landmark className="w-4 h-4" />}
              {explaining ? t('behoerde.explaining') : t('behoerde.explainButton')}
            </button>
          </div>

          {/* Explanation Result */}
          {erklaerung && (
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
          )}
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
