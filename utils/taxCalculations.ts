import { TaxResult, TaxBreakdownRow } from '../types';

/**
 * مالیه معاشات (ماهوار)
 * 0 - 5,000: 0%
 * 5,001 - 12,500: 2% of amount over 5,000
 * 12,501 - 100,000: 150 + 10% of amount over 12,500
 * Over 100,000: 8,900 + 20% of amount over 100,000
 */
export function calculateSalaryTax(monthlySalary: number): TaxResult {
  const breakdown: TaxBreakdownRow[] = [];
  let totalTax = 0;

  if (monthlySalary <= 5000) {
    breakdown.push({ label: '۰ تا ۵,۰۰۰ افغانی', amount: 0, rate: '۰٪' });
  } else if (monthlySalary <= 12500) {
    const taxable = monthlySalary - 5000;
    const tax = taxable * 0.02;
    totalTax = tax;
    breakdown.push({ label: '۰ تا ۵,۰۰۰ افغانی', amount: 0, rate: '۰٪' });
    breakdown.push({
      label: `۵,۰۰۱ تا ${formatNumber(monthlySalary)} افغانی`,
      amount: tax,
      rate: '۲٪',
    });
  } else if (monthlySalary <= 100000) {
    const taxable = monthlySalary - 12500;
    const tax = 150 + taxable * 0.1;
    totalTax = tax;
    breakdown.push({ label: '۰ تا ۵,۰۰۰ افغانی', amount: 0, rate: '۰٪' });
    breakdown.push({
      label: '۵,۰۰۱ تا ۱۲,۵۰۰ افغانی',
      amount: 150,
      rate: '۲٪',
    });
    breakdown.push({
      label: `۱۲,۵۰۱ تا ${formatNumber(monthlySalary)} افغانی`,
      amount: taxable * 0.1,
      rate: '۱۰٪',
    });
  } else {
    const taxable = monthlySalary - 100000;
    const tax = 8900 + taxable * 0.2;
    totalTax = tax;
    breakdown.push({ label: '۰ تا ۵,۰۰۰ افغانی', amount: 0, rate: '۰٪' });
    breakdown.push({
      label: '۵,۰۰۱ تا ۱۲,۵۰۰ افغانی',
      amount: 150,
      rate: '۲٪',
    });
    breakdown.push({
      label: '۱۲,۵۰۱ تا ۱۰۰,۰۰۰ افغانی',
      amount: 8750,
      rate: '۱۰٪',
    });
    breakdown.push({
      label: `۱۰۰,۰۰۱ تا ${formatNumber(monthlySalary)} افغانی`,
      amount: taxable * 0.2,
      rate: '۲۰٪',
    });
  }

  const effectiveRate = monthlySalary > 0 ? (totalTax / monthlySalary) * 100 : 0;

  return {
    taxableAmount: monthlySalary,
    totalTax: Math.round(totalTax * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    breakdown,
  };
}

/**
 * مالیات اشخاص حقیقی (سالانه)
 * 0 - 60,000: 0%
 * 60,001 - 150,000: 2% of amount over 60,000
 * 150,001 - 1,200,000: 1,800 + 10% of amount over 150,000
 * Over 1,200,000: 106,800 + 20% of amount over 1,200,000
 */
export function calculatePersonalIncomeTax(annualIncome: number): TaxResult {
  const breakdown: TaxBreakdownRow[] = [];
  let totalTax = 0;

  if (annualIncome <= 60000) {
    breakdown.push({ label: '۰ تا ۶۰,۰۰۰ افغانی', amount: 0, rate: '۰٪' });
  } else if (annualIncome <= 150000) {
    const taxable = annualIncome - 60000;
    const tax = taxable * 0.02;
    totalTax = tax;
    breakdown.push({ label: '۰ تا ۶۰,۰۰۰ افغانی', amount: 0, rate: '۰٪' });
    breakdown.push({
      label: `۶۰,۰۰۱ تا ${formatNumber(annualIncome)} افغانی`,
      amount: tax,
      rate: '۲٪',
    });
  } else if (annualIncome <= 1200000) {
    const taxable = annualIncome - 150000;
    const tax = 1800 + taxable * 0.1;
    totalTax = tax;
    breakdown.push({ label: '۰ تا ۶۰,۰۰۰ افغانی', amount: 0, rate: '۰٪' });
    breakdown.push({
      label: '۶۰,۰۰۱ تا ۱۵۰,۰۰۰ افغانی',
      amount: 1800,
      rate: '۲٪',
    });
    breakdown.push({
      label: `۱۵۰,۰۰۱ تا ${formatNumber(annualIncome)} افغانی`,
      amount: taxable * 0.1,
      rate: '۱۰٪',
    });
  } else {
    const taxable = annualIncome - 1200000;
    const tax = 106800 + taxable * 0.2;
    totalTax = tax;
    breakdown.push({ label: '۰ تا ۶۰,۰۰۰ افغانی', amount: 0, rate: '۰٪' });
    breakdown.push({
      label: '۶۰,۰۰۱ تا ۱۵۰,۰۰۰ افغانی',
      amount: 1800,
      rate: '۲٪',
    });
    breakdown.push({
      label: '۱۵۰,۰۰۱ تا ۱,۲۰۰,۰۰۰ افغانی',
      amount: 105000,
      rate: '۱۰٪',
    });
    breakdown.push({
      label: `۱,۲۰۰,۰۰۱ تا ${formatNumber(annualIncome)} افغانی`,
      amount: taxable * 0.2,
      rate: '۲۰٪',
    });
  }

  const effectiveRate = annualIncome > 0 ? (totalTax / annualIncome) * 100 : 0;

  return {
    taxableAmount: annualIncome,
    totalTax: Math.round(totalTax * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    breakdown,
  };
}

/**
 * مالیات اشخاص حکمی (شرکت‌ها) - ۲۰٪ ثابت
 */
export function calculateCorporateTax(
  netIncome: number,
  deductions: number
): TaxResult {
  const taxableAmount = Math.max(0, netIncome - deductions);
  const totalTax = taxableAmount * 0.2;

  const breakdown: TaxBreakdownRow[] = [
    { label: 'عایدات خالص', amount: netIncome, rate: '' },
  ];
  if (deductions > 0) {
    breakdown.push({
      label: 'مصارف قابل مجرایی (کسر)',
      amount: -deductions,
      rate: '',
    });
  }
  breakdown.push({
    label: 'مالیات ۲۰٪ بر عایدات قابل مالیه',
    amount: totalTax,
    rate: '۲۰٪',
  });

  const effectiveRate =
    netIncome > 0 ? (totalTax / netIncome) * 100 : 0;

  return {
    taxableAmount,
    totalTax: Math.round(totalTax * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    breakdown,
  };
}

/**
 * مالیه کرایه (ماهوار)
 * زیر ۱۰,۰۰۰: 0%
 * ۱۰,۰۰۰ - ۱۰۰,۰۰۰: 10%
 * بالای ۱۰۰,۰۰۰: 15%
 */
export function calculateRentTax(monthlyRent: number): TaxResult {
  const breakdown: TaxBreakdownRow[] = [];
  let totalTax = 0;

  if (monthlyRent < 10000) {
    breakdown.push({
      label: 'زیر ۱۰,۰۰۰ افغانی',
      amount: 0,
      rate: '۰٪ (معاف)',
    });
  } else if (monthlyRent <= 100000) {
    totalTax = monthlyRent * 0.1;
    breakdown.push({
      label: `کرایه ماهوار ${formatNumber(monthlyRent)} افغانی`,
      amount: totalTax,
      rate: '۱۰٪',
    });
  } else {
    totalTax = monthlyRent * 0.15;
    breakdown.push({
      label: `کرایه ماهوار ${formatNumber(monthlyRent)} افغانی`,
      amount: totalTax,
      rate: '۱۵٪',
    });
  }

  const effectiveRate = monthlyRent > 0 ? (totalTax / monthlyRent) * 100 : 0;

  return {
    taxableAmount: monthlyRent,
    totalTax: Math.round(totalTax * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    breakdown,
  };
}

/**
 * مالیه قراردادها
 * بدون جواز: 7%
 * دارای جواز: 2%
 */
export function calculateContractTax(
  amount: number,
  hasLicense: boolean
): TaxResult {
  const rate = hasLicense ? 0.02 : 0.07;
  const rateLabel = hasLicense ? '۲٪' : '۷٪';
  const totalTax = amount * rate;
  const typeLabel = hasLicense
    ? 'دارای جواز فعالیت'
    : 'بدون جواز فعالیت';

  return {
    taxableAmount: amount,
    totalTax: Math.round(totalTax * 100) / 100,
    effectiveRate: rate * 100,
    breakdown: [
      {
        label: `مبلغ قرارداد (${typeLabel})`,
        amount: totalTax,
        rate: rateLabel,
      },
    ],
  };
}

/**
 * مالیه معاملاتی BRT
 * ۴٪ از عواید ناخالص انتفاعی — ربع‌وار
 * ۲۰٪ از عواید خالص — سالانه
 */
export function calculateBRT(grossIncome: number): TaxResult {
  const brtRate = 0.04;
  const annualRate = 0.20;

  const quarterlyBRT = grossIncome * brtRate;
  const annualBRT = quarterlyBRT * 4;

  // Estimate annual net income as gross * 4 for annual tax reference
  const annualGross = grossIncome * 4;
  const annualNetTax = annualGross * annualRate;

  const totalQuarterlyTax = quarterlyBRT;

  const breakdown: TaxBreakdownRow[] = [
    {
      label: 'عواید ناخالص انتفاعی ربع‌وار',
      amount: grossIncome,
      rate: '',
    },
    {
      label: 'مالیه معاملاتی ربع‌وار (۴٪)',
      amount: quarterlyBRT,
      rate: '۴٪',
    },
    {
      label: 'مالیه معاملاتی سالانه (۴ ربع)',
      amount: annualBRT,
      rate: '۴٪ × ۴',
    },
    {
      label: 'مالیه عواید خالص سالانه (تخمینی)',
      amount: annualNetTax,
      rate: '۲۰٪',
    },
  ];

  const effectiveRate =
    grossIncome > 0 ? (totalQuarterlyTax / grossIncome) * 100 : 0;

  return {
    taxableAmount: grossIncome,
    totalTax: Math.round(totalQuarterlyTax * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    breakdown,
  };
}

/** Format a number with commas for display */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/** Convert a number to Dari/Farsi numerals */
export function toDariDigits(n: number | string): string {
  const dariDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (d) => dariDigits[parseInt(d)]);
}

/** Format currency for display */
export function formatCurrency(amount: number): string {
  return `${formatNumber(Math.round(amount))} ؋`;
}
