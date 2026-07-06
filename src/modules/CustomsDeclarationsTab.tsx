import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Plus, Trash2, Search, Upload, Download, FileText, RefreshCw, AlertCircle, CheckCircle2, TrendingUp, Package, Wallet } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import {
  calcImportTaxes, validateTIN, CUSTOMS_OFFICES, CURRENCIES,
} from '@/lib/tax-engine';

interface Declaration {
  id: string;
  declaration_no: string;
  declaration_type: 'import' | 'export';
  customs_office: string;
  declaration_date: string;
  importer_tin: string | null;
  hs_code: string | null;
  goods_description: string;
  country: string | null;
  quantity: number;
  unit: string | null;
  currency: string;
  invoice_value: number;
  exchange_rate: number;
  value_afn: number;
  customs_duty_rate: number;
  customs_duty: number;
  brt_rate: number;
  brt_amount: number;
  vat_rate: number;
  vat_amount: number;
  red_tax: number;
  total_tax: number;
  payment_status: 'unpaid' | 'paid' | 'partial';
  payment_date: string | null;
  receipt_no: string | null;
  broker_name: string | null;
  vehicle_vin: string | null;
  bill_of_lading_no: string | null;
  notes: string | null;
  company_id: string | null;
}

interface Company { id: string; name: string; tin: string | null; }
interface Rate { currency_code: string; rate_to_afn: number; rate_date: string; }
interface HsTariff { hs_code: string; description_fa: string; duty_rate: number; vat_applicable: boolean; restricted: boolean; }

const fmt = (n: number) => Math.round(n || 0).toLocaleString('fa-AF');
const fmt2 = (n: number) => (n || 0).toLocaleString('fa-AF', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);

// تبدیل ساده تاریخ جلالی → میلادی (سال/ماه/روز)
function jalaliToGregorian(jy: number, jm: number, jd: number): string {
  let gy = jy > 979 ? 1600 : 621;
  let jy2 = jy - (jy > 979 ? 979 : 0);
  let days = 365 * jy2 + Math.floor(jy2 / 33) * 8 + Math.floor(((jy2 % 33) + 3) / 4);
  for (let i = 0; i < jm - 1; ++i) days += i < 6 ? 31 : 30;
  days += jd - 1 + 79;
  gy += 400 * Math.floor(days / 146097); days %= 146097;
  let leap = true;
  if (days >= 36525) { days--; gy += 100 * Math.floor(days / 36524); days %= 36524; if (days >= 365) days++; else leap = false; }
  gy += 4 * Math.floor(days / 1461); days %= 1461;
  if (days >= 366) { leap = false; days--; gy += Math.floor(days / 365); days %= 365; }
  const gdm = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0; for (; gm < 12 && days >= gdm[gm]; gm++) days -= gdm[gm];
  const gd = days + 1;
  return `${gy}-${String(gm + 1).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

function parseAnyDate(raw: any): string {
  if (!raw) return today();
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  const s = String(raw).trim().replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
  const m = s.match(/(\d{2,4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (!m) return today();
  const y = parseInt(m[1]), mo = parseInt(m[2]), d = parseInt(m[3]);
  if (y < 1500) return jalaliToGregorian(y < 100 ? 1400 + y : y, mo, d);
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

interface Props {
  onFlash?: (m: string) => void;
  onLog?: (action: string, detail: string) => void;
}

const emptyForm = {
  declaration_no: '',
  declaration_type: 'import' as 'import' | 'export',
  customs_office: CUSTOMS_OFFICES[0],
  declaration_date: today(),
  importer_tin: '',
  hs_code: '',
  goods_description: '',
  country: '',
  quantity: 0,
  unit: 'عدد',
  currency: 'USD',
  invoice_value: 0,
  exchange_rate: 71,
  customs_duty_rate: 5,
  broker_name: '',
  vehicle_vin: '',
  bill_of_lading_no: '',
  notes: '',
  company_id: '' as string,
};

const CustomsDeclarationsTab: React.FC<Props> = ({ onFlash, onLog }) => {
  const [items, setItems] = useState<Declaration[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [tariffs, setTariffs] = useState<HsTariff[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'import' | 'export'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid' | 'partial'>('all');
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (m: string) => onFlash?.(m);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [decls, comps, rt, hs] = await Promise.all([
        supabase.from('customs_declarations').select('*').order('declaration_date', { ascending: false }).limit(500),
        supabase.from('companies').select('id, name, tin'),
        supabase.from('exchange_rates').select('currency_code, rate_to_afn, rate_date').order('rate_date', { ascending: false }).limit(50),
        supabase.from('hs_tariffs').select('hs_code, description_fa, duty_rate, vat_applicable, restricted'),
      ]);
      if (decls.data) setItems(decls.data as any);
      if (comps.data) setCompanies(comps.data as any);
      if (rt.data) setRates(rt.data as any);
      if (hs.data) setTariffs(hs.data as any);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  // آخرین نرخ برای هر ارز
  const latestRates = useMemo(() => {
    const m: Record<string, number> = { AFN: 1 };
    for (const r of rates) if (!(r.currency_code in m)) m[r.currency_code] = Number(r.rate_to_afn);
    return m;
  }, [rates]);

  // به‌روزرسانی نرخ خودکار وقتی ارز عوض می‌شود
  useEffect(() => {
    const r = latestRates[form.currency];
    if (r && r !== form.exchange_rate) setForm(f => ({ ...f, exchange_rate: r }));
  }, [form.currency, latestRates]);

  // انتخاب کد HS → نرخ حقوق گمرکی خودکار
  const hsSelected = useMemo(() => tariffs.find(t => t.hs_code === form.hs_code), [form.hs_code, tariffs]);
  useEffect(() => {
    if (hsSelected) setForm(f => ({ ...f, customs_duty_rate: Number(hsSelected.duty_rate) }));
  }, [hsSelected]);

  // محاسبه زنده مالیات‌ها
  const liveCalc = useMemo(() => calcImportTaxes({
    invoiceValue: Number(form.invoice_value) || 0,
    exchangeRate: Number(form.exchange_rate) || 1,
    customsDutyRate: Number(form.customs_duty_rate) || 0,
    vatApplicable: hsSelected?.vat_applicable ?? true,
  }), [form.invoice_value, form.exchange_rate, form.customs_duty_rate, hsSelected]);

  const tinCheck = validateTIN(form.importer_tin);
  const restrictedWarning = hsSelected?.restricted;

  const filtered = useMemo(() => {
    return items.filter(d => {
      if (typeFilter !== 'all' && d.declaration_type !== typeFilter) return false;
      if (statusFilter !== 'all' && d.payment_status !== statusFilter) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!(
          d.declaration_no.toLowerCase().includes(s) ||
          (d.importer_tin || '').includes(s) ||
          d.goods_description.toLowerCase().includes(s) ||
          (d.hs_code || '').includes(s)
        )) return false;
      }
      return true;
    });
  }, [items, q, typeFilter, statusFilter]);

  // KPI
  const kpi = useMemo(() => {
    const todayStr = today();
    const monthStart = todayStr.slice(0, 7);
    let todayCount = 0, monthCount = 0, monthTax = 0, unpaidCount = 0, unpaidAmt = 0, imp = 0, exp = 0;
    for (const d of items) {
      if (d.declaration_date === todayStr) todayCount++;
      if (d.declaration_date.startsWith(monthStart)) { monthCount++; monthTax += Number(d.total_tax); }
      if (d.payment_status === 'unpaid') { unpaidCount++; unpaidAmt += Number(d.total_tax); }
      if (d.declaration_type === 'import') imp++; else exp++;
    }
    return { todayCount, monthCount, monthTax, unpaidCount, unpaidAmt, imp, exp };
  }, [items]);

  const submit = async () => {
    if (!form.declaration_no.trim() || !form.goods_description.trim()) {
      flash('شماره اظهارنامه و شرح کالا الزامی است'); return;
    }
    if (restrictedWarning && !confirm('این کد HS کالای محدود/ممنوعه است. ادامه می‌دهید؟')) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { flash('لطفاً وارد شوید'); return; }
    const row: any = {
      user_id: user.id,
      company_id: form.company_id || null,
      declaration_no: form.declaration_no.trim(),
      declaration_type: form.declaration_type,
      customs_office: form.customs_office,
      declaration_date: form.declaration_date,
      importer_tin: form.importer_tin.trim() || null,
      hs_code: form.hs_code.trim() || null,
      goods_description: form.goods_description.trim(),
      country: form.country.trim() || null,
      quantity: Number(form.quantity) || 0,
      unit: form.unit || null,
      currency: form.currency,
      invoice_value: Number(form.invoice_value) || 0,
      exchange_rate: Number(form.exchange_rate) || 1,
      value_afn: liveCalc.valueAfn,
      customs_duty_rate: Number(form.customs_duty_rate) || 0,
      customs_duty: liveCalc.customsDuty,
      brt_rate: 2,
      brt_amount: liveCalc.brt,
      vat_rate: 10,
      vat_amount: liveCalc.vat,
      red_tax: 0,
      total_tax: liveCalc.total,
      payment_status: 'unpaid',
      broker_name: form.broker_name.trim() || null,
      vehicle_vin: form.vehicle_vin.trim() || null,
      bill_of_lading_no: form.bill_of_lading_no.trim() || null,
      notes: form.notes.trim() || null,
    };
    const { error } = await supabase.from('customs_declarations').insert(row);
    if (error) { flash('خطا: ' + error.message); return; }
    flash('اظهارنامه ثبت شد');
    onLog?.('ثبت اظهارنامه', `${row.declaration_no} — مالیات ${fmt(row.total_tax)} افغانی`);
    setForm({ ...emptyForm, exchange_rate: latestRates[emptyForm.currency] || 71 });
    loadAll();
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase.from('customs_declarations')
      .update({ payment_status: 'paid', payment_date: today() }).eq('id', id);
    if (error) { flash('خطا: ' + error.message); return; }
    loadAll();
  };

  const del = async (id: string) => {
    if (!confirm('حذف شود؟')) return;
    const { error } = await supabase.from('customs_declarations').delete().eq('id', id);
    if (error) { flash('خطا: ' + error.message); return; }
    flash('حذف شد'); loadAll();
  };

  // ورود Excel
  const importExcel = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { flash('لطفاً وارد شوید'); return; }
      let ok = 0, skip = 0;
      for (const r of rows) {
        const dno = String(r['شماره'] || r['declaration_no'] || r['شماره اظهارنامه'] || '').trim();
        if (!dno) { skip++; continue; }
        const currency = String(r['ارز'] || r['currency'] || 'USD').toUpperCase();
        const invoice = Number(r['ارزش فاکتور'] || r['invoice_value'] || r['مبلغ'] || 0);
        const rate = Number(r['نرخ'] || r['exchange_rate'] || latestRates[currency] || 1);
        const dutyRate = Number(r['نرخ حقوق'] || r['duty_rate'] || 5);
        const calc = calcImportTaxes({ invoiceValue: invoice, exchangeRate: rate, customsDutyRate: dutyRate });
        const row: any = {
          user_id: user.id,
          declaration_no: dno,
          declaration_type: String(r['نوع'] || r['type'] || 'import').includes('صادر') ? 'export' : 'import',
          customs_office: String(r['گمرک'] || r['customs_office'] || CUSTOMS_OFFICES[0]),
          declaration_date: parseAnyDate(r['تاریخ'] || r['date'] || r['declaration_date']),
          importer_tin: String(r['TIN'] || r['tin'] || '').trim() || null,
          hs_code: String(r['HS'] || r['hs_code'] || '').trim() || null,
          goods_description: String(r['شرح کالا'] || r['description'] || r['کالا'] || dno),
          country: String(r['کشور'] || r['country'] || '').trim() || null,
          quantity: Number(r['مقدار'] || r['quantity'] || 0),
          unit: String(r['واحد'] || r['unit'] || '') || null,
          currency, invoice_value: invoice, exchange_rate: rate,
          value_afn: calc.valueAfn,
          customs_duty_rate: dutyRate, customs_duty: calc.customsDuty,
          brt_rate: 2, brt_amount: calc.brt,
          vat_rate: 10, vat_amount: calc.vat,
          red_tax: 0, total_tax: calc.total,
          payment_status: 'unpaid',
        };
        const { error } = await supabase.from('customs_declarations').upsert(row, { onConflict: 'user_id,declaration_no' });
        if (error) skip++; else ok++;
      }
      flash(`ورود کامل شد: ${ok} موفق، ${skip} رد‌شده`);
      onLog?.('ورود اکسل اظهارنامه', `${ok} ردیف`);
      loadAll();
    } catch (e: any) { flash('خطا: ' + e.message); }
  };

  const exportExcel = () => {
    const data = filtered.map(d => ({
      'شماره': d.declaration_no,
      'نوع': d.declaration_type === 'import' ? 'واردات' : 'صادرات',
      'گمرک': d.customs_office,
      'تاریخ': d.declaration_date,
      'TIN': d.importer_tin,
      'HS': d.hs_code,
      'شرح کالا': d.goods_description,
      'کشور': d.country,
      'ارز': d.currency,
      'ارزش فاکتور': d.invoice_value,
      'نرخ': d.exchange_rate,
      'ارزش افغانی': d.value_afn,
      'حقوق گمرکی': d.customs_duty,
      'BRT': d.brt_amount,
      'VAT': d.vat_amount,
      'مجموع مالیات': d.total_tax,
      'وضعیت': d.payment_status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'اظهارنامه‌ها');
    XLSX.writeFile(wb, `declarations_${today()}.xlsx`);
  };

  // گزارش تصفیه PDF
  const generateSettlementPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const totalTax = filtered.reduce((s, d) => s + Number(d.total_tax), 0);
    const totalDuty = filtered.reduce((s, d) => s + Number(d.customs_duty), 0);
    const totalVat = filtered.reduce((s, d) => s + Number(d.vat_amount), 0);
    const totalBrt = filtered.reduce((s, d) => s + Number(d.brt_amount), 0);
    const paidTax = filtered.filter(d => d.payment_status === 'paid').reduce((s, d) => s + Number(d.total_tax), 0);

    doc.setFontSize(14);
    doc.text('Tax Settlement Report / Customs Declarations', 148, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Date: ${today()}   |   Records: ${filtered.length}`, 148, 22, { align: 'center' });

    (doc as any).autoTable({
      startY: 28,
      head: [['#', 'Decl.No', 'Type', 'Office', 'Date', 'TIN', 'HS', 'Value(AFN)', 'Duty', 'VAT', 'BRT', 'Total', 'Status']],
      body: filtered.map((d, i) => [
        i + 1, d.declaration_no,
        d.declaration_type,
        d.customs_office,
        d.declaration_date,
        d.importer_tin || '-',
        d.hs_code || '-',
        Math.round(d.value_afn).toLocaleString(),
        Math.round(d.customs_duty).toLocaleString(),
        Math.round(d.vat_amount).toLocaleString(),
        Math.round(d.brt_amount).toLocaleString(),
        Math.round(d.total_tax).toLocaleString(),
        d.payment_status,
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [30, 41, 59] },
      foot: [['', '', '', '', '', '', 'TOTAL',
        '', Math.round(totalDuty).toLocaleString(),
        Math.round(totalVat).toLocaleString(),
        Math.round(totalBrt).toLocaleString(),
        Math.round(totalTax).toLocaleString(), '']],
      footStyles: { fillColor: [51, 65, 85], fontStyle: 'bold' },
    });
    const y = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.text(`Total Tax Liability: AFN ${Math.round(totalTax).toLocaleString()}`, 15, y);
    doc.text(`Paid: AFN ${Math.round(paidTax).toLocaleString()}   |   Outstanding: AFN ${Math.round(totalTax - paidTax).toLocaleString()}`, 15, y + 6);
    doc.save(`settlement_${today()}.pdf`);
    onLog?.('گزارش تصفیه', `${filtered.length} اظهارنامه`);
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
          <div className="card-body p-4">
            <div className="flex items-center gap-2 text-xs opacity-70"><Package size={14} /> امروز</div>
            <div className="text-2xl font-bold">{fmt(kpi.todayCount)}</div>
            <div className="text-xs opacity-60">اظهارنامه</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
          <div className="card-body p-4">
            <div className="flex items-center gap-2 text-xs opacity-70"><TrendingUp size={14} /> این ماه</div>
            <div className="text-2xl font-bold">{fmt(kpi.monthCount)}</div>
            <div className="text-xs opacity-60">مالیات: {fmt(kpi.monthTax)} افغانی</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
          <div className="card-body p-4">
            <div className="flex items-center gap-2 text-xs opacity-70"><Wallet size={14} /> پرداخت‌نشده</div>
            <div className="text-2xl font-bold">{fmt(kpi.unpaidCount)}</div>
            <div className="text-xs opacity-60">مبلغ: {fmt(kpi.unpaidAmt)} افغانی</div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20">
          <div className="card-body p-4">
            <div className="flex items-center gap-2 text-xs opacity-70">واردات / صادرات</div>
            <div className="text-2xl font-bold">{fmt(kpi.imp)} / {fmt(kpi.exp)}</div>
            <div className="text-xs opacity-60">مجموع: {fmt(items.length)}</div>
          </div>
        </div>
      </div>

      {/* نرخ ارز */}
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body p-3">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw size={14} className="text-primary" />
            <span className="text-sm font-bold">نرخ ارز به افغانی (آخرین)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(latestRates).map(([c, r]) => (
              <div key={c} className="badge badge-outline gap-1 py-3">
                <span className="font-bold">{c}</span> = {fmt2(r as number)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* فرم درج */}
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body p-4">
          <div className="flex items-center gap-2 mb-3">
            <Plus size={16} className="text-primary" />
            <span className="font-bold">اظهارنامه جدید</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <input className="input input-sm input-bordered" placeholder="شماره اظهارنامه *"
              value={form.declaration_no} onChange={e => setForm(f => ({ ...f, declaration_no: e.target.value }))} />
            <select className="select select-sm select-bordered"
              value={form.declaration_type} onChange={e => setForm(f => ({ ...f, declaration_type: e.target.value as any }))}>
              <option value="import">واردات</option>
              <option value="export">صادرات</option>
            </select>
            <select className="select select-sm select-bordered"
              value={form.customs_office} onChange={e => setForm(f => ({ ...f, customs_office: e.target.value }))}>
              {CUSTOMS_OFFICES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <input type="date" className="input input-sm input-bordered"
              value={form.declaration_date} onChange={e => setForm(f => ({ ...f, declaration_date: e.target.value }))} />

            <select className="select select-sm select-bordered col-span-1"
              value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}>
              <option value="">— شرکت —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="relative">
              <input className={`input input-sm input-bordered w-full ${form.importer_tin && !tinCheck.valid ? 'input-error' : ''}`}
                placeholder="TIN (۱۰ رقم)"
                value={form.importer_tin} onChange={e => setForm(f => ({ ...f, importer_tin: e.target.value }))} />
              {form.importer_tin && !tinCheck.valid && (
                <div className="text-[10px] text-error mt-1">{tinCheck.message}</div>
              )}
            </div>
            <input list="hs-list" className="input input-sm input-bordered" placeholder="کد HS"
              value={form.hs_code} onChange={e => setForm(f => ({ ...f, hs_code: e.target.value }))} />
            <datalist id="hs-list">
              {tariffs.map(t => <option key={t.hs_code} value={t.hs_code}>{t.description_fa} — {t.duty_rate}%</option>)}
            </datalist>
            <input className="input input-sm input-bordered" placeholder="کشور مبدأ/مقصد"
              value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />

            <input className="input input-sm input-bordered col-span-2 md:col-span-4" placeholder="شرح کالا *"
              value={form.goods_description} onChange={e => setForm(f => ({ ...f, goods_description: e.target.value }))} />

            <input type="number" className="input input-sm input-bordered" placeholder="مقدار"
              value={form.quantity || ''} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) || 0 }))} />
            <input className="input input-sm input-bordered" placeholder="واحد"
              value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
            <select className="select select-sm select-bordered"
              value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" step="0.0001" className="input input-sm input-bordered" placeholder="نرخ تبدیل"
              value={form.exchange_rate || ''} onChange={e => setForm(f => ({ ...f, exchange_rate: Number(e.target.value) || 1 }))} />

            <input type="number" className="input input-sm input-bordered col-span-2" placeholder="ارزش فاکتور (ارز اصلی)"
              value={form.invoice_value || ''} onChange={e => setForm(f => ({ ...f, invoice_value: Number(e.target.value) || 0 }))} />
            <input type="number" step="0.01" className="input input-sm input-bordered" placeholder="نرخ حقوق گمرکی %"
              value={form.customs_duty_rate || ''} onChange={e => setForm(f => ({ ...f, customs_duty_rate: Number(e.target.value) || 0 }))} />
            <input className="input input-sm input-bordered" placeholder="شماره بارنامه"
              value={form.bill_of_lading_no} onChange={e => setForm(f => ({ ...f, bill_of_lading_no: e.target.value }))} />

            <input className="input input-sm input-bordered col-span-2" placeholder="نام دلال گمرکی"
              value={form.broker_name} onChange={e => setForm(f => ({ ...f, broker_name: e.target.value }))} />
            <input className="input input-sm input-bordered col-span-2" placeholder="VIN وسیله (در صورت خودرو)"
              value={form.vehicle_vin} onChange={e => setForm(f => ({ ...f, vehicle_vin: e.target.value }))} />
          </div>

          {/* محاسبه زنده */}
          <div className="mt-3 p-3 rounded-lg bg-base-100 border border-primary/30">
            <div className="text-xs font-bold mb-2 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-success" /> محاسبه هوشمند مالیات (خودکار)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              <div><span className="opacity-60 text-xs">ارزش (AFN):</span> <div className="font-bold">{fmt(liveCalc.valueAfn)}</div></div>
              <div><span className="opacity-60 text-xs">حقوق گمرکی:</span> <div className="font-bold text-warning">{fmt(liveCalc.customsDuty)}</div></div>
              <div><span className="opacity-60 text-xs">VAT ۱۰٪:</span> <div className="font-bold text-info">{fmt(liveCalc.vat)}</div></div>
              <div><span className="opacity-60 text-xs">BRT ۲٪:</span> <div className="font-bold text-secondary">{fmt(liveCalc.brt)}</div></div>
              <div><span className="opacity-60 text-xs">مجموع:</span> <div className="font-bold text-error text-lg">{fmt(liveCalc.total)}</div></div>
            </div>
            {restrictedWarning && (
              <div className="alert alert-warning mt-2 py-2 text-xs">
                <AlertCircle size={14} /> این کالا محدود/ممنوعه است — نیاز به مجوز خاص
              </div>
            )}
          </div>

          <button className="btn btn-primary btn-sm mt-3 self-start gap-2" onClick={submit}>
            <Plus size={14} /> ثبت اظهارنامه
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input className="input input-sm input-bordered w-full pr-8" placeholder="جستجو…"
            value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <select className="select select-sm select-bordered" value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}>
          <option value="all">همه انواع</option>
          <option value="import">واردات</option>
          <option value="export">صادرات</option>
        </select>
        <select className="select select-sm select-bordered" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="all">همه وضعیت‌ها</option>
          <option value="unpaid">پرداخت‌نشده</option>
          <option value="paid">پرداخت‌شده</option>
          <option value="partial">جزئی</option>
        </select>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) importExcel(f); if (fileRef.current) fileRef.current.value = ''; }} />
        <button className="btn btn-sm btn-outline gap-1" onClick={() => fileRef.current?.click()}>
          <Upload size={14} /> ورود اکسل
        </button>
        <button className="btn btn-sm btn-outline gap-1" onClick={exportExcel}>
          <Download size={14} /> خروجی اکسل
        </button>
        <button className="btn btn-sm btn-primary gap-1" onClick={generateSettlementPDF}>
          <FileText size={14} /> گزارش تصفیه PDF
        </button>
        <button className="btn btn-sm btn-ghost" onClick={loadAll} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table */}
      <div className="card bg-base-200 border border-base-300 overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr className="text-xs">
              <th>شماره</th><th>نوع</th><th>گمرک</th><th>تاریخ</th>
              <th>TIN</th><th>HS</th><th>شرح</th>
              <th>ارز/فاکتور</th><th>ارزش AFN</th>
              <th>مجموع مالیات</th><th>وضعیت</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={12} className="text-center opacity-50 py-6">هیچ اظهارنامه‌ای ثبت نشده است</td></tr>
            )}
            {filtered.map(d => (
              <tr key={d.id} className="text-xs hover">
                <td className="font-bold">{d.declaration_no}</td>
                <td>
                  <span className={`badge badge-xs ${d.declaration_type === 'import' ? 'badge-info' : 'badge-success'}`}>
                    {d.declaration_type === 'import' ? 'واردات' : 'صادرات'}
                  </span>
                </td>
                <td>{d.customs_office}</td>
                <td>{d.declaration_date}</td>
                <td>{d.importer_tin || '—'}</td>
                <td>{d.hs_code || '—'}</td>
                <td className="max-w-[160px] truncate">{d.goods_description}</td>
                <td>{d.currency} {fmt(d.invoice_value)}</td>
                <td>{fmt(d.value_afn)}</td>
                <td className="font-bold text-error">{fmt(d.total_tax)}</td>
                <td>
                  <span className={`badge badge-xs ${d.payment_status === 'paid' ? 'badge-success' : d.payment_status === 'partial' ? 'badge-warning' : 'badge-error'}`}>
                    {d.payment_status === 'paid' ? 'پرداخت‌شده' : d.payment_status === 'partial' ? 'جزئی' : 'پرداخت‌نشده'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1">
                    {d.payment_status !== 'paid' && (
                      <button className="btn btn-ghost btn-xs" title="پرداخت شد" onClick={() => markPaid(d.id)}>
                        <CheckCircle2 size={12} className="text-success" />
                      </button>
                    )}
                    <button className="btn btn-ghost btn-xs" title="حذف" onClick={() => del(d.id)}>
                      <Trash2 size={12} className="text-error" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomsDeclarationsTab;
