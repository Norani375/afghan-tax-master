import React, { useState, useMemo } from 'react';
import { Plus, Trash2, FileText, Edit3, X, Check, Search, PieChart, Printer } from 'lucide-react';
import { Deduction, DEDUCTION_TYPE_LABELS } from '../types';
import { fmtAFN, fmtPct } from '../utils/formatters';
import { openPrintWindow } from '../utils/printHelper';

interface DeductionsProps {
  deductions: Deduction[];
  onAdd: (ded: Omit<Deduction, 'id' | 'companyId'>) => void;
  onEdit: (id: number, updated: Partial<Deduction>) => void;
  onDelete: (id: number) => void;
  companyName?: string;
  companyLogo?: string;
}

const TYPE_ICONS: Record<string, { icon: string; color: string; gradient: string }> = {
  expense:   { icon: '📋', color: '#6366f1', gradient: 'from-indigo-500 to-purple-600' },
  exemption: { icon: '🛡️', color: '#10b981', gradient: 'from-emerald-500 to-teal-600' },
  mandatory: { icon: '⚖️', color: '#f59e0b', gradient: 'from-amber-500 to-orange-600' },
};

const defaultForm = { type: 'expense', description: '', amount: '' };

export const Deductions: React.FC<DeductionsProps> = ({ deductions, onAdd, onEdit, onDelete, companyName, companyLogo }) => {
  const [form, setForm] = useState({ ...defaultForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Deduction>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(form.amount as string);
    if (!form.description || !amt || amt <= 0) return;
    onAdd({ type: form.type, description: form.description, amount: amt });
    setForm({ ...defaultForm });
    setShowForm(false);
  }

  function startEdit(ded: Deduction) {
    setEditingId(ded.id);
    setEditForm({ type: ded.type, description: ded.description, amount: ded.amount });
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
    return deductions.filter(d => {
      if (filterType !== 'all' && d.type !== filterType) return false;
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        if (!d.description.toLowerCase().includes(t) && !(DEDUCTION_TYPE_LABELS[d.type] || '').toLowerCase().includes(t)) return false;
      }
      return true;
    });
  }, [deductions, filterType, searchTerm]);

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const byType: Record<string, number> = {};
  for (const d of deductions) { byType[d.type] = (byType[d.type] || 0) + d.amount; }
  const maxType = Math.max(...Object.values(byType), 1);

  /* ── Print Handler ── */
  function handlePrint() {
    // Type summary
    const typeSummaryRows = Object.entries(DEDUCTION_TYPE_LABELS).map(([type, label], i) => {
      const amt = byType[type] || 0;
      const pct = totalDeductions > 0 ? ((amt / totalDeductions) * 100).toFixed(1) : '0';
      const t = TYPE_ICONS[type] || TYPE_ICONS.expense;
      const bg = i % 2 === 0 ? '#fff' : '#f7f7f7';
      const barW = totalDeductions > 0 ? Math.round((amt / totalDeductions) * 100) : 0;
      return `<tr style="background:${bg}">
        <td style="padding:6pt 10pt;border-bottom:0.5pt solid #e0e0e0">${t.icon} ${label}</td>
        <td style="padding:6pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left;font-weight:600;color:${t.color}">${amt.toLocaleString()} ؋</td>
        <td style="padding:6pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left">
          <div style="display:flex;align-items:center;gap:6pt">
            <div style="width:60pt;height:6pt;background:#eee;border-radius:3pt;overflow:hidden">
              <div style="width:${barW}%;height:100%;background:${t.color};border-radius:3pt"></div>
            </div>
            <span style="font-size:8pt;color:#666">${pct}٪</span>
          </div>
        </td>
      </tr>`;
    }).join('');

    // Detail rows
    const detailRows = deductions.map((ded, i) => {
      const bg = i % 2 === 0 ? '#fff' : '#f7f7f7';
      const typeLabel = DEDUCTION_TYPE_LABELS[ded.type] || ded.type;
      const t = TYPE_ICONS[ded.type] || TYPE_ICONS.expense;
      return `<tr style="background:${bg}">
        <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:center">${i + 1}</td>
        <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0;font-weight:600">${ded.description}</td>
        <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0;font-size:9pt;color:#666">${t.icon} ${typeLabel}</td>
        <td style="padding:5pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left;font-weight:600;color:${t.color}">${ded.amount.toLocaleString()} ؋</td>
      </tr>`;
    }).join('');

    const content = `
      <!-- Type Summary -->
      <div class="sec-title">▪ خلاصه کسورات بر اساس نوع</div>
      <div class="sec-body">
        <table>
          <thead><tr class="thead">
            <th style="text-align:right">نوع کسر</th>
            <th style="text-align:left">مبلغ (؋)</th>
            <th style="text-align:left;width:30%">سهم</th>
          </tr></thead>
          <tbody>
            ${typeSummaryRows}
            <tr class="total-row">
              <td style="padding:7pt 10pt">مجموع کل کسورات</td>
              <td style="padding:7pt 10pt;text-align:left">${totalDeductions.toLocaleString()} ؋</td>
              <td style="padding:7pt 10pt;text-align:left">100٪</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Detail Table -->
      <div class="sec-title" style="margin-top:14pt">▪ جزئیات کسورات و مصارف</div>
      <div class="sec-body">
        <table>
          <thead><tr class="thead">
            <th style="text-align:center;width:6%">#</th>
            <th style="text-align:right">شرح</th>
            <th style="text-align:right">نوع</th>
            <th style="text-align:left">مبلغ (؋)</th>
          </tr></thead>
          <tbody>
            ${detailRows}
            <tr style="background:linear-gradient(135deg,#dc2626,#e11d48);color:#fff;font-weight:700">
              <td colspan="3" style="padding:8pt 10pt">مجموع کل</td>
              <td style="padding:8pt 10pt;text-align:left">${totalDeductions.toLocaleString()} ؋</td>
            </tr>
          </tbody>
        </table>
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
      title: `گزارش مصارف — ${companyName || 'شرکت'}`,
      companyName: companyName || 'شرکت صرافی',
      companyLogo,
      pageTitle: 'گزارش کسورات و مصارف',
      content,
    });
  }

  const cardStyle = 'rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm overflow-hidden';

  return (
    <div className="space-y-4" dir="rtl">

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Total */}
        <div className={cardStyle}>
          <div className="p-4">
            <div className="text-[10px] text-base-content/40 mb-1">مجموع کسورات</div>
            <div className="text-xl font-black text-success">{fmtAFN(totalDeductions)}</div>
            <div className="text-[10px] text-base-content/30">{deductions.length} مورد ثبت شده</div>
          </div>
        </div>

        {/* Per type */}
        {Object.entries(DEDUCTION_TYPE_LABELS).map(([type, label]) => {
          const amt = byType[type] || 0;
          const t = TYPE_ICONS[type] || TYPE_ICONS.expense;
          const isActive = filterType === type;
          return (
            <div key={type} className={`${cardStyle} cursor-pointer transition-all ${isActive ? 'ring-2 ring-primary' : 'hover:bg-base-200'}`}
              onClick={() => setFilterType(isActive ? 'all' : type)}>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{t.icon}</span>
                  <div className="text-[10px] text-base-content/40">{label}</div>
                </div>
                <div className="text-lg font-bold" style={{ color: t.color }}>{fmtAFN(amt)}</div>
                <div className="w-full h-1.5 bg-base-300 rounded-full mt-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${totalDeductions > 0 ? (amt / totalDeductions) * 100 : 0}%`, background: t.color }} />
                </div>
                <div className="text-[10px] text-base-content/30 mt-1">{fmtPct(amt, totalDeductions)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Visual Distribution ── */}
      {totalDeductions > 0 && (
        <div className={cardStyle}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <PieChart size={14} className="text-base-content/40" />
              <span className="text-xs font-bold text-base-content/60">توزیع کسورات</span>
            </div>
            <div className="flex gap-2 h-6 rounded-lg overflow-hidden">
              {Object.entries(DEDUCTION_TYPE_LABELS).map(([type]) => {
                const amt = byType[type] || 0;
                if (amt === 0) return null;
                const t = TYPE_ICONS[type] || TYPE_ICONS.expense;
                return (
                  <div key={type} className="transition-all duration-500 relative group"
                    style={{ flex: amt, background: t.color, minWidth: amt > 0 ? 20 : 0 }}>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-[9px] font-bold">{fmtPct(amt, totalDeductions)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-3">
              {Object.entries(DEDUCTION_TYPE_LABELS).map(([type, label]) => {
                const t = TYPE_ICONS[type] || TYPE_ICONS.expense;
                return (
                  <div key={type} className="flex items-center gap-1.5 text-[10px] text-base-content/50">
                    <div className="w-3 h-2 rounded" style={{ background: t.color }} />
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30" />
          <input type="text" placeholder="جستجو در کسورات..."
            className="input input-bordered input-sm w-full pr-9 bg-base-200/50"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="select select-bordered select-sm bg-base-200/50"
          value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">همه انواع</option>
          {Object.entries(DEDUCTION_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {deductions.length > 0 && (
          <button className="btn btn-sm gap-1.5 border-0 text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-lg shadow-rose-500/20"
            onClick={handlePrint}>
            <Printer size={14} /> چاپ مصارف
          </button>
        )}
        <button className="btn btn-primary btn-sm gap-1.5 shadow-lg shadow-primary/20" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'بستن' : 'کسر جدید'}
        </button>
      </div>

      {/* ── Add Form ── */}
      {showForm && (
        <div className={cardStyle}>
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="p-4">
            <form onSubmit={handleAdd}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="form-control gap-1">
                  <label className="label py-0"><span className="label-text text-xs">نوع کسر</span></label>
                  <select className="select select-bordered select-sm" value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    {Object.entries(DEDUCTION_TYPE_LABELS).map(([k, v]) => {
                      const t = TYPE_ICONS[k];
                      return <option key={k} value={k}>{t?.icon} {v}</option>;
                    })}
                  </select>
                </div>
                <div className="form-control gap-1">
                  <label className="label py-0"><span className="label-text text-xs">توضیحات *</span></label>
                  <input type="text" className="input input-bordered input-sm" value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="شرح هزینه یا معافیت" required />
                </div>
                <div className="form-control gap-1">
                  <label className="label py-0"><span className="label-text text-xs">مبلغ (؋) *</span></label>
                  <div className="flex gap-2">
                    <input type="number" className="input input-bordered input-sm flex-1" value={form.amount}
                      onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="0" min="0" step="any" required />
                    <button type="submit" className="btn btn-primary btn-sm gap-1"><Plus size={14} /> ثبت</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Deductions List ── */}
      {filtered.length === 0 ? (
        <div className={cardStyle}>
          <div className="p-12 text-center text-base-content/30">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <div className="font-medium">{deductions.length === 0 ? 'هیچ کسری ثبت نشده است' : 'نتیجه‌ای یافت نشد'}</div>
          </div>
        </div>
      ) : (
        <div className={cardStyle}>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr className="text-[10px] text-base-content/40">
                  <th>نوع</th><th>توضیحات</th><th>مبلغ (؋)</th><th className="w-24 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ded => {
                  const t = TYPE_ICONS[ded.type] || TYPE_ICONS.expense;
                  return (
                    <tr key={ded.id} className="hover:bg-base-200/50 transition-colors">
                      {editingId === ded.id ? (
                        <>
                          <td>
                            <select className="select select-bordered select-xs" value={editForm.type}
                              onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))}>
                              {Object.entries(DEDUCTION_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </td>
                          <td>
                            <input type="text" className="input input-bordered input-xs w-full" value={editForm.description || ''}
                              onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                          </td>
                          <td>
                            <input type="number" className="input input-bordered input-xs w-24" value={editForm.amount || 0}
                              onChange={e => setEditForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
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
                              <span>{t.icon}</span>
                              <span className="badge badge-ghost badge-xs">{DEDUCTION_TYPE_LABELS[ded.type] || ded.type}</span>
                            </div>
                          </td>
                          <td className="text-sm">{ded.description}</td>
                          <td className="font-semibold" style={{ color: t.color }}>{ded.amount.toLocaleString()} ؋</td>
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <button className="btn btn-ghost btn-xs text-info" onClick={() => startEdit(ded)}><Edit3 size={11} /></button>
                              <button className="btn btn-ghost btn-xs text-error" onClick={() => onDelete(ded.id)}><Trash2 size={11} /></button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="font-bold text-sm">
                    <td colSpan={2} className="text-left">مجموع</td>
                    <td className="text-success">{filtered.reduce((s, d) => s + d.amount, 0).toLocaleString()} ؋</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
