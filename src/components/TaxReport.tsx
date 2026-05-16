import React, { useState } from 'react';
import { Printer, AlertTriangle, Calendar, Shield, TrendingUp, Users, Building2, FileText, Coins, BarChart3, Wallet } from 'lucide-react';
import { Company, Employee, Deduction, TaxSummary, CATEGORY_LABELS, QUARTER_LABELS, DEDUCTION_TYPE_LABELS } from '../types';
import { fmtAFN, fmtNum } from '../utils/formatters';

interface TaxReportProps {
  company: Company;
  taxSummary: TaxSummary;
  employeeCount: number;
  employees: Employee[];
  deductions: Deduction[];
}

const CAT_COLORS: Record<string, { bg: string; bar: string; icon: string }> = {
  sales:      { bg: 'from-emerald-500/20 to-emerald-600/5', bar: 'from-emerald-400 to-emerald-600', icon: '💰' },
  exchange:   { bg: 'from-blue-500/20 to-blue-600/5',    bar: 'from-blue-400 to-blue-600',    icon: '💱' },
  commission: { bg: 'from-purple-500/20 to-purple-600/5', bar: 'from-purple-400 to-purple-600', icon: '🤝' },
  rent:       { bg: 'from-amber-500/20 to-amber-600/5',  bar: 'from-amber-400 to-amber-600',  icon: '🏢' },
  other:      { bg: 'from-pink-500/20 to-pink-600/5',    bar: 'from-pink-400 to-pink-600',    icon: '📦' },
};

const QUARTER_COLORS = [
  { bg: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30', text: 'text-cyan-400', dot: 'bg-cyan-400' },
  { bg: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30', text: 'text-green-400', dot: 'bg-green-400' },
  { bg: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-400' },
  { bg: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30', text: 'text-rose-400', dot: 'bg-rose-400' },
];

export const TaxReport: React.FC<TaxReportProps> = ({ company, taxSummary, employeeCount, employees, deductions }) => {
  const {
    totalIncome, totalDeductions, netIncome,
    employeeSalaryTax, quarterlyTax, totalQuarterlyTax,
    annualTax, totalTax, incomeByCategory,
  } = taxSummary;

  const todayISO = new Date().toISOString().split('T')[0];
  const [reportDate, setReportDate] = useState(todayISO);

  const isValid = !!(company.name && totalIncome > 0);
  const companyName = company.name || '[نام شرکت]';
  const periodStart = company.period_start || '[تاریخ شروع]';
  const periodEnd = company.period_end || '[تاریخ پایان]';

  const displayDate = reportDate
    ? new Date(reportDate).toLocaleDateString('fa-AF', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const maxCatAmt = Math.max(...Object.values(incomeByCategory), 1);
  const maxQIncome = Math.max(...quarterlyTax.map(q => q.income), 1);

  // ── Salary calculations ──
  const totalMonthlySalary = employees.reduce((s, e) => s + e.monthly_salary, 0);
  const totalAnnualSalary = totalMonthlySalary * 12;
  const totalOtherDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const totalAllExpenses = totalAnnualSalary + totalOtherDeductions;
  const maxSalary = Math.max(...employees.map(e => e.monthly_salary), 1);

  // ── Print HTML ──
  function buildPrintHTML(): string {
    const incomeRows = Object.entries(CATEGORY_LABELS).map(([cat, label], i) => {
      const amt = incomeByCategory[cat] || 0;
      const pct = totalIncome > 0 ? ((amt / totalIncome) * 100).toFixed(1) : '0';
      const bg = i % 2 === 0 ? '#fff' : '#f7f7f7';
      const barW = totalIncome > 0 ? Math.round((amt / totalIncome) * 100) : 0;
      return `<tr style="background:${bg}">
        <td style="padding:6pt 10pt;border-bottom:0.5pt solid #e0e0e0;font-weight:500">${label}</td>
        <td style="padding:6pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left;font-weight:600">${amt.toLocaleString()} ؋</td>
        <td style="padding:6pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left">
          <div style="display:flex;align-items:center;gap:6pt">
            <div style="width:60pt;height:6pt;background:#eee;border-radius:3pt;overflow:hidden">
              <div style="width:${barW}%;height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:3pt"></div>
            </div>
            <span style="font-size:8pt;color:#666">${pct}٪</span>
          </div>
        </td>
      </tr>`;
    }).join('');

    // Employee salary rows for print
    const employeeRows = employees.map((emp, i) => {
      const annualSal = emp.monthly_salary * 12;
      const taxable = Math.max(emp.monthly_salary - 5000, 0);
      const monthlyTax = taxable * 0.02;
      const annualTaxEmp = monthlyTax * 12;
      const bg = i % 2 === 0 ? '#fff' : '#f7f7f7';
      return `<tr style="background:${bg}">
        <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0;font-weight:600">${i + 1}</td>
        <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0;font-weight:600">${emp.name}</td>
        <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0;font-size:8.5pt;color:#666">${emp.position}</td>
        <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left">${emp.monthly_salary.toLocaleString()} ؋</td>
        <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left">${annualSal.toLocaleString()} ؋</td>
        <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left;color:#7c3aed;font-weight:600">${Math.round(annualTaxEmp).toLocaleString()} ؋</td>
      </tr>`;
    }).join('');

    // Deduction rows for print
    const deductionRows = deductions.map((ded, i) => {
      const bg = i % 2 === 0 ? '#fff' : '#f7f7f7';
      const typeLabel = DEDUCTION_TYPE_LABELS[ded.type] || ded.type;
      return `<tr style="background:${bg}">
        <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0;font-weight:600">${i + 1}</td>
        <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0;font-weight:500">${ded.description}</td>
        <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0;font-size:8.5pt;color:#666">${typeLabel}</td>
        <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left;font-weight:600">${ded.amount.toLocaleString()} ؋</td>
      </tr>`;
    }).join('');

    const quarterCards = quarterlyTax.map((qt, i) => {
      const colors = ['#06b6d4','#22c55e','#f97316','#f43f5e'];
      return `<div style="flex:1;background:#fff;border:1.5pt solid ${colors[i]}22;border-radius:8pt;padding:10pt 12pt;text-align:center">
        <div style="font-size:8pt;color:#888;margin-bottom:4pt">${QUARTER_LABELS[qt.q]}</div>
        <div style="font-size:11pt;font-weight:700;color:#111">${qt.income.toLocaleString()} ؋</div>
        <div style="margin:6pt auto;width:80%;height:4pt;background:#f0f0f0;border-radius:2pt;overflow:hidden">
          <div style="width:${maxQIncome > 0 ? Math.round((qt.income / maxQIncome) * 100) : 0}%;height:100%;background:${colors[i]};border-radius:2pt"></div>
        </div>
        <div style="font-size:9pt;font-weight:600;color:${colors[i]}">مالیات: ${Math.round(qt.tax).toLocaleString()} ؋</div>
      </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="UTF-8"/>
<title>گزارش مالیاتی — ${companyName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{font-family:'Vazirmatn','Tahoma',sans-serif;font-size:10pt;color:#1a1a1a;background:#fff;direction:rtl}
@page{size:A4;margin:10mm 12mm}
@media print{.no-print{display:none!important}}
table{width:100%;border-collapse:collapse}
.sec-title{font-size:10.5pt;font-weight:700;color:#1e293b;padding:8pt 12pt;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:6pt 6pt 0 0;border-bottom:2pt solid #6366f1;margin-top:16pt;display:flex;align-items:center;gap:6pt}
.sec-body{background:#fff;border:1pt solid #e8e8e8;border-top:none;border-radius:0 0 6pt 6pt;padding:10pt;margin-bottom:4pt}
.thead th{background:#1e293b;color:#fff;padding:7pt 10pt;font-weight:600;font-size:9pt}
.total-row{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700}
.total-row td{padding:7pt 10pt}
.info-row td{padding:5pt 10pt;border-bottom:0.5pt solid #f0f0f0;font-size:9.5pt}
.info-label{font-weight:600;color:#64748b;width:30%}
.sum-row td{padding:6pt 10pt;font-size:9.5pt}
.expense-total{background:linear-gradient(135deg,#dc2626,#e11d48);color:#fff;font-weight:700}
.expense-total td{padding:7pt 10pt}
</style>
</head>
<body style="padding:10pt">

<!-- HEADER -->
<div style="text-align:center;padding:16pt 0 14pt;margin-bottom:0;background:linear-gradient(135deg,#1e1b4b,#312e81,#4338ca);border-radius:10pt;color:#fff;position:relative;overflow:hidden">
  <div style="position:absolute;top:-30pt;right:-30pt;width:100pt;height:100pt;background:rgba(255,255,255,0.05);border-radius:50%"></div>
  <div style="position:absolute;bottom:-20pt;left:-20pt;width:80pt;height:80pt;background:rgba(255,255,255,0.03);border-radius:50%"></div>
  ${company.logo ? `<div style="margin-bottom:8pt"><img src="${company.logo}" style="max-height:55pt;max-width:110pt;object-fit:contain;border-radius:6pt" /></div>` : ''}
  <div style="font-size:9pt;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:4pt">Islamic Emirate of Afghanistan</div>
  <div style="font-size:17pt;font-weight:900;letter-spacing:0.03em">امارت اسلامی افغانستان</div>
  <div style="font-size:9pt;color:rgba(255,255,255,0.6);margin-top:2pt">وزارت مالیه — ریاست عمومی عواید</div>
  <div style="width:60pt;height:2pt;background:linear-gradient(90deg,transparent,#fbbf24,transparent);margin:10pt auto"></div>
  <div style="font-size:12pt;font-weight:700;color:#fde68a">گزارش رسمی تصفیه مالیاتی</div>
  <div style="font-size:10pt;margin-top:4pt;font-weight:600">شرکت صرافی «${companyName}»</div>
  <div style="font-size:8.5pt;color:rgba(255,255,255,0.5);margin-top:4pt">تاریخ تهیه: ${displayDate}</div>
</div>

<!-- INTRO -->
<div style="margin:14pt 0;padding:10pt 14pt;background:linear-gradient(135deg,#fffbeb,#fff);border:1pt solid #fde68a;border-radius:8pt;border-right:4pt solid #f59e0b;font-size:9.5pt;line-height:2">
  <strong>بسم‌الله الرحمن الرحیم — </strong>
  این گزارش به منظور ارائه وضعیت دقیق مالی و محاسبه مالیات شرکت صرافی <strong>«${companyName}»</strong>
  برای دوره مالی <strong>${periodStart}</strong> الی <strong>${periodEnd}</strong> تهیه گردیده است.
  تمام محاسبات مطابق قوانین مالیاتی افغانستان انجام و جهت ارائه به مستوفیت تنظیم شده است.
</div>

<!-- SECTION 1 -->
<div class="sec-title">▪ ۱ — مشخصات شرکت</div>
<div class="sec-body">
<table>
  <tr class="info-row"><td class="info-label">نام شرکت</td><td style="font-weight:700">${companyName}</td></tr>
  <tr class="info-row"><td class="info-label">شماره جواز</td><td>${company.license_no || '—'}</td></tr>
  <tr class="info-row"><td class="info-label">نمبر TIN</td><td>${company.tin || '—'}</td></tr>
  <tr class="info-row"><td class="info-label">آدرس</td><td>${company.address || '—'}</td></tr>
  <tr class="info-row"><td class="info-label">شماره تماس</td><td>${company.phone || '—'}</td></tr>
  <tr class="info-row"><td class="info-label">سال مالی</td><td>${company.year}</td></tr>
  <tr class="info-row"><td class="info-label">دوره گزارش</td><td>${periodStart} — ${periodEnd}</td></tr>
  <tr class="info-row"><td class="info-label">تعداد کارمندان</td><td>${employeeCount} نفر</td></tr>
</table>
</div>

<!-- SECTION 2 -->
<div class="sec-title">▪ ۲ — تفکیک درآمد</div>
<div class="sec-body">
<table>
  <thead><tr class="thead">
    <th style="text-align:right">نوع درآمد</th>
    <th style="text-align:left">مبلغ (؋)</th>
    <th style="text-align:left;width:30%">سهم</th>
  </tr></thead>
  <tbody>
    ${incomeRows}
    <tr class="total-row">
      <td style="padding:7pt 10pt;border-radius:0 0 6pt 0">مجموع کل درآمد</td>
      <td style="padding:7pt 10pt;text-align:left">${totalIncome.toLocaleString()} ؋</td>
      <td style="padding:7pt 10pt;text-align:left">100٪</td>
    </tr>
  </tbody>
</table>
</div>

<!-- SECTION 3: EXPENSES -->
<div class="sec-title" style="border-bottom-color:#dc2626">▪ ۳ — مصارف (معاش کارمندان و کسورات)</div>
<div class="sec-body">
  ${employees.length > 0 ? `
  <div style="font-size:9pt;font-weight:700;color:#475569;margin-bottom:6pt;display:flex;align-items:center;gap:4pt">
    <span style="color:#6366f1">👥</span> الف — معاش کارمندان (${employeeCount} نفر)
  </div>
  <table>
    <thead><tr class="thead">
      <th style="text-align:right;width:6%">#</th>
      <th style="text-align:right">نام کارمند</th>
      <th style="text-align:right">وظیفه</th>
      <th style="text-align:left">معاش ماهانه</th>
      <th style="text-align:left">معاش سالانه</th>
      <th style="text-align:left">مالیات سالانه</th>
    </tr></thead>
    <tbody>
      ${employeeRows}
      <tr style="background:linear-gradient(135deg,#1e1b4b,#312e81);color:#fff;font-weight:700">
        <td colspan="3" style="padding:7pt 10pt">جمع کل معاش کارمندان</td>
        <td style="padding:7pt 10pt;text-align:left">${totalMonthlySalary.toLocaleString()} ؋</td>
        <td style="padding:7pt 10pt;text-align:left">${totalAnnualSalary.toLocaleString()} ؋</td>
        <td style="padding:7pt 10pt;text-align:left;color:#fde68a">${Math.round(employeeSalaryTax).toLocaleString()} ؋</td>
      </tr>
    </tbody>
  </table>
  ` : '<div style="font-size:9pt;color:#888;text-align:center;padding:10pt">هیچ کارمندی ثبت نشده است</div>'}

  ${deductions.length > 0 ? `
  <div style="font-size:9pt;font-weight:700;color:#475569;margin:14pt 0 6pt;display:flex;align-items:center;gap:4pt">
    <span style="color:#ef4444">📋</span> ب — سایر کسورات و مصارف
  </div>
  <table>
    <thead><tr class="thead" style="background:#7c2d12">
      <th style="text-align:right;width:6%">#</th>
      <th style="text-align:right">شرح</th>
      <th style="text-align:right">نوع</th>
      <th style="text-align:left">مبلغ (؋)</th>
    </tr></thead>
    <tbody>
      ${deductionRows}
      <tr style="background:linear-gradient(135deg,#7c2d12,#991b1b);color:#fff;font-weight:700">
        <td colspan="3" style="padding:7pt 10pt">جمع سایر کسورات</td>
        <td style="padding:7pt 10pt;text-align:left">${totalOtherDeductions.toLocaleString()} ؋</td>
      </tr>
    </tbody>
  </table>
  ` : ''}

  <!-- Total expenses box -->
  <div style="margin-top:12pt;background:linear-gradient(135deg,#dc2626,#e11d48);color:#fff;border-radius:8pt;padding:12pt 16pt;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:8pt;color:rgba(255,255,255,0.6)">Total Expenses</div>
      <div style="font-size:10pt;font-weight:700">مجموع کل مصارف</div>
    </div>
    <div style="font-size:14pt;font-weight:900;color:#fef2f2">${totalAllExpenses.toLocaleString()} ؋</div>
  </div>
</div>

<!-- SECTION 4 -->
<div class="sec-title">▪ ۴ — مالیات انتفاعی ربع‌وار (۴٪ از درآمد ناخالص)</div>
<div class="sec-body">
  <div style="font-size:8pt;color:#888;margin-bottom:8pt;font-style:italic">
    مالیات انتفاعی مستقیماً از درآمد ناخالص محاسبه می‌شود — مصارف کسر نمی‌گردد.
  </div>
  <div style="display:flex;gap:8pt;margin-bottom:8pt">
    ${quarterCards}
  </div>
  <table>
    <tr class="total-row">
      <td style="padding:7pt 10pt;border-radius:0 0 6pt 0;width:50%">جمع مالیات انتفاعی سالانه</td>
      <td style="padding:7pt 10pt;text-align:left;font-size:11pt">${Math.round(totalQuarterlyTax).toLocaleString()} ؋</td>
    </tr>
  </table>
</div>

<!-- SECTION 5 -->
<div class="sec-title">▪ ۵ — خلاصه محاسبه مالیات</div>
<div class="sec-body">
<table>
  <tr class="sum-row"><td style="width:60%">مجموع درآمد سالانه</td><td style="text-align:left;font-weight:600">${fmtAFN(totalIncome)}</td></tr>
  <tr class="sum-row"><td style="color:#ef4444">کسر: معاش کارمندان (سالانه)</td><td style="text-align:left;color:#ef4444">(${fmtAFN(totalAnnualSalary)})</td></tr>
  <tr class="sum-row"><td style="color:#ef4444">کسر: سایر کسورات و مصارف</td><td style="text-align:left;color:#ef4444">(${fmtAFN(totalOtherDeductions)})</td></tr>
  <tr class="sum-row" style="background:#fef2f2"><td style="font-weight:700;color:#dc2626">مجموع مصارف</td><td style="text-align:left;font-weight:700;color:#dc2626">(${fmtAFN(totalAllExpenses)})</td></tr>
  <tr class="sum-row" style="background:#f0f9ff"><td style="font-weight:700">عواید خالص مشمول مالیات</td><td style="text-align:left;font-weight:700">${fmtAFN(netIncome)}</td></tr>
  <tr><td colspan="2" style="padding:4pt 0;border-top:1pt dashed #cbd5e1"></td></tr>
  <tr class="sum-row"><td>❶ مالیات بر معاش کارمندان (${employeeCount} نفر)</td><td style="text-align:left">${fmtAFN(employeeSalaryTax)}</td></tr>
  <tr class="sum-row"><td>❷ مالیات انتفاعی ربع‌وار (۴٪ × درآمد ناخالص)</td><td style="text-align:left">${fmtAFN(totalQuarterlyTax)}</td></tr>
  <tr class="sum-row"><td>❸ مالیات از عواید خالص سالانه (۲۰٪)</td><td style="text-align:left">${fmtAFN(annualTax)}</td></tr>
  <tr><td colspan="2" style="padding:3pt 0"></td></tr>
</table>
<div style="background:linear-gradient(135deg,#1e1b4b,#4338ca);color:#fff;border-radius:8pt;padding:14pt 16pt;display:flex;justify-content:space-between;align-items:center;margin-top:4pt">
  <div>
    <div style="font-size:8pt;color:rgba(255,255,255,0.6)">مجموع کل مالیات قابل پرداخت</div>
    <div style="font-size:8pt;color:rgba(255,255,255,0.4);margin-top:2pt">Total Tax Payable</div>
  </div>
  <div style="font-size:16pt;font-weight:900;color:#fde68a;letter-spacing:0.03em">${fmtAFN(totalTax)}</div>
</div>
</div>

<!-- SIGNATURES -->
<div style="margin-top:24pt;padding-top:14pt;border-top:1.5pt solid #1e293b">
  <div style="font-size:9pt;font-weight:700;color:#475569;margin-bottom:12pt">تأیید و امضای مسئولین:</div>
  <table style="width:100%">
    <tr>
      ${['مسئول مالی','حسابدار شرکت','مدیر عامل'].map(t =>
        `<td style="width:33%;text-align:center;padding:0 12pt">
          <div style="height:50pt;border-bottom:1.5pt solid #cbd5e1;margin-bottom:6pt;position:relative">
            <div style="position:absolute;bottom:4pt;left:50%;transform:translateX(-50%);width:40pt;height:0.5pt;background:#e2e8f0"></div>
          </div>
          <div style="font-weight:700;font-size:9pt;color:#1e293b">${t}</div>
          <div style="font-size:7.5pt;color:#94a3b8;margin-top:2pt">امضا و مهر</div>
        </td>`
      ).join('')}
    </tr>
  </table>
</div>

<!-- FOOTER -->
<div style="margin-top:18pt;text-align:center;border-top:1pt solid #f0f0f0;padding-top:10pt">
  <div style="font-size:8pt;color:#94a3b8">این گزارش توسط سیستم حسابداری صرافی تهیه شده — نسخه ۴٫۱ — ${displayDate}</div>
  <div style="font-size:7.5pt;color:#b0b0b0;margin-top:3pt">طراحی و توسعه: <strong>Manochehr Norani</strong> — تماس: 0744173723</div>
</div>

</body></html>`;
  }

  function handlePrint() {
    const html = buildPrintHTML();
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('لطفاً پاپ‌آپ را مجاز کنید'); return; }
    win.document.write(html);
    win.document.close();
    if (win.document.fonts && win.document.fonts.ready) {
      win.document.fonts.ready.then(() => { setTimeout(() => { win.focus(); win.print(); }, 500); });
    } else {
      setTimeout(() => { win.focus(); win.print(); }, 2500);
    }
  }

  return (
    <div dir="rtl" className="space-y-5">
      {!isValid && (
        <div className="alert alert-warning text-sm">
          <AlertTriangle size={15} />
          <span>برای گزارش کامل، ابتدا اطلاعات شرکت و درآمدها را وارد کنید</span>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />
          <h2 className="font-extrabold text-lg">گزارش رسمی مالیاتی</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-base-200/50 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2">
            <Calendar size={15} className="text-indigo-400" />
            <span className="text-xs text-base-content/50">تاریخ:</span>
            <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)}
              className="input input-xs input-ghost w-36 text-sm focus:outline-none bg-transparent" />
          </div>
          <button className="btn btn-sm gap-2 border-0 text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25" onClick={handlePrint}>
            <Printer size={15} /> چاپ گزارش
          </button>
        </div>
      </div>

      {/* ════════════ PREVIEW ════════════ */}
      <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">

        {/* ── Header ── */}
        <div className="relative bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 text-white text-center py-8 px-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/3 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-amber-400/40 rounded-full" />
          <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-amber-400/30 rounded-full" />
          <div className="relative z-10">
            {company.logo && (
              <div className="mb-2">
                <img src={company.logo} alt="logo" className="mx-auto max-h-14 max-w-28 object-contain rounded-lg" />
              </div>
            )}
            <div className="text-[10px] tracking-[0.2em] uppercase text-white/50 mb-1">Islamic Emirate of Afghanistan</div>
            <div className="text-xl font-black tracking-wide">امارت اسلامی افغانستان</div>
            <div className="text-xs text-white/40 mt-1">وزارت مالیه — ریاست عمومی عواید</div>
            <div className="w-16 h-0.5 mx-auto my-3 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
            <div className="text-base font-bold text-amber-300">گزارش رسمی تصفیه مالیاتی</div>
            <div className="text-sm mt-1 font-semibold text-white/90">شرکت صرافی «{companyName}»</div>
            <div className="text-[10px] text-white/30 mt-2">تاریخ تهیه: {displayDate}</div>
          </div>
        </div>

        <div className="bg-gradient-to-b from-base-300/80 to-base-100/90 p-5 space-y-5">

          {/* ── Intro ── */}
          <div className="relative rounded-xl p-4 bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-1 h-full rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
            <p className="text-xs leading-7 text-base-content/80 pr-3">
              <span className="font-bold text-amber-400">بسم‌الله الرحمن الرحیم — </span>
              این گزارش به منظور ارائه وضعیت دقیق مالی و محاسبه مالیات شرکت صرافی{' '}
              <strong className="text-white">«{companyName}»</strong>{' '}
              برای دوره مالی <strong>{periodStart}</strong> الی <strong>{periodEnd}</strong> تهیه گردیده است.
              تمام محاسبات مطابق قوانین مالیاتی افغانستان انجام و جهت ارائه به مستوفیت تنظیم شده است.
            </p>
          </div>

          {/* ── Section 1: Company Info ── */}
          <GlassSection icon={<Building2 size={15} />} title="۱ — مشخصات شرکت" color="indigo">
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {[
                ['نام شرکت', companyName],
                ['شماره جواز', company.license_no || '—'],
                ['نمبر TIN', company.tin || '—'],
                ['آدرس', company.address || '—'],
                ['شماره تماس', company.phone || '—'],
                ['سال مالی', String(company.year)],
                ['دوره گزارش', `${periodStart} — ${periodEnd}`],
                ['تعداد کارمندان', `${employeeCount} نفر`],
              ].map(([l, v], i) => (
                <div key={i} className="flex justify-between py-2 border-b border-white/5 text-xs">
                  <span className="text-base-content/40 font-medium">{l}</span>
                  <span className="font-semibold text-base-content/80">{v}</span>
                </div>
              ))}
            </div>
          </GlassSection>

          {/* ── Section 2: Income Breakdown ── */}
          <GlassSection icon={<TrendingUp size={15} />} title="۲ — تفکیک درآمد" color="emerald">
            <div className="space-y-2">
              {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
                const amt = incomeByCategory[cat] || 0;
                const pct = totalIncome > 0 ? ((amt / totalIncome) * 100) : 0;
                const barW = maxCatAmt > 0 ? ((amt / maxCatAmt) * 100) : 0;
                const c = CAT_COLORS[cat] || CAT_COLORS.other;
                return (
                  <div key={cat} className={`rounded-lg p-3 bg-gradient-to-r ${c.bg} border border-white/5 hover:border-white/10 transition-all duration-300`}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{c.icon}</span>
                        <span className="text-xs font-semibold text-base-content/70">{label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-base-content/40">{pct.toFixed(1)}٪</span>
                        <span className="text-xs font-bold text-base-content/90">{fmtNum(amt)} ؋</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${c.bar} rounded-full transition-all duration-700`}
                        style={{ width: `${barW}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="rounded-lg p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center mt-1">
                <span className="text-xs font-bold">مجموع کل درآمد</span>
                <span className="text-sm font-black">{fmtAFN(totalIncome)}</span>
              </div>
            </div>
          </GlassSection>

          {/* ── Section 3: EXPENSES (معاش + کسورات) ── */}
          <GlassSection icon={<Wallet size={15} />} title="۳ — مصارف (معاش کارمندان و کسورات)" color="red">
            {/* 3A: Employee Salaries */}
            {employees.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-indigo-400" />
                  <span className="text-xs font-bold text-base-content/60">الف — معاش کارمندان ({employeeCount} نفر)</span>
                </div>
                <div className="space-y-2">
                  {employees.map((emp, i) => {
                    const annualSal = emp.monthly_salary * 12;
                    const taxable = Math.max(emp.monthly_salary - 5000, 0);
                    const monthlyTax = taxable * 0.02;
                    const annualTaxEmp = monthlyTax * 12;
                    const barW = maxSalary > 0 ? ((emp.monthly_salary / maxSalary) * 100) : 0;
                    return (
                      <div key={emp.id} className="rounded-lg p-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/5 border border-white/5 hover:border-indigo-500/20 transition-all duration-300">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                            <div>
                              <span className="text-xs font-bold text-base-content/80">{emp.name}</span>
                              <span className="text-[10px] text-base-content/30 mr-2">{emp.position}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-[10px]">
                            <div className="text-center">
                              <div className="text-base-content/30">ماهانه</div>
                              <div className="font-bold text-base-content/70">{fmtNum(emp.monthly_salary)} ؋</div>
                            </div>
                            <div className="text-center">
                              <div className="text-base-content/30">سالانه</div>
                              <div className="font-bold text-base-content/70">{fmtNum(annualSal)} ؋</div>
                            </div>
                            <div className="text-center">
                              <div className="text-base-content/30">مالیات</div>
                              <div className="font-bold text-purple-400">{fmtNum(Math.round(annualTaxEmp))} ؋</div>
                            </div>
                          </div>
                        </div>
                        <div className="w-full h-1 bg-black/20 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all duration-700"
                            style={{ width: `${barW}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {/* Salary total */}
                  <div className="rounded-lg p-3 bg-gradient-to-r from-indigo-900 to-purple-900 text-white flex justify-between items-center">
                    <span className="text-xs font-bold">جمع معاش سالانه</span>
                    <div className="flex items-center gap-6 text-xs">
                      <span>ماهانه: <strong>{fmtNum(totalMonthlySalary)} ؋</strong></span>
                      <span>سالانه: <strong className="text-amber-300">{fmtNum(totalAnnualSalary)} ؋</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {employees.length === 0 && (
              <div className="text-center py-4 text-xs text-base-content/30">هیچ کارمندی ثبت نشده است</div>
            )}

            {/* 3B: Other Deductions */}
            {deductions.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3 mt-2">
                  <FileText size={14} className="text-red-400" />
                  <span className="text-xs font-bold text-base-content/60">ب — سایر کسورات و مصارف</span>
                </div>
                <div className="space-y-1.5">
                  {deductions.map((ded, i) => {
                    const typeLabel = DEDUCTION_TYPE_LABELS[ded.type] || ded.type;
                    return (
                      <div key={ded.id} className="rounded-lg p-2.5 bg-gradient-to-r from-red-500/10 to-orange-500/5 border border-white/5 flex justify-between items-center hover:border-red-500/20 transition-all duration-300">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                          <div>
                            <span className="text-xs font-semibold text-base-content/70">{ded.description}</span>
                            <span className="text-[10px] text-base-content/30 mr-2">({typeLabel})</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-red-400">{fmtNum(ded.amount)} ؋</span>
                      </div>
                    );
                  })}
                  <div className="rounded-lg p-2.5 bg-gradient-to-r from-red-800 to-orange-800 text-white flex justify-between items-center">
                    <span className="text-xs font-bold">جمع سایر کسورات</span>
                    <span className="text-xs font-bold">{fmtNum(totalOtherDeductions)} ؋</span>
                  </div>
                </div>
              </div>
            )}

            {/* Total Expenses */}
            <div className="rounded-xl p-4 bg-gradient-to-br from-red-600 to-rose-700 text-white relative overflow-hidden mt-2">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-white/40">Total Expenses</div>
                  <div className="text-xs font-bold text-white/80">مجموع کل مصارف</div>
                </div>
                <div className="text-xl font-black text-white tracking-wide">{fmtAFN(totalAllExpenses)}</div>
              </div>
            </div>
          </GlassSection>

          {/* ── Section 4: Quarterly Tax ── */}
          <GlassSection icon={<BarChart3 size={15} />} title="۴ — مالیات انتفاعی ربع‌وار (۴٪ از درآمد ناخالص)" color="cyan">
            <div className="text-[10px] text-base-content/30 italic mb-3">
              مالیات انتفاعی مستقیماً از درآمد ناخالص محاسبه می‌شود — مصارف کسر نمی‌گردد.
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {quarterlyTax.map((qt, i) => {
                const c = QUARTER_COLORS[i];
                const barW = maxQIncome > 0 ? ((qt.income / maxQIncome) * 100) : 0;
                return (
                  <div key={qt.q} className={`rounded-xl p-3 bg-gradient-to-br ${c.bg} border ${c.border} backdrop-blur-sm text-center hover:scale-[1.03] transition-transform duration-300`}>
                    <div className="text-[10px] text-base-content/40 mb-1">{QUARTER_LABELS[qt.q]}</div>
                    <div className="text-sm font-bold text-base-content/90">{fmtNum(qt.income)} ؋</div>
                    <div className="w-full h-1 bg-black/20 rounded-full my-2 overflow-hidden">
                      <div className={`h-full ${c.dot} rounded-full`} style={{ width: `${barW}%` }} />
                    </div>
                    <div className={`text-xs font-bold ${c.text}`}>مالیات: {fmtNum(Math.round(qt.tax))} ؋</div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-lg p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center">
              <span className="text-xs font-bold">جمع مالیات انتفاعی سالانه</span>
              <span className="text-sm font-black">{fmtAFN(totalQuarterlyTax)}</span>
            </div>
          </GlassSection>

          {/* ── Section 5: Tax Summary ── */}
          <GlassSection icon={<Coins size={15} />} title="۵ — خلاصه محاسبه مالیات" color="amber">
            <div className="space-y-1">
              <SumRow label="مجموع درآمد سالانه" value={fmtAFN(totalIncome)} bold />
              <SumRow label="کسر: معاش کارمندان (سالانه)" value={`(${fmtAFN(totalAnnualSalary)})`} red />
              <SumRow label="کسر: سایر کسورات و مصارف" value={`(${fmtAFN(totalOtherDeductions)})`} red />
              <div className="bg-red-500/10 rounded-lg px-3 py-2 flex justify-between items-center border border-red-500/20 my-1">
                <span className="text-xs font-bold text-red-400">مجموع مصارف</span>
                <span className="text-xs font-bold text-red-300">({fmtAFN(totalAllExpenses)})</span>
              </div>
              <div className="bg-indigo-500/10 rounded-lg px-3 py-2 flex justify-between items-center border border-indigo-500/20 my-2">
                <span className="text-xs font-bold text-indigo-400">عواید خالص مشمول مالیات</span>
                <span className="text-sm font-black text-indigo-300">{fmtAFN(netIncome)}</span>
              </div>
              <div className="border-t border-dashed border-white/10 my-2" />
              <SumRow label={`❶ مالیات بر معاش کارمندان (${employeeCount} نفر)`} value={fmtAFN(employeeSalaryTax)} />
              <SumRow label="❷ مالیات انتفاعی ربع‌وار (۴٪ × درآمد ناخالص)" value={fmtAFN(totalQuarterlyTax)} />
              <SumRow label="❸ مالیات از عواید خالص سالانه (۲۰٪)" value={fmtAFN(annualTax)} />
            </div>
            {/* Grand Total */}
            <div className="mt-4 rounded-xl p-5 bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/3 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-white/40">Total Tax Payable</div>
                  <div className="text-xs font-bold text-white/70 mt-0.5">مجموع کل مالیات قابل پرداخت</div>
                </div>
                <div className="text-2xl font-black text-amber-300 tracking-wide">{fmtAFN(totalTax)}</div>
              </div>
            </div>
          </GlassSection>

          {/* ── Signatures ── */}
          <div className="rounded-xl p-4 bg-base-200/30 backdrop-blur-sm border border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={14} className="text-base-content/40" />
              <span className="text-xs font-bold text-base-content/50">تأیید و امضای مسئولین</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {['مسئول مالی', 'حسابدار شرکت', 'مدیر عامل'].map(title => (
                <div key={title} className="text-center">
                  <div className="h-12 border-b-2 border-dashed border-white/10 mb-2 relative">
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-[1px] bg-white/5" />
                  </div>
                  <div className="text-xs font-bold text-base-content/60">{title}</div>
                  <div className="text-[10px] text-base-content/30 mt-0.5">امضا و مهر</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="text-center pt-3 border-t border-white/5">
            <div className="text-[10px] text-base-content/25">
              سیستم حسابداری صرافی — نسخه ۴٫۱ — {displayDate}
            </div>
            <div className="text-[9px] text-base-content/20 mt-1">
              طراحی و توسعه: <span className="font-semibold">Manochehr Norani</span> — تماس: 0744173723
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

/* ────── Helper Components ────── */

function GlassSection({ icon, title, color, children }: {
  icon: React.ReactNode; title: string; color: string; children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    indigo: 'from-indigo-500 to-purple-500',
    emerald: 'from-emerald-500 to-teal-500',
    cyan: 'from-cyan-500 to-blue-500',
    amber: 'from-amber-500 to-orange-500',
    red: 'from-red-500 to-rose-500',
  };
  const grad = colorMap[color] || colorMap.indigo;

  return (
    <div className="rounded-xl overflow-hidden border border-white/5 bg-base-200/30 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-base-200/50">
        <div className={`w-1 h-4 rounded-full bg-gradient-to-b ${grad}`} />
        <span className="text-base-content/40">{icon}</span>
        <span className="text-xs font-bold text-base-content/70">{title}</span>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

function SumRow({ label, value, bold, dim, red }: {
  label: string; value: string; bold?: boolean; dim?: boolean; red?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-1.5 px-2 rounded-md hover:bg-white/3 transition-colors">
      <span className={`text-xs ${bold ? 'font-bold text-base-content/80' : dim ? 'text-base-content/40' : 'text-base-content/60'} ${red ? 'text-red-400/70' : ''}`}>
        {label}
      </span>
      <span className={`text-xs ${bold ? 'font-bold text-base-content/90' : dim ? 'text-base-content/40' : 'text-base-content/70'} ${red ? 'text-red-400/70' : ''}`}>
        {value}
      </span>
    </div>
  );
}
