export type TaxType =
  | 'salary'
  | 'personal'
  | 'corporate'
  | 'rent'
  | 'contract'
  | 'brt';

export interface TaxTypeInfo {
  id: TaxType;
  label: string;
  icon: string;
  description: string;
}

export interface TaxBreakdownRow {
  label: string;
  amount: number;
  rate: string;
}

export interface TaxResult {
  taxableAmount: number;
  totalTax: number;
  effectiveRate: number;
  breakdown: TaxBreakdownRow[];
}

export interface TaxRecord {
  id: number;
  tax_type: string;
  taxpayer_name: string;
  gross_income: number;
  deductions: number;
  taxable_income: number;
  tax_amount: number;
  tax_rate: number;
  period: string;
  notes: string;
  created_at: string;
}

export interface TaxDeclaration {
  id: number;
  tax_category: string;
  period: string;
  filing_due_date: string;
  payment_due_date: string;
  submission_date: string;
  assessment: number;
  paid: number;
  balance: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalAssessment: number;
  totalPaid: number;
  totalBalance: number;
  totalRecords: number;
  categories: { category: string; total_assessment: number; total_paid: number; count: number }[];
}

export const TAX_CATEGORIES = [
  { id: 'brt', label: 'مالیه بر معاملات انتقاضی ۴٪', icon: '📊', color: 'primary' },
  { id: 'annual', label: 'اظهارنامه سالانه مالیات بر عایدات صرافان', icon: '📋', color: 'secondary' },
  { id: 'salary_wh', label: 'مالیه موضوعی برمعاشات', icon: '💰', color: 'accent' },
  { id: 'transaction_wh', label: 'مالیه موضوعی برمعاملات', icon: '🔄', color: 'info' },
  { id: 'rent_wh', label: 'مالیه موضوعی برکرایه', icon: '🏠', color: 'warning' },
] as const;

export const TAX_TYPES: TaxTypeInfo[] = [
  {
    id: 'salary',
    label: 'مالیه معاشات',
    icon: '💰',
    description: 'مالیه ماهوار بر معاشات کارمندان',
  },
  {
    id: 'personal',
    label: 'مالیات اشخاص حقیقی',
    icon: '👤',
    description: 'مالیات سالانه بر عایدات اشخاص حقیقی',
  },
  {
    id: 'corporate',
    label: 'مالیات اشخاص حکمی',
    icon: '🏢',
    description: 'مالیات ۲۰٪ بر عایدات خالص شرکت‌ها',
  },
  {
    id: 'rent',
    label: 'مالیه کرایه',
    icon: '🏠',
    description: 'مالیه موضوعی بر کرایه جایدادها',
  },
  {
    id: 'contract',
    label: 'مالیه قراردادها',
    icon: '📝',
    description: 'مالیه موضوعی بر پرداخت‌های قراردادی',
  },
  {
    id: 'brt',
    label: 'مالیه معاملاتی (BRT)',
    icon: '🧾',
    description: 'مالیه بر عواید ناخالص تجارتی',
  },
];
