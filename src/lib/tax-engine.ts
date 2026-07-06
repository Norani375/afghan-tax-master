/**
 * موتور محاسبات هوشمند مالیاتی افغانستان
 * مطابق قوانین ARD (اداره عواید افغانستان) و ماده‌های ۴، ۵۸، ۶۰، ۷۲ قانون مالیات بر درآمد
 */

// ============ مالیات پلکانی حقوق (ماهانه، افغانی) ============
export function calcSalaryTax(gross: number): { tax: number; net: number; bracket: string } {
  const g = Math.max(0, gross || 0);
  let tax = 0, bracket = 'معاف';
  if (g <= 5000) { tax = 0; bracket = 'معاف (تا ۵,۰۰۰)'; }
  else if (g <= 12500) { tax = (g - 5000) * 0.02; bracket = '۲٪ (۵,۰۰۱ – ۱۲,۵۰۰)'; }
  else if (g <= 100000) { tax = 150 + (g - 12500) * 0.10; bracket = '۱۰٪ (۱۲,۵۰۱ – ۱۰۰,۰۰۰)'; }
  else { tax = 150 + 8750 + (g - 100000) * 0.20; bracket = '۲۰٪ (مازاد بر ۱۰۰,۰۰۰)'; }
  return { tax: Math.round(tax * 100) / 100, net: g - tax, bracket };
}

// ============ مالیات تکلیفی اجاره ============
export function calcRentTax(gross: number): { tax: number; rate: number } {
  const g = Math.max(0, gross || 0);
  if (g < 10000) return { tax: 0, rate: 0 };
  if (g <= 100000) return { tax: Math.round(g * 0.10 * 100) / 100, rate: 10 };
  return { tax: Math.round(g * 0.15 * 100) / 100, rate: 15 };
}

// ============ مالیات تکلیفی پیمانکاران (ماده ۷۲) ============
export function calcContractorTax(
  gross: number,
  hasLicense: boolean,
  yearlyTotal: number = 0
): { tax: number; rate: number; exempt: boolean } {
  const g = Math.max(0, gross || 0);
  const total = Math.max(g, yearlyTotal || 0);
  if (total < 500000) return { tax: 0, rate: 0, exempt: true };
  const rate = hasLicense ? 2 : 7;
  return { tax: Math.round(g * rate / 100 * 100) / 100, rate, exempt: false };
}

// ============ BRT (مالیات بر عواید کسب و کار) ============
export function calcBRT(income: number, rate: number = 2): number {
  return Math.round(Math.max(0, income || 0) * rate / 100 * 100) / 100;
}

// ============ مالیات بر عواید سالانه اشخاص حقیقی ============
export function calcAnnualIncomeTax(annualIncome: number): { tax: number; bracket: string } {
  const g = Math.max(0, annualIncome || 0);
  let tax = 0, bracket = 'معاف';
  if (g <= 60000) { tax = 0; bracket = 'معاف (تا ۶۰,۰۰۰)'; }
  else if (g <= 150000) { tax = (g - 60000) * 0.02; bracket = '۲٪'; }
  else if (g <= 1200000) { tax = 1800 + (g - 150000) * 0.10; bracket = '۱۰٪'; }
  else { tax = 1800 + 105000 + (g - 1200000) * 0.20; bracket = '۲۰٪'; }
  return { tax: Math.round(tax * 100) / 100, bracket };
}

// ============ مالیات اشخاص حقوقی (شرکت‌ها) ============
export function calcCorporateTax(netIncome: number): number {
  return Math.round(Math.max(0, netIncome || 0) * 0.20 * 100) / 100;
}

// ============ محاسبه یکپارچه مالیات‌های وارداتی ============
export interface ImportTaxInput {
  invoiceValue: number;    // به ارز اصلی
  exchangeRate: number;    // به افغانی
  customsDutyRate: number; // درصد
  vatRate?: number;        // پیش‌فرض ۱۰
  brtRate?: number;        // پیش‌فرض ۲
  vatApplicable?: boolean;
}

export interface ImportTaxResult {
  valueAfn: number;
  customsDuty: number;
  vat: number;
  brt: number;
  total: number;
  cifAfterDuty: number;
}

export function calcImportTaxes(input: ImportTaxInput): ImportTaxResult {
  const valueAfn = (input.invoiceValue || 0) * (input.exchangeRate || 1);
  const customsDuty = valueAfn * ((input.customsDutyRate || 0) / 100);
  const cifAfterDuty = valueAfn + customsDuty;
  const vatRate = input.vatRate ?? 10;
  const brtRate = input.brtRate ?? 2;
  const vat = (input.vatApplicable ?? true) ? cifAfterDuty * (vatRate / 100) : 0;
  const brt = cifAfterDuty * (brtRate / 100);
  const total = customsDuty + vat + brt;
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    valueAfn: r(valueAfn),
    customsDuty: r(customsDuty),
    vat: r(vat),
    brt: r(brt),
    total: r(total),
    cifAfterDuty: r(cifAfterDuty),
  };
}

// ============ جریمه دیرکرد پرداخت (۰.۵٪ ماهانه، سقف ۲۵٪) ============
export function calcLateFine(dueDate: string | Date, paidDate: string | Date | null, principal: number): {
  months: number; fine: number; rate: number;
} {
  if (!dueDate || !principal) return { months: 0, fine: 0, rate: 0 };
  const due = new Date(dueDate).getTime();
  const paid = paidDate ? new Date(paidDate).getTime() : Date.now();
  if (paid <= due) return { months: 0, fine: 0, rate: 0 };
  const days = (paid - due) / (1000 * 60 * 60 * 24);
  const months = Math.ceil(days / 30);
  const rate = Math.min(months * 0.5, 25);
  const fine = Math.round(principal * (rate / 100) * 100) / 100;
  return { months, fine, rate };
}

// ============ اعتبارسنجی TIN (۱۰ رقم) ============
export function validateTIN(tin: string): { valid: boolean; message?: string } {
  if (!tin) return { valid: false, message: 'TIN وارد نشده' };
  const clean = tin.replace(/\D/g, '');
  if (clean.length !== 10) return { valid: false, message: 'TIN باید ۱۰ رقم باشد' };
  return { valid: true };
}

// ============ اعتبارسنجی VIN وسیله (۱۷ کاراکتر) ============
export function validateVIN(vin: string): boolean {
  if (!vin) return false;
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin.trim());
}

// ============ سررسید پرداخت مالیات تکلیفی (۱۰ روز پس از ماه) ============
export function getWithholdingDueDate(paymentDate: Date | string): Date {
  const d = new Date(paymentDate);
  const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 10);
  return nextMonth;
}

export const CUSTOMS_OFFICES = [
  'گمرک تورخم', 'گمرک اسلام‌قلعه', 'گمرک کابل', 'گمرک حیرتان',
  'گمرک میدان هوایی کابل', 'گمرک شیرخان‌بندر', 'گمرک اسپین‌بولدک', 'گمرک آقینه', 'گمرک تورغندی'
];

export const CURRENCIES = ['AFN', 'USD', 'EUR', 'PKR', 'IRR', 'AED', 'SAR'];
