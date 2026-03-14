import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive, CheckCircle, Undo2, Loader2, ClipboardList
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getDocuments, updateDocument } from '../api';


const KATEGORIE_COLORS = {
  brief: 'bg-blue-100 text-blue-700',
  rechnung: 'bg-amber-100 text-amber-700',
  lohnzettel: 'bg-green-100 text-green-700',
  kontoauszug: 'bg-purple-100 text-purple-700',
  vertrag: 'bg-rose-100 text-rose-700',
  behoerde: 'bg-teal-100 text-teal-700',
  sonstiges: 'bg-slate-100 text-slate-700',
};

export default function Archiv() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reopeningIds, setReopeningIds] = useState(new Set());

  const fetchArchiv = async () => {
    setLoading(true);
    try {
      const data = await getDocuments({ archiv: true });
      setDocs(data.documents || data);
    } catch (err) {
      console.error('Fehler beim Laden des Archivs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchiv();
  }, []);

  const handleReopen = async (docId) => {
    setReopeningIds(prev => new Set(prev).add(docId));
    try {
      await updateDocument(docId, { handlung_erledigt: false });
      setTimeout(() => {
        setDocs(prev => prev.filter(d => d.id !== docId));
        setReopeningIds(prev => { const s = new Set(prev); s.delete(docId); return s; });
      }, 500);
    } catch (err) {
      console.error(err);
      setReopeningIds(prev => { const s = new Set(prev); s.delete(docId); return s; });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="text-center py-20">
        <Archive className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 text-lg">{t('archive.noItems')}</p>
        <p className="text-slate-400 text-sm mt-1">{t('archive.noItemsDesc')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Archive className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-slate-900">{t('archive.title')}</h1>
        <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
          {t('archive.doneCount', { count: docs.length })}
        </span>
      </div>

      {/* Desktop: Tabelle */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-5 py-3 font-medium text-slate-500 text-xs">{t('archive.sender')}</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs">{t('archive.task')}</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs">{t('archive.amount')}</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs">{t('archive.category')}</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs">{t('archive.doneAt')}</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs text-right">{t('archive.action')}</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc, idx) => (
              <tr
                key={doc.id}
                className={`border-t border-slate-100 hover:bg-indigo-50/50 cursor-pointer transition-all duration-300 ${
                  reopeningIds.has(doc.id) ? 'opacity-0 -translate-x-8' : 'opacity-100 translate-x-0'
                }`}
                style={{ animationDelay: `${idx * 50}ms`, animation: 'fadeInUp 0.3s ease-out both' }}
                onClick={() => navigate(`/documents/${doc.id}`)}
              >
                <td className="px-5 py-3 font-medium text-slate-800">{doc.absender || '—'}</td>
                <td className="px-5 py-3 text-slate-600 max-w-xs truncate line-through opacity-70">{doc.handlung_beschreibung || '—'}</td>
                <td className="px-5 py-3 text-slate-700 font-medium whitespace-nowrap">
                  {doc.betrag != null && doc.betrag > 0
                    ? Number(doc.betrag).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
                    : '—'}
                </td>
                <td className="px-5 py-3">
                  {doc.kategorie && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KATEGORIE_COLORS[doc.kategorie] || KATEGORIE_COLORS.sonstiges}`}>
                      {t(`categories.${doc.kategorie}`, doc.kategorie)}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                  {doc.erledigt_am
                    ? new Date(doc.erledigt_am).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReopen(doc.id); }}
                    disabled={reopeningIds.has(doc.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-500 hover:text-white transition-all duration-200 cursor-pointer border-none disabled:opacity-50"
                  >
                    <Undo2 className="w-3.5 h-3.5" /> {t('archive.reopen')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {docs.map((doc, idx) => (
          <div
            key={doc.id}
            className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 transition-all duration-300 ${
              reopeningIds.has(doc.id) ? 'opacity-0 -translate-x-8' : 'opacity-100 translate-x-0'
            }`}
            style={{ animationDelay: `${idx * 50}ms`, animation: 'fadeInUp 0.3s ease-out both' }}
            onClick={() => navigate(`/documents/${doc.id}`)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-slate-900 truncate">{doc.absender || '—'}</p>
                <p className="text-sm text-slate-500 line-through opacity-70 truncate mt-0.5">{doc.handlung_beschreibung || '—'}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 ml-2" />
            </div>
            <div className="flex items-center gap-3 flex-wrap mt-2">
              {doc.kategorie && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KATEGORIE_COLORS[doc.kategorie] || KATEGORIE_COLORS.sonstiges}`}>
                  {t(`categories.${doc.kategorie}`, doc.kategorie)}
                </span>
              )}
              {doc.betrag != null && doc.betrag > 0 && (
                <span className="text-xs font-semibold text-slate-700">
                  {Number(doc.betrag).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </span>
              )}
              {doc.erledigt_am && (
                <span className="text-xs text-slate-400">
                  {new Date(doc.erledigt_am).toLocaleDateString('de-DE')}
                </span>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleReopen(doc.id); }}
              disabled={reopeningIds.has(doc.id)}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-500 hover:text-white transition-all duration-200 cursor-pointer border-none disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              <Undo2 className="w-4 h-4" /> {t('archive.reopen')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
