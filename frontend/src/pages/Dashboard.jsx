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


const KATEGORIE_BADGE = {
  brief: 'badge-brief',
  rechnung: 'badge-rechnung',
  lohnzettel: 'badge-lohnzettel',
  kontoauszug: 'badge-kontoauszug',
  vertrag: 'badge-vertrag',
  behoerde: 'badge-behoerde',
  sonstiges: 'badge-sonstiges',
};

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
      <div className="glass-card mb-5 overflow-hidden animate-fade-in-up">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: 6, borderRadius: 8, background: 'var(--danger-soft)' }}>
            <ClipboardList style={{ width: 16, height: 16, color: '#ef4444' }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{t('dashboard.openTasks')}</span>
          <span style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 700,
            padding: '2px 8px', borderRadius: 20,
            background: 'var(--danger-soft)', color: '#ef4444',
          }}>
            {offeneTodos.length}
          </span>
        </div>

        <div>
          {offeneTodos.map((todo, idx) => (
            <div
              key={todo.id}
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-glass)',
                transition: 'all 0.3s ease',
                opacity: dismissingIds.has(todo.id) ? 0 : 1,
                transform: dismissingIds.has(todo.id) ? 'translateX(40px)' : 'translateX(0)',
                animation: `fadeInUp 0.3s ease-out ${idx * 0.05}s both`,
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/documents/${todo.id}`)}
            >
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {todo.absender || '—'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {todo.handlung_beschreibung || '—'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {todo.betrag != null && todo.betrag > 0 && (
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {Number(todo.betrag).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                )}
                {todo.faelligkeitsdatum && (
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 6,
                    background: isOverdue(todo.faelligkeitsdatum) ? 'var(--danger-soft)' : 'var(--bg-glass)',
                    color: isOverdue(todo.faelligkeitsdatum) ? '#ef4444' : 'var(--text-secondary)',
                  }}>
                    {new Date(todo.faelligkeitsdatum).toLocaleDateString('de-DE')}
                    {isOverdue(todo.faelligkeitsdatum) && ` — ${t('dashboard.overdue')}`}
                  </span>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleTodoDone(todo.id); }}
                disabled={dismissingIds.has(todo.id)}
                className="btn-ghost"
                style={{
                  width: '100%', marginTop: 10, padding: '10px 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 13, fontWeight: 600,
                  background: 'var(--success-soft)', color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 10,
                }}
              >
                <CheckCircle style={{ width: 15, height: 15 }} /> {t('dashboard.done')}
              </button>
            </div>
          ))}
        </div>
      </div>
    ),

    stats: (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <StatCard icon={<FileText style={{ width: 18, height: 18 }} />} label={t('dashboard.total')} value={total} gradient="linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))" iconColor="#818cf8" onClick={() => navigate('/sektor/gesamt')} delay={0} />
        <StatCard icon={<AlertCircle style={{ width: 18, height: 18 }} />} label={t('dashboard.open')} value={offen} gradient="linear-gradient(135deg, rgba(239,68,68,0.12), rgba(244,63,94,0.08))" iconColor="#f87171" onClick={() => navigate('/sektor/offen')} delay={1} />
        <StatCard icon={<Receipt style={{ width: 18, height: 18 }} />} label={t('dashboard.invoices')} value={rechnungen} gradient="linear-gradient(135deg, rgba(245,158,11,0.12), rgba(251,191,36,0.08))" iconColor="#fbbf24" onClick={() => navigate('/sektor/rechnungen')} delay={2} />
        <StatCard icon={<Mail style={{ width: 18, height: 18 }} />} label={t('dashboard.letters')} value={briefe} gradient="linear-gradient(135deg, rgba(59,130,246,0.12), rgba(96,165,250,0.08))" iconColor="#60a5fa" onClick={() => navigate('/sektor/briefe')} delay={3} />
      </div>
    ),

    search: (
      <div className="glass-card animate-fade-in-up" style={{ padding: 14, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={t('dashboard.searchPlaceholder')}
              className="input-dark"
              style={{ paddingLeft: 38, padding: '10px 14px 10px 38px', fontSize: 14 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Filter style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
            <select
              className="input-dark"
              style={{ paddingLeft: 32, paddingRight: 12, fontSize: 13, appearance: 'none', minWidth: 110 }}
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
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '3px solid rgba(139,92,246,0.15)',
              borderTopColor: 'var(--accent-solid)',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }} className="animate-fade-in">
            <FileText style={{ width: 48, height: 48, color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.4 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, margin: 0 }}>{t('dashboard.noDocuments')}</p>
            <Link to="/upload" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16,
              color: 'var(--accent-solid)', fontWeight: 600, fontSize: 14, textDecoration: 'none',
            }}>
              {t('dashboard.uploadDocument')} <ChevronRight style={{ width: 16, height: 16 }} />
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {documents.map((doc, idx) => (
                <DocumentCard key={doc.id} doc={doc} delay={idx} />
              ))}
            </div>
            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
                <button
                  onClick={() => fetchDocs(true)}
                  disabled={loadingMore}
                  className="btn-ghost"
                  style={{ padding: '10px 24px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {loadingMore ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} /> : null}
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
      {/* Toolbar — sticky, full width */}
      {editMode && (
        <div style={{
          position: 'sticky', top: 56, zIndex: 40,
          background: 'rgba(10, 15, 26, 0.9)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-glass)',
          padding: '8px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginLeft: -16, marginRight: -16, marginBottom: 12,
        }}>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-ghost"
            style={{ fontSize: 13, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {t('dashboard.addSector')}
          </button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={resetLayout}
              style={{ fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {t('dashboard.resetLayout')}
            </button>
            <button
              onClick={() => { setEditMode(false); setShowAddModal(false); setConfirmHide(null); }}
              className="btn-accent"
              style={{ fontSize: 13, padding: '6px 16px' }}
            >
              {t('dashboard.editDone')}
            </button>
          </div>
        </div>
      )}

      {/* Add Sector Modal */}
      {showAddModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="modal-content"
            style={{
              background: 'var(--bg-secondary)', borderRadius: 18,
              border: '1px solid var(--border-glass-strong)',
              padding: 20, width: '100%', maxWidth: 320,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>{t('dashboard.addSectorTitle')}</span>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
              >
                ✕
              </button>
            </div>
            {availableSectors.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                {t('dashboard.allSectorsVisible')}
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
                    padding: 12, marginBottom: 8, borderRadius: 10,
                    background: sector.locked ? 'var(--bg-glass)' : 'var(--accent-soft)',
                    opacity: sector.locked ? 0.5 : 1,
                    cursor: sector.locked ? 'not-allowed' : 'pointer',
                    border: '1px solid',
                    borderColor: sector.locked ? 'var(--border-glass)' : 'var(--accent-soft-border)',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ fontSize: 14, color: sector.locked ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {sector.icon} {t('dashboard.sector' + sector.id.charAt(0).toUpperCase() + sector.id.slice(1))}
                  </span>
                  {sector.locked && (
                    <span style={{ fontSize: 12, color: '#fbbf24' }}>{t('dashboard.sectorUpgrade')}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Confirm-hide popup */}
      {confirmHide && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={() => setConfirmHide(null)}>
          <div className="modal-content" style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border-glass-strong)', padding: 20, maxWidth: 300, width: '100%', margin: '0 16px' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{t('dashboard.hideSectorTitle')}</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
              {t('dashboard.hideSectorDesc', { name: t('dashboard.sector' + confirmHide.charAt(0).toUpperCase() + confirmHide.slice(1)) })}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmHide(null)}
                className="btn-ghost"
                style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500 }}
              >
                {t('dashboard.cancelButton')}
              </button>
              <button
                onClick={() => hideSection(confirmHide)}
                style={{
                  padding: '6px 14px', fontSize: 13, fontWeight: 600,
                  background: '#ef4444', color: 'white', border: 'none',
                  borderRadius: 10, cursor: 'pointer',
                }}
              >
                {t('dashboard.hideButton')}
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
                sectorLabel={t('dashboard.sector' + s.id.charAt(0).toUpperCase() + s.id.slice(1))}
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

function StatCard({ icon, label, value, gradient, iconColor, onClick, delay = 0 }) {
  return (
    <div
      className="glass-card animate-fade-in-up"
      style={{
        padding: 14, cursor: 'pointer',
        animationDelay: `${delay * 0.08}s`,
      }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          padding: 8, borderRadius: 10,
          background: gradient,
          color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <div>
          <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{value}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0', fontWeight: 500 }}>{label}</p>
        </div>
      </div>
    </div>
  );
}

function SortableSection({ id, editMode, onRemove, children, sectorIcon, sectorLabel, isTouchDragging, touchOffsetY, onTouchStart, onTouchMove, onTouchEnd }) {
  const { t } = useTranslation();
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
          height: 3,
          background: 'var(--accent-gradient)',
          borderRadius: 2,
          margin: '4px 8px',
          boxShadow: '0 0 12px rgba(139,92,246,0.5)',
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
            border: '2px solid var(--accent-solid)',
            borderRadius: 14,
            overflow: 'hidden',
            background: 'var(--bg-glass)',
            cursor: 'grab',
            marginBottom: 10,
          }}>
            <div style={{
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--accent-soft)',
            }}>
              <span style={{ fontSize: 16 }}>{sectorIcon}</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{sectorLabel}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 11 }}>{t('dashboard.dragToMove')}</span>
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(); }}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                style={{
                  width: 22, height: 22, borderRadius: '50%',
                  backgroundColor: '#ef4444', color: 'white', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 14, lineHeight: 1, flexShrink: 0,
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

function DocumentCard({ doc, delay = 0 }) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      to={`/documents/${doc.id}`}
      className="glass-card animate-fade-in-up"
      style={{
        display: 'flex', gap: 12, padding: 12, textDecoration: 'none',
        animationDelay: `${Math.min(delay, 8) * 0.05}s`,
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width: 64, height: 64, borderRadius: 12, overflow: 'hidden',
        background: 'rgba(255,255,255,0.03)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!imgError ? (
          <AuthImage
            src={`/documents/${doc.id}/thumbnail`}
            alt={doc.dateiname}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <FileText style={{ width: 24, height: 24, color: 'var(--text-muted)', opacity: 0.5 }} />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <p style={{
            fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {doc.absender || doc.dateiname}
          </p>
          {doc.handlung_erforderlich && !doc.handlung_erledigt && (
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
          )}
        </div>

        {doc.datum && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 6px' }}>
            {new Date(doc.datum).toLocaleDateString('de-DE')}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {doc.kategorie && (
            <span className={KATEGORIE_BADGE[doc.kategorie] || KATEGORIE_BADGE.sonstiges}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
              {t(`categories.${doc.kategorie}`, doc.kategorie)}
            </span>
          )}
          {doc.status === 'analyse_laeuft' && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 500,
              background: 'var(--warning-soft)', color: '#fbbf24',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Loader2 style={{ width: 10, height: 10, animation: 'spin 0.8s linear infinite' }} /> {t('dashboard.analysisRunning')}
            </span>
          )}
          {doc.status === 'fehler' && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 500,
              background: 'var(--danger-soft)', color: '#ef4444',
            }}>
              {t('dashboard.error')}
            </span>
          )}
          {doc.betrag != null && doc.betrag > 0 && (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginLeft: 'auto' }}>
              {Number(doc.betrag).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          )}
        </div>

        {doc.zusammenfassung && (
          <p style={{
            fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>{doc.zusammenfassung}</p>
        )}
      </div>
    </Link>
  );
}
