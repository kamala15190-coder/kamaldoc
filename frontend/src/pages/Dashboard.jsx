import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, FileText, Receipt, Mail, AlertCircle,
  ChevronRight, Loader2, Filter, CheckCircle, ClipboardList,
  Minus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getDocuments, updateDocument } from '../api';
import AuthImage from '../components/AuthImage';
import { useSubscription } from '../hooks/useSubscription';
import { DndContext, closestCenter, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
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

const ALL_SECTORS = [
  { id: 'todos', label: 'Offene Aufgaben', icon: '📋' },
  { id: 'stats', label: 'Statistik-Karten', icon: '📊' },
  { id: 'search', label: 'Suche & Filter', icon: '🔍' },
  { id: 'documents', label: 'Dokumente', icon: '📄' },
  { id: 'ausgaben', label: 'Ausgaben-Dashboard', icon: '💰', requiresPlan: 'basic' },
  { id: 'archiv', label: 'Archiv', icon: '🗃️' },
];

const ALL_SECTION_IDS = ALL_SECTORS.map(s => s.id);

const DEFAULT_SECTIONS = [
  { id: 'todos', visible: true },
  { id: 'stats', visible: true },
  { id: 'search', visible: true },
  { id: 'documents', visible: true },
  { id: 'ausgaben', visible: false },
  { id: 'archiv', visible: false },
];

const SECTION_LABELS = Object.fromEntries(ALL_SECTORS.map(s => [s.id, s.label]));

function loadLayout() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const ids = parsed.map(s => s.id);
      for (const def of DEFAULT_SECTIONS) {
        if (!ids.includes(def.id)) parsed.push({ ...def });
      }
      return parsed.filter(s => ALL_SECTION_IDS.includes(s.id));
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmHide, setConfirmHide] = useState(null);
  const { isPaid } = useSubscription();

  // Touch drag state
  const [touchDragging, setTouchDragging] = useState(null);
  const [touchOffsetY, setTouchOffsetY] = useState(0);
  const touchStartY = useRef(0);
  const sectionRefs = useRef({});

  // Broadcast editMode state & listen for toggle from header
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('dashboard-edit-mode', { detail: editMode }));
  }, [editMode]);

  useEffect(() => {
    const handler = () => setEditMode(prev => !prev);
    window.addEventListener('toggle-dashboard-edit', handler);
    return () => window.removeEventListener('toggle-dashboard-edit', handler);
  }, []);

  // Desktop drag (mouse only)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } })
  );

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

  // Manual touch drag handlers
  const handleTouchStart = useCallback((e, sectorId) => {
    if (!editMode) return;
    setTouchDragging(sectorId);
    touchStartY.current = e.touches[0].clientY;
    setTouchOffsetY(0);
  }, [editMode]);

  const handleTouchMove = useCallback((e) => {
    if (!touchDragging) return;
    e.preventDefault();
    const deltaY = e.touches[0].clientY - touchStartY.current;
    setTouchOffsetY(deltaY);
  }, [touchDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!touchDragging) return;
    const vis = sections.filter(s => s.visible);
    const dragIdx = vis.findIndex(s => s.id === touchDragging);
    if (dragIdx === -1) { setTouchDragging(null); setTouchOffsetY(0); return; }

    // Determine target index based on offset direction
    let targetIdx = dragIdx;
    const threshold = 40;
    if (touchOffsetY < -threshold && dragIdx > 0) {
      targetIdx = dragIdx - 1;
    } else if (touchOffsetY > threshold && dragIdx < vis.length - 1) {
      targetIdx = dragIdx + 1;
    }

    if (targetIdx !== dragIdx) {
      setSections(prev => {
        const visIds = prev.filter(s => s.visible).map(s => s.id);
        const reordered = arrayMove(visIds, dragIdx, targetIdx);
        const hidden = prev.filter(s => !s.visible);
        const updated = [...reordered.map(id => ({ id, visible: true })), ...hidden];
        saveLayout(updated);
        return updated;
      });
    }

    setTouchDragging(null);
    setTouchOffsetY(0);
  }, [touchDragging, touchOffsetY, sections]);

  const hideSection = (id) => {
    setSections(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, visible: false } : s);
      saveLayout(updated);
      return updated;
    });
    setConfirmHide(null);
  };

  const showSection = (id) => {
    setSections(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, visible: true } : s);
      saveLayout(updated);
      return updated;
    });
    setShowAddModal(false);
  };

  const resetLayout = () => {
    const def = DEFAULT_SECTIONS.map(s => ({ ...s }));
    setSections(def);
    saveLayout(def);
  };

  const hiddenSections = sections.filter(s => !s.visible);
  const visibleSections = sections.filter(s => s.visible);

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

  // Build list of available (hidden) sectors for the modal
  const availableSectors = ALL_SECTORS
    .filter(s => !visibleSections.some(v => v.id === s.id))
    .map(s => ({
      ...s,
      locked: s.requiresPlan && !isPaid,
    }));

  return (
    <div>
      {/* Toolbar — sticky, full width, subtle */}
      {editMode && (
        <div style={{
          position: 'sticky', top: 56, zIndex: 40,
          backgroundColor: 'white', borderBottom: '1px solid #e5e7eb',
          padding: '8px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginLeft: '-16px', marginRight: '-16px', marginBottom: '12px',
        }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '13px', color: '#374151',
              background: 'none', border: '1px solid #d1d5db',
              borderRadius: '8px', padding: '5px 10px', cursor: 'pointer',
            }}
          >
            + Sektor
          </button>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={resetLayout}
              style={{
                fontSize: '13px', color: '#6b7280',
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              Zurücksetzen
            </button>
            <button
              onClick={() => { setEditMode(false); setShowAddModal(false); setConfirmHide(null); }}
              style={{
                fontSize: '13px', color: 'white',
                background: '#2563eb', border: 'none',
                borderRadius: '8px', padding: '5px 14px', cursor: 'pointer',
              }}
            >
              ✓ Fertig
            </button>
          </div>
        </div>
      )}

      {/* Add Sector Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white', borderRadius: '16px',
              padding: '20px', width: '100%', maxWidth: '320px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: '600', fontSize: '16px', color: '#1f2937' }}>Sektor hinzufügen</span>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>
            {availableSectors.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', padding: '16px 0' }}>
                Alle Sektoren sind bereits sichtbar.
              </p>
            ) : (
              availableSectors.map(sector => (
                <div
                  key={sector.id}
                  onClick={() => {
                    if (sector.locked) {
                      navigate('/pricing');
                      setShowAddModal(false);
                      return;
                    }
                    showSection(sector.id);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px', marginBottom: '8px', borderRadius: '10px',
                    backgroundColor: sector.locked ? '#f9fafb' : '#f0f7ff',
                    opacity: sector.locked ? 0.5 : 1,
                    cursor: sector.locked ? 'not-allowed' : 'pointer',
                    border: '1px solid',
                    borderColor: sector.locked ? '#e5e7eb' : '#bfdbfe',
                    transition: 'background-color 0.15s',
                  }}
                >
                  <span style={{ fontSize: '14px', color: sector.locked ? '#9ca3af' : '#374151' }}>
                    {sector.icon} {sector.label}
                  </span>
                  {sector.locked && (
                    <span style={{ fontSize: '12px', color: '#f59e0b' }}>⚡ Upgrade</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Confirm-hide popup */}
      {confirmHide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setConfirmHide(null)}>
          <div className="bg-white rounded-xl shadow-xl p-5 max-w-xs w-full mx-4" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-medium text-slate-900 mb-1">Sektor ausblenden?</p>
            <p className="text-xs text-slate-500 mb-4">
              "{SECTION_LABELS[confirmHide]}" wird ausgeblendet. Du kannst ihn jederzeit wieder hinzufügen.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmHide(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer border-none"
              >
                Abbrechen
              </button>
              <button
                onClick={() => hideSection(confirmHide)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer border-none"
              >
                Ausblenden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sections — real dashboard always visible */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {visibleSections.map(s => {
            const meta = ALL_SECTORS.find(a => a.id === s.id) || {};
            return (
              <SortableSection
                key={s.id}
                id={s.id}
                editMode={editMode}
                onRemove={() => setConfirmHide(s.id)}
                sectorIcon={meta.icon}
                sectorLabel={meta.label}
                isTouchDragging={touchDragging === s.id}
                touchOffsetY={touchDragging === s.id ? touchOffsetY : 0}
                onTouchStart={(e) => handleTouchStart(e, s.id)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {sectionContent[s.id]}
              </SortableSection>
            );
          })}
        </SortableContext>
      </DndContext>
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

function SortableSection({ id, editMode, onRemove, children, sectorIcon, sectorLabel, isTouchDragging, touchOffsetY, onTouchStart, onTouchMove, onTouchEnd }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id });

  const isBeingDragged = isDragging || isTouchDragging;

  const style = editMode ? {
    transform: isTouchDragging
      ? `translateY(${touchOffsetY}px)`
      : CSS.Transform.toString(transform),
    transition: isTouchDragging ? 'none' : (transition || 'transform 0.3s ease'),
    zIndex: isBeingDragged ? 50 : 'auto',
    filter: isBeingDragged ? 'blur(2px)' : 'none',
    opacity: isBeingDragged ? 0.7 : 1,
    touchAction: 'none',
  } : {};

  return (
    <>
      {editMode && isOver && !isBeingDragged && (
        <div style={{
          height: '4px',
          backgroundColor: '#2563eb',
          borderRadius: '2px',
          margin: '4px 8px',
          boxShadow: '0 0 8px rgba(37,99,235,0.6)',
          transition: 'all 0.15s ease',
        }} />
      )}
      <div
        ref={setNodeRef}
        style={style}
        {...(editMode ? { ...attributes, ...listeners } : {})}
        onTouchStart={editMode ? onTouchStart : undefined}
        onTouchMove={editMode ? onTouchMove : undefined}
        onTouchEnd={editMode ? onTouchEnd : undefined}
        className="relative"
      >
        {editMode ? (
          <div style={{
            border: '2px solid #2563eb',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: 'white',
            cursor: 'grab',
            marginBottom: '10px',
          }}>
            <div style={{
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#eff6ff',
            }}>
              <span style={{ fontSize: '16px' }}>{sectorIcon}</span>
              <span style={{ fontWeight: '600', fontSize: '14px', color: '#1f2937' }}>{sectorLabel}</span>
              <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: '12px' }}>↕ verschieben</span>
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(); }}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  backgroundColor: '#ef4444', color: 'white', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: '14px', lineHeight: 1, flexShrink: 0,
                }}
              >
                <Minus className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </>
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
