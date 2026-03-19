import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, FileText, Receipt, Mail, AlertCircle,
  ChevronRight, Loader2, CheckCircle, ClipboardList,
  Minus, Settings, Archive, DollarSign, Undo2, Zap, Crown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getDocuments, updateDocument, getExpenseSummary } from '../api';
import AuthImage from '../components/AuthImage';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { DndContext, closestCenter, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const KATEGORIE_BADGE = {
  brief: 'badge-brief', rechnung: 'badge-rechnung', lohnzettel: 'badge-lohnzettel',
  kontoauszug: 'badge-kontoauszug', vertrag: 'badge-vertrag', behoerde: 'badge-behoerde', sonstiges: 'badge-sonstiges',
};

const KATEGORIE_ICON = {
  behoerde: { bg: 'rgba(99,89,255,0.12)', color: '#6359FF' },
  brief: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
  rechnung: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  lohnzettel: { bg: 'rgba(0,200,150,0.12)', color: '#00C896' },
  kontoauszug: { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
  vertrag: { bg: 'rgba(248,113,113,0.12)', color: '#f87171' },
  sonstiges: { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af' },
};

const SUBLINES_DE = [
  "Sch\u00f6n, dass du da bist \ud83d\udc4b",
  "Willkommen zur\u00fcck \u2728",
  "Alles im Blick. Los geht\u2019s \ud83d\ude80",
  "Deine Dokumente warten \ud83d\udcc4",
  "Heute wird produktiv \ud83d\udcaa",
  "Gut organisiert ist halb gewonnen \ud83d\udccb",
  "Dein digitales B\u00fcro wartet \ud83d\uddc2\ufe0f",
];

const SUBLINES_EN = [
  "Nice to see you \ud83d\udc4b",
  "Welcome back \u2728",
  "Everything at a glance \ud83d\ude80",
  "Your documents await \ud83d\udcc4",
  "Let\u2019s be productive \ud83d\udcaa",
  "Well organized is half the battle \ud83d\udccb",
  "Your digital office awaits \ud83d\uddc2\ufe0f",
];

const STORAGE_KEY_PREFIX = 'kamaldoc_dashboard_layout';
const ALL_SECTORS = [
  { id: 'todos', label: 'Offene Aufgaben', icon: '\ud83d\udccb' },
  { id: 'stats', label: 'Statistik-Karten', icon: '\ud83d\udcca' },
  { id: 'search', label: 'Suche & Filter', icon: '\ud83d\udd0d' },
  { id: 'documents', label: 'Dokumente', icon: '\ud83d\udcc4' },
  { id: 'ausgaben', label: 'Ausgaben-Dashboard', icon: '\ud83d\udcb0', requiresPlan: 'basic' },
  { id: 'archiv', label: 'Archiv', icon: '\ud83d\uddc3\ufe0f' },
];
const ALL_SECTION_IDS = ALL_SECTORS.map(s => s.id);
const DEFAULT_SECTIONS = [
  { id: 'stats', visible: true }, { id: 'todos', visible: true },
  { id: 'search', visible: true }, { id: 'documents', visible: true },
  { id: 'ausgaben', visible: false }, { id: 'archiv', visible: false },
];

function loadLayout(userId) {
  const key = userId ? `${STORAGE_KEY_PREFIX}_${userId}` : STORAGE_KEY_PREFIX;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      const ids = parsed.map(s => s.id);
      for (const def of DEFAULT_SECTIONS) { if (!ids.includes(def.id)) parsed.push({ ...def }); }
      return parsed.filter(s => ALL_SECTION_IDS.includes(s.id));
    }
  } catch {}
  return DEFAULT_SECTIONS.map(s => ({ ...s }));
}
function saveLayout(sections, userId) {
  const key = userId ? `${STORAGE_KEY_PREFIX}_${userId}` : STORAGE_KEY_PREFIX;
  localStorage.setItem(key, JSON.stringify(sections));
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const userId = user?.id || '';
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
  const [sections, setSections] = useState(() => loadLayout(userId));
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmHide, setConfirmHide] = useState(null);
  const [archivedDocs, setArchivedDocs] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const { isPaid, isFree } = useSubscription();

  const [touchDragging, setTouchDragging] = useState(null);
  const [touchOffsetY, setTouchOffsetY] = useState(0);
  const touchStartY = useRef(0);

  useEffect(() => { window.dispatchEvent(new CustomEvent('dashboard-edit-mode', { detail: editMode })); }, [editMode]);
  useEffect(() => {
    const handler = () => setEditMode(prev => !prev);
    window.addEventListener('toggle-dashboard-edit', handler);
    return () => window.removeEventListener('toggle-dashboard-edit', handler);
  }, []);

  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 8 } }));
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setSections(prev => {
        const oldIdx = prev.findIndex(s => s.id === active.id);
        const newIdx = prev.findIndex(s => s.id === over.id);
        const updated = arrayMove(prev, oldIdx, newIdx);
        saveLayout(updated, userId);
        return updated;
      });
    }
  };

  const handleTouchStart = useCallback((e, sectorId) => {
    if (!editMode) return;
    setTouchDragging(sectorId); touchStartY.current = e.touches[0].clientY; setTouchOffsetY(0);
  }, [editMode]);
  const handleTouchMove = useCallback((e) => {
    if (!touchDragging) return; e.preventDefault();
    setTouchOffsetY(e.touches[0].clientY - touchStartY.current);
  }, [touchDragging]);
  const handleTouchEnd = useCallback(() => {
    if (!touchDragging) return;
    const vis = sections.filter(s => s.visible);
    const dragIdx = vis.findIndex(s => s.id === touchDragging);
    if (dragIdx === -1) { setTouchDragging(null); setTouchOffsetY(0); return; }
    let targetIdx = dragIdx;
    if (touchOffsetY < -40 && dragIdx > 0) targetIdx = dragIdx - 1;
    else if (touchOffsetY > 40 && dragIdx < vis.length - 1) targetIdx = dragIdx + 1;
    if (targetIdx !== dragIdx) {
      setSections(prev => {
        const visIds = prev.filter(s => s.visible).map(s => s.id);
        const reordered = arrayMove(visIds, dragIdx, targetIdx);
        const hidden = prev.filter(s => !s.visible);
        const updated = [...reordered.map(id => ({ id, visible: true })), ...hidden];
        saveLayout(updated, userId);
        return updated;
      });
    }
    setTouchDragging(null); setTouchOffsetY(0);
  }, [touchDragging, touchOffsetY, sections]);

  const hideSection = (id) => { setSections(prev => { const u = prev.map(s => s.id === id ? { ...s, visible: false } : s); saveLayout(u, userId); return u; }); setConfirmHide(null); };
  const showSection = (id) => { setSections(prev => { const u = prev.map(s => s.id === id ? { ...s, visible: true } : s); saveLayout(u, userId); return u; }); setShowAddModal(false); };
  const resetLayout = () => { const d = DEFAULT_SECTIONS.map(s => ({ ...s })); setSections(d); saveLayout(d, userId); };
  const hiddenSections = sections.filter(s => !s.visible);
  const visibleSections = sections.filter(s => s.visible);

  const fetchDocs = async (append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    try {
      const params = {};
      if (search) { params.search = search; } else { params.limit = PAGE_SIZE; params.offset = append ? documents.length : 0; }
      if (kategorie) params.kategorie = kategorie;
      const data = await getDocuments(params);
      const docs = data.documents || data;
      const total = data.total ?? docs.length;
      if (append) setDocuments(prev => [...prev, ...docs]); else setDocuments(docs);
      setTotalDocs(total);
    } catch (err) { console.error('Fehler beim Laden:', err); }
    finally { setLoading(false); setLoadingMore(false); }
  };
  const fetchTodos = async () => { try { const data = await getDocuments({ handlung_offen: true }); setOffeneTodos(data.documents || data); } catch {} };
  const fetchArchived = async () => { try { const data = await getDocuments({ archiv: true }); setArchivedDocs((data.documents || data).slice(0, 5)); } catch {} };
  const fetchExpenses = async () => { if (isFree) return; try { const data = await getExpenseSummary({ year: new Date().getFullYear() }); setExpenseSummary(data); } catch {} };

  const hasMore = !search && documents.length < totalDocs;
  useEffect(() => { fetchDocs(); fetchTodos(); fetchArchived(); fetchExpenses(); }, [kategorie]);
  useEffect(() => { const timer = setTimeout(fetchDocs, 400); return () => clearTimeout(timer); }, [search]);

  const handleTodoDone = async (docId) => {
    setDismissingIds(prev => new Set(prev).add(docId));
    try {
      await updateDocument(docId, { handlung_erledigt: true });
      setTimeout(() => {
        setOffeneTodos(prev => prev.filter(d => d.id !== docId));
        setDismissingIds(prev => { const s = new Set(prev); s.delete(docId); return s; });
        fetchDocs();
      }, 500);
    } catch (err) { console.error(err); setDismissingIds(prev => { const s = new Set(prev); s.delete(docId); return s; }); }
  };
  const isOverdue = (dateStr) => dateStr ? new Date(dateStr) < new Date() : false;

  // Theme colors
  const tc = {
    bg: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
    border: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    text: isDark ? 'rgba(255,255,255,0.85)' : '#111827',
    textMuted: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.35)',
    textHint: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.20)',
    shadow: isDark ? 'none' : '0 1px 8px rgba(0,0,0,0.05)',
    heroBg: isDark ? 'rgba(99,89,255,0.12)' : 'rgba(99,89,255,0.06)',
    heroBorder: isDark ? 'rgba(99,89,255,0.20)' : 'rgba(99,89,255,0.12)',
    tileBg: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
    divider: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
  };
  const glassCard = {
    background: tc.bg, border: `0.5px solid ${tc.border}`, borderRadius: 18,
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: tc.shadow, overflow: 'hidden',
  };

  // Greeting
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? t('dashboard.goodMorning') : hour < 18 ? t('dashboard.goodAfternoon') : t('dashboard.goodEvening');
  const sublines = i18n.language === 'en' ? SUBLINES_EN : SUBLINES_DE;
  const subline = sublines[new Date().getDate() % sublines.length];
  const dateStr = new Date().toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  // Computed
  const total = totalDocs;
  const offen = offeneTodos.length;
  const rechnungen = documents.filter(d => d.kategorie === 'rechnung').length;
  const briefe = documents.filter(d => d.kategorie === 'brief').length;
  const erledigtCount = documents.filter(d => d.handlung_erledigt).length;
  const now = new Date(); const dow = now.getDay() || 7;
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - dow + 1); startOfWeek.setHours(0,0,0,0);
  const thisWeekCount = documents.filter(d => d.datum && new Date(d.datum) >= startOfWeek).length;

  const availableSectors = ALL_SECTORS.filter(s => !visibleSections.some(v => v.id === s.id)).map(s => ({ ...s, locked: s.requiresPlan && !isPaid }));

  const sectionContent = {
    stats: (
      <div style={{ animation: 'scaleIn 0.4s ease both', animationDelay: '0.05s' }}>
        <div style={{ ...glassCard, background: tc.heroBg, border: `0.5px solid ${tc.heroBorder}`, padding: 20, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: tc.textMuted, marginBottom: 4 }}>{t('dashboard.documentsTotal')}</div>
              <div style={{ fontSize: 44, fontWeight: 800, color: '#6359FF', lineHeight: 1, letterSpacing: '-1px' }}>{total}</div>
              {thisWeekCount > 0 && <div style={{ fontSize: 12, color: '#6359FF', marginTop: 6, fontWeight: 500 }}>+{thisWeekCount} {t('dashboard.thisWeek')}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: tc.textMuted }}>{t('dashboard.open')}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#FF5F6D' }}>{offen}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: tc.textMuted }}>{t('dashboard.done')}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#00C896' }}>{erledigtCount}</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <TileCard icon={<Receipt style={{ width: 16, height: 16, color: '#F59E0B' }} />} iconBg="rgba(245,158,11,0.12)" value={rechnungen} label={t('dashboard.invoices')} tc={tc} onClick={() => navigate('/sektor/rechnungen')} />
          <TileCard icon={<Mail style={{ width: 16, height: 16, color: '#00C896' }} />} iconBg="rgba(0,200,150,0.12)" value={briefe} label={t('dashboard.letters')} tc={tc} onClick={() => navigate('/sektor/briefe')} />
        </div>
      </div>
    ),

    todos: offeneTodos.length > 0 && (
      <div style={{ ...glassCard, marginBottom: 16, animation: 'fadeUp 0.4s ease both', animationDelay: '0.13s' }}>
        <div style={{ padding: '12px 16px', borderBottom: `0.5px solid ${tc.divider}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardList style={{ width: 14, height: 14, color: '#FF5F6D' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: tc.text }}>{t('dashboard.openTasks')}</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: 'rgba(255,95,109,0.12)', color: '#FF5F6D' }}>{offeneTodos.length}</span>
        </div>
        <div>
          {offeneTodos.map((todo, idx) => (
            <div key={todo.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px 10px 16px',
              borderBottom: idx < offeneTodos.length - 1 ? `0.5px solid ${tc.divider}` : 'none',
              transition: 'all 0.3s ease', cursor: 'pointer',
              opacity: dismissingIds.has(todo.id) ? 0 : 1,
              transform: dismissingIds.has(todo.id) ? 'translateX(40px)' : 'translateX(0)',
              animation: 'slideInLeft 0.3s ease both', animationDelay: `${idx * 0.06}s`,
            }} onClick={() => navigate(`/documents/${todo.id}`)}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: '#FF5F6D', animation: 'glowPulse 2s ease-in-out infinite' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: tc.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{todo.absender || '\u2014'}</span>
                  {todo.betrag != null && todo.betrag > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: tc.textMuted, flexShrink: 0 }}>{Number(todo.betrag).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                  <span style={{ fontSize: 11, color: tc.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{todo.handlung_beschreibung || '\u2014'}</span>
                  {todo.faelligkeitsdatum && <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 4, flexShrink: 0, background: isOverdue(todo.faelligkeitsdatum) ? 'rgba(255,95,109,0.12)' : 'transparent', color: isOverdue(todo.faelligkeitsdatum) ? '#FF5F6D' : tc.textMuted }}>{new Date(todo.faelligkeitsdatum).toLocaleDateString('de-DE')}</span>}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleTodoDone(todo.id); }} disabled={dismissingIds.has(todo.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', borderRadius: '50%' }}>
                <CheckCircle style={{ width: 18, height: 18, color: '#00C896' }} />
              </button>
            </div>
          ))}
        </div>
      </div>
    ),

    search: (
      <div style={{ marginBottom: 16, animation: 'fadeUp 0.4s ease both', animationDelay: '0.21s' }}>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: tc.textMuted }} />
          <input type="text" placeholder={t('dashboard.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} style={{
            width: '100%', padding: '11px 14px 11px 40px', fontSize: 13, borderRadius: 14,
            background: tc.bg, border: `0.5px solid ${tc.border}`, color: tc.text, outline: 'none',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: tc.shadow,
            transition: 'border-color 0.2s',
          }} onFocus={e => e.target.style.borderColor = '#6359FF'} onBlur={e => e.target.style.borderColor = tc.border} />
        </div>
        <div className="hide-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {[{ value: '', labelKey: 'dashboard.allCategories' },
            ...['brief','rechnung','lohnzettel','kontoauszug','vertrag','behoerde','sonstiges'].map(k => ({ value: k, labelKey: `categories.${k}` }))
          ].map(opt => (
            <button key={opt.value} onClick={() => setKategorie(opt.value)} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer',
              transition: 'all 0.15s ease', border: '0.5px solid',
              background: kategorie === opt.value ? 'rgba(99,89,255,0.12)' : 'transparent',
              color: kategorie === opt.value ? '#6359FF' : tc.textMuted,
              borderColor: kategorie === opt.value ? 'rgba(99,89,255,0.3)' : tc.border,
            }}>{t(opt.labelKey)}</button>
          ))}
        </div>
      </div>
    ),

    documents: (
      <div style={{ animation: 'fadeUp 0.4s ease both', animationDelay: '0.29s' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(99,89,255,0.15)', borderTopColor: '#6359FF', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <FileText style={{ width: 48, height: 48, color: tc.textHint, margin: '0 auto 16px' }} />
            <p style={{ color: tc.textMuted, fontSize: 16, margin: '0 0 16px' }}>{t('dashboard.noDocuments')}</p>
            <Link to="/upload" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6359FF', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              {t('dashboard.uploadDocument')} <ChevronRight style={{ width: 16, height: 16 }} />
            </Link>
          </div>
        ) : (
          <>
            <div style={{ ...glassCard, marginBottom: 16 }}>
              <div style={{ padding: '12px 16px', borderBottom: `0.5px solid ${tc.divider}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText style={{ width: 14, height: 14, color: '#6359FF' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: tc.text }}>{t('dashboard.recentlyAdded')}</span>
              </div>
              {documents.map((doc, idx) => (
                <DocumentRow key={doc.id} doc={doc} tc={tc} isLast={idx === documents.length - 1} delay={idx} />
              ))}
            </div>
            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <button onClick={() => fetchDocs(true)} disabled={loadingMore} style={{
                  padding: '10px 24px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
                  background: tc.bg, border: `0.5px solid ${tc.border}`, borderRadius: 12, color: tc.text, cursor: 'pointer',
                  backdropFilter: 'blur(20px)',
                }}>
                  {loadingMore && <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} />}
                  {loadingMore ? t('common.loading') : t('dashboard.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    ),

    archiv: (
      <div style={{ ...glassCard, marginBottom: 16, animation: 'fadeUp 0.4s ease both', animationDelay: '0.37s' }}>
        <div style={{ padding: '12px 16px', borderBottom: `0.5px solid ${tc.divider}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Archive style={{ width: 14, height: 14, color: '#00C896' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: tc.text }}>{t('dashboard.sectorArchiv')}</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: 'rgba(0,200,150,0.12)', color: '#00C896' }}>{archivedDocs.length}</span>
        </div>
        {archivedDocs.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center' }}><p style={{ fontSize: 13, color: tc.textMuted, margin: 0 }}>{t('archive.noItems')}</p></div>
        ) : (
          <div>
            {archivedDocs.map((doc, idx) => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px 10px 16px', borderBottom: idx < archivedDocs.length - 1 ? `0.5px solid ${tc.divider}` : 'none', cursor: 'pointer' }} onClick={() => navigate(`/documents/${doc.id}`)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: tc.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{doc.absender || '\u2014'}</span>
                  <span style={{ fontSize: 11, color: tc.textMuted, textDecoration: 'line-through', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{doc.handlung_beschreibung || '\u2014'}</span>
                </div>
                <CheckCircle style={{ width: 16, height: 16, color: '#00C896', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
        <div style={{ padding: '8px 16px', borderTop: `0.5px solid ${tc.divider}` }}>
          <Link to="/archiv" style={{ fontSize: 12, fontWeight: 600, color: '#6359FF', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            {t('archive.title')} <ChevronRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      </div>
    ),

    ausgaben: (
      <div style={{ ...glassCard, marginBottom: 16, animation: 'fadeUp 0.4s ease both', animationDelay: '0.45s' }}>
        <div style={{ padding: '12px 16px', borderBottom: `0.5px solid ${tc.divider}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <DollarSign style={{ width: 14, height: 14, color: '#F59E0B' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: tc.text }}>{t('dashboard.sectorAusgaben')}</span>
        </div>
        {isFree ? (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: tc.textMuted, margin: '0 0 8px' }}>{t('pricing.expensesLocked')}</p>
            <Link to="/pricing" style={{ fontSize: 12, fontWeight: 600, color: '#6359FF', textDecoration: 'none' }}>{t('upgradeModal.upgradeButton')}</Link>
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            {expenseSummary ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 11, color: tc.textMuted }}>{new Date().getFullYear()}</span>
                  <p style={{ fontSize: 20, fontWeight: 700, color: tc.text, margin: '2px 0 0' }}>{Number(expenseSummary.total || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                </div>
                <Link to="/ausgaben" style={{ fontSize: 12, fontWeight: 600, color: '#6359FF', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>{t('expenses.title')} <ChevronRight style={{ width: 14, height: 14 }} /></Link>
              </div>
            ) : (
              <Link to="/ausgaben" style={{ fontSize: 13, fontWeight: 600, color: '#6359FF', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>{t('expenses.title')} <ChevronRight style={{ width: 14, height: 14 }} /></Link>
            )}
          </div>
        )}
      </div>
    ),
  };

  return (
    <div>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.93); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes glowPulse { 0%, 100% { box-shadow: 0 0 4px rgba(255,95,109,0.4); } 50% { box-shadow: 0 0 8px rgba(255,95,109,0.8); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .tile-hover:hover { transform: scale(1.02); }
      `}</style>


      {/* Greeting */}
      <div style={{ marginBottom: 20, animation: 'fadeUp 0.4s ease both', animationDelay: '0.03s' }}>
        <div style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(44,44,46,0.55)', marginBottom: 2 }}>{dateStr}</div>
        <div style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(44,44,46,0.55)' }}>{timeGreeting}</div>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.4px', color: isDark ? '#f5f5f7' : '#2c2c2e', lineHeight: 1.3, marginTop: 2 }}>{subline}</div>
      </div>

      {/* Edit mode toolbar */}
      {editMode && (
        <div style={{
          position: 'sticky', top: 56, zIndex: 40,
          background: isDark ? 'rgba(10,15,26,0.85)' : 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `0.5px solid ${tc.border}`, padding: '8px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginLeft: -16, marginRight: -16, marginBottom: 12,
        }}>
          <button onClick={() => setShowAddModal(true)} className="btn-ghost" style={{ fontSize: 13, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
            {t('dashboard.addSector')}
          </button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={resetLayout} style={{ fontSize: 13, color: tc.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>{t('dashboard.resetLayout')}</button>
            <button onClick={() => { setEditMode(false); setShowAddModal(false); setConfirmHide(null); }} className="btn-accent" style={{ fontSize: 13, padding: '6px 16px' }}>{t('dashboard.editDone')}</button>
          </div>
        </div>
      )}

      {/* Add Sector Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowAddModal(false)}>
          <div style={{ background: isDark ? '#1a1f2e' : '#ffffff', borderRadius: 18, border: `0.5px solid ${tc.border}`, padding: 20, width: '100%', maxWidth: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 600, fontSize: 16, color: tc.text }}>{t('dashboard.addSectorTitle')}</span>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, color: tc.textMuted, cursor: 'pointer', padding: 4 }}>{'\u2715'}</button>
            </div>
            {availableSectors.length === 0 ? (
              <p style={{ fontSize: 14, color: tc.textMuted, textAlign: 'center', padding: '16px 0' }}>{t('dashboard.allSectorsVisible')}</p>
            ) : availableSectors.map(sector => (
              <div key={sector.id} onClick={() => { if (sector.locked) { navigate('/pricing'); setShowAddModal(false); return; } showSection(sector.id); }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, marginBottom: 8, borderRadius: 10,
                background: sector.locked ? tc.tileBg : 'rgba(99,89,255,0.08)', opacity: sector.locked ? 0.5 : 1,
                cursor: sector.locked ? 'not-allowed' : 'pointer', border: `0.5px solid ${sector.locked ? tc.border : 'rgba(99,89,255,0.2)'}`,
              }}>
                <span style={{ fontSize: 14, color: sector.locked ? tc.textMuted : tc.text }}>{sector.icon} {t('dashboard.sector' + sector.id.charAt(0).toUpperCase() + sector.id.slice(1))}</span>
                {sector.locked && <span style={{ fontSize: 12, color: '#F59E0B' }}>{t('dashboard.sectorUpgrade')}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm hide */}
      {confirmHide && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={() => setConfirmHide(null)}>
          <div style={{ background: isDark ? '#1a1f2e' : '#ffffff', borderRadius: 16, border: `0.5px solid ${tc.border}`, padding: 20, maxWidth: 300, width: '100%', margin: '0 16px' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 14, fontWeight: 600, color: tc.text, margin: '0 0 4px' }}>{t('dashboard.hideSectorTitle')}</p>
            <p style={{ fontSize: 13, color: tc.textMuted, margin: '0 0 16px' }}>{t('dashboard.hideSectorDesc', { name: t('dashboard.sector' + confirmHide.charAt(0).toUpperCase() + confirmHide.slice(1)) })}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmHide(null)} className="btn-ghost" style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500 }}>{t('dashboard.cancelButton')}</button>
              <button onClick={() => hideSection(confirmHide)} style={{ padding: '6px 14px', fontSize: 13, fontWeight: 600, background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer' }}>{t('dashboard.hideButton')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Sortable sections */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {visibleSections.map(s => {
            const meta = ALL_SECTORS.find(a => a.id === s.id) || {};
            return (
              <SortableSection key={s.id} id={s.id} editMode={editMode} onRemove={() => setConfirmHide(s.id)}
                sectorIcon={meta.icon} sectorLabel={t('dashboard.sector' + s.id.charAt(0).toUpperCase() + s.id.slice(1))}
                isTouchDragging={touchDragging === s.id} touchOffsetY={touchDragging === s.id ? touchOffsetY : 0}
                onTouchStart={(e) => handleTouchStart(e, s.id)} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} tc={tc} isDark={isDark}>
                {sectionContent[s.id]}
              </SortableSection>
            );
          })}
        </SortableContext>
      </DndContext>

      {!editMode && (
        <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
          <button onClick={() => setEditMode(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: tc.textMuted,
            fontWeight: 500, opacity: 0.5, transition: 'opacity 0.2s ease', display: 'inline-flex', alignItems: 'center', gap: 5,
          }} onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}>
            <Settings style={{ width: 12, height: 12 }} />
            {t('dashboard.customizeLayout', 'Customize layout')}
          </button>
        </div>
      )}
    </div>
  );
}

function TileCard({ icon, iconBg, value, label, tc, onClick }) {
  return (
    <div className="tile-hover" onClick={onClick} style={{
      background: tc.tileBg, border: `0.5px solid ${tc.border}`, borderRadius: 18,
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: tc.shadow,
      padding: 16, cursor: 'pointer', transition: 'transform 0.15s ease',
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: tc.text }}>{value}</div>
      <div style={{ fontSize: 12, color: tc.textMuted }}>{label}</div>
    </div>
  );
}

function SortableSection({ id, editMode, onRemove, children, sectorIcon, sectorLabel, isTouchDragging, touchOffsetY, onTouchStart, onTouchMove, onTouchEnd, tc, isDark }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id });
  const isBeingDragged = isDragging || isTouchDragging;
  const style = editMode ? {
    transform: isTouchDragging ? `translateY(${touchOffsetY}px)` : CSS.Transform.toString(transform),
    transition: isTouchDragging ? 'none' : (transition || 'transform 0.3s ease'),
    zIndex: isBeingDragged ? 50 : 'auto', filter: isBeingDragged ? 'blur(2px)' : 'none',
    opacity: isBeingDragged ? 0.7 : 1, touchAction: 'none',
  } : {};

  return (
    <>
      {editMode && isOver && !isBeingDragged && (
        <div style={{ height: 3, background: 'linear-gradient(90deg, #6359FF, #9B8FFF)', borderRadius: 2, margin: '4px 8px', boxShadow: '0 0 12px rgba(99,89,255,0.5)' }} />
      )}
      <div ref={setNodeRef} style={style} {...(editMode ? { ...attributes, ...listeners } : {})}
        onTouchStart={editMode ? onTouchStart : undefined} onTouchMove={editMode ? onTouchMove : undefined} onTouchEnd={editMode ? onTouchEnd : undefined}>
        {editMode ? (
          <div style={{ border: '2px solid #6359FF', borderRadius: 14, overflow: 'hidden', background: tc.bg, cursor: 'grab', marginBottom: 10 }}>
            <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(99,89,255,0.08)' }}>
              <span style={{ fontSize: 16 }}>{sectorIcon}</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: tc.text }}>{sectorLabel}</span>
              <span style={{ marginLeft: 'auto', color: tc.textMuted, fontSize: 11 }}>{t('dashboard.dragToMove')}</span>
              <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(); }} onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{
                width: 22, height: 22, borderRadius: '50%', backgroundColor: '#ef4444', color: 'white', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, lineHeight: 1, flexShrink: 0,
              }}><Minus className="w-3 h-3" /></button>
            </div>
          </div>
        ) : children}
      </div>
    </>
  );
}

function DocumentRow({ doc, tc, isLast, delay }) {
  const { t } = useTranslation();
  const catIcon = KATEGORIE_ICON[doc.kategorie] || KATEGORIE_ICON.sonstiges;
  return (
    <Link to={`/documents/${doc.id}`} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', textDecoration: 'none',
      borderBottom: isLast ? 'none' : `0.5px solid ${tc.divider}`,
      animation: 'slideInLeft 0.3s ease both', animationDelay: `${Math.min(delay, 10) * 0.04}s`,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: catIcon.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <FileText style={{ width: 16, height: 16, color: catIcon.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: tc.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{doc.absender || doc.dateiname}</span>
          {doc.handlung_erforderlich && !doc.handlung_erledigt && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF5F6D', flexShrink: 0, animation: 'glowPulse 2s ease-in-out infinite' }} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          {doc.kategorie && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: catIcon.bg, color: catIcon.color }}>{t(`categories.${doc.kategorie}`, doc.kategorie)}</span>}
          {doc.datum && <span style={{ fontSize: 11, color: tc.textMuted }}>{new Date(doc.datum).toLocaleDateString('de-DE')}</span>}
          {doc.betrag != null && doc.betrag > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: tc.text, marginLeft: 'auto' }}>{Number(doc.betrag).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>}
        </div>
      </div>
      <ChevronRight style={{ width: 14, height: 14, color: tc.textHint, flexShrink: 0 }} />
    </Link>
  );
}
