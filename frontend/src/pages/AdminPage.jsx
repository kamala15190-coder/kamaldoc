import { useState, useEffect } from 'react'
import { Shield, Mail, Save, Search, UserPlus, Trash2, Loader2, MessageCircle, ChevronRight, ArrowLeft, Send, CheckCircle } from 'lucide-react'
import {
  getSupportEmail, updateSupportEmail,
  adminSearchUser, adminChangePlan,
  getAdminList, addAdmin, removeAdmin,
  adminGetTickets, adminGetTicket, adminCloseTicket, adminAddTicketMessage,
} from '../api'

const cardStyle = {
  background: 'var(--bg-glass-strong)',
  border: '1px solid var(--border-glass)',
  borderRadius: 16,
  padding: 24,
  marginBottom: 20,
}

const inputStyle = {
  flex: 1,
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid var(--border-glass)',
  background: 'var(--bg-glass)',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
}

const btnAccent = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '10px 18px', borderRadius: 10, border: 'none',
  background: 'var(--accent-solid)', color: '#fff',
  fontWeight: 600, fontSize: 13, cursor: 'pointer',
  opacity: 1, transition: 'opacity 0.2s',
}

const btnDanger = {
  display: 'flex', alignItems: 'center', gap: 4,
  padding: '6px 12px', borderRadius: 8, border: 'none',
  background: 'var(--danger-soft)', color: 'var(--danger)',
  fontWeight: 600, fontSize: 11, cursor: 'pointer',
}

const btnGhost = {
  ...btnAccent,
  background: 'var(--bg-glass)',
  border: '1px solid var(--border-glass)',
  color: 'var(--text-primary)',
}

const sectionTitle = {
  fontSize: 15, fontWeight: 600, color: 'var(--text-primary)',
  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
}

const msgStyle = (type) => ({
  marginTop: 12, fontSize: 12, fontWeight: 500,
  color: type === 'success' ? '#34d399' : '#ef4444',
})

export default function AdminPage() {
  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Shield style={{ width: 20, height: 20, color: 'var(--accent-solid)' }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Admin-Bereich</h1>
      </div>

      <TicketManagementSection />
      <SupportEmailSection />
      <ChangePlanSection />
      <AdminManagementSection />
    </div>
  )
}

function SupportEmailSection() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    getSupportEmail().then(d => { setEmail(d.email); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      await updateSupportEmail(email)
      setMsg({ type: 'success', text: 'Support E-Mail gespeichert.' })
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.detail || 'Fehler beim Speichern.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitle}>
        <Mail style={{ width: 16, height: 16, color: 'var(--text-muted)' }} /> Support E-Mail
      </h2>
      {loading ? (
        <Loader2 style={{ width: 18, height: 18, color: 'var(--text-muted)', animation: 'spin 0.8s linear infinite' }} />
      ) : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            style={inputStyle} placeholder="support@example.com" />
          <button onClick={handleSave} disabled={saving}
            style={{ ...btnAccent, opacity: saving ? 0.5 : 1 }}>
            {saving ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <Save style={{ width: 14, height: 14 }} />}
            Speichern
          </button>
        </div>
      )}
      {msg && <p style={msgStyle(msg.type)}>{msg.text}</p>}
    </div>
  )
}

function ChangePlanSection() {
  const [searchEmail, setSearchEmail] = useState('')
  const [user, setUser] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const handleSearch = async () => {
    setSearching(true)
    setMsg(null)
    setUser(null)
    try {
      const data = await adminSearchUser(searchEmail)
      setUser(data)
      setSelectedPlan(data.plan)
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.detail || 'User nicht gefunden.' })
    } finally {
      setSearching(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      await adminChangePlan(user.email, selectedPlan)
      setUser(prev => ({ ...prev, plan: selectedPlan }))
      setMsg({ type: 'success', text: `Plan auf "${selectedPlan}" geändert.` })
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.detail || 'Fehler beim Ändern.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitle}>
        <Search style={{ width: 16, height: 16, color: 'var(--text-muted)' }} /> User-Plan ändern
      </h2>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input type="email" value={searchEmail} onChange={e => setSearchEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          style={inputStyle} placeholder="user@email.com" />
        <button onClick={handleSearch} disabled={searching || !searchEmail}
          style={{ ...btnGhost, opacity: (searching || !searchEmail) ? 0.5 : 1 }}>
          {searching ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <Search style={{ width: 14, height: 14 }} />}
          Suchen
        </button>
      </div>

      {user && (
        <div style={{
          background: 'var(--bg-glass)', borderRadius: 12,
          border: '1px solid var(--border-glass)', padding: 16,
        }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 12 }}>
            <strong style={{ color: 'var(--text-primary)' }}>E-Mail:</strong> {user.email}<br />
            <strong style={{ color: 'var(--text-primary)' }}>User ID:</strong>{' '}
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{user.user_id}</span><br />
            <strong style={{ color: 'var(--text-primary)' }}>Aktueller Plan:</strong>{' '}
            <span style={{
              padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              background: user.plan === 'pro' ? 'var(--accent-soft)' : user.plan === 'basic' ? 'rgba(59,130,246,0.15)' : 'var(--bg-glass)',
              color: user.plan === 'pro' ? 'var(--accent-solid)' : user.plan === 'basic' ? '#60a5fa' : 'var(--text-muted)',
              textTransform: 'uppercase',
            }}>{user.plan}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)}
              style={{ ...inputStyle, minWidth: 120 }}>
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
            </select>
            <button onClick={handleSave} disabled={saving || selectedPlan === user.plan}
              style={{ ...btnAccent, opacity: (saving || selectedPlan === user.plan) ? 0.5 : 1 }}>
              {saving ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <Save style={{ width: 14, height: 14 }} />}
              Speichern
            </button>
          </div>
        </div>
      )}

      {msg && <p style={msgStyle(msg.type)}>{msg.text}</p>}
    </div>
  )
}

function AdminManagementSection() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState(null)

  const fetchAdmins = async () => {
    try {
      const data = await getAdminList()
      setAdmins(data.admins || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAdmins() }, [])

  const handleAdd = async () => {
    setAdding(true)
    setMsg(null)
    try {
      await addAdmin(newEmail)
      setMsg({ type: 'success', text: 'Admin erfolgreich hinzugefügt.' })
      setNewEmail('')
      fetchAdmins()
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.detail || 'Fehler beim Hinzufügen.' })
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (userId) => {
    if (!confirm('Admin wirklich entfernen?')) return
    try {
      await removeAdmin(userId)
      setAdmins(prev => prev.filter(a => a.user_id !== userId))
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.detail || 'Fehler beim Entfernen.' })
    }
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitle}>
        <Shield style={{ width: 16, height: 16, color: 'var(--text-muted)' }} /> Admin-Verwaltung
      </h2>

      {loading ? (
        <Loader2 style={{ width: 18, height: 18, color: 'var(--text-muted)', animation: 'spin 0.8s linear infinite' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {admins.map(admin => (
            <div key={admin.user_id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg-glass)', borderRadius: 10,
              border: '1px solid var(--border-glass)', padding: '10px 14px',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {admin.email || 'Unbekannt'}
                  {admin.is_permanent && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                      background: 'var(--accent-soft)', color: 'var(--accent-solid)',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>Permanent</span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                  {admin.user_id}
                </div>
              </div>
              {!admin.is_permanent && (
                <button onClick={() => handleRemove(admin.user_id)} style={btnDanger}>
                  <Trash2 style={{ width: 12, height: 12 }} /> Entfernen
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          style={inputStyle} placeholder="neue-admin@email.com" />
        <button onClick={handleAdd} disabled={adding || !newEmail}
          style={{ ...btnAccent, background: '#22c55e', opacity: (adding || !newEmail) ? 0.5 : 1 }}>
          {adding ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <UserPlus style={{ width: 14, height: 14 }} />}
          Admin hinzufügen
        </button>
      </div>

      {msg && <p style={msgStyle(msg.type)}>{msg.text}</p>}
    </div>
  )
}


const STATUS_COLORS = {
  'erstellt': { bg: 'rgba(99,89,255,0.12)', color: '#6359FF', label: 'Erstellt' },
  'in bearbeitung': { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: 'In Bearbeitung' },
  'bearbeitet': { bg: 'rgba(16,185,129,0.12)', color: '#10B981', label: 'Bearbeitet' },
  'abgeschlossen': { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af', label: 'Abgeschlossen' },
}

const STATUS_OPTIONS = ['erstellt', 'in bearbeitung', 'bearbeitet', 'abgeschlossen']

function TicketManagementSection() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [solution, setSolution] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [newMsg, setNewMsg] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [msg, setMsg] = useState(null)

  const fetchTickets = async () => {
    try {
      const data = await adminGetTickets()
      setTickets(data.tickets || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchTickets() }, [])

  const openTicket = async (ticketId) => {
    try {
      const data = await adminGetTicket(ticketId)
      setSelected(data.ticket)
      setMessages(data.messages || [])
      setSolution(data.ticket.admin_solution || '')
      setNewStatus(data.ticket.status)
      setMsg(null)
      fetchTickets()
    } catch (err) { console.error(err) }
  }

  const handleClose = async () => {
    setSaving(true)
    setMsg(null)
    try {
      await adminCloseTicket(selected.id, solution, newStatus)
      setMsg({ type: 'success', text: `Status auf "${newStatus}" gesetzt.` })
      openTicket(selected.id)
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.detail || 'Fehler' })
    } finally { setSaving(false) }
  }

  const handleSendMsg = async () => {
    if (!newMsg.trim()) return
    setSendingMsg(true)
    try {
      await adminAddTicketMessage(selected.id, newMsg)
      setNewMsg('')
      openTicket(selected.id)
    } catch (err) { console.error(err) }
    finally { setSendingMsg(false) }
  }

  if (selected) {
    const st = STATUS_COLORS[selected.status] || STATUS_COLORS['erstellt']
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', cursor: 'pointer' }}>
            <ArrowLeft style={{ width: 14, height: 14, color: 'var(--text-primary)' }} />
          </button>
          <h2 style={sectionTitle}>
            <MessageCircle style={{ width: 16, height: 16, color: st.color }} /> Ticket #{selected.id}
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: st.bg, color: st.color, marginLeft: 6 }}>{st.label}</span>
          </h2>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-primary)' }}>User:</strong> {selected.user_id.slice(0, 8)}...<br />
          <strong style={{ color: 'var(--text-primary)' }}>Erstellt:</strong> {new Date(selected.created_at).toLocaleString('de-DE')}<br />
          <strong style={{ color: 'var(--text-primary)' }}>Priorität:</strong> {selected.priority}<br />
          {selected.subject && <><strong style={{ color: 'var(--text-primary)' }}>Betreff:</strong> {selected.subject}<br /></>}
        </div>

        {/* Messages */}
        <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {messages.map((m) => {
            const isAdmin = m.sender_type === 'admin'
            return (
              <div key={m.id} style={{
                padding: '8px 12px', borderRadius: 10, maxWidth: '85%',
                alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                background: isAdmin ? 'rgba(16,185,129,0.08)' : 'var(--bg-glass)',
                border: `1px solid ${isAdmin ? 'rgba(16,185,129,0.2)' : 'var(--border-glass)'}`,
              }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: isAdmin ? '#10B981' : '#6359FF', margin: '0 0 2px' }}>{isAdmin ? 'Admin' : 'User'}</p>
                <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>{m.message}</p>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '2px 0 0', textAlign: 'right' }}>{new Date(m.created_at).toLocaleString('de-DE')}</p>
              </div>
            )
          })}
        </div>

        {/* Reply as admin */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <input type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMsg()} style={inputStyle} placeholder="Nachricht an User..." />
          <button onClick={handleSendMsg} disabled={sendingMsg || !newMsg.trim()} style={{ ...btnAccent, background: '#10B981', opacity: (sendingMsg || !newMsg.trim()) ? 0.5 : 1 }}>
            {sendingMsg ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <Send style={{ width: 14, height: 14 }} />}
          </button>
        </div>

        {/* Status + Solution */}
        <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ ...inputStyle, minWidth: 150 }}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_COLORS[s].label}</option>)}
            </select>
          </div>
          <textarea value={solution} onChange={e => setSolution(e.target.value)} style={{ ...inputStyle, width: '100%', minHeight: 60, resize: 'vertical', marginBottom: 10, boxSizing: 'border-box' }} placeholder="Lösung / Antwort an User (wird als Solution angezeigt)..." />
          <button onClick={handleClose} disabled={saving} style={{ ...btnAccent, opacity: saving ? 0.5 : 1 }}>
            {saving ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle style={{ width: 14, height: 14 }} />}
            Status aktualisieren
          </button>
          {msg && <p style={msgStyle(msg.type)}>{msg.text}</p>}
        </div>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitle}>
        <MessageCircle style={{ width: 16, height: 16, color: 'var(--text-muted)' }} /> Support-Tickets
      </h2>

      {loading ? (
        <Loader2 style={{ width: 18, height: 18, color: 'var(--text-muted)', animation: 'spin 0.8s linear infinite' }} />
      ) : tickets.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Keine Tickets vorhanden.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tickets.map(ticket => {
            const st = STATUS_COLORS[ticket.status] || STATUS_COLORS['erstellt']
            return (
              <div key={ticket.id} onClick={() => openTicket(ticket.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                background: 'var(--bg-glass)', border: ticket.unread_admin ? '1px solid #F59E0B' : '1px solid var(--border-glass)',
                cursor: 'pointer', transition: 'background 0.15s',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      #{ticket.id} — {ticket.subject || ticket.message.slice(0, 40)}
                    </span>
                    {ticket.unread_admin === 1 && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: st.bg, color: st.color }}>{st.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ticket.priority}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{new Date(ticket.updated_at).toLocaleDateString('de-DE')}</span>
                  </div>
                </div>
                <ChevronRight style={{ width: 12, height: 12, color: 'var(--text-muted)', flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

