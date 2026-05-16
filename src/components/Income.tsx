import React, { useState, useMemo } from 'react';
import { Plus, Trash2, TrendingUp, Edit3, X, Check, Search, Filter, BarChart3, Printer } from 'lucide-react';
import { IncomeEntry, CATEGORY_LABELS, QUARTER_LABELS } from '../types';
import { fmtAFN, fmtNum, fmtPct } from '../utils/formatters';
import { openPrintWindow } from '../utils/printHelper';

interface IncomeProps {
  incomes: IncomeEntry[];
  year: number;
  onAdd: (entry: Omit<IncomeEntry, 'id' | 'companyId'>) => void;
  onEdit: (id: number, updated: Partial<IncomeEntry>) => void;
  onDelete: (id: number) => void;
  companyName?: string;
  companyLogo?: string;
}

const CAT_ICONS: Record<string, string> = {
  sales: '💰', exchange: '💱', commission: '🤝', rent: '🏢', other: '📦',
};
const CAT_COLORS: Record<string, string> = {
  sales: '#10b981', exchange: '#6366f1', commission: '#ec4899', rent: '#f59e0b', other: '#14b8a6',
};

const defaultForm = { category: 'sales', amount: '', quarter: 1, description: '' };

export const Income: React.FC<IncomeProps> = ({ incomes, year, onAdd, onEdit, onDelete, companyName, companyLogo }) => {
  const [form, setForm] = useState({ ...defaultForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<IncomeEntry>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterQuarter, setFilterQuarter] = useState<number>(0);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(form.amount as string);
    if (!amt || amt <= 0) return;
    onAdd({ category: form.category, amount: amt, quarter: form.quarter, year, description: form.description });
    setForm({ ...defaultForm });
    setShowForm(false);
  }

  function startEdit(inc: IncomeEntry) {
    setEditingId(inc.id);
    setEditForm({ category: inc.category, amount: inc.amount, quarter: inc.quarter, description: inc.description });
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
    return incomes.filter(inc => {
      if (filterQuarter > 0 && inc.quarter !== filterQuarter) return false;
      if (filterCategory !== 'all' && inc.category !== filterCategory) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const catLabel = (CATEGORY_LABELS[inc.category] || '').toLowerCase();
        const desc = (inc.description || '').toLowerCase();
        if (!catLabel.includes(term) && !desc.includes(term) && !String(inc.amount).includes(term)) return false;
      }
      return true;
    });
  }, [incomes, filterQuarter, filterCategory, searchTerm]);

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const filteredTotal = filtered.reduce((s, i) => s + i.amount, 0);
  const maxCatAmt = Math.max(...Object.keys(CATEGORY_LABELS).map(c => incomes.filter(i => i.category === c).reduce((s, i) => s + i.amount, 0)), 1);

  const byQuarter = useMemo(() => {
    const q: Record<number, IncomeEntry[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const inc of filtered) {
      if (q[inc.quarter]) q[inc.quarter].push(inc);
    }
    return q;
  }, [filtered]);

  /* ── Print Handler ── */
  function handlePrint() {
    // Category summary
    const catRows = Object.entries(CATEGORY_LABELS).map(([cat, label], i) => {
      const amt = incomes.filter(x => x.category === cat).reduce((s, x) => s + x.amount, 0);
      const pct = totalIncome > 0 ? ((amt / totalIncome) * 100).toFixed(1) : '0';
      const bg = i % 2 === 0 ? '#fff' : '#f7f7f7';
      const barW = totalIncome > 0 ? Math.round((amt / totalIncome) * 100) : 0;
      return `<tr style="background:${bg}">
        <td style="padding:6pt 10pt;border-bottom:0.5pt solid #e0e0e0">${CAT_ICONS[cat] || ''} ${label}</td>
        <td style="padding:6pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left;font-weight:600">${amt.toLocaleString()} ؋</td>
        <td style="padding:6pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left">
          <div style="display:flex;align-items:center;gap:6pt">
            <div style="width:60pt;height:6pt;background:#eee;border-radius:3pt;overflow:hidden">
              <div style="width:${barW}%;height:100%;background:${CAT_COLORS[cat] || '#999'};border-radius:3pt"></div>
            </div>
            <span style="font-size:8pt;color:#666">${pct}٪</span>
          </div>
        </td>
      </tr>`;
    }).join('');

    // Quarterly detail rows
    const quarterSections = [1, 2, 3, 4].map(q => {
      const qEntries = incomes.filter(i => i.quarter === q);
      if (qEntries.length === 0) return '';
      const qTotal = qEntries.reduce((s, i) => s + i.amount, 0);
      const rows = qEntries.map((inc, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f7f7f7';
        return `<tr style="background:${bg}">
          <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:center">${i + 1}</td>
          <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0">${CAT_ICONS[inc.category] || ''} ${CATEGORY_LABELS[inc.category] || inc.category}</td>
          <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left;font-weight:600">${inc.amount.toLocaleString()} ؋</td>
          <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0;font-size:9pt;color:#666">${inc.description || '—'}</td>
        </tr>`;
      }).join('');

      return `
        <div class="sec-title" style="margin-top:14pt">${QUARTER_LABELS[q]} — ${qEntries.length} ورودی</div>
        <div class="sec-body">
          <table>
            <thead><tr class="thead">
              <th style="text-align:center;width:8%">#</th>
              <th style="text-align:right">نوع درآمد</th>
              <th style="text-align:left">مبلغ (؋)</th>
              <th style="text-align:right">توضیح</th>
            </tr></thead>
            <tbody>
              ${rows}
              <tr class="total-row">
                <td colspan="2" style="padding:7pt 10pt">جمع ${QUARTER_LABELS[q]}</td>
                <td style="padding:7pt 10pt;text-align:left">${qTotal.toLocaleString()} ؋</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>`;
    }).join('');

    const content = `
      <!-- Category Summary -->
      <div class="sec-title">▪ خلاصه درآمد بر اساس نوع</div>
      <div class="sec-body">
        <table>
          <thead><tr class="thead">
            <th style="text-align:right">نوع درآمد</th>
            <th style="text-align:left">مبلغ (؋)</th>
            <th style="text-align:left;width:30%">سهم</th>
          </tr></thead>
          <tbody>
            ${catRows}
            <tr class="total-row">
              <td style="padding:7pt 10pt">مجموع کل درآمد</td>
              <td style="padding:7pt 10pt;text-align:left">${totalIncome.toLocaleString()} ؋</td>
              <td style="padding:7pt 10pt;text-align:left">100٪</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Quarterly Details -->
      ${quarterSections}

      <!-- Grand Total -->
      <div style="margin-top:14pt;background:linear-gradient(135deg,#1e1b4b,#4338ca);color:#fff;border-radius:8pt;padding:14pt 16pt;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:8pt;color:rgba(255,255,255,0.6)">Total Annual Income</div>
          <div style="font-size:10pt;font-weight:700">مجموع کل عواید سالانه ${year}</div>
        </div>
        <div style="font-size:16pt;font-weight:900;color:#fde68a">${totalIncome.toLocaleString()} ؋</div>
      </div>

      <!-- Signature -->
      <div style="margin-top:24pt;padding-top:14pt;border-top:1.5pt solid #1e293b">
        <div style="font-size:9pt;font-weight:700;color:#475569;margin-bottom:12pt">تأیید و امضا:</div>
        <table style="width:100%">
          <tr>
            ${['مسئول مالی', 'حسابدار شرکت', 'مدیر عامل'].map(t =>
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
      title: `گزارش عواید — ${companyName || 'شرکت'}`,
      companyName: companyName || 'شرکت صرافی',
      companyLogo,
      pageTitle: `گزارش عواید سال مالی ${year}`,
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
            <div className="text-[10px] text-base-content/40 mb-1">مجموع درآمد</div>
            <div className="text-lg font-black text-primary">{fmtAFN(totalIncome)}</div>
            <div className="text-[10px] text-base-content/30 mt-1">{incomes.length} ورودی</div>
          </div>
        </div>
        {[1, 2, 3, 4].map(q => {
          const qAmt = incomes.filter(i => i.quarter === q).reduce((s, i) => s + i.amount, 0);
          return (
            <div key={q} className={`${cardStyle} ${filterQuarter === q ? 'ring-2 ring-primary' : ''} cursor-pointer hover:bg-base-200 transition-colors`}
              onClick={() => setFilterQuarter(filterQuarter === q ? 0 : q)}>
              <div className="p-4">
                <div className="text-[10px] text-base-content/40 mb-1">{QUARTER_LABELS[q]}</div>
                <div className="text-base font-bold">{fmtAFN(qAmt)}</div>
                <div className="w-full h-1 bg-base-300 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${totalIncome > 0 ? (qAmt / totalIncome) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Category Bars ── */}
      {totalIncome > 0 && (
        <div className={cardStyle}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-base-content/40" />
              <span className="text-xs font-bold text-base-content/60">تفکیک بر اساس نوع درآمد</span>
            </div>
            <div className="space-y-2">
              {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
                const amt = incomes.filter(i => i.category === cat).reduce((s, i) => s + i.amount, 0);
                if (amt === 0) return null;
                const isActive = filterCategory === cat;
                return (
                  <div key={cat} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${isActive ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-base-300/50'}`}
                    onClick={() => setFilterCategory(isActive ? 'all' : cat)}>
                    <span className="text-sm">{CAT_ICONS[cat]}</span>
                    <span className="text-xs font-medium text-base-content/70 w-28">{label}</span>
                    <div className="flex-1 h-2 bg-base-300 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(amt / maxCatAmt) * 100}%`, background: CAT_COLORS[cat] }} />
                    </div>
                    <span className="text-xs font-bold w-24 text-left" style={{ color: CAT_COLORS[cat] }}>{fmtAFN(amt)}</span>
                    <span className="text-[10px] text-base-content/30 w-10 text-left">{fmtPct(amt, totalIncome)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar: Search + Filter + Print + Add ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30" />
          <input type="text" placeholder="جستجو در درآمدها..."
            className="input input-bordered input-sm w-full pr-9 bg-base-200/50 backdrop-blur-sm"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="select select-bordered select-sm bg-base-200/50"
          value={filterQuarter} onChange={e => setFilterQuarter(parseInt(e.target.value))}>
          <option value={0}>همه ربع‌ها</option>
          {[1, 2, 3, 4].map(q => <option key={q} value={q}>{QUARTER_LABELS[q]}</option>)}
        </select>
        <select className="select select-bordered select-sm bg-base-200/50"
          value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">همه انواع</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {incomes.length > 0 && (
          <button className="btn btn-sm gap-1.5 border-0 text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/20"
            onClick={handlePrint}>
            <Printer size={14} /> چاپ عواید
          </button>
        )}
        <button className="btn btn-primary btn-sm gap-1.5 shadow-lg shadow-primary/20"
          onClick={() => setShowForm(!showForm)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'بستن' : 'درآمد جدید'}
        </button>
      </div>

      {/* ── Add Form (Collapsible) ── */}
      {showForm && (
        <div className={`${cardStyle} animate-in`}>
          <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
          <div className="p-4">
            <form onSubmit={handleAdd}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="form-control gap-1">
                  <label className="label py-0"><span className="label-text text-xs">نوع درآمد</span></label>
                  <select className="select select-bordered select-sm" value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{CAT_ICONS[k]} {v}</option>
                    ))}
                  </select>
                </div>
                <div className="form-control gap-1">
                  <label className="label py-0"><span className="label-text text-xs">ربع مالی</span></label>
                  <select className="select select-bordered select-sm" value={form.quarter}
                    onChange={e => setForm(p => ({ ...p, quarter: parseInt(e.target.value) }))}>
                    {[1, 2, 3, 4].map(q => <option key={q} value={q}>{QUARTER_LABELS[q]}</option>)}
                  </select>
                </div>
                <div className="form-control gap-1">
                  <label className="label py-0"><span className="label-text text-xs">مبلغ (افغانی) *</span></label>
                  <input type="number" className="input input-bordered input-sm" value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="0" min="0" step="any" required />
                </div>
                <div className="form-control gap-1">
                  <label className="label py-0"><span className="label-text text-xs">توضیح</span></label>
                  <div className="flex gap-2">
                    <input type="text" className="input input-bordered input-sm flex-1" value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="شرح درآمد" />
                    <button type="submit" className="btn btn-primary btn-sm gap-1">
                      <Plus size={14} /> ثبت
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Filter status ── */}
      {(filterQuarter > 0 || filterCategory !== 'all' || searchTerm) && (
        <div className="flex items-center gap-2 text-xs text-base-content/50">
          <Filter size={12} />
          <span>نمایش {filtered.length} از {incomes.length} ورودی</span>
          <span className="font-bold text-primary">{fmtAFN(filteredTotal)}</span>
          <button className="btn btn-ghost btn-xs text-error" onClick={() => { setFilterQuarter(0); setFilterCategory('all'); setSearchTerm(''); }}>
            <X size={10} /> پاک کردن فیلتر
          </button>
        </div>
      )}

      {/* ── Entries by Quarter ── */}
      {filtered.length === 0 ? (
        <div className={cardStyle}>
          <div className="p-12 text-center text-base-content/30">
            <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
            <div className="font-medium">
              {incomes.length === 0 ? 'هیچ درآمدی ثبت نشده است' : 'نتیجه‌ای با فیلتر فعلی یافت نشد'}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(q => {
            const qEntries = byQuarter[q];
            if (qEntries.length === 0) return null;
            const qTotal = qEntries.reduce((s, i) => s + i.amount, 0);
            return (
              <div key={q} className={cardStyle}>
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/50 border-b border-gray-200/50">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />
                    <span className="font-bold text-sm">{QUARTER_LABELS[q]}</span>
                    <span className="badge badge-ghost badge-xs">{qEntries.length} ورودی</span>
                  </div>
                  <span className="badge badge-primary badge-sm font-bold">{fmtAFN(qTotal)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr className="text-[10px] text-base-content/40">
                        <th>نوع</th><th>مبلغ (؋)</th><th>توضیح</th><th className="w-24 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qEntries.map(inc => (
                        <tr key={inc.id} className="hover:bg-base-200/50 transition-colors">
                          {editingId === inc.id ? (
                            <>
                              <td>
                                <select className="select select-bordered select-xs w-full" value={editForm.category}
                                  onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}>
                                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                              </td>
                              <td>
                                <input type="number" className="input input-bordered input-xs w-24" value={editForm.amount}
                                  onChange={e => setEditForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
                              </td>
                              <td>
                                <input type="text" className="input input-bordered input-xs w-full" value={editForm.description || ''}
                                  onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                              </td>
                              <td className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button className="btn btn-ghost btn-xs text-success" onClick={saveEdit}><Check size={12} /></button>
                                  <button className="btn btn-ghost btn-xs text-base-content/40" onClick={cancelEdit}><X size={12} /></button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm">{CAT_ICONS[inc.category]}</span>
                                  <span className="badge badge-ghost badge-xs">{CATEGORY_LABELS[inc.category] || inc.category}</span>
                                </div>
                              </td>
                              <td className="font-semibold">{inc.amount.toLocaleString()}</td>
                              <td className="text-base-content/50 text-xs">{inc.description || '—'}</td>
                              <td className="text-center">
                                <div className="flex items-center justify-center gap-0.5">
                                  <button className="btn btn-ghost btn-xs text-info" onClick={() => startEdit(inc)}>
                                    <Edit3 size={11} />
                                  </button>
                                  <button className="btn btn-ghost btn-xs text-error" onClick={() => onDelete(inc.id)}>
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
