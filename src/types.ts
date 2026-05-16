export interface Company {
  id: string;
  name: string;
  license_no: string;
  tin: string;
  address: string;
  phone: string;
  logo?: string; // base64 data URL
  period_start: string;
  period_end: string;
  year: number;
}

export interface IncomeEntry {
  id: number;
  companyId: string;
  category: string;
  amount: number;
  quarter: number;
  year: number;
  description: string;
}

export interface Employee {
  id: number;
  companyId: string;
  name: string;
  position: string;
  monthly_salary: number;
  social_insurance: number;
}

export interface Deduction {
  id: number;
  companyId: string;
  type: string;
  description: string;
  amount: number;
}

export type TabId = 'dashboard' | 'company' | 'income' | 'employees' | 'deductions' | 'report';

export interface QuarterTax {
  q: number;
  income: number;
  expenses: number;
  netProfit: number;
  tax: number;
}

export interface TaxSummary {
  totalIncome: number;
  totalDeductions: number;
  netIncome: number;
  employeeSalaryTax: number;
  quarterlyTax: QuarterTax[];
  annualTax: number;
  totalTax: number;
  totalQuarterlyTax: number;
  incomeByCategory: Record<string, number>;
}

export const CATEGORY_LABELS: Record<string, string> = {
  sales: 'فروش کالا و خدمات',
  exchange: 'تبادله اسعار',
  commission: 'کمیشن',
  rent: 'کرایه و مستغلات',
  other: 'سایر درآمدها',
};

export const QUARTER_LABELS: Record<number, string> = {
  1: 'ربع اول',
  2: 'ربع دوم',
  3: 'ربع سوم',
  4: 'ربع چهارم',
};

export const DEDUCTION_TYPE_LABELS: Record<string, string> = {
  expense: 'هزینه قابل قبول',
  exemption: 'معافیت مالیاتی',
  mandatory: 'پرداخت اجباری',
};
