import { useState, useEffect } from 'react'
import { Shield, Mail, Save, Search, UserPlus, Trash2, Loader2 } from 'lucide-react'
import {
  getSupportEmail, updateSupportEmail,
  adminSearchUser, adminChangePlan,
  getAdminList, addAdmin, removeAdmin,
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
