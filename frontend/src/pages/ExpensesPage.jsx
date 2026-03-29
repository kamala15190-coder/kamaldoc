import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, TrendingUp, Loader2, Calendar
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getExpenseCategories, getExpenseItems, getExpenseSummary } from '../api';
import { formatLocalDate } from '../utils/dateUtils';
import { useSubscription } from '../hooks/useSubscription';
import { usePlanLimit } from '../hooks/usePlanLimit';
import UpgradePrompt from '../components/UpgradePrompt';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const CATEGORY_COLORS = {
  Lebensmittel: '#ef4444', Telekommunikation: '#8b5cf6', Versicherung: '#6366f1',
  Energie: '#10b981', Miete: '#f59e0b', Transport: '#14b8a6', Gesundheit: '#ec4899',
  Unterhaltung: '#f97316', Haushalt: '#84cc16', Bildung: '#06b6d4', Kleidung: '#a855f7',
  Abonnement: '#0ea5e9', Steuern: '#dc2626', Gebuehren: '#64748b', Sonstiges: '#94a3b8',
};
const FALLBACK_COLOR = '#94a3b8';
const MONTHS_DE = ['', 'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MONTHS_FULL = ['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const fmt = (v) => Number(v).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

export default function ExpensesPage() {
  const { t } = useTranslation();
  const { isFree, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const { handleApiError } = usePlanLimit();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState({});
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');

  if (subLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(139,92,246,0.15)', borderTopColor: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isFree) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }} className="animate-fade-in">
          <div style={{ padding: 8, borderRadius: 10, background: 'var(--warning-soft)' }}>
            <DollarSign style={{ width: 18, height: 18, color: 'var(--warning-text)' }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('expenses.title')}</h1>
        </div>
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <UpgradePrompt messageKey="pricing.expensesLocked" minPlan="basic" />
        </div>
      </div>
    );
  }

  const years = useMemo(() => {
    const c = new Date().getFullYear();
    return [c, c - 1, c - 2, c - 3];
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedYear) params.year = selectedYear;
      if (selectedMonth) params.month = selectedMonth;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedSubcategory) params.subcategory = selectedSubcategory;

      const [catData, summaryData, itemsData] = await Promise.all([
        getExpenseCategories(),
        getExpenseSummary(params),
        getExpenseItems(params),
      ]);
      setCategories(catData.categories || {});
      setSummary(summaryData);
      setItems(itemsData.items || []);
    } catch (err) {
      if (!handleApiError(err)) console.error('Fehler beim Laden der Ausgaben:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [selectedYear, selectedMonth, selectedCategory, selectedSubcategory]);

  // Build chart data
  const chartData = useMemo(() => {
    if (!summary) return [];

    // Month selected → show days
    if (selectedMonth) {
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = String(i + 1).padStart(2, '0');
        const monthStr = String(selectedMonth).padStart(2, '0');
        const key = `${selectedYear}-${monthStr}-${day}`;
        return { name: `${i + 1}`, value: summary.by_day?.[key] || 0 };
      });
    }

    // No month → show all 12 months
    return Array.from({ length: 12 }, (_, i) => {
      const monthStr = String(i + 1).padStart(2, '0');
      const key = `${selectedYear}-${monthStr}`;
      return { name: MONTHS_DE[i + 1], value: summary.by_month?.[key] || 0 };
    });
  }, [summary, selectedYear, selectedMonth]);

  // Category breakdown for chart
  const categoryChartData = useMemo(() => {
    if (!summary?.by_category) return [];
    return Object.entries(summary.by_category)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, value]) => ({ name: cat, value, color: CATEGORY_COLORS[cat] || FALLBACK_COLOR }));
  }, [summary]);

  const subcategories = selectedCategory ? (categories[selectedCategory] || []) : [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }} className="animate-fade-in">
        <div style={{ padding: 8, borderRadius: 10, background: 'var(--warning-soft)' }}>
          <DollarSign style={{ width: 18, height: 18, color: 'var(--warning-text)' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('expenses.title')}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>{t('expenses.subtitle')}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card animate-fade-in-up" style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <select
            className="input-dark"
            style={{ fontSize: 13, appearance: 'none', minWidth: 90, flex: 1 }}
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            className="input-dark"
            style={{ fontSize: 13, appearance: 'none', minWidth: 120, flex: 1 }}
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
          >
            <option value={0}>Alle Monate</option>
            {MONTHS_FULL.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>

        {/* Category Chips */}
        {Object.keys(categories).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            <button
              onClick={() => { setSelectedCategory(''); setSelectedSubcategory(''); }}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                background: !selectedCategory ? 'var(--accent-gradient)' : 'var(--bg-glass)',
                color: !selectedCategory ? 'white' : 'var(--text-secondary)',
              }}
            >
              Alle
            </button>
            {Object.keys(categories).map(cat => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat === selectedCategory ? '' : cat); setSelectedSubcategory(''); }}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                  background: selectedCategory === cat ? (CATEGORY_COLORS[cat] || FALLBACK_COLOR) : 'var(--bg-glass)',
                  color: selectedCategory === cat ? 'white' : 'var(--text-secondary)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Subcategory Chips */}
        {subcategories.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {subcategories.map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubcategory(sub === selectedSubcategory ? '' : sub)}
                style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                  background: selectedSubcategory === sub ? 'var(--accent-solid)' : 'var(--accent-soft)',
                  color: selectedSubcategory === sub ? 'white' : 'var(--accent-solid)',
                }}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(139,92,246,0.15)', borderTopColor: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : !summary ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>{t('expenses.noData')}</div>
      ) : (
        <>
          {/* Total Card */}
          <div className="glass-card animate-fade-in-up" style={{ padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ padding: 10, borderRadius: 12, background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.08))' }}>
                <TrendingUp style={{ width: 24, height: 24, color: 'var(--warning-text)' }} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{t('expenses.totalExpenses')}</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', margin: '2px 0 0', lineHeight: 1 }}>{fmt(summary.total)}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  {summary.count} Positionen
                </p>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          {chartData.length > 0 && (
            <div className="glass-card animate-fade-in-up" style={{ padding: 16, marginBottom: 14 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar style={{ width: 16, height: 16, color: 'var(--accent-solid)' }} />
                {selectedMonth ? `${MONTHS_FULL[selectedMonth]} ${selectedYear}` : `Ausgaben ${selectedYear}`}
              </h2>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} stroke="rgba(255,255,255,0.08)" />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickFormatter={v => `${v}€`} stroke="rgba(255,255,255,0.08)" />
                    <Tooltip
                      formatter={(v) => fmt(v)}
                      labelStyle={{ fontWeight: 600, color: '#fff' }}
                      contentStyle={{ background: 'rgba(15,20,35,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#fff' }}
                      itemStyle={{ color: '#a78bfa' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Category Breakdown Chart */}
          {categoryChartData.length > 0 && !selectedCategory && (
            <div className="glass-card animate-fade-in-up" style={{ padding: 16, marginBottom: 14 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 14px' }}>Nach Kategorie</h2>
              <div style={{ width: '100%', height: Math.max(categoryChartData.length * 40, 150) }}>
                <ResponsiveContainer>
                  <BarChart data={categoryChartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickFormatter={v => `${v}€`} stroke="rgba(255,255,255,0.08)" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.7)' }} width={110} stroke="rgba(255,255,255,0.08)" />
                    <Tooltip
                      formatter={(v) => fmt(v)}
                      contentStyle={{ background: 'rgba(15,20,35,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#fff' }}
                      itemStyle={{ color: '#a78bfa' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {categoryChartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Items List */}
          {items.length > 0 && (
            <div className="glass-card animate-fade-in-up" style={{ overflow: 'hidden', padding: 0 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-glass)' }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Einzelpositionen ({items.length})</h2>
              </div>
              <div>
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px 16px', cursor: item.document_id ? 'pointer' : 'default',
                      borderBottom: idx < items.length - 1 ? '1px solid var(--border-glass)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      transition: 'background 0.15s ease',
                    }}
                    onClick={() => item.document_id && navigate(`/documents/${item.document_id}`)}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 600,
                          color: 'white', backgroundColor: CATEGORY_COLORS[item.category] || FALLBACK_COLOR,
                        }}>
                          {item.category}
                        </span>
                        {item.subcategory && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.subcategory}</span>
                        )}
                        {item.absender && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>von {item.absender}</span>
                        )}
                        {item.date && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {formatLocalDate(item.date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{fmt(item.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
