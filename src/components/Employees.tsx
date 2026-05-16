import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Users, ChevronDown, Edit3, X, Check, Search, BarChart3, Printer } from 'lucide-react';
import { Employee } from '../types';
import { fmtAFN } from '../utils/formatters';
import { calcMonthlySalaryTax } from '../utils/taxCalc';
import { openPrintWindow } from '../utils/printHelper';

interface EmployeesProps {
  employees: Employee[];
  onAdd: (emp: Omit<Employee, 'id' | 'companyId'>) => void;
  onEdit: (id: number, updated: Partial<Employee>) => void;
  onDelete: (id: number) => void;
  companyName?: string;
  companyLogo?: string;
}

const defaultForm = { name: '', position: '', monthly_salary: '', social_insurance: '' };

export const Employees: React.FC<EmployeesProps> = ({ employees, onAdd, onEdit, onDelete, companyName, companyLogo }) => {
  const [form, setForm] = useState({ ...defaultForm });
  const [showBrackets, setShowBrackets] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const salary = parseFloat(form.monthly_salary as string);
    if (!form.name || !salary || salary <= 0) return;
    onAdd({
      name: form.name, position: form.position,
      monthly_salary: salary,
      social_insurance: parseFloat(form.social_insurance as string) || 0,
    });
    setForm({ ...defaultForm });
    setShowForm(false);
  }

  function startEdit(emp: Employee) {
    setEditingId(emp.id);
    setEditForm({ name: emp.name, position: emp.position, monthly_salary: emp.monthly_salary, social_insurance: emp.social_insurance });
  }
  function saveEdit() {
    if (editingId !== null) {
      onEdit(editingId, editForm);
      setEditingId(null);
      setEditForm({});
    }
  }
  function cancelEdit() { setEditingId(null); setEditForm({}); }

  const filtered = useMemo(() => {
    if (!searchTerm) return employees;
    const t = searchTerm.toLowerCase();
    return employees.filter(emp =>
      emp.name.toLowerCase().includes(t) ||
      (emp.position || '').toLowerCase().includes(t) ||
      String(emp.monthly_salary).includes(t)
    );
  }, [employees, searchTerm]);

  const totalAnnualTax = employees.reduce((s, emp) => s + calcMonthlySalaryTax(emp.monthly_salary) * 12, 0);
  const totalMonthlySalary = employees.reduce((s, emp) => s + emp.monthly_salary, 0);
  const maxSalary = Math.max(...employees.map(e => e.monthly_salary), 1);
  const avgSalary = employees.length > 0 ? totalMonthlySalary / employees.length : 0;

  /* ── Print Handler ── */
  function handlePrint() {
    const rows = employees.map((emp, i) => {
      const annualSal = emp.monthly_salary * 12;
      const taxable = Math.max(emp.monthly_salary - 5000, 0);
      const monthlyTax = taxable * 0.02;
      const annualTaxEmp = monthlyTax * 12;
      const bg = i % 2 === 0 ? '#fff' : '#f7f7f7';
      return `<tr style="background:${bg}">
        <td style="padding:6pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:center;font-weight:600">${i + 1}</td>
        <td style="padding:6pt 10pt;border-bottom:0.5pt solid #e0e0e0;font-weight:600">${emp.name}</td>
        <td style="padding:6pt 10pt;border-bottom:0.5pt solid #e0e0e0;font-size:9pt;color:#666">${emp.position || '—'}</td>
        <td style="padding:6pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left;font-weight:500">${emp.monthly_salary.toLocaleString()} ؋</td>
        <td style="padding:6pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left">${annualSal.toLocaleString()} ؋</td>
        <td style="padding:6pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left;color:#f59e0b">${Math.round(monthlyTax).toLocaleString()} ؋</td>
        <td style="padding:6pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left;color:#7c3aed;font-weight:600">${Math.round(annualTaxEmp).toLocaleString()} ؋</td>
        <td style="padding:6pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left">${emp.social_insurance ? emp.social_insurance.toLocaleString() + ' ؋' : '—'}</td>
      </tr>`;
    }).join('');

    const totalInsurance = employees.reduce((s, e) => s + (e.social_insurance || 0), 0);

    const content = `
      <div class="sec-title">▪ لیست کارمندان و محاسبه مالیات معاش</div>
      <div class="sec-body">
        <div style="font-size:9pt;color:#666;margin-bottom:8pt;font-style:italic">
          فرمول: معاش تا ۵,۰۰۰ ؋ معاف — بالای آن: (معاش − ۵,۰۰۰) × ۲٪
        </div>
        <table>
          <thead><tr class="thead">
            <th style="text-align:center;width:5%">#</th>
            <th style="text-align:right">نام کارمند</th>
            <th style="text-align:right">وظیفه</th>
            <th style="text-align:left">معاش ماهانه</th>
            <th style="text-align:left">معاش سالانه</th>
            <th style="text-align:left">مالیات ماهانه</th>
            <th style="text-align:left">مالیات سالانه</th>
            <th style="text-align:left">بیمه</th>
          </tr></thead>
          <tbody>
            ${rows}
            <tr style="background:linear-gradient(135deg,#1e1b4b,#312e81);color:#fff;font-weight:700">
              <td colspan="3" style="padding:8pt 10pt">جمع کل</td>
              <td style="padding:8pt 10pt;text-align:left">${totalMonthlySalary.toLocaleString()} ؋</td>
              <td style="padding:8pt 10pt;text-align:left">${(totalMonthlySalary * 12).toLocaleString()} ؋</td>
              <td style="padding:8pt 10pt;text-align:left">—</td>
              <td style="padding:8pt 10pt;text-align:left;color:#fde68a">${Math.round(totalAnnualTax).toLocaleString()} ؋</td>
              <td style="padding:8pt 10pt;text-align:left">${totalInsurance > 0 ? totalInsurance.toLocaleString() + ' ؋' : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Summary Cards -->
      <div style="display:flex;gap:8pt;margin-top:14pt">
        <div style="flex:1;background:#f0f9ff;border:1pt solid #bae6fd;border-radius:8pt;padding:12pt;text-align:center">
          <div style="font-size:8pt;color:#666;margin-bottom:4pt">تعداد کارمندان</div>
          <div style="font-size:14pt;font-weight:900;color:#0284c7">${employees.length}</div>
        </div>
        <div style="flex:1;background:#f0fdf4;border:1pt solid #bbf7d0;border-radius:8pt;padding:12pt;text-align:center">
          <div style="font-size:8pt;color:#666;margin-bottom:4pt">میانگین معاش ماهانه</div>
          <div style="font-size:14pt;font-weight:900;color:#16a34a">${Math.round(avgSalary).toLocaleString()} ؋</div>
        </div>
        <div style="flex:1;background:#fef2f2;border:1pt solid #fecaca;border-radius:8pt;padding:12pt;text-align:center">
          <div style="font-size:8pt;color:#666;margin-bottom:4pt">مجموع مالیات سالانه</div>
          <div style="font-size:14pt;font-weight:900;color:#dc2626">${Math.round(totalAnnualTax).toLocaleString()} ؋</div>
        </div>
      </div>

      <!-- Signature -->
      <div style="margin-top:24pt;padding-top:14pt;border-top:1.5pt solid #1e293b">
        <div style="font-size:9pt;font-weight:700;color:#475569;margin-bottom:12pt">تأیید و امضا:</div>
        <table style="width:100%">
          <tr>
            ${['مسئول مالی', 'مدیر منابع بشری', 'مدیر عامل'].map(t =>
              `<td style="width:33%;text-align:center;padding:0 12pt">
                <div style="height:50pt;border-bottom:1.5pt solid #cbd5e1;margin-bottom:6pt"></div>
                <div style="font-weight:700;font-size:9pt;color:#1e293b">${t}</div>
                <div style="font-size:7.5pt;color:#94a3b8;margin-top:2pt">امضا و مهر</div>
              </td>`
            ).join('')}
          </tr>
        </table>
      </div>`;

    openPrintWindow({
      title: `گزارش کارمندان — ${companyName || 'شرکت'}`,
      companyName: companyName || 'شرکت صرافی',
      companyLogo,
      pageTitle: 'گزارش کارمندان و مالیات معاش',
      content,
    });
  }

  const cardStyle = 'rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm overflow-hidden';

  return (
    <div className="space-y-4" dir="rtl">

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={cardStyle}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Users size={16} className="text-white" />
              </div>
              <div className="text-[10px] text-base-content/40">تعداد کارمندان</div>
            </div>
            <div className="text-2xl font-black text-primary">{employees.length}</div>
            <div className="text-[10px] text-base-content/30">نفر</div>
          </div>
        </div>
        <div className={cardStyle}>
          <div className="p-4">
            <div className="text-[10px] text-base-content/40 mb-1">مجموع معاش ماهانه</div>
            <div className="text-lg font-bold text-info">{fmtAFN(totalMonthlySalary)}</div>
            <div className="text-[10px] text-base-content/30">سالانه: {fmtAFN(totalMonthlySalary * 12)}</div>
          </div>
        </div>
        <div className={cardStyle}>
          <div className="p-4">
            <div className="text-[10px] text-base-content/40 mb-1">میانگین معاش</div>
            <div className="text-lg font-bold text-warning">{fmtAFN(avgSalary)}</div>
            <div className="text-[10px] text-base-content/30">ماهانه</div>
          </div>
        </div>
        <div className={cardStyle}>
          <div className="p-4">
            <div className="text-[10px] text-base-content/40 mb-1">مالیات معاش سالانه</div>
            <div className="text-lg font-bold text-error">{fmtAFN(totalAnnualTax)}</div>
            <div className="text-[10px] text-base-content/30">(معاش − ۵,۰۰۰) × ۲٪ × ۱۲</div>
          </div>
        </div>
      </div>

      {/* ── Salary Distribution ── */}
      {employees.length > 0 && (
        <div className={cardStyle}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-base-content/40" />
              <span className="text-xs font-bold text-base-content/60">مقایسه معاش کارمندان</span>
            </div>
            <div className="space-y-2">
              {employees.slice().sort((a, b) => b.monthly_salary - a.monthly_salary).map(emp => {
                const tax = calcMonthlySalaryTax(emp.monthly_salary);
                return (
                  <div key={emp.id} className="flex items-center gap-3">
                    <div className="w-20 text-xs font-medium truncate text-base-content/60">{emp.name}</div>
                    <div className="flex-1 h-4 bg-base-300 rounded-full overflow-hidden relative">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${(emp.monthly_salary / maxSalary) * 100}%` }} />
                      {tax > 0 && (
                        <div className="absolute top-0 left-0 h-full bg-red-500/40 rounded-full"
                          style={{ width: `${(tax / maxSalary) * 100}%` }} />
                      )}
                    </div>
                    <div className="text-xs font-bold w-20 text-left">{emp.monthly_salary.toLocaleString()} ؋</div>
                    <div className="text-[10px] text-error w-16 text-left">{tax > 0 ? `−${Math.round(tax).toLocaleString()}` : 'معاف'}</div>
                  </div>
                );
              })}
              <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-base-content/30">
                <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-gradient-to-r from-cyan-500 to-blue-500" /> معاش</div>
                <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-red-500/40" /> مالیات</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30" />
          <input type="text" placeholder="جستجو نام یا بست..." className="input input-bordered input-sm w-full pr-9 bg-base-200/50"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="btn-group">
          <button className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('table')}>جدول</button>
          <button className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('cards')}>کارت</button>
        </div>
        {employees.length > 0 && (
          <button className="btn btn-sm gap-1.5 border-0 text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/20"
            onClick={handlePrint}>
            <Printer size={14} /> چاپ کارمندان
          </button>
        )}
        <button className="btn btn-primary btn-sm gap-1.5 shadow-lg shadow-primary/20" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'بستن' : 'کارمند جدید'}
        </button>
      </div>

      {/* ── Add Form ── */}
      {showForm && (
        <div className={cardStyle}>
          <div className="h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
          <div className="p-4">
            <form onSubmit={handleAdd}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="form-control gap-1">
                  <label className="label py-0"><span className="label-text text-xs">نام کامل *</span></label>
                  <input type="text" className="input input-bordered input-sm" value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="نام و تخلص" required />
                </div>
                <div className="form-control gap-1">
                  <label className="label py-0"><span className="label-text text-xs">بست / موقف</span></label>
                  <input type="text" className="input input-bordered input-sm" value={form.position}
                    onChange={e => setForm(p => ({ ...p, position: e.target.value }))} placeholder="عنوان وظیفه" />
                </div>
                <div className="form-control gap-1">
                  <label className="label py-0"><span className="label-text text-xs">معاش ماهانه (؋) *</span></label>
                  <input type="number" className="input input-bordered input-sm" value={form.monthly_salary}
                    onChange={e => setForm(p => ({ ...p, monthly_salary: e.target.value }))} placeholder="0" min="0" required />
                </div>
                <div className="form-control gap-1">
                  <label className="label py-0"><span className="label-text text-xs">بیمه اجتماعی (؋)</span></label>
                  <div className="flex gap-2">
                    <input type="number" className="input input-bordered input-sm flex-1" value={form.social_insurance}
                      onChange={e => setForm(p => ({ ...p, social_insurance: e.target.value }))} placeholder="0" min="0" />
                    <button type="submit" className="btn btn-primary btn-sm gap-1"><Plus size={14} /> ثبت</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Employee List ── */}
      {filtered.length === 0 ? (
        <div className={cardStyle}>
          <div className="p-12 text-center text-base-content/30">
            <Users size={32} className="mx-auto mb-3 opacity-30" />
            <div className="font-medium">{employees.length === 0 ? 'هیچ کارمندی ثبت نشده است' : 'نتیجه‌ای یافت نشد'}</div>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className={cardStyle}>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr className="text-[10px] text-base-content/40">
                  <th>#</th><th>نام</th><th>موقف</th><th>معاش ماهانه</th>
                  <th>مالیات ماهانه</th><th>مالیات سالانه</th><th>بیمه</th><th className="w-24 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, idx) => {
                  const mTax = calcMonthlySalaryTax(emp.monthly_salary);
                  return (
                    <tr key={emp.id} className="hover:bg-base-200/50 transition-colors">
                      {editingId === emp.id ? (
                        <>
                          <td className="text-base-content/40 text-xs">{idx + 1}</td>
                          <td><input type="text" className="input input-bordered input-xs w-full" value={editForm.name || ''}
                            onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></td>
                          <td><input type="text" className="input input-bordered input-xs w-full" value={editForm.position || ''}
                            onChange={e => setEditForm(p => ({ ...p, position: e.target.value }))} /></td>
                          <td><input type="number" className="input input-bordered input-xs w-24" value={editForm.monthly_salary || 0}
                            onChange={e => setEditForm(p => ({ ...p, monthly_salary: parseFloat(e.target.value) || 0 }))} /></td>
                          <td colSpan={2} className="text-center text-base-content/30 text-xs">ذخیره کنید...</td>
                          <td><input type="number" className="input input-bordered input-xs w-20" value={editForm.social_insurance || 0}
                            onChange={e => setEditForm(p => ({ ...p, social_insurance: parseFloat(e.target.value) || 0 }))} /></td>
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button className="btn btn-ghost btn-xs text-success" onClick={saveEdit}><Check size={12} /></button>
                              <button className="btn btn-ghost btn-xs text-base-content/40" onClick={cancelEdit}><X size={12} /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="text-base-content/40 text-xs">{idx + 1}</td>
                          <td className="font-medium">{emp.name}</td>
                          <td className="text-base-content/60">{emp.position || '—'}</td>
                          <td className="font-semibold">{emp.monthly_salary.toLocaleString()} ؋</td>
                          <td className="text-warning">{Math.round(mTax).toLocaleString()} ؋</td>
                          <td className="text-error font-semibold">{Math.round(mTax * 12).toLocaleString()} ؋</td>
                          <td className="text-base-content/50">{emp.social_insurance ? emp.social_insurance.toLocaleString() + ' ؋' : '—'}</td>
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <button className="btn btn-ghost btn-xs text-info" onClick={() => startEdit(emp)}><Edit3 size={11} /></button>
                              <button className="btn btn-ghost btn-xs text-error" onClick={() => onDelete(emp.id)}><Trash2 size={11} /></button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((emp, idx) => {
            const mTax = calcMonthlySalaryTax(emp.monthly_salary);
            const salaryPct = (emp.monthly_salary / maxSalary) * 100;
            return (
              <div key={emp.id} className={`${cardStyle} hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}>
                <div className="h-1 bg-gradient-to-r from-cyan-500 to-blue-500" style={{ opacity: salaryPct / 100 }} />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        {emp.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{emp.name}</div>
                        <div className="text-[10px] text-base-content/40">{emp.position || 'بدون عنوان'}</div>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      <button className="btn btn-ghost btn-xs text-info" onClick={() => startEdit(emp)}><Edit3 size={11} /></button>
                      <button className="btn btn-ghost btn-xs text-error" onClick={() => onDelete(emp.id)}><Trash2 size={11} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-base-300/50 rounded-lg p-2">
                      <div className="text-[9px] text-base-content/40">معاش ماهانه</div>
                      <div className="text-sm font-bold text-info">{emp.monthly_salary.toLocaleString()} ؋</div>
                    </div>
                    <div className="bg-base-300/50 rounded-lg p-2">
                      <div className="text-[9px] text-base-content/40">مالیات ماهانه</div>
                      <div className="text-sm font-bold text-error">
                        {mTax > 0 ? `${Math.round(mTax).toLocaleString()} ؋` : <span className="text-success">معاف</span>}
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-base-300 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${salaryPct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tax Brackets ── */}
      <div className={cardStyle}>
        <div className="p-3 cursor-pointer" onClick={() => setShowBrackets(!showBrackets)}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">📋 فرمول مالیات معاش افغانستان</span>
            <ChevronDown size={16} className={`transition-transform ${showBrackets ? 'rotate-180' : ''}`} />
          </div>
          {showBrackets && (
            <div className="mt-3 p-3 bg-base-300/50 rounded-lg">
              <div className="text-xs text-base-content/60 leading-6">
                <div className="font-bold text-base-content/80 mb-2">فرمول ساده:</div>
                <div>• معاش تا <strong>۵,۰۰۰ ؋</strong> → <span className="text-success font-bold">معاف از مالیات</span></div>
                <div>• معاش بالای ۵,۰۰۰ ؋ → <strong className="text-warning">(معاش − ۵,۰۰۰) × ۲٪</strong></div>
                <div className="mt-2 p-2 bg-base-200 rounded-lg text-[10px]">
                  <strong>مثال:</strong> معاش ۱۵,۰۰۰ → (۱۵,۰۰۰ − ۵,۰۰۰) × ۲٪ = <strong>۲۰۰ ؋</strong> ماهانه = <strong>۲,۴۰۰ ؋</strong> سالانه
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
