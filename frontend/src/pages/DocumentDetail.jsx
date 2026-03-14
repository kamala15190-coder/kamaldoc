import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Trash2, Save, CheckCircle, MessageSquare,
  Loader2, Copy, AlertCircle, ExternalLink, RefreshCw, Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getDocument, updateDocument, deleteDocument,
  generateReply, getReplies, getFileUrl, getThumbnailUrl
} from '../api';
import { REPLY_LANGUAGES } from '../languages';

const KATEGORIE_COLORS = {
  brief: 'bg-blue-100 text-blue-700',
  rechnung: 'bg-amber-100 text-amber-700',
  lohnzettel: 'bg-green-100 text-green-700',
  kontoauszug: 'bg-purple-100 text-purple-700',
  vertrag: 'bg-rose-100 text-rose-700',
  behoerde: 'bg-teal-100 text-teal-700',
  sonstiges: 'bg-slate-100 text-slate-700',
};

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notizen, setNotizen] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [replies, setReplies] = useState([]);
  const [generatingReply, setGeneratingReply] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(null);
  const [polling, setPolling] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);
  const [justMarkedDone, setJustMarkedDone] = useState(false);
  const [replyLanguage, setReplyLanguage] = useState('de');

  const fetchDoc = useCallback(async () => {
    try {
      const data = await getDocument(id);
      setDoc(data);
      setNotizen(data.notizen || '');
      setTags(data.tags || '');
      return data;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchReplies = useCallback(async () => {
    try {
      const data = await getReplies(id);
      setReplies(data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  useEffect(() => {
    fetchDoc();
    fetchReplies();
  }, [fetchDoc, fetchReplies]);

  // Polling wenn Analyse läuft
  useEffect(() => {
    if (doc?.status === 'analyse_laeuft') {
      setPolling(true);
      const interval = setInterval(async () => {
        const updated = await fetchDoc();
        if (updated && updated.status !== 'analyse_laeuft') {
          setPolling(false);
          clearInterval(interval);
        }
      }, 3000);
      return () => clearInterval(interval);
    } else {
      setPolling(false);
    }
  }, [doc?.status, fetchDoc]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateDocument(id, { notizen, tags });
      setDoc(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkDone = async () => {
    setMarkingDone(true);
    try {
      const updated = await updateDocument(id, { handlung_erledigt: true });
      setJustMarkedDone(true);
      setTimeout(() => {
        setDoc(updated);
        setMarkingDone(false);
      }, 800);
    } catch (err) {
      console.error(err);
      setMarkingDone(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('document.confirmDelete'))) return;
    setDeleting(true);
    try {
      await deleteDocument(id);
      navigate('/');
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  const handleGenerateReply = async () => {
    setGeneratingReply(true);
    try {
      await generateReply(id, replyLanguage);
      await fetchReplies();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || err.message);
    } finally {
      setGeneratingReply(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 text-lg">{t('document.notFound')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer bg-transparent border-none text-sm"
          style={{ minHeight: '44px' }}
        >
          <ArrowLeft className="w-4 h-4" /> {t('document.back')}
        </button>
        <div className="flex items-center gap-2">
          <a
            href={getFileUrl(doc.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 no-underline"
            style={{ minHeight: '44px' }}
          >
            <ExternalLink className="w-4 h-4" /> <span className="hidden md:inline">{t('document.original')}</span>
          </a>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 text-red-700 cursor-pointer disabled:opacity-50"
            style={{ minHeight: '44px' }}
          >
            <Trash2 className="w-4 h-4" /> <span className="hidden md:inline">{t('document.delete')}</span>
          </button>
        </div>
      </div>

      {/* Mobile: Bild oben full-width */}
      <div className="md:hidden bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
        <img
          src={doc.dateityp === 'pdf' ? getThumbnailUrl(doc.id) : getFileUrl(doc.id)}
          alt={doc.dateiname}
          className="w-full h-auto"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Linke Spalte: Bild (Desktop) */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <img
            src={doc.dateityp === 'pdf' ? getThumbnailUrl(doc.id) : getFileUrl(doc.id)}
            alt={doc.dateiname}
            className="w-full h-auto"
          />
        </div>

        {/* Rechte Spalte: Daten */}
        <div className="space-y-4">
          {/* Status-Banner */}
          {doc.status === 'analyse_laeuft' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
              <div>
                <p className="text-sm font-medium text-yellow-800">{t('document.analysisRunning')}</p>
                <p className="text-xs text-yellow-600">{t('document.analysisRunningDesc')}</p>
              </div>
            </div>
          )}

          {doc.status === 'fehler' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-medium text-red-800">{t('document.analysisFailed')}</p>
              <p className="text-xs text-red-600 mt-1">{doc.analyse_fehler}</p>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1 mt-2 text-xs text-red-700 hover:text-red-900 cursor-pointer bg-transparent border-none"
              >
                <RefreshCw className="w-3 h-3" /> {t('document.reload')}
              </button>
            </div>
          )}

          {/* Handlungsbedarf */}
          {doc.handlung_erforderlich && !doc.handlung_erledigt && (
            <div className={`rounded-xl p-4 transition-all duration-500 ${justMarkedDone ? 'bg-green-50 border border-green-200 scale-[0.98]' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start gap-3 mb-3">
                {justMarkedDone ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0 animate-bounce" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium transition-all duration-500 ${justMarkedDone ? 'text-green-800 line-through opacity-60' : 'text-red-800'}`}>
                    {justMarkedDone ? t('document.doneLabel') : t('document.actionRequired')}
                  </p>
                  <p className={`text-sm mt-1 transition-all duration-500 ${justMarkedDone ? 'text-green-600 line-through opacity-60' : 'text-red-600'}`}>
                    {doc.handlung_beschreibung}
                  </p>
                </div>
              </div>
              <button
                onClick={handleMarkDone}
                disabled={markingDone}
                className={`w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium rounded-lg cursor-pointer border-none transition-all duration-300 ${
                  justMarkedDone
                    ? 'bg-green-500 text-white scale-[1.02]'
                    : 'bg-green-100 text-green-700 hover:bg-green-500 hover:text-white hover:scale-[1.02]'
                } disabled:cursor-not-allowed`}
                style={{ minHeight: '44px' }}
              >
                {markingDone && !justMarkedDone ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {justMarkedDone ? t('document.doneLabel') : t('document.markDone')}
              </button>
            </div>
          )}

          {doc.handlung_erforderlich && doc.handlung_erledigt ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-green-700 line-through opacity-70">{doc.handlung_beschreibung || t('document.actionDone')}</p>
                <p className="text-xs text-green-600 mt-0.5 font-medium">
                  {doc.erledigt_am ? t('document.doneAt', { date: new Date(doc.erledigt_am).toLocaleDateString() }) : t('document.doneLabel')}
                </p>
              </div>
            </div>
          ) : null}

          {/* Extrahierte Daten */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('document.documentData')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              <Field label={t('document.category')} value={
                doc.kategorie ? (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KATEGORIE_COLORS[doc.kategorie] || ''}`}>
                    {t(`categories.${doc.kategorie}`, doc.kategorie)}
                  </span>
                ) : null
              } />
              <Field label={t('document.date')} value={doc.datum ? new Date(doc.datum).toLocaleDateString() : null} />
              <Field label={t('document.sender')} value={doc.absender} />
              <Field label={t('document.recipient')} value={doc.empfaenger} />
              <Field label={t('document.amount')} value={doc.betrag != null ? Number(doc.betrag).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : null} />
              <Field label={t('document.due')} value={doc.faelligkeitsdatum ? new Date(doc.faelligkeitsdatum).toLocaleDateString() : null} />
              <Field label={t('document.filename')} value={doc.dateiname} />
              <Field label={t('document.uploaded')} value={doc.hochgeladen_am ? new Date(doc.hochgeladen_am).toLocaleString() : null} />
            </div>

            {doc.zusammenfassung && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-1">{t('document.summary')}</p>
                <p className="text-sm text-slate-700">{doc.zusammenfassung}</p>
              </div>
            )}

            {(doc.kontakt_name || doc.kontakt_adresse || doc.kontakt_email || doc.kontakt_telefon) && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-2">{t('document.contactData')}</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <Field label={t('document.name')} value={doc.kontakt_name} small />
                  <Field label={t('document.email')} value={doc.kontakt_email} small />
                  <Field label={t('document.address')} value={doc.kontakt_adresse} small />
                  <Field label={t('document.phone')} value={doc.kontakt_telefon} small />
                </div>
              </div>
            )}

            {doc.volltext && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-1">{t('document.fulltext')}</p>
                <p className="text-sm text-slate-600 whitespace-pre-wrap max-h-60 overflow-y-auto">{doc.volltext}</p>
              </div>
            )}
          </div>

          {/* Notizen & Tags */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('document.notesAndTags')}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('document.notes')}</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                  value={notizen}
                  onChange={e => setNotizen(e.target.value)}
                  placeholder={t('document.notesPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('document.tags')}</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder={t('document.tagsPlaceholder')}
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer border-none disabled:opacity-50"
                style={{ minHeight: '44px' }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('document.save')}
              </button>
            </div>
          </div>

          {/* Antwort generieren — für alle Kategorien verfügbar */}
          {doc.status === 'analysiert' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {{ brief: t('document.replyLetter'), rechnung: t('document.replyInvoice'), behoerde: t('document.replyAuthority') }[doc.kategorie] || t('document.replySection')}
                </h2>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                    <select
                      value={replyLanguage}
                      onChange={e => setReplyLanguage(e.target.value)}
                      className="px-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      style={{ minHeight: '44px' }}
                    >
                      {REPLY_LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleGenerateReply}
                    disabled={generatingReply}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer border-none disabled:opacity-50"
                    style={{ minHeight: '44px' }}
                  >
                    {generatingReply ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> {t('document.generating')}</>
                    ) : (
                      <><MessageSquare className="w-4 h-4" />
                        {{ brief: t('document.generateReply'), rechnung: t('document.generateReplyInvoice'), behoerde: t('document.generateReplyAuthority') }[doc.kategorie] || t('document.generateReply')}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {replies.length > 0 && (
                <div className="space-y-3">
                  {replies.map((reply, idx) => (
                    <div key={reply.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-slate-500">
                          {new Date(reply.erstellt_am).toLocaleString()}
                        </p>
                        <button
                          onClick={() => handleCopy(reply.inhalt, idx)}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer bg-transparent border-none"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {copied === idx ? t('document.copied') : t('document.copy')}
                        </button>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{reply.inhalt}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, small }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <p className={`font-medium text-slate-500 ${small ? 'text-xs' : 'text-xs'}`}>{label}</p>
      <div className={`text-slate-800 ${small ? 'text-xs' : 'text-sm'}`}>{value}</div>
    </div>
  );
}
