import React, { useState } from 'react';
import { TaxRecord, TAX_TYPES } from '../types';
import { formatCurrency } from '../utils/taxCalculations';
import { Trash2, Clock, Database, AlertCircle } from 'lucide-react';

interface TaxHistoryProps {
  records: TaxRecord[];
  loading: boolean;
  onDelete: (id: number) => void;
}

export const TaxHistory: React.FC<TaxHistoryProps> = ({ records, loading, onDelete }) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = (id: number) => {
    setDeletingId(id);
    onDelete(id);
  };

  const getTaxLabel = (code: string) => {
    const found = TAX_TYPES.find((t) => t.id === code);
    return found ? `${found.icon} ${found.label}` : code;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fa-AF', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <span className="loading loading-spinner loading-lg text-primary" />
        <span className="text-base-content/60 text-sm">بارگذاری تاریخچه...</span>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-base-content/40">
        <Database size={40} className="opacity-40" />
        <p className="text-sm">هنوز هیچ محاسبه‌ای ذخیره نشده</p>
        <p className="text-xs">بعد از محاسبه مالیه، دکمه «ذخیره» را بزنید</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Clock size={16} className="text-primary" />
        <span className="text-sm text-base-content/60">{records.length} محاسبه ذخیره شده</span>
      </div>
      {records.map((rec) => (
        <div key={rec.id} className="card bg-base-200">
          <div className="card-body p-4 gap-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-bold text-sm">{getTaxLabel(rec.tax_type)}</span>
                {rec.taxpayer_name && (
                  <span className="text-xs text-base-content/60 mr-2">— {rec.taxpayer_name}</span>
                )}
              </div>
              <button
                className="btn btn-ghost btn-xs text-error"
                onClick={() => handleDelete(rec.id)}
                disabled={deletingId === rec.id}
              >
                {deletingId === rec.id ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <Trash2 size={14} />
                )}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-base-content/50">عاید ناخالص:</span>
                <div className="font-mono" dir="ltr">{formatCurrency(Number(rec.gross_income))}</div>
              </div>
              <div>
                <span className="text-base-content/50">مالیه:</span>
                <div className="font-mono text-secondary" dir="ltr">{formatCurrency(Number(rec.tax_amount))}</div>
              </div>
              <div>
                <span className="text-base-content/50">نرخ مؤثر:</span>
                <div className="font-mono" dir="ltr">{Number(rec.tax_rate)}%</div>
              </div>
            </div>
            {rec.period && (
              <div className="text-xs text-base-content/40">دوره: {rec.period}</div>
            )}
            <div className="text-xs text-base-content/30">{formatDate(rec.created_at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
