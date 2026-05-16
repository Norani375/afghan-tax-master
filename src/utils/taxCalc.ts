import { IncomeEntry, Employee, Deduction, TaxSummary, QuarterTax } from '../types';

// فرمول مالیات معاش کارمندان (ماهانه، افغانی)
// مالیات = (معاش - ۵,۰۰۰) × ۲٪
// اگر معاش ۵,۰۰۰ یا کمتر باشد → معاف
export function calcMonthlySalaryTax(salary: number): number {
  if (salary <= 5000) return 0;
  return (salary - 5000) * 0.02;
}

export function calcTaxSummary(
  incomes: IncomeEntry[],
  employees: Employee[],
  deductions: Deduction[]
): TaxSummary {
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const netIncome = totalIncome - totalDeductions;

  // Income by category
  const incomeByCategory: Record<string, number> = {
    sales: 0, exchange: 0, commission: 0, rent: 0, other: 0,
  };
  for (const inc of incomes) {
    incomeByCategory[inc.category] = (incomeByCategory[inc.category] || 0) + inc.amount;
  }

  // Employee salary tax (annual = monthly × 12)
  const employeeSalaryTax = employees.reduce((s, emp) => {
    return s + calcMonthlySalaryTax(emp.monthly_salary) * 12;
  }, 0);

  // ── مالیات انتفاعی ربع‌وار (۴٪ از درآمد ناخالص — بدون کسر مصارف) ──
  const quarterlyTax: QuarterTax[] = [1, 2, 3, 4].map(q => {
    const income = incomes.filter(i => i.quarter === q).reduce((s, i) => s + i.amount, 0);
    // مالیات انتفاعی مستقیماً از درآمد ناخالص محاسبه می‌شود
    const tax = income * 0.04;
    return { q, income, expenses: 0, netProfit: income, tax };
  });

  const totalQuarterlyTax = quarterlyTax.reduce((s, q) => s + q.tax, 0);

  // Annual net revenue tax (20% of net income after deductions)
  const annualTax = Math.max(0, netIncome) * 0.20;

  // مجموع مالیات = معاش کارمندان + انتفاعی ربع‌وار + مالیات سالانه ۲۰٪
  const totalTax = employeeSalaryTax + totalQuarterlyTax + annualTax;

  return {
    totalIncome, totalDeductions, netIncome,
    employeeSalaryTax, quarterlyTax, totalQuarterlyTax,
    annualTax, totalTax, incomeByCategory,
  };
}
