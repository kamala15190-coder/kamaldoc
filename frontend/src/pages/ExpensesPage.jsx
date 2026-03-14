import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, TrendingUp, Filter, Loader2, BarChart3,
  ChevronDown, Receipt, Calendar
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getExpenses } from '../api';
import { useSubscription } from '../hooks/useSubscription';
import UpgradePrompt from '../components/UpgradePrompt';

const EXPENSE_COLORS = {
  versicherung: '#6366f1',
  miete: '#f59e0b',
  strom: '#10b981',
  internet: '#3b82f6',
  telefon: '#8b5cf6',
  lebensmittel: '#ef4444',
  transport: '#14b8a6',
  gesundheit: '#ec4899',
  bildung: '#06b6d4',
  unterhaltung: '#f97316',
  kleidung: '#a855f7',
  haushalt: '#84cc16',
  steuern: '#dc2626',
  gebuehren: '#64748b',
  abonnement: '#0ea5e9',
  sonstiges: '#94a3b8',
};

export default function ExpensesPage() {
  const { t } = useTranslation();
  const { isFree } = useSubscription();

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
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = all
  const [selectedCategory, setSelectedCategory] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedYear) params.year = selectedYear;
      if (selectedMonth) params.month = selectedMonth;
      if (selectedCategory) params.expense_category = selectedCategory;
      const result = await getExpenses(params);
      setData(result);
    } catch (err) {
      console.error('Fehler beim Laden der Ausgaben:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth, selectedCategory]);

  const months = [
    '', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current, current - 1, current - 2, current - 3];
  }, []);

  const categories = Object.keys(EXPENSE_COLORS);

  // Max value for bar chart scaling
  const maxCatValue = data ? Math.max(...Object.values(data.by_category || {}), 1) : 1;
  const maxMonthValue = data ? Math.max(...Object.values(data.by_month || {}), 1) : 1;

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

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
            >
              <option value={0}>{t('expenses.allMonths')}</option>
              {months.slice(1).map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="">{t('expenses.allCategories')}</option>
              {categories.map(c => (
                <option key={c} value={c}>{t(`expenseCategories.${c}`, c)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : !data ? (
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
                <p className="text-3xl font-bold text-slate-900">
                  {Number(data.total).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {data.items.length} {t('expenses.invoiceCount')}
                </p>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          {Object.keys(data.by_category || {}).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                {t('expenses.byCategory')}
              </h2>
              <div className="space-y-3">
                {Object.entries(data.by_category)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amount]) => (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">
                          {t(`expenseCategories.${cat}`, cat)}
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {Number(amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max((amount / maxCatValue) * 100, 2)}%`,
                            backgroundColor: EXPENSE_COLORS[cat] || '#94a3b8',
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Monthly Breakdown */}
          {Object.keys(data.by_month || {}).length > 0 && !selectedMonth && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                {t('expenses.byMonth')}
              </h2>
              <div className="space-y-3">
                {Object.entries(data.by_month)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([month, amount]) => {
                    const [y, m] = month.split('-');
                    const label = `${months[parseInt(m)]} ${y}`;
                    return (
                      <div key={month}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700">{label}</span>
                          <span className="text-sm font-semibold text-slate-900">
                            {Number(amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                          <div
                            className="h-2.5 rounded-full bg-indigo-500 transition-all duration-500"
                            style={{ width: `${Math.max((amount / maxMonthValue) * 100, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Invoice List */}
          {data.items.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">{t('expenses.invoiceList')}</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {data.items.map(item => (
                  <div
                    key={item.id}
                    className="px-5 py-3 hover:bg-indigo-50/50 cursor-pointer transition-colors flex items-center justify-between gap-3"
                    onClick={() => navigate(`/documents/${item.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.absender || '—'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.datum && (
                          <span className="text-xs text-slate-500">
                            {new Date(item.datum).toLocaleDateString('de-DE')}
                          </span>
                        )}
                        {item.expense_category && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-medium text-white"
                            style={{ backgroundColor: EXPENSE_COLORS[item.expense_category] || '#94a3b8' }}
                          >
                            {t(`expenseCategories.${item.expense_category}`, item.expense_category)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
                      {Number(item.betrag).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </span>
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
