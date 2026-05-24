import React from 'react';
import { TaxType } from '../types';
import { Info } from 'lucide-react';

interface TaxRatesReferenceProps {
  taxType: TaxType;
}

export const TaxRatesReference: React.FC<TaxRatesReferenceProps> = ({
  taxType,
}) => {
  const renderRates = () => {
    switch (taxType) {
      case 'salary':
        return (
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>معاش ماهوار</th>
                <th>نرخ مالیه</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>۰ تا ۵,۰۰۰ ؋</td>
                <td>۰٪</td>
              </tr>
              <tr>
                <td>۵,۰۰۱ تا ۱۲,۵۰۰ ؋</td>
                <td>۲٪ مبلغ بالای ۵,۰۰۰</td>
              </tr>
              <tr>
                <td>۱۲,۵۰۱ تا ۱۰۰,۰۰۰ ؋</td>
                <td>۱۵۰ + ۱۰٪ مبلغ بالای ۱۲,۵۰۰</td>
              </tr>
              <tr>
                <td>بالای ۱۰۰,۰۰۰ ؋</td>
                <td>۸,۹۰۰ + ۲۰٪ مبلغ بالای ۱۰۰,۰۰۰</td>
              </tr>
            </tbody>
          </table>
        );

      case 'personal':
        return (
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>عایدات سالانه</th>
                <th>نرخ مالیه</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>۰ تا ۶۰,۰۰۰ ؋</td>
                <td>۰٪</td>
              </tr>
              <tr>
                <td>۶۰,۰۰۱ تا ۱۵۰,۰۰۰ ؋</td>
                <td>۲٪ مبلغ بالای ۶۰,۰۰۰</td>
              </tr>
              <tr>
                <td>۱۵۰,۰۰۱ تا ۱,۲۰۰,۰۰۰ ؋</td>
                <td>۱,۸۰۰ + ۱۰٪ مبلغ بالای ۱۵۰,۰۰۰</td>
              </tr>
              <tr>
                <td>بالای ۱,۲۰۰,۰۰۰ ؋</td>
                <td>۱۰۶,۸۰۰ + ۲۰٪ مبلغ بالای ۱,۲۰۰,۰۰۰</td>
              </tr>
            </tbody>
          </table>
        );

      case 'corporate':
        return (
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>نوع</th>
                <th>نرخ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>شرکت‌ها و شخصیت‌های حکمی</td>
                <td>۲۰٪ عایدات خالص قابل مالیه</td>
              </tr>
            </tbody>
          </table>
        );

      case 'rent':
        return (
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>کرایه ماهوار</th>
                <th>نرخ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>زیر ۱۰,۰۰۰ ؋</td>
                <td>معاف</td>
              </tr>
              <tr>
                <td>۱۰,۰۰۰ تا ۱۰۰,۰۰۰ ؋</td>
                <td>۱۰٪</td>
              </tr>
              <tr>
                <td>بالای ۱۰۰,۰۰۰ ؋</td>
                <td>۱۵٪</td>
              </tr>
            </tbody>
          </table>
        );

      case 'contract':
        return (
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>وضعیت</th>
                <th>نرخ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>دارای جواز فعالیت اجتماعی/مالی</td>
                <td>۲٪</td>
              </tr>
              <tr>
                <td>بدون جواز</td>
                <td>۷٪</td>
              </tr>
            </tbody>
          </table>
        );

      case 'brt':
        return (
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>شرح</th>
                <th>نرخ</th>
                <th>دوره</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>مالیه معاملاتی از عواید ناخالص انتفاعی</td>
                <td>۴٪</td>
                <td>ربع‌وار</td>
              </tr>
              <tr>
                <td>مالیه بر عواید خالص</td>
                <td>۲۰٪</td>
                <td>سالانه</td>
              </tr>
            </tbody>
          </table>
        );
    }
  };

  return (
    <div className="collapse collapse-arrow bg-base-200">
      <input type="checkbox" />
      <div className="collapse-title font-medium flex items-center gap-2">
        <Info size={16} className="text-info opacity-60" />
        جدول نرخ‌های مالیاتی (مرجع)
      </div>
      <div className="collapse-content">{renderRates()}</div>
    </div>
  );
};
