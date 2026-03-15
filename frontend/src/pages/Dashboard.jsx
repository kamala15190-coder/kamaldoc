import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, FileText, Receipt, Mail, AlertCircle,
  ChevronRight, Loader2, Filter, CheckCircle, ClipboardList,
  Pencil, GripVertical, Eye, EyeOff, X as XIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getDocuments, updateDocument } from '../api';
import AuthImage from '../components/AuthImage';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


const KATEGORIE_COLORS = {
  brief: 'bg-blue-100 text-blue-700',
  rechnung: 'bg-amber-100 text-amber-700',
  lohnzettel: 'bg-green-100 text-green-700',
  kontoauszug: 'bg-purple-100 text-purple-700',
  vertrag: 'bg-rose-100 text-rose-700',
  behoerde: 'bg-teal-100 text-teal-700',
  sonstiges: 'bg-slate-100 text-slate-700',
};

const STATUS_LABELS = {
  analyse_laeuft: 'Analyse läuft…',
  analysiert: 'Analysiert',
  fehler: 'Fehler',
};

const STORAGE_KEY = 'kamaldoc_dashboard_layout';

const DEFAULT_SECTIONS = [
  { id: 'todos', visible: true },
  { id: 'stats', visible: true },
  { id: 'search', visible: true },
  { id: 'documents', visible: true },
];

const SECTION_LABELS = {
  todos: 'Offene Aufgaben',
  stats: 'Statistik-Karten',
  search: 'Suche & Filter',
  documents: 'Dokumente',
};

function loadLayout() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure all default sections exist
      const ids = parsed.map(s => s.id);
      for (const def of DEFAULT_SECTIONS) {
        if (!ids.includes(def.id)) parsed.push({ ...def });
      }
      return parsed.filter(s => DEFAULT_SECTIONS.some(d => d.id === s.id));
    }
  } catch {}
  return DEFAULT_SECTIONS.map(s => ({ ...s }));
}

function saveLayout(sections) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const PAGE_SIZE = 20;
  const [documents, setDocuments] = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [offeneTodos, setOffeneTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [kategorie, setKategorie] = useState('');
  const [dismissingIds, setDismissingIds] = useState(new Set());
  const [editMode, setEditMode] = useState(false);
  const [sections, setSections] = useState(loadLayout);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setSections(prev => {
        const oldIdx = prev.findIndex(s => s.id === active.id);
        const newIdx = prev.findIndex(s => s.id === over.id);
        const updated = arrayMove(prev, oldIdx, newIdx);
        saveLayout(updated);
        return updated;
      });
    }
  };

  const toggleVisibility = (id) => {
    setSections(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s);
      saveLayout(updated);
      return updated;
    });
  };

  const resetLayout = () => {
    const def = DEFAULT_SECTIONS.map(s => ({ ...s }));
    setSections(def);
    saveLayout(def);
  };

  const fetchDocs = async (append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = {};
      if (search) {
        params.search = search;
      } else {
        params.limit = PAGE_SIZE;
        params.offset = append ? documents.length : 0;
      }
      if (kategorie) params.kategorie = kategorie;
      const data = await getDocuments(params);
      const docs = data.documents || data;
      const total = data.total ?? docs.length;
      if (append) {
        setDocuments(prev => [...prev, ...docs]);
      } else {
        setDocuments(docs);
      }
      setTotalDocs(total);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchTodos = async () => {
    try {
      const data = await getDocuments({ handlung_offen: true });
      const docs = data.documents || data;
      setOffeneTodos(docs);
    } catch (err) {
      console.error('Fehler beim Laden der Todos:', err);
    }
  };

  const hasMore = !search && documents.length < totalDocs;

  useEffect(() => {
    fetchDocs();
    fetchTodos();
  }, [kategorie]);

  useEffect(() => {
    const timer = setTimeout(fetchDocs, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleTodoDone = async (docId) => {
    setDismissingIds(prev => new Set(prev).add(docId));
    try {
      await updateDocument(docId, { handlung_erledigt: true });
      setTimeout(() => {
        setOffeneTodos(prev => prev.filter(d => d.id !== docId));
        setDismissingIds(prev => { const s = new Set(prev); s.delete(docId); return s; });
        fetchDocs();
      }, 500);
    } catch (err) {
      console.error(err);
      setDismissingIds(prev => { const s = new Set(prev); s.delete(docId); return s; });
    }
  };

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  // Statistiken
  const total = totalDocs;
  const offen = offeneTodos.length;
  const rechnungen = documents.filter(d => d.kategorie === 'rechnung').length;
  const briefe = documents.filter(d => d.kategorie === 'brief').length;

  const sectionContent = {
    todos: offeneTodos.length > 0 && (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
        <div className="px-4 md:px-5 py-3 md:py-4 border-b border-slate-100 flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-semibold text-slate-900">{t('dashboard.openTasks')}</h2>
          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {offeneTodos.length}
          </span>
        </div>

        {/* Desktop: Tabelle */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-5 py-2.5 font-medium text-slate-500 text-xs">{t('dashboard.sender')}</th>
                <th className="px-5 py-2.5 font-medium text-slate-500 text-xs">{t('dashboard.task')}</th>
                <th className="px-5 py-2.5 font-medium text-slate-500 text-xs">{t('dashboard.amount')}</th>
                <th className="px-5 py-2.5 font-medium text-slate-500 text-xs">{t('dashboard.dueDate')}</th>
                <th className="px-5 py-2.5 font-medium text-slate-500 text-xs text-right">{t('dashboard.action')}</th>
              </tr>
            </thead>
            <tbody>
              {offeneTodos.map((todo, idx) => (
                <tr
                  key={todo.id}
                  className={`border-t border-slate-100 hover:bg-indigo-50/50 cursor-pointer transition-all duration-300 ${
                    dismissingIds.has(todo.id) ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'
                  }`}
                  style={{ animationDelay: `${idx * 50}ms`, animation: 'fadeInUp 0.3s ease-out both' }}
                  onClick={() => navigate(`/documents/${todo.id}`)}
                >
                  <td className="px-5 py-3 font-medium text-slate-800">{todo.absender || '—'}</td>
                  <td className="px-5 py-3 text-slate-600 max-w-xs truncate">{todo.handlung_beschreibung || '—'}</td>
                  <td className="px-5 py-3 text-slate-700 font-medium whitespace-nowrap">
                    {todo.betrag != null && todo.betrag > 0
                      ? Number(todo.betrag).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
                      : '—'}
                  </td>
                  <td className={`px-5 py-3 whitespace-nowrap font-medium ${
                    todo.faelligkeitsdatum && isOverdue(todo.faelligkeitsdatum) ? 'text-red-600' : 'text-slate-600'
                  }`}>
                    {todo.faelligkeitsdatum
                      ? new Date(todo.faelligkeitsdatum).toLocaleDateString('de-DE')
                      : '—'}
                    {todo.faelligkeitsdatum && isOverdue(todo.faelligkeitsdatum) && (
                      <span className="ml-1.5 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{t('dashboard.overdue')}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTodoDone(todo.id); }}
                      disabled={dismissingIds.has(todo.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-500 hover:text-white transition-all duration-200 cursor-pointer border-none disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> {t('dashboard.done')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {offeneTodos.map((todo, idx) => (
            <div
              key={todo.id}
              className={`p-4 transition-all duration-300 ${
                dismissingIds.has(todo.id) ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'
              }`}
              style={{ animationDelay: `${idx * 50}ms`, animation: 'fadeInUp 0.3s ease-out both' }}
              onClick={() => navigate(`/documents/${todo.id}`)}
            >
              <p className="text-base font-semibold text-slate-900 truncate">{todo.absender || '—'}</p>
              <p className="text-sm text-slate-600 mt-0.5 truncate">{todo.handlung_beschreibung || '—'}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {todo.betrag != null && todo.betrag > 0 && (
                  <span className="text-sm font-semibold text-slate-800">
                    {Number(todo.betrag).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                )}
                {todo.faelligkeitsdatum && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    isOverdue(todo.faelligkeitsdatum) ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {new Date(todo.faelligkeitsdatum).toLocaleDateString('de-DE')}
                    {isOverdue(todo.faelligkeitsdatum) && ` — ${t('dashboard.overdue')}`}
                  </span>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleTodoDone(todo.id); }}
                disabled={dismissingIds.has(todo.id)}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-500 hover:text-white transition-all duration-200 cursor-pointer border-none disabled:opacity-50"
                style={{ minHeight: '44px' }}
              >
                <CheckCircle className="w-4 h-4" /> {t('dashboard.done')}
              </button>
            </div>
          ))}
        </div>
      </div>
    ),

    stats: (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard icon={<FileText className="w-5 h-5" />} label={t('dashboard.total')} value={total} color="bg-indigo-50 text-indigo-600" onClick={() => navigate('/sektor/gesamt')} />
        <StatCard icon={<AlertCircle className="w-5 h-5" />} label={t('dashboard.open')} value={offen} color="bg-red-50 text-red-600" onClick={() => navigate('/sektor/offen')} />
        <StatCard icon={<Receipt className="w-5 h-5" />} label={t('dashboard.invoices')} value={rechnungen} color="bg-amber-50 text-amber-600" onClick={() => navigate('/sektor/rechnungen')} />
        <StatCard icon={<Mail className="w-5 h-5" />} label={t('dashboard.letters')} value={briefe} color="bg-blue-50 text-blue-600" onClick={() => navigate('/sektor/briefe')} />
      </div>
    ),

    search: (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('dashboard.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
              value={kategorie}
              onChange={e => setKategorie(e.target.value)}
            >
              <option value="">{t('dashboard.allCategories')}</option>
              {['brief','rechnung','lohnzettel','kontoauszug','vertrag','behoerde','sonstiges'].map(k => (
                <option key={k} value={k}>{t(`categories.${k}`)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    ),

    documents: (
      <>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">{t('dashboard.noDocuments')}</p>
            <Link to="/upload" className="inline-flex items-center gap-2 mt-4 text-indigo-600 hover:text-indigo-800 font-medium">
              {t('dashboard.uploadDocument')} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {documents.map(doc => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => fetchDocs(true)}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-indigo-200 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loadingMore ? t('common.loading') : t('dashboard.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </>
    ),
  };

  return (
    <div>
      {/* Edit Mode Toggle */}
      <div className="flex items-center justify-end mb-4 gap-2">
        {editMode && (
          <button
            onClick={resetLayout}
            className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer bg-transparent border-none underline"
          >
            Zurücksetzen
          </button>
        )}
        <button
          onClick={() => setEditMode(!editMode)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border-none ${
            editMode
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-white text-slate-600 border border-slate-200 shadow-sm hover:bg-slate-50'
          }`}
          style={{ border: editMode ? 'none' : '1px solid #e2e8f0' }}
        >
          {editMode ? <XIcon className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          {editMode ? 'Fertig' : 'Bearbeiten'}
        </button>
      </div>

      {editMode ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sections.map(section => (
                <SortableSectionItem
                  key={section.id}
                  section={section}
                  onToggle={toggleVisibility}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        sections
          .filter(s => s.visible)
          .map(s => <div key={s.id}>{sectionContent[s.id]}</div>)
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, onClick }) {
  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all"
      style={{ minHeight: '44px' }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 md:gap-3">
        <div className={`p-1.5 md:p-2 rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-xl md:text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs md:text-sm text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function SortableSectionItem({ section, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 bg-white rounded-xl border p-4 transition-shadow ${
        isDragging ? 'shadow-lg border-indigo-300' : 'shadow-sm border-slate-200'
      } ${!section.visible ? 'opacity-60' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 bg-transparent border-none text-slate-400"
      >
        <GripVertical className="w-5 h-5" />
      </button>
      <span className="flex-1 text-sm font-medium text-slate-800">
        {SECTION_LABELS[section.id] || section.id}
      </span>
      <button
        onClick={() => onToggle(section.id)}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer border-none ${
          section.visible
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
        }`}
      >
        {section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
    </div>
  );
}

function DocumentCard({ doc }) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      to={`/documents/${doc.id}`}
      className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all no-underline"
    >
      {/* Thumbnail */}
      <div className="aspect-4/3 bg-slate-100 overflow-hidden">
        {!imgError ? (
          <AuthImage
            src={`/documents/${doc.id}/thumbnail`}
            alt={doc.dateiname}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="w-12 h-12 text-slate-300" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-medium text-slate-900 truncate flex-1">
            {doc.absender || doc.dateiname}
          </p>
          {doc.handlung_erforderlich && !doc.handlung_erledigt && (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          )}
        </div>

        {doc.datum && (
          <p className="text-xs text-slate-500 mb-2">
            {new Date(doc.datum).toLocaleDateString('de-DE')}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {doc.kategorie && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KATEGORIE_COLORS[doc.kategorie] || KATEGORIE_COLORS.sonstiges}`}>
              {t(`categories.${doc.kategorie}`, doc.kategorie)}
            </span>
          )}
          {doc.status === 'analyse_laeuft' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> {t('dashboard.analysisRunning')}
            </span>
          )}
          {doc.status === 'fehler' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
              {t('dashboard.error')}
            </span>
          )}
          {doc.betrag != null && doc.betrag > 0 && (
            <span className="text-xs font-semibold text-slate-700">
              {Number(doc.betrag).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          )}
        </div>

        {doc.zusammenfassung && (
          <p className="text-xs text-slate-500 mt-2 line-clamp-2">{doc.zusammenfassung}</p>
        )}
      </div>
    </Link>
  );
}
