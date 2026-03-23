import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, CheckCircle, AlertCircle, Loader2, Headphones, ChevronRight, ArrowLeft, MessageCircle, Paperclip, X, ZoomIn } from 'lucide-react'
import { createTicket, getTickets, getTicket, addTicketMessage, acceptTicket, fetchTicketFileUrl } from '../api'

// Prüft ob ein Dateiname eine Bild-Erweiterung hat
function isImageFile(fileName) {
  if (!fileName) return false
  const ext = fileName.split('.').pop().toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)
}

/**
 * Zeigt einen Ticket-Anhang an:
 * - Bild: Inline-Vorschau (200px), klickbar → öffnet Vollbild im neuen Tab
 * - Sonstiges: Paperclip-Button zum Herunterladen
 */
function TicketAttachment({ fileUrl, fileName }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    if (!fileUrl || !isImageFile(fileName)) return
    setLoading(true)
    fetchTicketFileUrl(fileUrl)
      .then(url => setBlobUrl(url))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [fileUrl, fileName])

  const openFullscreen = () => {
    if (blobUrl) window.open(blobUrl, '_blank')
  }

  if (!fileUrl) return null

  if (!isImageFile(fileName)) {
    // Kein Bild → normaler Download-Button
    return (
      <button onClick={async () => {
        try {
          const url = await fetchTicketFileUrl(fileUrl)
          window.open(url, '_blank')
        } catch (e) { console.error('File fetch failed', e) }
      }} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
        fontSize: 11, color: 'var(--accent-solid)', background: 'none',
        border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline',
      }}>
        <Paperclip style={{ width: 12, height: 12 }} /> {fileName || t('support.fileAttached')}
      </button>
    )
  }

  // Bild-Vorschau mit Lupe-Hinweis
  return (
    <div style={{ marginTop: 8 }}>
      {loading && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 0' }}>
          <Loader2 style={{ width: 12, height: 12, animation: 'spin 0.8s linear infinite', display: 'inline', marginRight: 4 }} />
          {t('support.loadingImage')}
        </div>
      )}
      {blobUrl && (
        <div
          onClick={openFullscreen}
          style={{ cursor: 'pointer', display: 'inline-block', position: 'relative' }}
          title={t('support.imageClickToEnlarge')}
        >
          <img
            src={blobUrl}
            alt={fileName}
            style={{
              maxWidth: 220, maxHeight: 160, borderRadius: 8, display: 'block',
              objectFit: 'cover', border: '1px solid var(--border-glass)',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          />
          {/* Lupe-Icon oben rechts */}
          <div style={{
            position: 'absolute', top: 4, right: 4,
            background: 'rgba(0,0,0,0.5)', borderRadius: 6,
            padding: '2px 4px', display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <ZoomIn style={{ width: 10, height: 10, color: 'white' }} />
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '3px 0 0' }}>
            {t('support.imageClickToEnlarge')}
          </p>
        </div>
      )}
    </div>
  )
}

export default function SupportPage() {
  const { t } = useTranslation()
  const [view, setView] = useState('list')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [selectedMessages, setSelectedMessages] = useState([])

  const statusLabel = (s) => ({
    'erstellt': t('support.statusCreated'),
    'in bearbeitung': t('support.statusInProgress'),
    'bearbeitet': t('support.statusResolved'),
    'abgeschlossen': t('support.statusClosed'),
  }[s] || s)

  const STATUS_COLORS = {
    'erstellt': { bg: 'rgba(99,89,255,0.12)', color: '#6359FF' },
    'in bearbeitung': { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
    'bearbeitet': { bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
    'abgeschlossen': { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af' },
  }

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const data = await getTickets()
      setTickets(data.tickets || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchTickets() }, [])

  const openTicket = async (ticketId) => {
    try {
      const data = await getTicket(ticketId)
      setSelectedTicket(data.ticket)
      setSelectedMessages(data.messages || [])
      setView('detail')
      fetchTickets()
    } catch (err) { console.error(err) }
  }

  if (view === 'create') return <CreateTicket onBack={() => { setView('list'); fetchTickets() }} />
  if (view === 'detail' && selectedTicket) return (
    <TicketDetail
      ticket={selectedTicket}
      messages={selectedMessages}
      onBack={() => { setView('list'); fetchTickets() }}
      onRefresh={() => openTicket(selectedTicket.id)}
      statusLabel={statusLabel}
      STATUS_COLORS={STATUS_COLORS}
    />
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }} className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: 8, borderRadius: 10, background: 'var(--accent-soft)' }}>
            <Headphones style={{ width: 18, height: 18, color: 'var(--accent-solid)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('support.title')}</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>{t('support.subtitle')}</p>
          </div>
        </div>
        <button onClick={() => setView('create')} className="btn-accent" style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Send style={{ width: 14, height: 14 }} /> {t('support.newTicketBtn')}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 style={{ width: 24, height: 24, color: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : tickets.length === 0 ? (
        <div className="glass-card animate-fade-in-up" style={{ padding: 40, textAlign: 'center' }}>
          <MessageCircle style={{ width: 40, height: 40, color: 'var(--text-muted)', margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: '0 0 16px' }}>{t('support.noTickets')}</p>
          <button onClick={() => setView('create')} className="btn-accent" style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600 }}>
            {t('support.createFirst')}
          </button>
        </div>
      ) : (
        <div className="animate-fade-in-up">
          {tickets.map((ticket) => {
            const st = STATUS_COLORS[ticket.status] || STATUS_COLORS['erstellt']
            return (
              <div key={ticket.id} onClick={() => openTicket(ticket.id)} className="glass-card" style={{
                padding: '14px 16px', marginBottom: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                border: ticket.unread_user ? '1px solid var(--accent-solid)' : '1px solid var(--border-glass)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ticket.subject || (ticket.message || '').slice(0, 50)}
                    </span>
                    {ticket.unread_user === 1 && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5F6D', flexShrink: 0 }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: st.bg, color: st.color }}>{statusLabel(ticket.status)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>#{ticket.id}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{new Date(ticket.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-muted)', flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function CreateTicket({ onBack }) {
  const { t } = useTranslation()
  const [priority, setPriority] = useState('mittel')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  const canSubmit = message.length >= 10

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await createTicket({ subject, message, priority, file })
      onBack()
    } catch (err) {
      setError(err?.response?.data?.detail || t('support.createError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', cursor: 'pointer' }}>
          <ArrowLeft style={{ width: 16, height: 16, color: 'var(--text-primary)' }} />
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('support.newTicketBtn')}</h2>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'var(--danger-soft)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle style={{ width: 14, height: 14, color: 'var(--danger)', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: 'var(--danger-text)', margin: 0 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('support.priority')}</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input-dark" disabled={loading}>
              <option value="niedrig">{t('support.priorityLow')}</option>
              <option value="mittel">{t('support.priorityMedium')}</option>
              <option value="hoch">{t('support.priorityHigh')}</option>
              <option value="sehr_hoch">{t('support.priorityVeryHigh')}</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('support.subject')}</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="input-dark" placeholder={t('support.subjectPlaceholder')} disabled={loading} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              {t('support.descriptionLabel')} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{t('support.minCharsTicket')}</span>
            </label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="input-dark" style={{ resize: 'none', minHeight: 120 }} rows={5} placeholder={t('support.descPlaceholder')} required minLength={10} disabled={loading} />
            <p style={{ fontSize: 11, marginTop: 4, color: message.length >= 10 ? '#34d399' : 'var(--text-muted)' }}>
              {t('support.charCountTicket', { count: message.length })}
            </p>
          </div>

          {/* File attachment (images only, max 5MB) */}
          <div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/bmp" style={{ display: 'none' }} onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && f.size > 5 * 1024 * 1024) {
                setError(t('support.fileTooLarge'));
                if (fileRef.current) fileRef.current.value = '';
                return;
              }
              setFile(f || null);
            }} />
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
                <Paperclip style={{ width: 14, height: 14, color: 'var(--accent-solid)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <X style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
                background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>
                <Paperclip style={{ width: 14, height: 14 }} /> {t('support.attachFile')}
              </button>
            )}
          </div>

          <button type="submit" disabled={loading || !canSubmit} className="btn-accent" style={{
            width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: (loading || !canSubmit) ? 0.5 : 1,
          }}>
            {loading ? (<><Loader2 style={{ width: 18, height: 18, animation: 'spin 0.8s linear infinite' }} /> {t('support.creating')}</>) : (<><Send style={{ width: 16, height: 16 }} /> {t('support.createButton')}</>)}
          </button>
        </form>
      </div>
    </div>
  )
}

function TicketDetail({ ticket, messages: initialMessages, onBack, onRefresh, statusLabel, STATUS_COLORS }) {
  const { t } = useTranslation()
  const [messages, setMessages] = useState(initialMessages)
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [file, setFile] = useState(null)
  const fileRef = useRef(null)
  const isClosed = ticket.status === 'abgeschlossen'
  const isResolved = ticket.status === 'bearbeitet'
  const st = STATUS_COLORS[ticket.status] || STATUS_COLORS['erstellt']

  const handleSend = async () => {
    if ((!newMsg.trim() && !file) || sending) return
    setSending(true)
    try {
      await addTicketMessage(ticket.id, newMsg, file)
      setNewMsg('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      onRefresh()
    } catch (err) { console.error(err) }
    finally { setSending(false) }
  }

  const handleAccept = async () => {
    setAccepting(true)
    try {
      await acceptTicket(ticket.id)
      onRefresh()
    } catch (err) { console.error(err) }
    finally { setAccepting(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', cursor: 'pointer' }}>
          <ArrowLeft style={{ width: 16, height: 16, color: 'var(--text-primary)' }} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Ticket #{ticket.id}</h2>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: st.bg, color: st.color }}>{statusLabel(ticket.status)}</span>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 14, marginBottom: 12, opacity: isClosed ? 0.6 : 1 }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px' }}>
          {new Date(ticket.created_at).toLocaleString()} · {t('support.priority')}: {ticket.priority}
        </p>
        {ticket.subject && <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{ticket.subject}</p>}
      </div>

      {ticket.admin_solution && (isResolved || isClosed) && (
        <div style={{ padding: 14, borderRadius: 12, marginBottom: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#10B981', margin: '0 0 6px' }}>{t('support.solutionFrom')}</p>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>{ticket.admin_solution}</p>
          {isResolved && !isClosed && (
            <button onClick={handleAccept} disabled={accepting} className="btn-accent" style={{ marginTop: 12, padding: '10px 20px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              {accepting ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle style={{ width: 14, height: 14 }} />}
              {t('support.acceptSolution')}
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {messages.map((msg) => {
          const isAdmin = msg.sender_type === 'admin'
          return (
            <div key={msg.id} style={{
              padding: '10px 14px', borderRadius: 12, maxWidth: '85%',
              alignSelf: isAdmin ? 'flex-start' : 'flex-end',
              background: isAdmin ? 'var(--bg-glass-strong)' : 'var(--accent-soft)',
              border: `1px solid ${isAdmin ? 'var(--border-glass)' : 'rgba(99,89,255,0.2)'}`,
              opacity: isClosed ? 0.6 : 1,
            }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: isAdmin ? '#10B981' : 'var(--accent-solid)', margin: '0 0 4px' }}>
                {isAdmin ? t('support.supportTeam') : t('support.you')}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>{msg.message}</p>
              {msg.file_url && (
                <TicketAttachment fileUrl={msg.file_url} fileName={msg.file_name} />
              )}
              <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0', textAlign: 'right' }}>
                {new Date(msg.created_at).toLocaleString()}
              </p>
            </div>
          )
        })}
      </div>

      {!isClosed && (
        <div>
          {file && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, padding: '6px 10px', borderRadius: 6, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
              <Paperclip style={{ width: 12, height: 12, color: 'var(--accent-solid)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
              <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1 }}>
                <X style={{ width: 12, height: 12, color: 'var(--text-muted)' }} />
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/bmp" style={{ display: 'none' }} onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && f.size > 5 * 1024 * 1024) { alert('Max 5MB'); if (fileRef.current) fileRef.current.value = ''; return; }
              setFile(f || null);
            }} />
            <button onClick={() => fileRef.current?.click()} style={{ background: 'none', border: '1px solid var(--border-glass)', borderRadius: 10, padding: '10px', cursor: 'pointer', flexShrink: 0 }}>
              <Paperclip style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
            </button>
            <textarea value={newMsg} onChange={(e) => setNewMsg(e.target.value)} className="input-dark" placeholder={t('support.writeMessage')} rows={2} style={{ flex: 1, resize: 'none', fontSize: 13 }} disabled={sending} />
            <button onClick={handleSend} disabled={sending || (!newMsg.trim() && !file)} className="btn-accent" style={{ padding: '10px 14px', borderRadius: 10, flexShrink: 0, opacity: (sending || (!newMsg.trim() && !file)) ? 0.5 : 1 }}>
              {sending ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} /> : <Send style={{ width: 16, height: 16 }} />}
            </button>
          </div>
        </div>
      )}

      {isClosed && (
        <div style={{ textAlign: 'center', padding: 16, opacity: 0.5 }}>
          <CheckCircle style={{ width: 20, height: 20, color: '#9ca3af', margin: '0 auto 6px' }} />
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{t('support.ticketClosedMsg')}</p>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
