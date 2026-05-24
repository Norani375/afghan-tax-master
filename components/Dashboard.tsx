import React, { useState, useEffect } from 'react';
import { DashboardStats, TAX_CATEGORIES } from '../types';
import { getDashboardStats } from '../utils/database';
import { formatCurrency } from '../utils/taxCalculations';
import { BarChart3, TrendingUp, Wallet, Receipt, RefreshCw, CheckCircle } from 'lucide-react';

export const Dashboard: React.FC<{}> = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  const getCategoryIcon = (category: string) => {
    const found = TAX_CATEGORIES.find((c) => c.label === category);
    return found ? found.icon : '📄';
  };

  const maxCategoryTotal = stats
    ? Math.max(...stats.categories.map((c) => c.total_assessment), 1)
    : 1;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="loading loading-spinner loading-lg text-primary" />
        <span className="text-base-content/60 text-sm">بارگذاری داشبورد...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="alert alert-error">خطا در بارگذاری آمار</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 size={20} className="text-primary" /> داشبورد مالیاتی
        </h2>
        <button className="btn btn-ghost btn-sm" onClick={loadStats} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> بازنشانی
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card bg-base-200">
          <div className="card-body p-4 gap-1">
            <div className="flex items-center gap-2 text-xs text-base-content/60">
              <Receipt size={14} /> مجموع معینه
            </div>
            <div className="text-lg font-bold text-primary" dir="ltr">
              {formatCurrency(stats.totalAssessment)}
            </div>
          </div>
        </div>
        <div className="card bg-base-200">
          <div className="card-body p-4 gap-1">
            <div className="flex items-center gap-2 text-xs text-base-content/60">
              <Wallet size={14} /> مجموع پرداخت
            </div>
            <div className="text-lg font-bold text-success" dir="ltr">
              {formatCurrency(stats.totalPaid)}
            </div>
          </div>
        </div>
        <div className="card bg-base-200">
          <div className="card-body p-4 gap-1">
            <div className="flex items-center gap-2 text-xs text-base-content/60">
              <TrendingUp size={14} /> باقیمانده
            </div>
            <div className={`text-lg font-bold ${stats.totalBalance > 0 ? 'text-error' : 'text-success'}`} dir="ltr">
              {stats.totalBalance === 0 ? '✅ صفر' : formatCurrency(stats.totalBalance)}
            </div>
          </div>
        </div>
        <div className="card bg-base-200">
          <div className="card-body p-4 gap-1">
            <div className="flex items-center gap-2 text-xs text-base-content/60">
              <CheckCircle size={14} /> تعداد دوره‌ها
            </div>
            <div className="text-lg font-bold">{stats.totalRecords}</div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="card bg-base-200">
        <div className="card-body p-4 gap-4">
          <h3 className="card-title text-sm">📊 تفکیک بر اساس نوع مالیه</h3>
          <div className="space-y-4">
            {stats.categories.map((cat) => {
              const pct = stats.totalAssessment > 0
                ? ((cat.total_assessment / stats.totalAssessment) * 100).toFixed(1)
                : '0';
              const barPct = ((cat.total_assessment / maxCategoryTotal) * 100).toFixed(0);
              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-start justify-between text-sm">
                    <span className="flex items-center gap-1 leading-tight">
                      <span>{getCategoryIcon(cat.category)}</span>
                      <span className="line-clamp-1">{cat.category}</span>
                    </span>
                    <span className="badge badge-sm badge-ghost whitespace-nowrap mr-2">
                      {cat.count} دوره
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="w-full bg-base-300 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-primary h-3 rounded-full transition-all duration-500"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-base-content/60 whitespace-nowrap w-16 text-left" dir="ltr">
                      {pct}%
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-base-content/60">
                    <span>معینه: <span className="font-mono" dir="ltr">{formatCurrency(cat.total_assessment)}</span></span>
                    <span>پرداخت: <span className="font-mono text-success" dir="ltr">{formatCurrency(cat.total_paid)}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="card bg-base-200">
        <div className="card-body p-4 gap-3">
          <h3 className="card-title text-sm">📋 خلاصه وضعیت</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>نوع مالیه</th>
                  <th className="text-left" dir="ltr">تعداد</th>
                  <th className="text-left" dir="ltr">معینه</th>
                  <th className="text-left" dir="ltr">پرداخت</th>
                </tr>
              </thead>
              <tbody>
                {stats.categories.map((cat) => (
                  <tr key={cat.category}>
                    <td className="text-sm">
                      {getCategoryIcon(cat.category)} {cat.category}
                    </td>
                    <td className="font-mono text-left" dir="ltr">{cat.count}</td>
                    <td className="font-mono text-left" dir="ltr">{formatCurrency(cat.total_assessment)}</td>
                    <td className="font-mono text-success text-left" dir="ltr">{formatCurrency(cat.total_paid)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td>مجموع</td>
                  <td className="font-mono text-left" dir="ltr">{stats.totalRecords}</td>
                  <td className="font-mono text-left" dir="ltr">{formatCurrency(stats.totalAssessment)}</td>
                  <td className="font-mono text-success text-left" dir="ltr">{formatCurrency(stats.totalPaid)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
