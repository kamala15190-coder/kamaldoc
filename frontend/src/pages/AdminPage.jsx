import { useState, useEffect } from 'react'
import { Shield, Save, Search, UserPlus, Trash2, Loader2, MessageCircle, ChevronRight, ChevronDown, ArrowLeft, Send, CheckCircle, Paperclip, ZoomIn, DollarSign, AlertCircle, Mail } from 'lucide-react'
import {
  adminSearchUser, adminChangePlan,
  getAdminList, addAdmin, removeAdmin,
  adminGetTickets, adminGetTicket, adminCloseTicket, adminAddTicketMessage, adminDeleteTicket,
  fetchTicketFileUrl, adminGetFinanceOverview,
  adminGetFeatureFlags, adminSetFeatureFlag,
} from '../api'
import { formatLocalDateTime, formatLocalDate } from '../utils/dateUtils'
import { useConfirm } from '../hooks/useConfirm'

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetchTicketFileUrl(fileUrl)
      .then(url => setBlobUrl(url))
      .catch(() => { /* ignore */ })
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
  borderRadius: 14,
  padding: 18,
  marginBottom: 12,
}

const inputStyle = {
  flex: 1,
  padding: '8px 12px',
  borderRadius: 9,
  border: '1px solid var(--border-glass)',
  background: 'var(--bg-glass)',
  color: 'var(--text-primary)',
  fontSize: 12.5,
  outline: 'none',
}

// Buttons bewusst kompakt – diese Seite ist nur für den Eigentümer.
const btnAccent = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  padding: '7px 13px', borderRadius: 9, border: 'none',
  background: 'var(--accent-solid)', color: '#fff',
  fontWeight: 600, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap',
  transition: 'opacity 0.2s, background 0.2s',
}

const btnDanger = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  padding: '6px 11px', borderRadius: 8, border: 'none',
  background: 'var(--danger-soft)', color: 'var(--danger)',
  fontWeight: 600, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
  transition: 'opacity 0.2s',
}

const btnGhost = {
  ...btnAccent,
  background: 'var(--bg-glass)',
  border: '1px solid var(--border-glass)',
  color: 'var(--text-primary)',
}

const sectionTitle = {
  fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.01em',
  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
}

const msgStyle = (type) => ({
  marginTop: 12, fontSize: 12, fontWeight: 500,
  color: type === 'success' ? '#34d399' : '#ef4444',
})

// Schlichte Label/Wert-Zeile für die Finanzübersicht.
function StatRow({ label, value, color, strong, indent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '5px 0', paddingLeft: indent ? 12 : 0,
    }}>
      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{
        fontSize: 12.5, fontWeight: strong ? 700 : 600,
        color: color || 'var(--text-primary)', fontVariantNumeric: 'tabular-nums',
      }}>{value}</span>
    </div>
  )
}

// Kompakte Token-Anzeige: 1.234.567 → „1,2 Mio." · 12.300 → „12k".
function fmtTokens(n) {
  const v = Number(n || 0)
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')} Mio.`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`
  return String(v)
}

export default function AdminPage() {
  return (
    <div style={{ padding: '0 4px', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Shield style={{ width: 18, height: 18, color: 'var(--accent-solid)' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.1 }}>Admin-Bereich</h1>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '3px 0 0' }}>Nur für Eigentümer · intern</p>
        </div>
      </div>

      <FinanceOverviewSection />
      <TicketManagementSection />
      <ChangePlanSection />
      <EmailFeatureFlagsSection />
      <AdminManagementSection />
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

  const fmt = (v) => Number(v ?? 0).toFixed(2).replace('.', ',')

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
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 2 }}>
            Einnahmen
          </div>
          <StatRow label={`Basic · ${data.stripe.basic_count} Abos`} value={`${fmt(data.stripe.basic_revenue)} €`} indent />
          <StatRow label={`Pro · ${data.stripe.pro_count} Abos`} value={`${fmt(data.stripe.pro_revenue)} €`} indent />
          <StatRow label="Gesamt / Monat" value={`${fmt(data.stripe.total_revenue)} €`} color="#34d399" strong />

          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', margin: '12px 0 2px' }}>
            Mistral-Kosten · {data.mistral.month}
          </div>
          {(data.mistral.models || []).length === 0 ? (
            <StatRow label="Keine Nutzung diesen Monat" value="0,00 €" indent />
          ) : (
            data.mistral.models.map(m => (
              <div key={m.model} style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                padding: '5px 0', paddingLeft: 12,
              }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  {m.label}
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginLeft: 6 }}>
                    {fmtTokens((m.input_tokens || 0) + (m.output_tokens || 0))} Tok.
                  </span>
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
                  − {fmt(m.cost)} €
                </span>
              </div>
            ))
          )}
          <StatRow label="Kosten / Monat" value={`− ${fmt(data.mistral.total_cost)} €`} color="var(--danger)" strong />

          <div style={{
            borderTop: '1px solid var(--border-glass)', marginTop: 10, paddingTop: 10,
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Netto Monat</span>
            <span style={{
              fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              color: data.net >= 0 ? '#34d399' : '#ef4444',
            }}>{data.net >= 0 ? '+' : ''}{fmt(data.net)} €</span>
          </div>

          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '10px 0 0' }}>
            Mistral-Preise pro Modell · Kurs {fmt(data.mistral.usd_to_eur)} €/$ · Stripe-Erlöse netto
          </p>
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
      const expiryMsg = result.expires_at ? ` (aktiv bis ${formatLocalDate(result.expires_at)})` : ''
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
  const confirm = useConfirm()

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
    const ok = await confirm({
      title: 'Admin entfernen?',
      message: 'Dieser Nutzer verliert sofort alle Admin-Rechte.',
      confirmLabel: 'Entfernen',
      cancelLabel: 'Abbrechen',
      variant: 'danger',
    })
    if (!ok) return
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
          style={{ ...btnAccent, opacity: (adding || !newEmail) ? 0.5 : 1 }}>
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
        width: 44, height: 24, borderRadius: 12, cursor: disabled ? 'default' : 'pointer',
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
            border: `1px solid ${globalEnabled ? 'rgba(232,154,82,0.25)' : 'var(--border-glass)'}`,
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
  'erstellt': { bg: 'rgba(232,154,82,0.12)', color: '#E89A52', label: 'Erstellt' },
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
  const confirm = useConfirm()

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
    const ok = await confirm({
      title: 'Ticket löschen?',
      message: 'Ticket samt allen Nachrichten und Dateien wird endgültig gelöscht. Das kann nicht rückgängig gemacht werden.',
      confirmLabel: 'Endgültig löschen',
      cancelLabel: 'Abbrechen',
      variant: 'danger',
    })
    if (!ok) return
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
          <strong style={{ color: 'var(--text-primary)' }}>Erstellt:</strong> {formatLocalDateTime(selected.created_at)}<br />
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
                <p style={{ fontSize: 10, fontWeight: 600, color: isAdmin ? '#10B981' : '#E89A52', margin: '0 0 2px' }}>{isAdmin ? 'Admin' : 'User'}</p>
                <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>{m.message}</p>
                {m.file_url && (
                  <AdminTicketAttachment fileUrl={m.file_url} fileName={m.file_name} />
                )}
                <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '2px 0 0', textAlign: 'right' }}>{formatLocalDateTime(m.created_at)}</p>
              </div>
            )
          })}
        </div>

        {/* Reply as admin */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <input type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMsg()} style={inputStyle} placeholder="Nachricht an User..." />
          <button onClick={handleSendMsg} disabled={sendingMsg || !newMsg.trim()} style={{ ...btnAccent, opacity: (sendingMsg || !newMsg.trim()) ? 0.5 : 1 }}>
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
            <button onClick={handleDelete} disabled={deleting} style={{ ...btnDanger, padding: '7px 12px', fontSize: 12, opacity: deleting ? 0.5 : 1 }}>
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
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{formatLocalDate(ticket.updated_at)}</span>
        </div>
      </div>
      <ChevronRight style={{ width: 12, height: 12, color: 'var(--text-muted)', flexShrink: 0 }} />
    </div>
  )
}

