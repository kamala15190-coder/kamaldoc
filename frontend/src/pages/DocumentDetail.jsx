import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Trash2, Save, CheckCircle, MessageSquare,
  Loader2, Copy, AlertCircle, ExternalLink, RefreshCw, Globe, Clock, Lock, Brain, MessageCircle, StickyNote, Zap, Share2, ListChecks, Plus as PlusIcon, X as XIcon, Languages
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getDocument, updateDocument, deleteDocument,
  generateReply, getReplies, downloadFile,
  getTodos, createTodo as apiCreateTodo, updateTodo as apiUpdateTodo, deleteTodo as apiDeleteTodo,
  translateDocumentVolltext, getDocumentTranslations
} from '../api';
import { Capacitor } from '@capacitor/core';
import AuthImage from '../components/AuthImage';
import CollapsibleSection from '../components/CollapsibleSection';
import { REPLY_LANGUAGES, LANGUAGES } from '../languages';
import { useSubscription } from '../hooks/useSubscription';
import { usePlanLimit } from '../hooks/usePlanLimit';

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
  const [replyHints, setReplyHints] = useState('');
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [shared, setShared] = useState(null);
  const [deadline, setDeadline] = useState('');
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [translateLang, setTranslateLang] = useState('de');
  const [translating, setTranslating] = useState(false);
  const [translations, setTranslations] = useState([]);
  const [copiedTranslation, setCopiedTranslation] = useState(null);
  const [savedToast, setSavedToast] = useState({ message: '', visible: false, fading: false });
  const showToast = (msg) => {
    setSavedToast({ message: msg, visible: true, fading: false });
    setTimeout(() => setSavedToast(prev => ({ ...prev, fading: true })), 3000);
    setTimeout(() => setSavedToast({ message: '', visible: false, fading: false }), 3300);
  };
  // Listen for reminder save toast
  useEffect(() => {
    const handler = (e) => {
      const days = e.detail?.days;
      if (days === null || days === 0) showToast('Erinnerung deaktiviert');
      else showToast(`Erinnerung ${days} Tag${days > 1 ? 'e' : ''} vorher gespeichert`);
    };
    window.addEventListener('reminder-saved', handler);
    return () => window.removeEventListener('reminder-saved', handler);
  }, []);

  const { handleApiError} = usePlanLimit();

  const fetchDoc = useCallback(async () => {
    try {
      const data = await getDocument(id);
      setDoc(data);
      setNotizen(data.notizen || '');
      setTags(data.tags || '');
      setDeadline(data.deadline || '');
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

  const fetchTodos = useCallback(async () => {
    try {
      const data = await getTodos(id);
      setTodos(data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const fetchTranslations = useCallback(async () => {
    try {
      const data = await getDocumentTranslations(id);
      setTranslations(data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  useEffect(() => {
    fetchDoc();
    fetchReplies();
    fetchTodos();
    fetchTranslations();
  }, [fetchDoc, fetchReplies, fetchTodos, fetchTranslations]);

  // Polling wenn Analyse laeuft
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
      showToast('Gespeichert!');
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
      await generateReply(id, replyLanguage, replyHints);
      await fetchReplies();
    } catch (err) {
      if (!handleApiError(err)) {
        console.error(err);
      }
    } finally {
      setGeneratingReply(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const addTodo = async () => {
    const text = newTodo.trim();
    if (!text) return;
    try {
      const todo = await apiCreateTodo(id, text);
      setTodos(prev => [...prev, todo]);
      setNewTodo('');
    } catch (err) { console.error(err); }
  };

  const toggleTodo = async (todoId, currentDone) => {
    try {
      await apiUpdateTodo(todoId, currentDone ? 0 : 1);
      setTodos(prev => prev.map(t => t.id === todoId ? { ...t, done: currentDone ? 0 : 1 } : t));
    } catch (err) { console.error(err); }
  };

  const removeTodo = async (todoId) => {
    try {
      await apiDeleteTodo(todoId);
      setTodos(prev => prev.filter(t => t.id !== todoId));
    } catch (err) { console.error(err); }
  };

  const handleTranslate = async () => {
    setTranslating(true);
    try {
      const result = await translateDocumentVolltext(id, translateLang);
      await fetchTranslations();
    } catch (err) {
      if (!handleApiError(err)) {
        console.error(err);
      }
    } finally {
      setTranslating(false);
    }
  };

  const handleCopyTranslation = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedTranslation(idx);
    setTimeout(() => setCopiedTranslation(null), 2000);
  };

  const handleShare = async (text, title = 'KamalDoc') => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Share } = await import('@capacitor/share');
        await Share.share({ title, text, dialogTitle: t('document.share') });
      } catch (_) {}
    } else if (navigator.share) {
      try { await navigator.share({ title, text }); } catch (_) {}
    } else {
      window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`);
    }
  };
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid rgba(139,92,246,0.15)',
          borderTopColor: 'var(--accent-solid)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!doc) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }} className="animate-fade-in">
        <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>{t('document.notFound')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }} className="animate-fade-in">
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500,
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0',
          }}
        >
          <ArrowLeft style={{ width: 18, height: 18 }} /> {t('document.back')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => downloadFile(doc.id, doc.dateiname)}
            className="btn-ghost"
            style={{ padding: '8px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ExternalLink style={{ width: 16, height: 16 }} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: '8px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--danger-soft)', color: 'var(--danger)',
              border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10,
              cursor: 'pointer', opacity: deleting ? 0.5 : 1,
            }}
          >
            <Trash2 style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>

      {/* Image Preview */}
      <div className="glass-card animate-fade-in-up" style={{ overflow: 'hidden', marginBottom: 14, padding: 0 }}>
        <AuthImage
          src={doc.dateityp === 'pdf' ? `/documents/${doc.id}/thumbnail` : `/documents/${doc.id}/file`}
          alt={doc.dateiname}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Status-Banner */}
          {doc.status === 'analyse_laeuft' && (
            <div className="glass-card animate-fade-in" style={{
              padding: 14, display: 'flex', alignItems: 'center', gap: 10,
              border: '1px solid rgba(245,158,11,0.2)',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                border: '2px solid rgba(251,191,36,0.3)',
                borderTopColor: '#fbbf24',
                animation: 'spin 0.8s linear infinite',
              }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning-text)', margin: 0 }}>{t('document.analysisRunning')}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>{t('document.analysisRunningDesc')}</p>
              </div>
            </div>
          )}

          {doc.status === 'fehler' && (
            <div className="glass-card animate-fade-in" style={{
              padding: 14, border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', margin: 0 }}>{t('document.analysisFailed')}</p>
              <p style={{ fontSize: 12, color: 'var(--danger-text)', margin: '4px 0 0' }}>{doc.analyse_fehler}</p>
              <button
                onClick={() => window.location.reload()}
                style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <RefreshCw style={{ width: 12, height: 12 }} /> {t('document.reload')}
              </button>
            </div>
          )}

          {/* Handlungsbedarf */}
          {doc.handlung_erforderlich && !doc.handlung_erledigt && (
            <div className="glass-card animate-fade-in-up" style={{
              padding: 14, transition: 'all 0.5s ease',
              border: justMarkedDone ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--action-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                {justMarkedDone ? (
                  <CheckCircle style={{ width: 18, height: 18, color: 'var(--success)', flexShrink: 0, marginTop: 1 }} />
                ) : (
                  <AlertCircle style={{ width: 18, height: 18, color: 'var(--action-icon)', flexShrink: 0, marginTop: 1 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 14, fontWeight: 600, margin: 0, transition: 'all 0.5s ease',
                    color: justMarkedDone ? '#34d399' : 'var(--action-text)',
                    textDecoration: justMarkedDone ? 'line-through' : 'none',
                    opacity: justMarkedDone ? 0.6 : 1,
                  }}>
                    {justMarkedDone ? t('document.doneLabel') : t('document.actionRequired')}
                  </p>
                  <p style={{
                    fontSize: 13, margin: '4px 0 0', transition: 'all 0.5s ease',
                    color: justMarkedDone ? '#6ee7b7' : 'var(--text-secondary)',
                    textDecoration: justMarkedDone ? 'line-through' : 'none',
                    opacity: justMarkedDone ? 0.6 : 1,
                  }}>
                    {doc.handlung_beschreibung}
                  </p>
                </div>
              </div>
              <button
                onClick={handleMarkDone}
                disabled={markingDone}
                style={{
                  width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  borderRadius: 10, cursor: 'pointer', border: 'none',
                  transition: 'all 0.3s ease',
                  background: justMarkedDone ? '#10b981' : 'var(--success-soft)',
                  color: justMarkedDone ? 'white' : '#10b981',
                  opacity: markingDone ? 0.5 : 1,
                }}
              >
                {markingDone && !justMarkedDone ? (
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(16,185,129,0.3)', borderTopColor: '#10b981', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <CheckCircle style={{ width: 16, height: 16 }} />
                )}
                {justMarkedDone ? t('document.doneLabel') : t('document.markDone')}
              </button>
            </div>
          )}

          {doc.handlung_erforderlich && doc.handlung_erledigt ? (
            <div className="glass-card animate-fade-in" style={{
              padding: 14, display: 'flex', alignItems: 'center', gap: 10,
              border: '1px solid rgba(16,185,129,0.2)',
            }}>
              <CheckCircle style={{ width: 18, height: 18, color: 'var(--success)' }} />
              <div>
                <p style={{ fontSize: 13, color: 'var(--success-text)', textDecoration: 'line-through', opacity: 0.7, margin: 0 }}>{doc.handlung_beschreibung || t('document.actionDone')}</p>
                <p style={{ fontSize: 12, color: 'var(--success-text)', margin: '2px 0 0', fontWeight: 600 }}>
                  {doc.erledigt_am ? t('document.doneAt', { date: new Date(doc.erledigt_am).toLocaleDateString() }) : t('document.doneLabel')}
                </p>
              </div>
            </div>
          ) : null}


          {/* Aufgaben / Todos */}
          <div className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
            <CollapsibleSection title={t('document.tasks')} icon={ListChecks} level={1} defaultOpen={true}
              badge={todos.filter(t => !t.done).length > 0 ? `${todos.filter(t => !t.done).length}` : undefined}>

              {/* KI-erkannte Aufgabe */}
              {doc.handlung_beschreibung && !doc.handlung_erledigt && (
                <div style={{
                  padding: '10px 14px', backgroundColor: 'var(--action-bg)',
                  border: '1px solid var(--action-border)', borderRadius: 8,
                  marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>[KI]</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--action-text)', fontWeight: 600 }}>
                      {t('document.aiDetectedTask')}
                    </div>
                    <div style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                      {doc.handlung_beschreibung}
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Todos */}
              {todos.map(todo => (
                <div key={todo.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 8,
                  backgroundColor: 'var(--bg-glass)', marginBottom: 8,
                  border: '1px solid var(--border-glass)',
                }}>
                  <input type="checkbox" checked={!!todo.done}
                    onChange={() => toggleTodo(todo.id, todo.done)}
                    style={{ width: 18, height: 18, accentColor: 'var(--accent-solid)', cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{
                    flex: 1, fontSize: 14,
                    textDecoration: todo.done ? 'line-through' : 'none',
                    color: todo.done ? 'var(--text-muted)' : 'var(--text-primary)',
                    opacity: todo.done ? 0.6 : 1,
                  }}>{todo.text}</span>
                  <button onClick={() => removeTodo(todo.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, fontSize: 16, lineHeight: 1 }}>
                    <XIcon style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              ))}

              {/* New todo input */}
              <div style={{ display: 'flex', gap: 8, marginTop: todos.length > 0 ? 4 : 0 }}>
                <input
                  value={newTodo}
                  onChange={e => setNewTodo(e.target.value)}
                  placeholder={t('document.addTask')}
                  className="input-dark"
                  style={{ flex: 1, fontSize: 14 }}
                  onKeyDown={e => e.key === 'Enter' && addTodo()}
                />
                <button onClick={addTodo}
                  style={{
                    padding: '5px 10px', borderRadius: 7,
                    backgroundColor: 'transparent',
                    border: '1px solid var(--accent-solid)',
                    color: 'var(--accent-solid)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>
                  + {t('document.addTaskBtn')}
                </button>
              </div>
            </CollapsibleSection>
          </div>
          {/* KI-Analyse Section (Collapsible) */}
          <div className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
            <CollapsibleSection title={t('document.documentData')} icon={Brain} level={1} defaultOpen={true}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                <Field label={t('document.category')} value={
                  doc.kategorie ? (
                    <span className={KATEGORIE_BADGE[doc.kategorie] || KATEGORIE_BADGE.sonstiges}
                      style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                      {t(`categories.${doc.kategorie}`, doc.kategorie)}
                    </span>
                  ) : null
                } />
                <Field label={t('document.date')} value={doc.datum ? new Date(doc.datum).toLocaleDateString() : null} />
                <Field label={t('document.sender')} value={doc.absender} />
                <Field label={t('document.recipient')} value={doc.empfaenger} />
                <Field label={t('document.amount')} value={doc.betrag != null ? Number(doc.betrag).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : null} />
                <Field label={t('document.due')} value={doc.faelligkeitsdatum ? new Date(doc.faelligkeitsdatum).toLocaleDateString() : null} />
                <Field label={t('document.filename')} value={doc.dateiname && doc.dateiname.length > 20 ? doc.dateiname.slice(0, 17) + '...' + doc.dateiname.slice(doc.dateiname.lastIndexOf('.')) : doc.dateiname} />
                <Field label={t('document.uploaded')} value={doc.hochgeladen_am ? new Date(doc.hochgeladen_am).toLocaleString() : null} />
              </div>

              {/* Deadline */}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Clock style={{ width: 14, height: 14, color: 'var(--warning-text)' }} />
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>{t('document.deadline')}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      type="date"
                      value={deadline}
                      onChange={e => setDeadline(e.target.value)}
                      className="input-dark"
                      style={{ flex: 1, minWidth: 140, fontSize: 13 }}
                    />
                    <button
                      onClick={async () => {
                        setSavingDeadline(true);
                        try {
                          const updated = await updateDocument(id, { deadline: deadline || '' });
                          setDoc(updated);
                          setDeadline(updated.deadline || '');
                          showToast(`Deadline gespeichert: ${new Date(updated.deadline).toLocaleDateString('de-DE')}`);
                        } catch (err) { console.error(err); }
                        finally { setSavingDeadline(false); }
                      }}
                      disabled={savingDeadline}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '8px 14px', fontSize: 12, fontWeight: 600,
                        background: 'var(--warning-soft)', color: 'var(--warning-text)',
                        border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8,
                        cursor: 'pointer', opacity: savingDeadline ? 0.5 : 1,
                      }}
                    >
                      {savingDeadline ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 0.8s linear infinite' }} /> : <Save style={{ width: 12, height: 12 }} />}
                      {t('document.saveDeadline')}
                    </button>
                    {deadline && (
                      <button
                        onClick={async () => {
                          setDeadline('');
                          setSavingDeadline(true);
                          try {
                            const updated = await updateDocument(id, { deadline: '' });
                            setDoc(updated);
                          } catch (err) { console.error(err); }
                          finally { setSavingDeadline(false); }
                        }}
                        title={t('document.removeDeadline')}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 28, height: 28, borderRadius: 6,
                          background: 'var(--danger-soft)', border: 'none', cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <Trash2 style={{ width: 13, height: 13, color: 'var(--danger)' }} />
                      </button>
                    )}
                  </div>
                </div>
                {deadline && new Date(deadline) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) && new Date(deadline) >= new Date(new Date().toDateString()) && (
                  <p style={{ fontSize: 12, color: 'var(--warning-text)', fontWeight: 600, margin: '6px 0 0' }}>
                    {t('document.deadlineSoon')}
                  </p>
                )}
                {deadline && new Date(deadline) < new Date(new Date().toDateString()) && (
                  <p style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, margin: '6px 0 0' }}>
                    {t('document.deadlineOverdue')}
                  </p>
                )}

                {deadline && <ReminderSettings docId={id} currentDays={doc.reminder_days} onUpdate={(updated) => setDoc(updated)} />}
              </div>

              {doc.zusammenfassung && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-glass)' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 4px' }}>{t('document.summary')}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{doc.zusammenfassung}</p>
                </div>
              )}

              {(doc.kontakt_name || doc.kontakt_adresse || doc.kontakt_email || doc.kontakt_telefon) && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-glass)' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 8px' }}>{t('document.contactData')}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                    <Field label={t('document.name')} value={doc.kontakt_name} small />
                    <Field label={t('document.email')} value={doc.kontakt_email} small />
                    <Field label={t('document.address')} value={doc.kontakt_adresse} small />
                    <Field label={t('document.phone')} value={doc.kontakt_telefon} small />
                  </div>
                </div>
              )}

              {doc.volltext && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-glass)' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 4px' }}>{t('document.fulltext')}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto', margin: 0 }}>{doc.volltext}</p>
                </div>
              )}
            </CollapsibleSection>
          </div>

          {/* Generierte Antworten (Collapsible) */}
          {doc.status === 'analysiert' && (
            <div className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
              <CollapsibleSection
                title={{ brief: t('document.replyLetter'), rechnung: t('document.replyInvoice'), behoerde: t('document.replyAuthority') }[doc.kategorie] || t('document.replySection')}
                icon={MessageCircle}
                level={1}
                defaultOpen={false}
                badge={replies.length > 0 ? `${replies.length}` : undefined}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: replies.length > 0 ? 14 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Globe style={{ width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0 }} />
                    <select
                      value={replyLanguage}
                      onChange={e => setReplyLanguage(e.target.value)}
                      className="input-dark"
                      style={{ flex: 1, fontSize: 13 }}
                    >
                      {REPLY_LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Context hints for AI */}
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block', fontWeight: 600 }}>
                      {t('document.replyHintsLabel')}
                    </label>
                    <textarea
                      value={replyHints}
                      onChange={e => setReplyHints(e.target.value)}
                      placeholder={t('document.replyHintsPlaceholder')}
                      className="input-dark"
                      style={{ width: '100%', minHeight: 70, resize: 'vertical', fontSize: 13, marginBottom: 10 }}
                    />
                  </div>
                  <button
                    onClick={handleGenerateReply}
                    disabled={generatingReply}
                    className="btn-accent"
                    style={{
                      width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: generatingReply ? 0.5 : 1,
                    }}
                  >
                    {generatingReply ? (
                      <><Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} /> {t('document.generating')}</>
                    ) : (
                      <><MessageSquare style={{ width: 16, height: 16 }} />
                        {{ brief: t('document.generateReply'), rechnung: t('document.generateReplyInvoice'), behoerde: t('document.generateReplyAuthority') }[doc.kategorie] || t('document.generateReply')}
                      </>
                    )}
                  </button>
                </div>

                {replies.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {replies.map((reply, idx) => (
                      <div key={reply.id} style={{
                        padding: 14, borderRadius: 12,
                        background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                            {new Date(reply.erstellt_am).toLocaleString()}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                              onClick={() => handleShare(reply.inhalt, t('document.replySection'))}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                fontSize: 12, color: 'var(--text-muted)', fontWeight: 600,
                                background: 'none', border: 'none', cursor: 'pointer',
                              }}
                              title={t('document.share')}
                            >
                              <Share2 style={{ width: 13, height: 13 }} />
                            </button>
                            <button
                              onClick={() => handleCopy(reply.inhalt, idx)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                fontSize: 12, color: 'var(--accent-solid)', fontWeight: 600,
                                background: 'none', border: 'none', cursor: 'pointer',
                              }}
                            >
                              <Copy style={{ width: 13, height: 13 }} />
                              {copied === idx ? t('document.copied') : t('document.copy')}
                            </button>
                          </div>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>{reply.inhalt}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>
            </div>
          )}

          {/* Dokument übersetzen (Collapsible) */}
          {doc.status === 'analysiert' && doc.volltext && (
            <div className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
              <CollapsibleSection
                title={t('document.translateSection')}
                icon={Languages}
                level={1}
                defaultOpen={false}
                badge={translations.length > 0 ? `${translations.length}` : undefined}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: translations.length > 0 ? 14 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Globe style={{ width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0 }} />
                    <select
                      value={translateLang}
                      onChange={e => setTranslateLang(e.target.value)}
                      className="input-dark"
                      style={{ flex: 1, fontSize: 13 }}
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.flag} {lang.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleTranslate}
                    disabled={translating}
                    className="btn-accent"
                    style={{
                      width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: translating ? 0.5 : 1,
                    }}
                  >
                    {translating ? (
                      <><Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} /> {t('document.translatingDoc')}</>
                    ) : (
                      <><Languages style={{ width: 16, height: 16 }} /> {t('document.translateBtn')}</>
                    )}
                  </button>
                </div>

                {translations.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {translations.map((tr, idx) => {
                      const lang = LANGUAGES.find(l => l.code === tr.target_language);
                      return (
                        <div key={tr.id} style={{
                          padding: 14, borderRadius: 12,
                          background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>
                              {lang ? `${lang.flag} ${lang.label}` : tr.target_language} — {new Date(tr.created_at).toLocaleString()}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button
                                onClick={() => handleShare(tr.translated_text, t('document.translateSection'))}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  fontSize: 12, color: 'var(--text-muted)', fontWeight: 600,
                                  background: 'none', border: 'none', cursor: 'pointer',
                                }}
                                title={t('document.share')}
                              >
                                <Share2 style={{ width: 13, height: 13 }} />
                              </button>
                              <button
                                onClick={() => handleCopyTranslation(tr.translated_text, idx)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  fontSize: 12, color: 'var(--accent-solid)', fontWeight: 600,
                                  background: 'none', border: 'none', cursor: 'pointer',
                                }}
                              >
                                <Copy style={{ width: 13, height: 13 }} />
                                {copiedTranslation === idx ? t('document.copied') : t('document.copy')}
                              </button>
                            </div>
                          </div>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0, maxHeight: 200, overflowY: 'auto' }}>{tr.translated_text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CollapsibleSection>
            </div>
          )}

          {/* Notizen & Tags (Collapsible) */}
          <div className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
            <CollapsibleSection title={t('document.notesAndTags')} icon={StickyNote} level={1} defaultOpen={false}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{t('document.notes')}</label>
                  <textarea
                    rows={3}
                    className="input-dark"
                    style={{ resize: 'vertical', minHeight: 70 }}
                    value={notizen}
                    onChange={e => setNotizen(e.target.value)}
                    placeholder={t('document.notesPlaceholder')}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{t('document.tags')}</label>
                  <input
                    type="text"
                    className="input-dark"
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder={t('document.tagsPlaceholder')}
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-accent"
                  style={{
                    width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  {saving ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} /> : <Save style={{ width: 16, height: 16 }} />}
                  {t('document.save')}
                </button>
                {savedToast.visible && (
                  <span style={{
                    fontSize: 13, color: 'var(--success-text)', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 4,
                    animation: savedToast.fading ? 'toastFadeOut 0.3s ease forwards' : 'toastFadeIn 0.3s ease forwards',
                  }}>
                    <CheckCircle style={{ width: 14, height: 14 }} /> {savedToast.message}
                  </span>
                )}
              </div>
            </CollapsibleSection>
          </div>
      </div>
      {/* Global confirmation toast */}
      {savedToast.visible && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, padding: '10px 20px', borderRadius: 12,
          background: 'rgba(16,185,129,0.95)', color: '#fff',
          fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
          animation: savedToast.fading ? 'toastFadeOut 0.3s ease forwards' : 'toastFadeIn 0.3s ease forwards',
        }}>
          <CheckCircle style={{ width: 14, height: 14 }} /> {savedToast.message}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Field({ label, value, small }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <p style={{ fontSize: small ? 11 : 11, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 2px' }}>{label}</p>
      <div style={{ fontSize: small ? 12 : 13, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function ReminderSettings({ docId, currentDays, onUpdate }) {
  const { t } = useTranslation();
  const { plan, isFree, isBasic, isPro } = useSubscription();
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(currentDays ?? 3);

  const options = [
    { value: 7, labelKey: 'document.reminder7', minPlan: 'pro' },
    { value: 3, labelKey: 'document.reminder3', minPlan: 'basic' },
    { value: 1, labelKey: 'document.reminder1', minPlan: 'pro' },
    { value: null, labelKey: 'document.reminderNone', minPlan: 'free' },
  ];

  const canSelect = (opt) => {
    if (isPro) return true;
    if (isBasic) return opt.minPlan === 'basic' || opt.minPlan === 'free';
    return opt.minPlan === 'free';
  };

  const handleChange = async (val) => {
    setSelected(val);
    setSaving(true);
    try {
      const updated = await updateDocument(docId, { reminder_days: val === null ? 0 : val });
      if (onUpdate) onUpdate(updated);
      // Dispatch toast event for parent
      window.dispatchEvent(new CustomEvent('reminder-saved', { detail: { days: val } }));
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-glass)' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 8px' }}>{t('document.reminderTitle')}</p>
      {isFree && (
        <p style={{ fontSize: 12, color: 'var(--warning-text)', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Lock style={{ width: 12, height: 12 }} /> {t('document.reminderFreeLocked')}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {options.map((opt) => {
          const enabled = canSelect(opt);
          const isSelected = selected === opt.value;
          return (
            <label
              key={String(opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 8, fontSize: 13,
                cursor: enabled ? 'pointer' : 'not-allowed',
                opacity: enabled ? 1 : 0.4,
                background: isSelected ? 'var(--accent-soft)' : 'transparent',
                color: isSelected ? 'var(--accent-solid)' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="radio"
                name="reminder_days"
                value={String(opt.value)}
                checked={isSelected}
                disabled={!enabled || saving}
                onChange={() => enabled && handleChange(opt.value)}
                style={{ accentColor: 'var(--accent-solid)' }}
              />
              <span>{t(opt.labelKey)}</span>
              {!enabled && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Lock style={{ width: 10, height: 10 }} />
                  {opt.minPlan === 'pro' ? 'Pro' : 'Basic'}
                </span>
              )}
            </label>
          );
        })}
      </div>
      {saving && <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(139,92,246,0.2)', borderTopColor: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite', marginTop: 8 }} />}
    </div>
  );
}
