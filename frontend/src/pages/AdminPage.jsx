import { useState, useEffect } from 'react'
import { Shield, Save, Search, UserPlus, Trash2, Loader2, MessageCircle, ChevronRight, ChevronDown, ArrowLeft, Send, CheckCircle, Paperclip, ZoomIn, DollarSign, AlertCircle, Mail } from 'lucide-react'
import {
  adminSearchUser, adminChangePlan,
  getAdminList, addAdmin, removeAdmin,
  adminGetTickets, adminGetTicket, adminCloseTicket, adminAddTicketMessage, adminDeleteTicket,
  fetchTicketFileUrl, adminGetFinanceOverview,
  adminGetFeatureFlags, adminSetFeatureFlag,
} from '../api'

// Prüft ob ein Dateiname eine Bild-Erweiterung hat
function isImageFile(fileName) {
  if (!fileName) return false
  const ext = fileName.split('.').pop().toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)
}

/**
 * Zeigt einen Ticket-Anhang im Admin-Bereich:
 * - Bild: Inline-Vorschau, klickbar → Vollbild in neuem Tab
 * - Sonstiges: Paperclip-Button
 */
function AdminTicketAttachment({ fileUrl, fileName }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!fileUrl || !isImageFile(fileName)) return
    setLoading(true)
    fetchTicketFileUrl(fileUrl)
      .then(url => setBlobUrl(url))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [fileUrl, fileName])

  if (!fileUrl) return null

  if (!isImageFile(fileName)) {
    return (
      <button onClick={async () => {
        try {
          const url = await fetchTicketFileUrl(fileUrl)
          window.open(url, '_blank')
        } catch (e) { console.error('File fetch failed', e) }
      }} style={{
        display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4,
        fontSize: 11, color: 'var(--accent-solid)', background: 'none',
        border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline',
      }}>
        <Paperclip style={{ width: 11, height: 11 }} /> {fileName || 'Anhang'}
      </button>
    )
  }

  return (
    <div style={{ marginTop: 6 }}>
      {loading && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Lädt...</span>}
      {blobUrl && (
        <div
          onClick={() => window.open(blobUrl, '_blank')}
          style={{ cursor: 'pointer', display: 'inline-block', position: 'relative' }}
          title="Vergrößern"
        >
          <img
            src={blobUrl}
            alt={fileName}
            style={{
              maxWidth: 200, maxHeight: 140, borderRadius: 6, display: 'block',
              objectFit: 'cover', border: '1px solid var(--border-glass)',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          />
          <div style={{
            position: 'absolute', top: 3, right: 3,
            background: 'rgba(0,0,0,0.5)', borderRadius: 4,
            padding: '2px 3px', display: 'flex',
          }}>
            <ZoomIn style={{ width: 9, height: 9, color: 'white' }} />
          </div>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '2px 0 0' }}>Vergrößern</p>
        </div>
      )}
    </div>
  )
}

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
      <ChangePlanSection />
      <AdminManagementSection />
      <FinanceOverviewSection />
      <EmailFeatureFlagsSection />
    </div>
  )
}

function FinanceOverviewSection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    adminGetFinanceOverview()
      .then(setData)
      .catch(err => setError(err?.response?.data?.detail || 'Finanzdaten konnten nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [])

  const fmt = (v) => v.toFixed(2).replace('.', ',')

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitle}>
        <DollarSign style={{ width: 16, height: 16, color: 'var(--text-muted)' }} /> Monatsübersicht
      </h2>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12 }}>
          <Loader2 style={{ width: 18, height: 18, color: 'var(--text-muted)', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Lade Finanzdaten...</span>
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, background: 'var(--danger-soft)' }}>
          <AlertCircle style={{ width: 16, height: 16, color: 'var(--danger)' }} />
          <span style={{ fontSize: 13, color: 'var(--danger-text)' }}>{error}</span>
        </div>
      )}

      {data && (
        <div style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 2, color: 'var(--text-primary)' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Aktive Abos</div>
          <div style={{ paddingLeft: 8 }}>
            <div>├─ kdoc Basic: <span style={{ fontWeight: 600 }}>{data.stripe.basic_count}</span> Abos = <span style={{ fontWeight: 600 }}>{fmt(data.stripe.basic_revenue)} €/Mo</span></div>
            <div>├─ kdoc Pro: <span style={{ fontWeight: 600 }}>{data.stripe.pro_count}</span> Abos = <span style={{ fontWeight: 600 }}>{fmt(data.stripe.pro_revenue)} €/Mo</span></div>
            <div>└─ Gesamt Stripe: <span style={{ fontWeight: 700 }}>{fmt(data.stripe.total_revenue)} €/Mo</span></div>
          </div>

          <div style={{ fontWeight: 700, marginTop: 12, marginBottom: 4 }}>
            Mistral Kosten ({data.mistral.month})
          </div>
          <div style={{ paddingLeft: 8 }}>
            <div>├─ mistral-ocr-latest: <span style={{ fontWeight: 600, color: 'var(--danger)' }}>- {fmt(data.mistral.ocr_cost)} €</span></div>
            <div>└─ mistral-small-latest: <span style={{ fontWeight: 600, color: 'var(--danger)' }}>- {fmt(data.mistral.small_cost)} €</span></div>
          </div>

          <div style={{
            borderTop: '1px solid var(--border-glass)', marginTop: 12, paddingTop: 10,
            fontSize: 15, fontWeight: 700,
            color: data.net >= 0 ? '#34d399' : '#ef4444',
          }}>
            Netto Monat: {data.net >= 0 ? '+' : ''}{fmt(data.net)} €
          </div>
        </div>
      )}
    </div>
  )
}

function ChangePlanSection() {
  const [searchEmail, setSearchEmail] = useState('')
  const [user, setUser] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
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
      const result = await adminChangePlan(user.email, selectedPlan, expiresAt || null)
      setUser(prev => ({ ...prev, plan: selectedPlan }))
      const expiryMsg = result.expires_at ? ` (aktiv bis ${new Date(result.expires_at).toLocaleDateString('de-DE')})` : ''
      setMsg({ type: 'success', text: `Plan auf "${selectedPlan}" geändert${expiryMsg}.` })
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
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)}
              style={{ ...inputStyle, minWidth: 120 }}>
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
            </select>
            {selectedPlan !== 'free' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                  Plan aktiv bis (leer = unbegrenzt)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setExpiresAt(e.target.value)}
                  style={{ ...inputStyle, width: 160 }}
                />
              </div>
            )}
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


const PROVIDER_LABELS = {
  email_gmail: 'Gmail',
  email_outlook: 'Outlook',
  email_gmx: 'GMX',
  email_icloud: 'iCloud',
  email_yahoo: 'Yahoo',
}

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: disabled ? 'default' : 'pointer',
        background: checked ? 'var(--accent-solid)' : 'var(--bg-glass)',
        border: `1px solid ${checked ? 'var(--accent-solid)' : 'var(--border-glass-strong)'}`,
        position: 'relative', transition: 'all 0.2s ease',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: checked ? '#fff' : 'var(--text-muted)',
        position: 'absolute', top: 2,
        left: checked ? 22 : 2,
        transition: 'all 0.2s ease',
      }} />
    </button>
  )
}

function EmailFeatureFlagsSection() {
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null) // key currently saving

  useEffect(() => {
    adminGetFeatureFlags()
      .then(data => setFlags(data.flags || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleToggle = async (key, enabled) => {
    setSaving(key)
    try {
      await adminSetFeatureFlag(key, enabled)
      setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled } : f))
    } catch (err) {
      console.error('Flag toggle failed:', err)
    } finally {
      setSaving(null)
    }
  }

  const globalEnabled = flags.find(f => f.key === 'email_enabled')?.enabled ?? false
  const providerFlags = flags.filter(f => f.key !== 'email_enabled' && f.key.startsWith('email_'))

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitle}>
        <Mail style={{ width: 16, height: 16, color: 'var(--text-muted)' }} /> E-Mail Verbinden
      </h2>

      {loading ? (
        <Loader2 style={{ width: 18, height: 18, color: 'var(--text-muted)', animation: 'spin 0.8s linear infinite' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Global toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderRadius: 10,
            background: globalEnabled ? 'var(--accent-soft)' : 'var(--bg-glass)',
            border: `1px solid ${globalEnabled ? 'rgba(139,92,246,0.25)' : 'var(--border-glass)'}`,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              E-Mail Feature (global)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {saving === 'email_enabled' && <Loader2 style={{ width: 14, height: 14, color: 'var(--text-muted)', animation: 'spin 0.8s linear infinite' }} />}
              <ToggleSwitch
                checked={globalEnabled}
                onChange={(v) => handleToggle('email_enabled', v)}
                disabled={saving !== null}
              />
            </div>
          </div>

          {/* Provider toggles */}
          {providerFlags.length > 0 && (
            <div style={{
              padding: '2px 0 0 12px',
              borderLeft: '2px solid var(--border-glass)',
              marginLeft: 6,
              opacity: globalEnabled ? 1 : 0.4,
              pointerEvents: globalEnabled ? 'auto' : 'none',
              transition: 'opacity 0.2s',
            }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px', fontWeight: 600 }}>
                Provider (nur aktiv wenn global AN)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {providerFlags.map(f => (
                  <div key={f.key} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: 8,
                    background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {PROVIDER_LABELS[f.key] || f.key}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {saving === f.key && <Loader2 style={{ width: 12, height: 12, color: 'var(--text-muted)', animation: 'spin 0.8s linear infinite' }} />}
                      <ToggleSwitch
                        checked={f.enabled}
                        onChange={(v) => handleToggle(f.key, v)}
                        disabled={saving !== null}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
  const [newStatus, setNewStatus] = useState('bearbeitet')
  const [saving, setSaving] = useState(false)
  const [newMsg, setNewMsg] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [msg, setMsg] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [closedOpen, setClosedOpen] = useState(false)

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
      setNewStatus('bearbeitet')
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

  const handleDelete = async () => {
    if (!confirm('Ticket und alle zugehörigen Nachrichten/Dateien wirklich endgültig löschen?')) return
    setDeleting(true)
    try {
      await adminDeleteTicket(selected.id)
      setSelected(null)
      fetchTickets()
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.detail || 'Fehler beim Löschen.' })
    } finally { setDeleting(false) }
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
                {m.file_url && (
                  <AdminTicketAttachment fileUrl={m.file_url} fileName={m.file_name} />
                )}
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={handleClose} disabled={saving} style={{ ...btnAccent, opacity: saving ? 0.5 : 1 }}>
              {saving ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle style={{ width: 14, height: 14 }} />}
              Status aktualisieren
            </button>
            <button onClick={handleDelete} disabled={deleting} style={{ ...btnDanger, padding: '10px 14px', fontSize: 12, opacity: deleting ? 0.5 : 1 }}>
              {deleting ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <Trash2 style={{ width: 14, height: 14 }} />}
              Ticket löschen
            </button>
          </div>
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
      ) : (() => {
        const activeTickets = tickets.filter(t => t.status !== 'abgeschlossen')
        const closedTickets = tickets.filter(t => t.status === 'abgeschlossen')
        return (
          <>
            {/* Active tickets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeTickets.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Keine offenen Tickets.</p>}
              {activeTickets.map(ticket => <TicketRow key={ticket.id} ticket={ticket} onOpen={openTicket} />)}
            </div>

            {/* Closed tickets — collapsible */}
            {closedTickets.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <button onClick={() => setClosedOpen(p => !p)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-glass)',
                  background: 'var(--bg-glass)', cursor: 'pointer', color: 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 600,
                }}>
                  {closedOpen
                    ? <ChevronDown style={{ width: 14, height: 14 }} />
                    : <ChevronRight style={{ width: 14, height: 14 }} />}
                  Abgeschlossene Tickets ({closedTickets.length})
                </button>
                {closedOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                    {closedTickets.map(ticket => <TicketRow key={ticket.id} ticket={ticket} onOpen={openTicket} />)}
                  </div>
                )}
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}

function TicketRow({ ticket, onOpen }) {
  const st = STATUS_COLORS[ticket.status] || STATUS_COLORS['erstellt']
  return (
    <div onClick={() => onOpen(ticket.id)} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
      background: 'var(--bg-glass)', border: ticket.unread_admin ? '1px solid #F59E0B' : '1px solid var(--border-glass)',
      cursor: 'pointer', transition: 'background 0.15s',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            #{ticket.id} — {ticket.subject || (ticket.message || '').slice(0, 40)}
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
}

