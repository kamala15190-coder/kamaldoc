import { useState, useEffect } from 'react'
import { Shield, Mail, Save, Search, UserPlus, Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import {
  getSupportEmail, updateSupportEmail,
  adminSearchUser, adminChangePlan,
  getAdminList, addAdmin, removeAdmin,
} from '../api'

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Shield className="w-6 h-6 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Admin-Bereich</h1>
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Mail className="w-5 h-5 text-slate-500" /> Support E-Mail
      </h2>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            placeholder="support@example.com"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer border-none text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Speichern
          </button>
        </div>
      )}
      {msg && (
        <p className={`mt-3 text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>
      )}
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Search className="w-5 h-5 text-slate-500" /> User-Plan ändern
      </h2>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="email"
          value={searchEmail}
          onChange={e => setSearchEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          placeholder="user@email.com"
        />
        <button
          onClick={handleSearch}
          disabled={searching || !searchEmail}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer border-none text-sm"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Suchen
        </button>
      </div>

      {user && (
        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          <p className="text-sm text-slate-700">
            <strong>E-Mail:</strong> {user.email}<br />
            <strong>User ID:</strong> <span className="font-mono text-xs">{user.user_id}</span><br />
            <strong>Aktueller Plan:</strong> <span className="font-semibold capitalize">{user.plan}</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedPlan}
              onChange={e => setSelectedPlan(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-sm"
            >
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
            </select>
            <button
              onClick={handleSave}
              disabled={saving || selectedPlan === user.plan}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer border-none text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Speichern
            </button>
          </div>
        </div>
      )}

      {msg && (
        <p className={`mt-3 text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>
      )}
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-slate-500" /> Admin-Verwaltung
      </h2>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      ) : (
        <div className="space-y-3 mb-4">
          {admins.map(admin => (
            <div key={admin.user_id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {admin.email || 'Unbekannt'}
                  {admin.is_permanent && (
                    <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Permanent</span>
                  )}
                </p>
                <p className="text-xs text-slate-500 font-mono">{admin.user_id}</p>
              </div>
              {!admin.is_permanent && (
                <button
                  onClick={() => handleRemove(admin.user_id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors cursor-pointer border-none"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Entfernen
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          placeholder="neue-admin@email.com"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newEmail}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer border-none text-sm"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Admin hinzufügen
        </button>
      </div>

      {msg && (
        <p className={`mt-3 text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>
      )}
    </div>
  )
}
