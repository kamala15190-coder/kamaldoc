import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, CheckCircle, AlertCircle, Loader2, Headphones, ChevronRight, ArrowLeft, MessageCircle, Clock, X } from 'lucide-react'
import { createTicket, getTickets, getTicket, addTicketMessage, acceptTicket } from '../api'

const STATUS_COLORS = {
  'erstellt': { bg: 'rgba(99,89,255,0.12)', color: '#6359FF', label: 'Erstellt' },
  'in bearbeitung': { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: 'In Bearbeitung' },
  'bearbeitet': { bg: 'rgba(16,185,129,0.12)', color: '#10B981', label: 'Bearbeitet' },
  'abgeschlossen': { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af', label: 'Abgeschlossen' },
}

export default function SupportPage() {
  const { t } = useTranslation()
  const [view, setView] = useState('list') // list | create | detail
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [selectedMessages, setSelectedMessages] = useState([])

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
      // Refresh list to clear unread badge
      fetchTickets()
    } catch (err) { console.error(err) }
  }

  if (view === 'create') return <CreateTicket onBack={() => { setView('list'); fetchTickets() }} />
  if (view === 'detail' && selectedTicket) return <TicketDetail ticket={selectedTicket} messages={selectedMessages} onBack={() => { setView('list'); fetchTickets() }} onRefresh={() => openTicket(selectedTicket.id)} />

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
          <Send style={{ width: 14, height: 14 }} /> Neues Ticket
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 style={{ width: 24, height: 24, color: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : tickets.length === 0 ? (
        <div className="glass-card animate-fade-in-up" style={{ padding: 40, textAlign: 'center' }}>
          <MessageCircle style={{ width: 40, height: 40, color: 'var(--text-muted)', margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: '0 0 16px' }}>Noch keine Tickets vorhanden</p>
          <button onClick={() => setView('create')} className="btn-accent" style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600 }}>
            Erstes Ticket erstellen
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
                      {ticket.subject || ticket.message.slice(0, 50)}
                    </span>
                    {ticket.unread_user === 1 && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5F6D', flexShrink: 0 }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: st.bg, color: st.color }}>{st.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>#{ticket.id}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{new Date(ticket.created_at).toLocaleDateString('de-DE')}</span>
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const canSubmit = message.length >= 10

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await createTicket({ subject, message, priority })
      onBack()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Fehler beim Erstellen')
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
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Neues Ticket</h2>
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
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Betreff</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="input-dark" placeholder="Kurze Beschreibung (optional)" disabled={loading} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Beschreibung <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(min. 10 Zeichen)</span>
            </label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="input-dark" style={{ resize: 'none', minHeight: 120 }} rows={5} placeholder="Beschreibe dein Problem..." required minLength={10} disabled={loading} />
            <p style={{ fontSize: 11, marginTop: 4, color: message.length >= 10 ? '#34d399' : 'var(--text-muted)' }}>
              {message.length}/10 Zeichen
            </p>
          </div>

          <button type="submit" disabled={loading || !canSubmit} className="btn-accent" style={{
            width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: (loading || !canSubmit) ? 0.5 : 1,
          }}>
            {loading ? (<><Loader2 style={{ width: 18, height: 18, animation: 'spin 0.8s linear infinite' }} /> Wird erstellt...</>) : (<><Send style={{ width: 16, height: 16 }} /> Ticket erstellen</>)}
          </button>
        </form>
      </div>
    </div>
  )
}

function TicketDetail({ ticket, messages: initialMessages, onBack, onRefresh }) {
  const [messages, setMessages] = useState(initialMessages)
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const isClosed = ticket.status === 'abgeschlossen'
  const isResolved = ticket.status === 'bearbeitet'
  const st = STATUS_COLORS[ticket.status] || STATUS_COLORS['erstellt']

  const handleSend = async () => {
    if (!newMsg.trim() || sending) return
    setSending(true)
    try {
      await addTicketMessage(ticket.id, newMsg)
      setNewMsg('')
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
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: st.bg, color: st.color }}>{st.label}</span>
        </div>
      </div>

      {/* Original ticket info */}
      <div className="glass-card" style={{ padding: 14, marginBottom: 12, opacity: isClosed ? 0.6 : 1 }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px' }}>
          {new Date(ticket.created_at).toLocaleString('de-DE')} · Priorität: {ticket.priority}
        </p>
        {ticket.subject && <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{ticket.subject}</p>}
      </div>

      {/* Admin solution banner */}
      {ticket.admin_solution && (isResolved || isClosed) && (
        <div style={{ padding: 14, borderRadius: 12, marginBottom: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#10B981', margin: '0 0 6px' }}>Lösung vom Support:</p>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>{ticket.admin_solution}</p>
          {isResolved && !isClosed && (
            <button onClick={handleAccept} disabled={accepting} className="btn-accent" style={{ marginTop: 12, padding: '10px 20px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              {accepting ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle style={{ width: 14, height: 14 }} />}
              Lösung annehmen
            </button>
          )}
        </div>
      )}

      {/* Chat messages */}
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
                {isAdmin ? 'Support' : 'Du'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>{msg.message}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0', textAlign: 'right' }}>
                {new Date(msg.created_at).toLocaleString('de-DE')}
              </p>
            </div>
          )
        })}
      </div>

      {/* Reply input */}
      {!isClosed && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea value={newMsg} onChange={(e) => setNewMsg(e.target.value)} className="input-dark" placeholder="Nachricht schreiben..." rows={2} style={{ flex: 1, resize: 'none', fontSize: 13 }} disabled={sending} />
          <button onClick={handleSend} disabled={sending || !newMsg.trim()} className="btn-accent" style={{ padding: '10px 14px', borderRadius: 10, flexShrink: 0, opacity: (sending || !newMsg.trim()) ? 0.5 : 1 }}>
            {sending ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} /> : <Send style={{ width: 16, height: 16 }} />}
          </button>
        </div>
      )}

      {isClosed && (
        <div style={{ textAlign: 'center', padding: 16, opacity: 0.5 }}>
          <CheckCircle style={{ width: 20, height: 20, color: '#9ca3af', margin: '0 auto 6px' }} />
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Ticket abgeschlossen</p>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
