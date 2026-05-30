import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle, Send, Plus, Paperclip, Scale, Trash2, Loader2,
  Sparkles, X, ChevronLeft, FileText, Search, Mail, ShieldAlert, ChevronRight,
  AlertTriangle, RotateCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  createDokaConversation, getDokaConversations, getDokaConversation,
  deleteDokaConversation, sendDokaMessage,
} from '../api';
import { tapHaptic } from '../utils/haptics';

// --- Minimal, safe markdown → React renderer ---------------------------------
// Doka answers in markdown (headings, lists, bold, inline code, links). We keep
// this tiny instead of pulling a full markdown dependency into the bundle.
function renderInline(text, keyPrefix) {
  const nodes = [];
  let rest = text;
  let i = 0;
  const pattern = /(\*\*(.+?)\*\*)|(`([^`]+?)`)|(\[([^\]]+)\]\((https?:\/\/[^)]+)\))/;
  let match;
  while ((match = pattern.exec(rest)) !== null) {
    if (match.index > 0) nodes.push(rest.slice(0, match.index));
    if (match[1]) nodes.push(<strong key={`${keyPrefix}-b${i}`}>{match[2]}</strong>);
    else if (match[3]) nodes.push(
      <code key={`${keyPrefix}-c${i}`} style={{ background: 'var(--chip-bg)', padding: '1px 5px', borderRadius: 5, fontSize: '0.92em' }}>{match[4]}</code>
    );
    else if (match[5]) nodes.push(
      <a key={`${keyPrefix}-a${i}`} href={match[8]} target="_blank" rel="noreferrer" style={{ color: 'var(--amber)' }}>{match[7]}</a>
    );
    rest = rest.slice(match.index + match[0].length);
    i += 1;
  }
  if (rest) nodes.push(rest);
  return nodes;
}

function MiniMarkdown({ text }) {
  const lines = (text || '').split('\n');
  const blocks = [];
  let list = null; // { ordered, items: [] }

  const flushList = () => {
    if (list) {
      const Tag = list.ordered ? 'ol' : 'ul';
      blocks.push(
        <Tag key={`l${blocks.length}`} style={{ margin: '6px 0', paddingInlineStart: 20 }}>
          {list.items.map((it, idx) => <li key={idx} style={{ margin: '2px 0' }}>{renderInline(it, `li${blocks.length}-${idx}`)}</li>)}
        </Tag>
      );
      list = null;
    }
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const numbered = line.match(/^\d+\.\s+(.*)$/);

    if (heading) {
      flushList();
      const level = heading[1].length;
      const size = level === 1 ? 18 : level === 2 ? 16 : 15;
      blocks.push(
        <div key={`h${idx}`} style={{ fontWeight: 700, fontSize: size, color: 'var(--text-primary)', margin: '10px 0 4px' }}>
          {renderInline(heading[2], `h${idx}`)}
        </div>
      );
    } else if (bullet) {
      if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; }
      list.items.push(bullet[1]);
    } else if (numbered) {
      if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [] }; }
      list.items.push(numbered[1]);
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      blocks.push(<p key={`p${idx}`} style={{ margin: '6px 0', lineHeight: 1.55 }}>{renderInline(line, `p${idx}`)}</p>);
    }
  });
  flushList();
  return <div>{blocks}</div>;
}

const TOOL_ICON = {
  kdoc_search_documents: Search,
  kdoc_get_document: FileText,
  kdoc_search_emails: Mail,
  legal_explain: Scale,
  legal_assessment: Scale,
  contestable_elements: Scale,
  draft_objection: Scale,
};

function ToolCard({ name, summary, pending, t }) {
  const Icon = TOOL_ICON[name] || Sparkles;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 11px', margin: '4px 0',
      borderRadius: 'var(--radius-md)', background: 'var(--amber-soft)',
      border: '1px solid var(--accent-soft-border)', fontSize: 12.5, color: 'var(--text-secondary)',
    }}>
      {pending
        ? <Loader2 style={{ width: 14, height: 14, color: 'var(--amber)', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
        : <Icon style={{ width: 14, height: 14, color: 'var(--amber)', flexShrink: 0 }} />}
      <span>{summary || t('doka.thinking', { defaultValue: 'Doka arbeitet …' })}</span>
    </div>
  );
}

export default function Doka() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [lawyerMode, setLawyerMode] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [streamTools, setStreamTools] = useState([]);
  const [showList, setShowList] = useState(false);
  const [error, setError] = useState(null);
  const [bloom, setBloom] = useState(false); // one-shot avatar bloom when an answer lands

  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);
  const lastSentRef = useRef(null); // { text, file } — for the error-retry action

  useEffect(() => {
    getDokaConversations().then(setConversations).catch(() => {});
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamContent, streamTools]);

  const openConversation = useCallback(async (id) => {
    setShowList(false);
    setError(null);
    try {
      const conv = await getDokaConversation(id);
      setActiveId(id);
      setMessages(conv.messages || []);
    } catch { /* ignore */ }
  }, []);

  const newConversation = () => {
    setActiveId(null);
    setMessages([]);
    setShowList(false);
    setError(null);
  };

  const handleSend = async (overrideText, overrideFile) => {
    const isRetry = overrideText !== undefined;
    const text = (isRetry ? overrideText : input).trim();
    const sendFile = isRetry ? overrideFile : file;
    if ((!text && !sendFile) || streaming) return;

    tapHaptic();
    setError(null);
    lastSentRef.current = { text, file: sendFile };
    let convId = activeId;
    try {
      if (!convId) {
        const conv = await createDokaConversation();
        convId = conv.id;
        setActiveId(conv.id);
        setConversations((prev) => [conv, ...prev]);
      }
    } catch {
      setError(t('doka.errorGeneric', { defaultValue: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.' }));
      return;
    }

    const sentFile = sendFile;
    const userMsg = {
      role: 'user', content: text,
      attachments: sentFile ? [{ filename: sentFile.name }] : null,
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!isRetry) { setInput(''); setFile(null); }
    setStreaming(true);
    setStreamContent('');
    setStreamTools([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await sendDokaMessage(convId, {
        message: text, lawyerMode, language: i18n.language, file: sentFile,
      }, {
        signal: controller.signal,
        onEvent: (ev) => {
          if (ev.type === 'delta') {
            setStreamContent((c) => c + (ev.content || ''));
          } else if (ev.type === 'tool_call') {
            setStreamTools((tools) => [...tools, { name: ev.name, pending: true }]);
          } else if (ev.type === 'tool_result') {
            setStreamTools((tools) => {
              const next = [...tools];
              const idx = next.findIndex((x) => x.pending && x.name === ev.name);
              if (idx !== -1) next[idx] = { name: ev.name, summary: ev.summary, pending: false };
              return next;
            });
          } else if (ev.type === 'done') {
            setMessages((prev) => [...prev, {
              role: 'assistant', content: ev.content || '', tool_calls: ev.tool_calls || [],
            }]);
            setStreamContent('');
            setStreamTools([]);
            setBloom(true);
            setTimeout(() => setBloom(false), 620);
          } else if (ev.type === 'error') {
            // Never surface raw backend error strings (e.g. Python tracebacks) to the user.
            setError(t('doka.errorGeneric', { defaultValue: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.' }));
          }
        },
      });
    } catch (e) {
      if (e?.status === 403) {
        setError(e?.detail?.message || t('doka.limitReached', { defaultValue: 'Doka-Limit erreicht. Bitte upgraden.' }));
      } else if (e?.name !== 'AbortError') {
        setError(t('doka.errorGeneric', { defaultValue: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.' }));
      }
      setStreamContent('');
      setStreamTools([]);
      // refresh conversation list (title may have been set)
    } finally {
      setStreaming(false);
      abortRef.current = null;
      getDokaConversations().then(setConversations).catch(() => {});
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteDokaConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === activeId) newConversation();
    } catch { /* ignore */ }
  };

  const suggestions = [
    t('doka.suggest1', { defaultValue: 'Welche Fristen habe ich offen?' }),
    t('doka.suggest2', { defaultValue: 'Fasse mein letztes Behördenschreiben zusammen.' }),
    t('doka.suggest3', { defaultValue: 'Welche Rechnungen sind noch offen?' }),
  ];

  const hasChat = messages.length > 0 || streaming;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 96 }}>
      {/* Header */}
      <div data-intro="doka" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div className={bloom ? 'doka-bloom' : undefined} style={{
          position: 'relative',
          width: 36, height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--amber-soft)', border: '1px solid var(--accent-soft-border)',
          boxShadow: 'var(--glow-warm)',
        }}>
          <MessageCircle style={{ width: 19, height: 19, color: 'var(--amber)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p className="kicker amber" style={{ margin: 0 }}>{t('doka.kicker', { defaultValue: 'KI-Begleiter' })}</p>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{t('doka.title', { defaultValue: 'Doka' })}</h1>
        </div>
        <button onClick={() => navigate('/phishing')} className="no-touch-min" aria-label={t('doka.checkPhishing', { defaultValue: 'Phishing-Nachricht prüfen' })}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 10, padding: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <ShieldAlert style={{ width: 18, height: 18 }} />
        </button>
        <button onClick={() => setShowList((s) => !s)} className="no-touch-min" aria-label={t('doka.conversations', { defaultValue: 'Unterhaltungen' })}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 10, padding: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <MessageCircle style={{ width: 18, height: 18 }} />
        </button>
        <button onClick={newConversation} className="no-touch-min" aria-label={t('doka.newChat', { defaultValue: 'Neue Unterhaltung' })}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 10, padding: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <Plus style={{ width: 18, height: 18 }} />
        </button>
      </div>

      {/* Lawyer mode toggle */}
      <button onClick={() => setLawyerMode((m) => !m)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginBottom: 12, cursor: 'pointer',
          padding: '9px 12px', borderRadius: 'var(--radius-md)', textAlign: 'start',
          background: lawyerMode ? 'var(--amber-soft)' : 'var(--bg-card)',
          border: `1px solid ${lawyerMode ? 'var(--accent-soft-border)' : 'var(--border-glass)'}`,
          color: lawyerMode ? 'var(--amber)' : 'var(--text-secondary)',
        }}>
        <Scale style={{ width: 16, height: 16, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{t('doka.lawyerMode', { defaultValue: 'Rechtsanwalt-Modus' })}</span>
        <span style={{
          width: 38, height: 22, borderRadius: 999, padding: 2, transition: 'background 0.2s',
          background: lawyerMode ? 'var(--amber)' : 'var(--progress-track)',
        }}>
          <span style={{
            display: 'block', width: 18, height: 18, borderRadius: 999, background: '#fff',
            transform: lawyerMode ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.2s',
          }} />
        </span>
      </button>
      {/* Dauerhafter KI-/Rechtshinweis (Apple 5.x) — immer sichtbar, nicht nur im Anwalt-Modus */}
      <p style={{ margin: '-6px 0 12px', fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {t('doka.permanentDisclaimer', { defaultValue: 'Von Doka erstellte Texte sind KI-generiert und ersetzen keine rechtliche, steuerliche oder medizinische Beratung. Bitte vor Verwendung prüfen.' })}
      </p>

      {/* Conversation list (toggle) */}
      {showList && (
        <div className="glass-card" style={{ padding: 8, marginBottom: 12, maxHeight: 260, overflowY: 'auto' }}>
          {conversations.length === 0 && (
            <p style={{ margin: 8, fontSize: 13, color: 'var(--text-muted)' }}>{t('doka.noConversations', { defaultValue: 'Noch keine Unterhaltungen.' })}</p>
          )}
          {conversations.map((c) => (
            <div key={c.id} onClick={() => openConversation(c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 10, cursor: 'pointer',
                background: c.id === activeId ? 'var(--amber-soft)' : 'transparent',
              }}>
              <MessageCircle style={{ width: 15, height: 15, color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.title || t('doka.untitled', { defaultValue: 'Neue Unterhaltung' })}
              </span>
              <button onClick={(e) => handleDelete(c.id, e)} className="no-touch-min" aria-label={t('common.delete', { defaultValue: 'Löschen' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                <Trash2 style={{ width: 14, height: 14 }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Chat area */}
      <div ref={scrollRef} style={{ minHeight: 200 }}>
        {!hasChat && (
          <div className="glass-card" style={{ padding: 22, textAlign: 'center' }}>
            <div className="animate-pulse-glow" style={{
              width: 50, height: 50, borderRadius: 16, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--amber-soft)', border: '1px solid var(--accent-soft-border)',
            }}>
              <Sparkles style={{ width: 24, height: 24, color: 'var(--amber)' }} />
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('doka.emptyChatTitle', { defaultValue: 'Frag Doka' })}
            </h2>
            <p className="lede" style={{ margin: '0 auto 16px', color: 'var(--text-secondary)' }}>
              {t('doka.emptyDesc', { defaultValue: 'Doka beantwortet Fragen zu deinen Dokumenten und E-Mails – mit Quellenangabe.' })}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => setInput(s)}
                  style={{
                    padding: '11px 14px', borderRadius: 'var(--radius-md)', textAlign: 'start', cursor: 'pointer',
                    background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontSize: 13.5,
                  }}>
                  {s}
                </button>
              ))}
              {/* Phishing entry point */}
              <button onClick={() => navigate('/phishing')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 'var(--radius-md)',
                  textAlign: 'start', cursor: 'pointer', marginTop: 2,
                  background: 'var(--amber-soft)', border: '1px solid var(--accent-soft-border)', color: 'var(--text-primary)',
                }}>
                <ShieldAlert style={{ width: 18, height: 18, color: 'var(--amber)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>
                  {t('doka.checkPhishing', { defaultValue: 'Phishing-Nachricht prüfen' })}
                </span>
                <ChevronRight style={{ width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0 }} />
              </button>
            </div>
          </div>
        )}

        {messages.map((m, idx) => (
          <MessageBubble key={idx} message={m} t={t} />
        ))}

        {/* Live streaming assistant turn */}
        {streaming && (
          <div style={{ margin: '10px 0' }}>
            {streamTools.map((tool, i) => (
              <ToolCard key={i} name={tool.name} summary={tool.summary} pending={tool.pending} t={t} />
            ))}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-lg)',
              padding: '11px 14px', color: 'var(--text-primary)', fontSize: 14,
            }}>
              {streamContent
                ? <MiniMarkdown text={streamContent} />
                : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                    <span className="doka-dots" aria-hidden="true"><span /><span /><span /></span>
                    {t('doka.thinking', { defaultValue: 'Doka denkt nach …' })}
                  </span>}
            </div>
          </div>
        )}

        {error && (
          <div role="alert" style={{
            margin: '10px 0', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontSize: 13,
            background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <AlertTriangle style={{ width: 17, height: 17, flexShrink: 0 }} />
            <span style={{ flex: 1, lineHeight: 1.4 }}>{error}</span>
            {lastSentRef.current && !streaming && (
              <button
                onClick={() => { const l = lastSentRef.current; setError(null); if (l) handleSend(l.text, l.file); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, cursor: 'pointer',
                  padding: '6px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                  background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)',
                }}>
                <RotateCw style={{ width: 13, height: 13 }} />
                {t('doka.retry', { defaultValue: 'Erneut senden' })}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Input bar (fixed above tab bar) */}
      <div style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 500,
        bottom: 'calc(var(--tab-bar-height) + var(--safe-area-bottom))', padding: '8px 16px 10px',
        background: 'var(--bg-primary)', borderTop: '1px solid var(--border-glass)', zIndex: 20,
      }}>
        {file && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 10px', borderRadius: 10,
            background: 'var(--amber-soft)', border: '1px solid var(--accent-soft-border)', fontSize: 12.5, color: 'var(--text-secondary)',
          }}>
            <Paperclip style={{ width: 13, height: 13, color: 'var(--amber)' }} />
            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
            <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); e.target.value = ''; }} />
          <button onClick={() => fileInputRef.current?.click()} className="no-touch-min" aria-label={t('doka.attach', { defaultValue: 'Datei anhängen' })}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 12, padding: 10, cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}>
            <Paperclip style={{ width: 18, height: 18 }} />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={t('doka.placeholder', { defaultValue: 'Frag Doka etwas …' })}
            rows={1}
            className="input-dark"
            style={{ flex: 1, resize: 'none', maxHeight: 120, padding: '11px 14px', borderRadius: 16, fontSize: 15, lineHeight: 1.4 }}
          />
          <button onClick={handleSend} disabled={streaming || (!input.trim() && !file)} className="no-touch-min"
            aria-label={t('doka.send', { defaultValue: 'Senden' })}
            style={{
              flexShrink: 0, borderRadius: 12, padding: 11, cursor: streaming ? 'default' : 'pointer', border: 'none',
              background: (streaming || (!input.trim() && !file)) ? 'var(--progress-track)' : 'var(--accent-gradient)',
              color: '#fff', opacity: (streaming || (!input.trim() && !file)) ? 0.6 : 1,
            }}>
            {streaming
              ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 0.8s linear infinite' }} />
              : <Send style={{ width: 18, height: 18 }} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, t }) {
  const isUser = message.role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', margin: '10px 0' }}>
      <div style={{ maxWidth: '88%' }}>
        {!isUser && Array.isArray(message.tool_calls) && message.tool_calls.map((tc, i) => (
          <ToolCard key={i} name={tc.name} summary={tc.summary} pending={false} t={t} />
        ))}
        <div className={isUser ? 'doka-user-in' : 'doka-msg-in'} style={{
          padding: '11px 14px', borderRadius: 'var(--radius-lg)', fontSize: 14,
          background: isUser ? 'var(--accent-gradient)' : 'var(--bg-card)',
          border: isUser ? 'none' : '1px solid var(--border-glass)',
          color: isUser ? '#fff' : 'var(--text-primary)',
          borderBottomRightRadius: isUser ? 4 : 'var(--radius-lg)',
          borderBottomLeftRadius: isUser ? 'var(--radius-lg)' : 4,
        }}>
          {isUser ? <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span> : <MiniMarkdown text={message.content} />}
          {isUser && Array.isArray(message.attachments) && message.attachments.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, opacity: 0.9 }}>
              <Paperclip style={{ width: 12, height: 12 }} /> {a.filename}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
