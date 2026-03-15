import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, TrendingUp, Loader2, Calendar
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getExpenseCategories, getExpenseItems, getExpenseSummary } from '../api';
import { useSubscription } from '../hooks/useSubscription';
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
  const { isFree } = useSubscription();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState({});
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');

  if (isFree) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-900">{t('expenses.title')}</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
      console.error('Fehler beim Laden der Ausgaben:', err);
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
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-amber-100 rounded-lg">
          <DollarSign className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('expenses.title')}</h1>
          <p className="text-sm text-slate-500">{t('expenses.subtitle')}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Year */}
          <select
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Month */}
          <select
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
          >
            <option value={0}>Alle Monate</option>
            {MONTHS_FULL.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>

        {/* Category Chips */}
        {Object.keys(categories).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => { setSelectedCategory(''); setSelectedSubcategory(''); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border-none ${
                !selectedCategory ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Alle
            </button>
            {Object.keys(categories).map(cat => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat === selectedCategory ? '' : cat); setSelectedSubcategory(''); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border-none ${
                  selectedCategory === cat ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                style={selectedCategory === cat ? { backgroundColor: CATEGORY_COLORS[cat] || FALLBACK_COLOR } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Subcategory Chips */}
        {subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {subcategories.map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubcategory(sub === selectedSubcategory ? '' : sub)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border-none ${
                  selectedSubcategory === sub ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : !summary ? (
        <div className="text-center py-20 text-slate-500">{t('expenses.noData')}</div>
      ) : (
        <>
          {/* Total Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <TrendingUp className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('expenses.totalExpenses')}</p>
                <p className="text-3xl font-bold text-slate-900">{fmt(summary.total)}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {summary.count} Positionen
                </p>
              </div>
            </div>
          </div>

          {/* Bar Chart — Months or Days */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                {selectedMonth ? `${MONTHS_FULL[selectedMonth]} ${selectedYear}` : `Ausgaben ${selectedYear}`}
              </h2>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `${v}€`} />
                    <Tooltip formatter={(v) => fmt(v)} labelStyle={{ fontWeight: 600 }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Category Breakdown Chart */}
          {categoryChartData.length > 0 && !selectedCategory && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Nach Kategorie</h2>
              <div style={{ width: '100%', height: Math.max(categoryChartData.length * 44, 150) }}>
                <ResponsiveContainer>
                  <BarChart data={categoryChartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `${v}€`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#374151' }} width={120} />
                    <Tooltip formatter={(v) => fmt(v)} />
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">Einzelpositionen ({items.length})</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="px-5 py-3 hover:bg-indigo-50/50 cursor-pointer transition-colors flex items-center justify-between gap-3"
                    onClick={() => item.document_id && navigate(`/documents/${item.document_id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-medium text-white"
                          style={{ backgroundColor: CATEGORY_COLORS[item.category] || FALLBACK_COLOR }}
                        >
                          {item.category}
                        </span>
                        {item.subcategory && (
                          <span className="text-xs text-slate-500">{item.subcategory}</span>
                        )}
                        {item.absender && (
                          <span className="text-xs text-slate-400">von {item.absender}</span>
                        )}
                        {item.date && (
                          <span className="text-xs text-slate-400">
                            {new Date(item.date).toLocaleDateString('de-DE')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{fmt(item.price)}</span>
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
