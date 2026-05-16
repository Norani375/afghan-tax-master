import React, { useState, useEffect, useRef } from 'react';
import { Save, Building2, CheckCircle, Plus, Trash2, Edit3, X, MapPin, Phone, Hash, Calendar, FileText, ChevronLeft, Printer, ImagePlus, XCircle } from 'lucide-react';
import { Company } from '../types';

interface CompanyInfoProps {
  company: Company;
  companies: Company[];
  onSave: (company: Company) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onSwitch: (id: string) => void;
  getCompanyStats: (id: string) => { incomeCount: number; employeeCount: number; deductionCount: number; totalIncome: number };
}

export const CompanyInfo: React.FC<CompanyInfoProps> = ({
  company, companies, onSave, onAdd, onDelete, onSwitch, getCompanyStats,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Company>(company);
  const [saved, setSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) {
      const co = companies.find(c => c.id === editingId);
      if (co) setForm(co);
    } else {
      setForm(company);
    }
  }, [editingId, company, companies]);

  function set(field: keyof Company, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditingId(null); }, 1500);
  }

  function handleEdit(id: string) {
    setEditingId(id);
    onSwitch(id);
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) { alert('حجم لوگو نباید بیشتر از ۵۰۰ کیلوبایت باشد'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setForm(prev => ({ ...prev, logo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setForm(prev => ({ ...prev, logo: undefined }));
    if (logoInputRef.current) logoInputRef.current.value = '';
  }

  const GRADIENT_COLORS = [
    'from-indigo-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-cyan-500 to-blue-600',
    'from-pink-500 to-rose-600',
    'from-amber-500 to-yellow-600',
    'from-violet-500 to-fuchsia-600',
    'from-lime-500 to-green-600',
  ];

  function getGradient(index: number) {
    return GRADIENT_COLORS[index % GRADIENT_COLORS.length];
  }

  /* ── Print Companies ── */
  function printCompanies() {
    const rows = companies.map((co, i) => {
      const stats = getCompanyStats(co.id);
      const bg = i % 2 === 0 ? '#fff' : '#f7f7f7';
      const logoImg = co.logo ? `<img src="${co.logo}" style="width:36pt;height:36pt;border-radius:6pt;object-fit:cover" />` : `<div style="width:36pt;height:36pt;border-radius:6pt;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14pt">${(co.name || '?')[0]}</div>`;
      return `<tr style="background:${bg}">
        <td style="padding:8pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:center">${i + 1}</td>
        <td style="padding:8pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:center">${logoImg}</td>
        <td style="padding:8pt 10pt;border-bottom:0.5pt solid #e0e0e0;font-weight:700">${co.name || '—'}</td>
        <td style="padding:8pt 10pt;border-bottom:0.5pt solid #e0e0e0">${co.license_no || '—'}</td>
        <td style="padding:8pt 10pt;border-bottom:0.5pt solid #e0e0e0">${co.tin || '—'}</td>
        <td style="padding:8pt 10pt;border-bottom:0.5pt solid #e0e0e0">${co.phone || '—'}</td>
        <td style="padding:8pt 10pt;border-bottom:0.5pt solid #e0e0e0">${co.address || '—'}</td>
        <td style="padding:8pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:center">${stats.employeeCount}</td>
        <td style="padding:8pt 10pt;border-bottom:0.5pt solid #e0e0e0;text-align:left;font-weight:600">${stats.totalIncome.toLocaleString()} ؋</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8"/>
<title>لیست شرکت‌ها</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{font-family:'Vazirmatn','Tahoma',sans-serif;font-size:10pt;color:#1a1a1a;background:#fff;direction:rtl}
@page{size:A4 landscape;margin:10mm 12mm}
table{width:100%;border-collapse:collapse}
</style></head><body style="padding:10pt">
<div style="text-align:center;padding:14pt 0;margin-bottom:14pt;background:linear-gradient(135deg,#1e1b4b,#312e81,#4338ca);border-radius:10pt;color:#fff">
  <div style="font-size:14pt;font-weight:900">لیست شرکت‌های ثبت شده</div>
  <div style="font-size:9pt;color:rgba(255,255,255,0.6);margin-top:4pt">تعداد: ${companies.length} شرکت</div>
</div>
<table>
<thead><tr style="background:#1e293b;color:#fff">
  <th style="padding:8pt 10pt;font-weight:600;font-size:9pt">#</th>
  <th style="padding:8pt 10pt;font-weight:600;font-size:9pt">لوگو</th>
  <th style="padding:8pt 10pt;font-weight:600;font-size:9pt;text-align:right">نام شرکت</th>
  <th style="padding:8pt 10pt;font-weight:600;font-size:9pt;text-align:right">شماره جواز</th>
  <th style="padding:8pt 10pt;font-weight:600;font-size:9pt;text-align:right">TIN</th>
  <th style="padding:8pt 10pt;font-weight:600;font-size:9pt;text-align:right">تماس</th>
  <th style="padding:8pt 10pt;font-weight:600;font-size:9pt;text-align:right">آدرس</th>
  <th style="padding:8pt 10pt;font-weight:600;font-size:9pt;text-align:center">کارمندان</th>
  <th style="padding:8pt 10pt;font-weight:600;font-size:9pt;text-align:left">مجموع درآمد</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
<div style="margin-top:20pt;text-align:center;font-size:8pt;color:#888;border-top:1pt solid #eee;padding-top:8pt">
  Manochehr Norani — تماس: 0744173723
</div>
</body></html>`;

    const w = window.open('', '_blank', 'width=1100,height=700');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 600); }
  }

  /* ── Company Cards View ── */
  if (!editingId) {
    return (
      <div dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">مدیریت شرکت‌ها</h2>
              <p className="text-xs text-base-content/50">{companies.length} شرکت ثبت شده</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-outline btn-sm gap-1.5" onClick={printCompanies}>
              <Printer size={14} />
              چاپ
            </button>
            <button className="btn btn-primary btn-sm gap-1.5 shadow-lg shadow-primary/25" onClick={onAdd}>
              <Plus size={15} />
              شرکت جدید
            </button>
          </div>
        </div>

        {/* Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((co, idx) => {
            const stats = getCompanyStats(co.id);
            const isActive = co.id === company.id;

            return (
              <div
                key={co.id}
                className={`card bg-base-200 border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer ${
                  isActive ? 'border-primary shadow-lg shadow-primary/10' : 'border-transparent hover:border-base-300'
                }`}
                onClick={() => onSwitch(co.id)}
              >
                {/* Gradient top bar */}
                <div className={`h-2 rounded-t-2xl bg-gradient-to-r ${getGradient(idx)}`} />

                <div className="card-body p-4 gap-3">
                  {/* Company name + logo + active badge */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {co.logo ? (
                        <img src={co.logo} alt="logo" className="w-9 h-9 rounded-lg object-cover shadow-sm" />
                      ) : (
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradient(idx)} flex items-center justify-center text-white font-bold text-sm`}>
                          {(co.name || '?')[0]}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-sm leading-tight">{co.name || 'شرکت بدون نام'}</h3>
                        <span className="text-[10px] text-base-content/40">سال {co.year}</span>
                      </div>
                    </div>
                    {isActive && (
                      <span className="badge badge-primary badge-xs gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        فعال
                      </span>
                    )}
                  </div>

                  {/* Info pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {co.tin && (
                      <span className="badge badge-ghost badge-xs gap-0.5">
                        <Hash size={8} /> {co.tin}
                      </span>
                    )}
                    {co.phone && (
                      <span className="badge badge-ghost badge-xs gap-0.5">
                        <Phone size={8} /> {co.phone}
                      </span>
                    )}
                    {co.address && (
                      <span className="badge badge-ghost badge-xs gap-0.5">
                        <MapPin size={8} /> {co.address.slice(0, 20)}{co.address.length > 20 ? '…' : ''}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="text-center p-2 bg-base-300/50 rounded-lg">
                      <div className="text-xs font-bold text-primary">{stats.incomeCount}</div>
                      <div className="text-[9px] text-base-content/50">درآمد</div>
                    </div>
                    <div className="text-center p-2 bg-base-300/50 rounded-lg">
                      <div className="text-xs font-bold text-success">{stats.employeeCount}</div>
                      <div className="text-[9px] text-base-content/50">کارمند</div>
                    </div>
                    <div className="text-center p-2 bg-base-300/50 rounded-lg">
                      <div className="text-xs font-bold text-warning">{stats.deductionCount}</div>
                      <div className="text-[9px] text-base-content/50">کسورات</div>
                    </div>
                  </div>

                  {/* Total income bar */}
                  {stats.totalIncome > 0 && (
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[10px] text-base-content/50 mb-1">
                        <span>مجموع درآمد</span>
                        <span className="font-bold text-base-content">{stats.totalIncome.toLocaleString()} ؋</span>
                      </div>
                      <div className="h-1.5 bg-base-300 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${getGradient(idx)}`}
                          style={{
                            width: `${Math.min(100, (stats.totalIncome / Math.max(...companies.map(c => getCompanyStats(c.id).totalIncome || 1))) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-1 border-t border-base-300">
                    <button
                      className="btn btn-ghost btn-xs flex-1 gap-1 text-primary"
                      onClick={(e) => { e.stopPropagation(); handleEdit(co.id); }}
                    >
                      <Edit3 size={11} /> ویرایش
                    </button>
                    {companies.length > 1 && (
                      <button
                        className="btn btn-ghost btn-xs text-error gap-1"
                        onClick={(e) => { e.stopPropagation(); onDelete(co.id); }}
                      >
                        <Trash2 size={11} /> حذف
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add new company card */}
          <div
            className="card border-2 border-dashed border-base-300 hover:border-primary/50 transition-all duration-300 cursor-pointer hover:shadow-lg group"
            onClick={onAdd}
          >
            <div className="card-body items-center justify-center min-h-[200px] text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Plus size={28} className="text-primary" />
              </div>
              <div>
                <div className="font-bold text-sm text-base-content/70">شرکت جدید اضافه کنید</div>
                <div className="text-[10px] text-base-content/40 mt-0.5">اطلاعات مالی هر شرکت جداگانه ذخیره می‌شود</div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary bar */}
        <div className="mt-6 card bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
          <div className="card-body p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-indigo-500" />
                <span className="text-sm font-bold">خلاصه کل</span>
              </div>
              <div className="flex gap-6 flex-wrap">
                <div className="text-center">
                  <div className="text-lg font-black text-primary">{companies.length}</div>
                  <div className="text-[10px] text-base-content/50">شرکت</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black text-success">
                    {companies.reduce((sum, c) => sum + getCompanyStats(c.id).employeeCount, 0)}
                  </div>
                  <div className="text-[10px] text-base-content/50">کل کارمندان</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black text-warning">
                    {companies.reduce((sum, c) => sum + getCompanyStats(c.id).totalIncome, 0).toLocaleString()} ؋
                  </div>
                  <div className="text-[10px] text-base-content/50">کل درآمد</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Edit Form View ── */
  return (
    <div dir="rtl">
      {/* Back button */}
      <button
        className="btn btn-ghost btn-sm gap-1 mb-4"
        onClick={() => setEditingId(null)}
      >
        <ChevronLeft size={14} />
        برگشت به لیست شرکت‌ها
      </button>

      <form onSubmit={handleSubmit}>
        <div className="card bg-base-200 shadow-xl">
          {/* Gradient header */}
          <div className={`h-2 rounded-t-2xl bg-gradient-to-r ${getGradient(companies.findIndex(c => c.id === editingId))}`} />
          
          <div className="card-body gap-6">
            <div className="flex items-center gap-3">
              {form.logo ? (
                <img src={form.logo} alt="logo" className="w-12 h-12 rounded-xl object-cover shadow-md" />
              ) : (
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getGradient(companies.findIndex(c => c.id === editingId))} flex items-center justify-center text-white font-bold`}>
                  {(form.name || '?')[0]}
                </div>
              )}
              <div>
                <h2 className="card-title text-base">ویرایش اطلاعات شرکت</h2>
                <p className="text-xs text-base-content/40">{form.name || 'شرکت بدون نام'}</p>
              </div>
            </div>

            {/* Logo Upload */}
            <div className="form-control gap-2">
              <label className="label py-0">
                <span className="label-text font-medium flex items-center gap-1.5">
                  <ImagePlus size={14} className="text-primary" /> لوگوی شرکت
                </span>
              </label>
              <div className="flex items-center gap-3">
                {form.logo ? (
                  <div className="relative group">
                    <img src={form.logo} alt="logo" className="w-20 h-20 rounded-xl object-cover shadow-md border-2 border-base-300" />
                    <button
                      type="button"
                      className="absolute -top-2 -left-2 btn btn-circle btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={removeLogo}
                    >
                      <XCircle size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-base-300 flex items-center justify-center text-base-content/30">
                    <ImagePlus size={24} />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="file-input file-input-bordered file-input-sm w-full max-w-xs"
                    onChange={handleLogoUpload}
                  />
                  <span className="text-[10px] text-base-content/40">حداکثر ۵۰۰ کیلوبایت — PNG, JPG, SVG</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 form-control gap-1">
                <label className="label py-0">
                  <span className="label-text font-medium">نام شرکت <span className="text-error">*</span></span>
                </label>
                <input type="text" className="input input-bordered" value={form.name}
                  onChange={e => set('name', e.target.value)} placeholder="نام کامل شرکت صرافی" required />
              </div>

              <div className="form-control gap-1">
                <label className="label py-0"><span className="label-text font-medium">شماره جواز تجارتی</span></label>
                <input type="text" className="input input-bordered" value={form.license_no}
                  onChange={e => set('license_no', e.target.value)} placeholder="AISA-2024-XXXXX" />
              </div>

              <div className="form-control gap-1">
                <label className="label py-0"><span className="label-text font-medium">نمبر TIN (شناسه مالیاتی)</span></label>
                <input type="text" className="input input-bordered" value={form.tin}
                  onChange={e => set('tin', e.target.value)} placeholder="Tax Identification Number" />
              </div>

              <div className="form-control gap-1">
                <label className="label py-0"><span className="label-text font-medium">شماره تماس</span></label>
                <input type="text" className="input input-bordered" value={form.phone}
                  onChange={e => set('phone', e.target.value)} placeholder="0700-000-000" />
              </div>

              <div className="form-control gap-1">
                <label className="label py-0"><span className="label-text font-medium">سال مالی (شمسی)</span></label>
                <input type="number" className="input input-bordered" value={form.year}
                  onChange={e => set('year', parseInt(e.target.value) || 1403)} min={1380} max={1430} />
              </div>

              <div className="form-control gap-1 md:col-span-2">
                <label className="label py-0"><span className="label-text font-medium">آدرس دفتر</span></label>
                <input type="text" className="input input-bordered" value={form.address}
                  onChange={e => set('address', e.target.value)} placeholder="ولایت، ناحیه، آدرس کامل" />
              </div>
            </div>

            <div className="divider text-xs text-base-content/40 my-0">دوره مالی گزارش</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control gap-1">
                <label className="label py-0"><span className="label-text font-medium">تاریخ شروع دوره</span></label>
                <input type="text" className="input input-bordered" value={form.period_start}
                  onChange={e => set('period_start', e.target.value)} placeholder="۱۴۰۳/۰۱/۰۱" />
              </div>
              <div className="form-control gap-1">
                <label className="label py-0"><span className="label-text font-medium">تاریخ پایان دوره</span></label>
                <input type="text" className="input input-bordered" value={form.period_end}
                  onChange={e => set('period_end', e.target.value)} placeholder="۱۴۰۳/۱۲/۲۹" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn btn-ghost btn-sm gap-1" onClick={() => setEditingId(null)}>
                <X size={14} /> انصراف
              </button>
              <button type="submit" className="btn btn-primary btn-sm gap-1.5 shadow-lg shadow-primary/25">
                {saved ? <CheckCircle size={15} /> : <Save size={15} />}
                {saved ? 'ذخیره شد ✓' : 'ذخیره تغییرات'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
