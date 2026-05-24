import React, { useState } from 'react';
import { TaxResult } from '../types';
import { formatCurrency } from '../utils/taxCalculations';
import { CheckCircle, TrendingDown, Receipt, Save, Check } from 'lucide-react';

interface TaxResultCardProps {
  result: TaxResult;
  taxLabel: string;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
}

export const TaxResultCard: React.FC<TaxResultCardProps> = ({
  result,
  taxLabel,
  onSave,
  saving,
  saved,
}) => {
  return (
    <div className="card bg-base-200 animate-fade-in">
      <div className="card-body gap-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="stat bg-base-300 rounded-xl p-3">
            <div className="stat-title text-xs">مبلغ قابل مالیه</div>
            <div className="stat-value text-sm md:text-lg text-primary" dir="ltr">
              {formatCurrency(result.taxableAmount)}
            </div>
          </div>
          <div className="stat bg-secondary/10 rounded-xl p-3">
            <div className="stat-title text-xs flex items-center gap-1">
              <Receipt size={12} className="opacity-60" />
              مالیه قابل پرداخت
            </div>
            <div className="stat-value text-sm md:text-lg text-secondary" dir="ltr">
              {formatCurrency(result.totalTax)}
            </div>
          </div>
          <div className="stat bg-base-300 rounded-xl p-3">
            <div className="stat-title text-xs flex items-center gap-1">
              <TrendingDown size={12} className="opacity-60" />
              نرخ مؤثر
            </div>
            <div className="stat-value text-sm md:text-lg" dir="ltr">
              {result.effectiveRate}%
            </div>
          </div>
        </div>

        {/* Breakdown table */}
        <div>
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <CheckCircle size={16} className="text-success" />
            جزئیات محاسبه {taxLabel}
          </h3>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>شرح</th>
                  <th className="text-center">نرخ</th>
                  <th className="text-left" dir="ltr">مبلغ مالیه</th>
                </tr>
              </thead>
              <tbody>
                {result.breakdown.map((row, i) => (
                  <tr key={i}>
                    <td className="text-sm">{row.label}</td>
                    <td className="text-center">
                      {row.rate && (
                        <span className="badge badge-outline badge-sm">
                          {row.rate}
                        </span>
                      )}
                    </td>
                    <td className="text-left font-mono" dir="ltr">
                      {formatCurrency(Math.abs(row.amount))}
                      {row.amount < 0 ? ' −' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td>مجموع مالیه</td>
                  <td></td>
                  <td className="text-left text-secondary font-mono" dir="ltr">
                    {formatCurrency(result.totalTax)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Net amount */}
        <div className="alert bg-primary/10 border-primary/20">
          <div className="flex justify-between items-center w-full">
            <span className="font-bold">مبلغ خالص بعد از مالیه:</span>
            <span className="font-bold text-lg text-primary" dir="ltr">
              {formatCurrency(result.taxableAmount - result.totalTax)}
            </span>
          </div>
        </div>

        {/* Save button */}
        {onSave && (
          <button
            className={`btn w-full ${saved ? 'btn-success' : 'btn-primary'}`}
            onClick={onSave}
            disabled={saving || saved}
          >
            {saving ? (
              <><span className="loading loading-spinner loading-sm" /> در حال ذخیره...</>
            ) : saved ? (
              <><Check size={18} /> ذخیره شد در دیتابیس ✓</>
            ) : (
              <><Save size={18} /> ذخیره در دیتابیس</>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
