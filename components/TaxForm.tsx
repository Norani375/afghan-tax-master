import React, { useState } from 'react';
import { TaxType, TaxResult } from '../types';
import {
  calculateSalaryTax,
  calculatePersonalIncomeTax,
  calculateCorporateTax,
  calculateRentTax,
  calculateContractTax,
  calculateBRT,
} from '../utils/taxCalculations';
import { Calculator } from 'lucide-react';

interface TaxFormProps {
  taxType: TaxType;
  onResult: (result: TaxResult) => void;
}

export const TaxForm: React.FC<TaxFormProps> = ({ taxType, onResult }) => {
  const [amount, setAmount] = useState('');
  const [deductions, setDeductions] = useState('');
  const [hasLicense, setHasLicense] = useState(true);


  const handleCalculate = () => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) return;

    let result: TaxResult;

    switch (taxType) {
      case 'salary':
        result = calculateSalaryTax(numAmount);
        break;
      case 'personal':
        result = calculatePersonalIncomeTax(numAmount);
        break;
      case 'corporate':
        result = calculateCorporateTax(
          numAmount,
          parseFloat(deductions) || 0
        );
        break;
      case 'rent':
        result = calculateRentTax(numAmount);
        break;
      case 'contract':
        result = calculateContractTax(numAmount, hasLicense);
        break;
      case 'brt':
        result = calculateBRT(numAmount);
        break;
      default:
        return;
    }

    onResult(result);
  };

  const renderFormFields = () => {
    switch (taxType) {
      case 'salary':
        return (
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-semibold">معاش ماهوار (افغانی)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full text-lg"
              placeholder="مثال: ۵۰۰۰۰"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0}
              dir="ltr"
            />
            <label className="label">
              <span className="label-text-alt text-base-content/50">
                مطابق ماده ۴ قانون مالیات بر عایدات - نرخ تصاعدی ماهوار
              </span>
            </label>
          </div>
        );

      case 'personal':
        return (
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-semibold">عایدات سالانه (افغانی)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full text-lg"
              placeholder="مثال: ۶۰۰۰۰۰"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0}
              dir="ltr"
            />
            <label className="label">
              <span className="label-text-alt text-base-content/50">
                مجموع عایدات از تمام منابع در یک سال مالی
              </span>
            </label>
          </div>
        );

      case 'corporate':
        return (
          <>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">عایدات خالص سالانه (افغانی)</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full text-lg"
                placeholder="مثال: ۵۰۰۰۰۰۰"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                dir="ltr"
              />
            </div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">
                  مصارف قابل مجرایی (افغانی)
                </span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full text-lg"
                placeholder="اختیاری - مثال: ۱۰۰۰۰۰۰"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
                min={0}
                dir="ltr"
              />
              <label className="label">
                <span className="label-text-alt text-base-content/50">
                  نرخ ثابت ۲۰٪ مطابق ماده ۴(۱) قانون مالیات بر عایدات
                </span>
              </label>
            </div>
          </>
        );

      case 'rent':
        return (
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-semibold">کرایه ماهوار (افغانی)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full text-lg"
              placeholder="مثال: ۳۰۰۰۰"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0}
              dir="ltr"
            />
            <label className="label">
              <span className="label-text-alt text-base-content/50">
                مالیه موضوعی بر کرایه جایداد - توسط کرایه‌نشین پرداخت می‌شود
              </span>
            </label>
          </div>
        );

      case 'contract':
        return (
          <>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">مبلغ قرارداد (افغانی)</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full text-lg"
                placeholder="مثال: ۲۰۰۰۰۰"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                dir="ltr"
              />
            </div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">وضعیت جواز</span>
              </label>
              <div className="flex gap-4">
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="license"
                    className="radio radio-primary"
                    checked={hasLicense}
                    onChange={() => setHasLicense(true)}
                  />
                  <span className="label-text">دارای جواز (۲٪)</span>
                </label>
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="license"
                    className="radio radio-secondary"
                    checked={!hasLicense}
                    onChange={() => setHasLicense(false)}
                  />
                  <span className="label-text">بدون جواز (۷٪)</span>
                </label>
              </div>
            </div>
          </>
        );

      case 'brt':
        return (
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-semibold">عواید ناخالص انتفاعی ربع‌وار (افغانی)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full text-lg"
              placeholder="مثال: ۱۰۰۰۰۰۰"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0}
              dir="ltr"
            />
            <label className="label">
              <span className="label-text-alt text-base-content/50">
                ۴٪ از عواید ناخالص انتفاعی — ربع‌وار | ۲۰٪ از عواید خالص — سالانه
              </span>
            </label>
          </div>
        );
    }
  };

  return (
    <div className="card bg-base-200">
      <div className="card-body gap-4">
        {renderFormFields()}
        <button
          className="btn btn-primary btn-lg w-full mt-2"
          onClick={handleCalculate}
          disabled={!amount || parseFloat(amount) <= 0}
        >
          <Calculator size={20} />
          محاسبه مالیه
        </button>
      </div>
    </div>
  );
};
