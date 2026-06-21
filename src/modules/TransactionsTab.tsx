import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeftRight, Send, Plus, Trash2, Upload, Download, Search,
  TrendingUp, TrendingDown, FileSpreadsheet, AlertCircle, CheckCircle2,
} from 'lucide-react';
import * as XLSX from 'xlsx';

/* ════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════ */
export interface ExchangeTx {
  id: number;
  date: string;        // Jalali string as provided
  type: string;        // Account / Cash
  buy_account: string; // خرید حساب
  buy_amount: number;  // مبلغ خرید (AFN equivalent or as captured)
  buy_currency: string;
  rate: number;        // نرخ
  sell_account: string;
  sell_amount: number;
  sell_currency: string;
  market_rate: number; // نرخ بازار
  profit: number;      // مفاد/نقص
  doc: string;
  details: string;
  via: string;         // ذریعه
  done_by: string;     // انجام دادن
}

export interface RemittanceOutTx {
  id: number;
  date: string;
  sender: string;
  receiver: string;
  agency: string;
  ref_no: string;
  amount: number;
  currency: string;
  com: number;
  dr_com: number;
  details: string;
  docs: string;
  info: string;
  status: string;
  by: string;
}

/* ════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════ */
const esc = (s: string) => (s ?? '').toString().replace(/'/g, "''");
const fmt = (n: number) => Math.round(n || 0).toLocaleString('fa-AF');
const fmt2 = (n: number) => (n || 0).toLocaleString('fa-AF', { maximumFractionDigits: 2 });

/** Parse strings like "افغانی 292,160.00" or "دالر 2,639.00" → { amount, currency } */
function parseMoney(raw: any): { amount: number; currency: string } {
  if (raw === null || raw === undefined) return { amount: 0, currency: '' };
  if (typeof raw === 'number') return { amount: raw, currency: '' };
  const s = String(raw).trim().replace(/\s+/g, ' ');
  if (!s) return { amount: 0, currency: '' };
  // Detect currency word
  const map: Record<string, string> = {
    'افغانی': 'AFN', 'افغانى': 'AFN', 'دالر': 'USD', 'یورو': 'EUR',
    'کلدار': 'PKR', 'تومان': 'IRR', 'درهم': 'AED', 'ریال': 'SAR',
  };
  let currency = '';
  for (const k of Object.keys(map)) {
    if (s.includes(k)) { currency = map[k]; break; }
  }
  // Extract number (with English or Farsi digits)
  const normalized = s
    .replace(/[٬,،]/g, '')
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const m = normalized.match(/-?\d+(\.\d+)?/);
  return { amount: m ? parseFloat(m[0]) : 0, currency };
}

function parseNum(raw: any): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return raw;
  const s = String(raw).trim()
    .replace(/[٬,،\s]/g, '')
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function cleanDate(raw: any): string {
  if (!raw) return '';
  return String(raw).trim().replace(/\s{2,}/g, ' ');
}

/* ════════════════════════════════════════════
   DB SETUP
   ════════════════════════════════════════════ */
async function ensureTables() {
  await window.tasklet.sqlExec(`CREATE TABLE IF NOT EXISTS tax_exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT, type TEXT,
    buy_account TEXT, buy_amount REAL, buy_currency TEXT,
    rate REAL,
    sell_account TEXT, sell_amount REAL, sell_currency TEXT,
    market_rate REAL, profit REAL,
    doc TEXT, details TEXT, via TEXT, done_by TEXT
  )`);
  await window.tasklet.sqlExec(`CREATE TABLE IF NOT EXISTS tax_remit_out (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT, sender TEXT, receiver TEXT, agency TEXT, ref_no TEXT,
    amount REAL, currency TEXT, com REAL, dr_com REAL,
    details TEXT, docs TEXT, info TEXT, status TEXT, by TEXT
  )`);
}

/* ════════════════════════════════════════════
   MAIN TAB
   ════════════════════════════════════════════ */
interface Props {
  onLog?: (action: string, detail: string) => void;
  onFlash?: (msg: string) => void;
}

const TransactionsTab: React.FC<Props> = ({ onLog, onFlash }) => {
  const [sub, setSub] = useState<'exchange' | 'remit'>('exchange');
  const [exchanges, setExchanges] = useState<ExchangeTx[]>([]);
  const [remits, setRemits] = useState<RemittanceOutTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await ensureTables();
      const ex = await window.tasklet.sqlQuery(`SELECT * FROM tax_exchanges ORDER BY id DESC`);
      setExchanges(ex as any);
      const rm = await window.tasklet.sqlQuery(`SELECT * FROM tax_remit_out ORDER BY id DESC`);
      setRemits(rm as any);
      setLoading(false);
    })();
  }, []);

  const reloadEx = async () => {
    const ex = await window.tasklet.sqlQuery(`SELECT * FROM tax_exchanges ORDER BY id DESC`);
    setExchanges(ex as any);
  };
  const reloadRm = async () => {
    const rm = await window.tasklet.sqlQuery(`SELECT * FROM tax_remit_out ORDER BY id DESC`);
    setRemits(rm as any);
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab switcher */}
      <div className="tabs tabs-boxed bg-base-200 inline-flex">
        <button
          className={`tab gap-2 ${sub === 'exchange' ? 'tab-active' : ''}`}
          onClick={() => setSub('exchange')}>
          <ArrowLeftRight size={14} /> تبادله
          <span className="badge badge-sm badge-primary">{exchanges.length}</span>
        </button>
        <button
          className={`tab gap-2 ${sub === 'remit' ? 'tab-active' : ''}`}
          onClick={() => setSub('remit')}>
          <Send size={14} /> حواله ارسالی
          <span className="badge badge-sm badge-primary">{remits.length}</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center opacity-60 py-10">در حال بارگذاری...</div>
      ) : sub === 'exchange' ? (
        <ExchangeSection
          rows={exchanges}
          reload={reloadEx}
          onLog={onLog}
          onFlash={onFlash}
        />
      ) : (
        <RemitSection
          rows={remits}
          reload={reloadRm}
          onLog={onLog}
          onFlash={onFlash}
        />
      )}
    </div>
  );
};

/* ════════════════════════════════════════════
   EXCHANGE SECTION
   ════════════════════════════════════════════ */
const ExchangeSection: React.FC<{
  rows: ExchangeTx[];
  reload: () => Promise<void>;
  onLog?: (a: string, d: string) => void;
  onFlash?: (m: string) => void;
}> = ({ rows, reload, onLog, onFlash }) => {
  const [q, setQ] = useState('');
  const [form, setForm] = useState({
    date: '', type: 'Account',
    buy_account: '', buy_amount: '', buy_currency: 'AFN',
    rate: '',
    sell_account: '', sell_amount: '', sell_currency: 'USD',
    market_rate: '', doc: '', details: '', via: '', done_by: '',
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const computedProfit = useMemo(() => {
    const buy = parseFloat(form.buy_amount) || 0;
    const sell = parseFloat(form.sell_amount) || 0;
    return sell - buy;
  }, [form.buy_amount, form.sell_amount]);

  const filtered = useMemo(() => {
    const s = q.trim();
    if (!s) return rows;
    return rows.filter(r =>
      [r.date, r.buy_account, r.sell_account, r.doc, r.details, r.via, r.done_by, r.buy_currency, r.sell_currency]
        .some(v => (v ?? '').toString().includes(s))
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    const totalProfit = filtered.reduce((s, r) => s + (r.profit || 0), 0);
    const totalBuy = filtered.reduce((s, r) => s + (r.buy_amount || 0), 0);
    const totalSell = filtered.reduce((s, r) => s + (r.sell_amount || 0), 0);
    const byCur: Record<string, number> = {};
    filtered.forEach(r => {
      const k = r.buy_currency || 'نامشخص';
      byCur[k] = (byCur[k] || 0) + (r.buy_amount || 0);
    });
    return { totalProfit, totalBuy, totalSell, byCur, count: filtered.length };
  }, [filtered]);

  const submit = async () => {
    if (!form.date && !form.buy_account && !form.sell_account) {
      onFlash?.('حداقل تاریخ یا حساب لازم است');
      return;
    }
    const buy = parseFloat(form.buy_amount) || 0;
    const sell = parseFloat(form.sell_amount) || 0;
    const profit = sell - buy;
    await window.tasklet.sqlExec(`
      INSERT INTO tax_exchanges
      (date,type,buy_account,buy_amount,buy_currency,rate,sell_account,sell_amount,sell_currency,market_rate,profit,doc,details,via,done_by)
      VALUES
      ('${esc(form.date)}','${esc(form.type)}','${esc(form.buy_account)}',${buy},'${esc(form.buy_currency)}',
       ${parseFloat(form.rate) || 0},'${esc(form.sell_account)}',${sell},'${esc(form.sell_currency)}',
       ${parseFloat(form.market_rate) || 0},${profit},
       '${esc(form.doc)}','${esc(form.details)}','${esc(form.via)}','${esc(form.done_by)}')`);
    await reload();
    onLog?.('تبادله', `ثبت ${form.buy_currency}→${form.sell_currency} ${fmt(buy)}`);
    onFlash?.('تبادله ثبت شد ✓');
    setForm({ ...form, buy_account: '', buy_amount: '', sell_account: '', sell_amount: '', rate: '', market_rate: '', doc: '', details: '' });
  };

  const del = async (id: number) => {
    if (!confirm('حذف این تبادله؟')) return;
    await window.tasklet.sqlExec(`DELETE FROM tax_exchanges WHERE id=${id}`);
    await reload();
    onLog?.('تبادله', `حذف #${id}`);
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportMsg(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rowsRaw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      // Find header row by looking for "تاریخ"
      let headerIdx = -1;
      for (let i = 0; i < Math.min(10, rowsRaw.length); i++) {
        if (rowsRaw[i].some((c: any) => String(c).trim() === 'تاریخ')) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx < 0) throw new Error('سرستون «تاریخ» یافت نشد');

      const header = rowsRaw[headerIdx].map((c: any) => String(c).trim());
      const colIdx = (name: string) => header.indexOf(name);

      const iDate = colIdx('تاریخ');
      const iType = colIdx('تایپ کردن');
      const iBuyAcc = colIdx('خرید حساب');
      const iBuyAmt = colIdx('مبلغ خرید');
      const iRate = colIdx('نرخ');
      const iSellAcc = colIdx('فروش حساب');
      const iSellAmt = colIdx('مبلغ فروش');
      const iMkt = colIdx('نرخ بازار');
      const iProf = colIdx('مفاد/نقص');
      const iDoc = colIdx('سند');
      const iDet = colIdx('جزئیات');
      const iVia = colIdx('ذریعه');
      const iBy = colIdx('انجام دادن');

      let inserted = 0, skipped = 0;
      for (let r = headerIdx + 1; r < rowsRaw.length; r++) {
        const row = rowsRaw[r];
        if (!row || row.every((c: any) => !String(c).trim())) { skipped++; continue; }
        const date = cleanDate(row[iDate]);
        if (!date) { skipped++; continue; }
        const buyM = iBuyAmt >= 0 ? parseMoney(row[iBuyAmt]) : { amount: 0, currency: '' };
        const sellM = iSellAmt >= 0 ? parseMoney(row[iSellAmt]) : { amount: 0, currency: '' };
        const profitM = iProf >= 0 ? parseMoney(row[iProf]) : { amount: sellM.amount - buyM.amount, currency: '' };
        const rate = iRate >= 0 ? parseNum(row[iRate]) : 0;
        const mkt = iMkt >= 0 ? parseNum(row[iMkt]) : 0;

        await window.tasklet.sqlExec(`
          INSERT INTO tax_exchanges
          (date,type,buy_account,buy_amount,buy_currency,rate,sell_account,sell_amount,sell_currency,market_rate,profit,doc,details,via,done_by)
          VALUES
          ('${esc(date)}','${esc(String(row[iType] ?? ''))}',
           '${esc(String(row[iBuyAcc] ?? ''))}',${buyM.amount},'${esc(buyM.currency)}',
           ${rate},
           '${esc(String(row[iSellAcc] ?? ''))}',${sellM.amount},'${esc(sellM.currency)}',
           ${mkt},${profitM.amount},
           '${esc(String(row[iDoc] ?? ''))}','${esc(String(row[iDet] ?? ''))}',
           '${esc(String(row[iVia] ?? ''))}','${esc(String(row[iBy] ?? ''))}')`);
        inserted++;
      }
      await reload();
      onLog?.('تبادله', `وارد کردن اکسل: ${inserted} رکورد`);
      setImportMsg({ type: 'ok', text: `${inserted} رکورد وارد شد${skipped ? ` — ${skipped} رد شد` : ''}` });
      onFlash?.(`${inserted} رکورد تبادله وارد شد ✓`);
    } catch (e: any) {
      setImportMsg({ type: 'err', text: 'خطا در خواندن فایل: ' + (e.message || 'نامشخص') });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const exportExcel = () => {
    const data = filtered.map(r => ({
      'تاریخ': r.date, 'نوع': r.type,
      'حساب خرید': r.buy_account, 'مبلغ خرید': r.buy_amount, 'ارز خرید': r.buy_currency,
      'نرخ': r.rate,
      'حساب فروش': r.sell_account, 'مبلغ فروش': r.sell_amount, 'ارز فروش': r.sell_currency,
      'نرخ بازار': r.market_rate, 'مفاد/نقص': r.profit,
      'سند': r.doc, 'جزئیات': r.details, 'ذریعه': r.via, 'توسط': r.done_by,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تبادله');
    XLSX.writeFile(wb, `exchanges-${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<ArrowLeftRight size={16} />} label="تعداد" value={stats.count.toString()} tone="primary" />
        <KpiCard icon={<TrendingDown size={16} />} label="جمع خرید" value={fmt(stats.totalBuy)} tone="info" />
        <KpiCard icon={<TrendingUp size={16} />} label="جمع فروش" value={fmt(stats.totalSell)} tone="success" />
        <KpiCard
          icon={stats.totalProfit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          label="مفاد/نقص"
          value={fmt(stats.totalProfit)}
          tone={stats.totalProfit >= 0 ? 'success' : 'error'}
        />
      </div>

      {/* Toolbar */}
      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body p-3 flex flex-row flex-wrap gap-2 items-center">
          <div className="join">
            <span className="join-item btn btn-sm btn-ghost pointer-events-none"><Search size={14} /></span>
            <input className="input input-sm input-bordered join-item w-48"
              placeholder="جستجو در تبادلات..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="flex-1" />
          <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden
            onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])} />
          <button className="btn btn-sm btn-outline gap-1" disabled={importing}
            onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> {importing ? 'در حال درج...' : 'درج از اکسل'}
          </button>
          <button className="btn btn-sm btn-outline gap-1" onClick={exportExcel} disabled={!filtered.length}>
            <Download size={14} /> خروجی اکسل
          </button>
        </div>
        {importMsg && (
          <div className={`alert ${importMsg.type === 'ok' ? 'alert-success' : 'alert-error'} m-3 py-2 text-sm`}>
            {importMsg.type === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>{importMsg.text}</span>
          </div>
        )}
      </div>

      {/* Insert form */}
      <details className="collapse collapse-arrow bg-base-100 border border-base-300">
        <summary className="collapse-title font-bold text-sm flex gap-2 items-center">
          <Plus size={14} className="text-primary" /> ثبت تبادله جدید
        </summary>
        <div className="collapse-content grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <Input label="تاریخ" v={form.date} on={v => setForm({ ...form, date: v })} placeholder="1404/01/01" />
          <Select label="نوع" v={form.type} on={v => setForm({ ...form, type: v })} options={['Account', 'Cash']} />
          <Input label="حساب خرید" v={form.buy_account} on={v => setForm({ ...form, buy_account: v })} />
          <Input label="مبلغ خرید" v={form.buy_amount} on={v => setForm({ ...form, buy_amount: v })} type="number" />
          <Select label="ارز خرید" v={form.buy_currency} on={v => setForm({ ...form, buy_currency: v })} options={['AFN', 'USD', 'EUR', 'PKR', 'IRR', 'AED', 'SAR']} />
          <Input label="نرخ" v={form.rate} on={v => setForm({ ...form, rate: v })} type="number" />
          <Input label="حساب فروش" v={form.sell_account} on={v => setForm({ ...form, sell_account: v })} />
          <Input label="مبلغ فروش" v={form.sell_amount} on={v => setForm({ ...form, sell_amount: v })} type="number" />
          <Select label="ارز فروش" v={form.sell_currency} on={v => setForm({ ...form, sell_currency: v })} options={['AFN', 'USD', 'EUR', 'PKR', 'IRR', 'AED', 'SAR']} />
          <Input label="نرخ بازار" v={form.market_rate} on={v => setForm({ ...form, market_rate: v })} type="number" />
          <Input label="سند" v={form.doc} on={v => setForm({ ...form, doc: v })} />
          <Input label="ذریعه" v={form.via} on={v => setForm({ ...form, via: v })} />
          <Input label="جزئیات" v={form.details} on={v => setForm({ ...form, details: v })} />
          <Input label="انجام دادن" v={form.done_by} on={v => setForm({ ...form, done_by: v })} />
          <div className="col-span-2 md:col-span-4 flex justify-between items-center pt-2">
            <span className={`text-sm font-bold ${computedProfit >= 0 ? 'text-success' : 'text-error'}`}>
              مفاد محاسبه‌شده: {fmt(computedProfit)}
            </span>
            <button className="btn btn-sm btn-primary gap-1" onClick={submit}>
              <Plus size={14} /> ثبت تبادله
            </button>
          </div>
        </div>
      </details>

      {/* Table */}
      <div className="overflow-x-auto border border-base-300 rounded-lg bg-base-100">
        <table className="table table-sm">
          <thead className="bg-base-200">
            <tr>
              <th>#</th><th>تاریخ</th><th>حساب خرید</th><th>مبلغ خرید</th><th>نرخ</th>
              <th>حساب فروش</th><th>مبلغ فروش</th><th>مفاد</th><th>ذریعه</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="text-center opacity-50 py-6">رکوردی نیست</td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.id} className="hover">
                <td className="opacity-60">{r.id}</td>
                <td className="whitespace-nowrap text-xs">{(r.date || '').split(' ')[0]}</td>
                <td className="text-xs">{r.buy_account}</td>
                <td className="text-xs">{r.buy_currency} {fmt2(r.buy_amount)}</td>
                <td className="text-xs">{r.rate || '-'}</td>
                <td className="text-xs">{r.sell_account}</td>
                <td className="text-xs">{r.sell_currency} {fmt2(r.sell_amount)}</td>
                <td className={`text-xs font-bold ${(r.profit || 0) >= 0 ? 'text-success' : 'text-error'}`}>{fmt(r.profit)}</td>
                <td className="text-xs">{r.via}</td>
                <td>
                  <button className="btn btn-xs btn-ghost text-error" onClick={() => del(r.id)}>
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="bg-base-200 font-bold text-xs">
              <tr>
                <td colSpan={3}>جمع کل ({filtered.length})</td>
                <td>{fmt(stats.totalBuy)}</td>
                <td></td>
                <td></td>
                <td>{fmt(stats.totalSell)}</td>
                <td className={stats.totalProfit >= 0 ? 'text-success' : 'text-error'}>{fmt(stats.totalProfit)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════
   REMITTANCE OUT SECTION
   ════════════════════════════════════════════ */
const RemitSection: React.FC<{
  rows: RemittanceOutTx[];
  reload: () => Promise<void>;
  onLog?: (a: string, d: string) => void;
  onFlash?: (m: string) => void;
}> = ({ rows, reload, onLog, onFlash }) => {
  const [q, setQ] = useState('');
  const [form, setForm] = useState({
    date: '', sender: '', receiver: '', agency: '', ref_no: '',
    amount: '', currency: 'USD', com: '', dr_com: '',
    details: '', docs: '', info: '', status: 'اجرا شده', by: '',
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim();
    if (!s) return rows;
    return rows.filter(r =>
      [r.date, r.sender, r.receiver, r.agency, r.ref_no, r.details, r.info, r.status, r.by, r.currency]
        .some(v => (v ?? '').toString().includes(s))
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    const byCur: Record<string, { amount: number; com: number; count: number }> = {};
    filtered.forEach(r => {
      const c = r.currency || 'نامشخص';
      if (!byCur[c]) byCur[c] = { amount: 0, com: 0, count: 0 };
      byCur[c].amount += r.amount || 0;
      byCur[c].com += r.com || 0;
      byCur[c].count += 1;
    });
    const totalCom = filtered.reduce((s, r) => s + (r.com || 0), 0);
    return { byCur, totalCom, count: filtered.length };
  }, [filtered]);

  const submit = async () => {
    if (!form.date && !form.sender && !form.receiver) {
      onFlash?.('حداقل تاریخ یا فرستنده/گیرنده لازم است');
      return;
    }
    await window.tasklet.sqlExec(`
      INSERT INTO tax_remit_out
      (date,sender,receiver,agency,ref_no,amount,currency,com,dr_com,details,docs,info,status,by)
      VALUES
      ('${esc(form.date)}','${esc(form.sender)}','${esc(form.receiver)}','${esc(form.agency)}','${esc(form.ref_no)}',
       ${parseFloat(form.amount) || 0},'${esc(form.currency)}',
       ${parseFloat(form.com) || 0},${parseFloat(form.dr_com) || 0},
       '${esc(form.details)}','${esc(form.docs)}','${esc(form.info)}','${esc(form.status)}','${esc(form.by)}')`);
    await reload();
    onLog?.('حواله ارسالی', `${form.sender} → ${form.receiver} ${form.currency} ${fmt(parseFloat(form.amount) || 0)}`);
    onFlash?.('حواله ثبت شد ✓');
    setForm({ ...form, sender: '', receiver: '', ref_no: '', amount: '', com: '', dr_com: '', details: '', info: '' });
  };

  const del = async (id: number) => {
    if (!confirm('حذف این حواله؟')) return;
    await window.tasklet.sqlExec(`DELETE FROM tax_remit_out WHERE id=${id}`);
    await reload();
    onLog?.('حواله ارسالی', `حذف #${id}`);
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportMsg(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rowsRaw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      let headerIdx = -1;
      for (let i = 0; i < Math.min(10, rowsRaw.length); i++) {
        if (rowsRaw[i].some((c: any) => String(c).trim() === 'تاریخ')) { headerIdx = i; break; }
      }
      if (headerIdx < 0) throw new Error('سرستون «تاریخ» یافت نشد');
      const header = rowsRaw[headerIdx].map((c: any) => String(c).trim());
      const idx = (n: string) => header.indexOf(n);

      const iDate = idx('تاریخ');
      const iSender = idx('فرستنده');
      const iReceiver = idx('گیرنده');
      const iAgency = idx('نمایندگی');
      const iRef = idx('نمبرحواله');
      const iAmt = idx('مبلغ');
      const iCom = idx('Com');
      const iDrCom = idx('Dr/Com');
      const iDet = idx('جزئیات');
      const iDocs = idx('اسناد حواله');
      const iInfo = idx('معلومات');
      const iStatus = idx('وضعیت');
      const iBy = idx('توسط');

      let inserted = 0, skipped = 0;
      for (let r = headerIdx + 1; r < rowsRaw.length; r++) {
        const row = rowsRaw[r];
        if (!row || row.every((c: any) => !String(c).trim())) { skipped++; continue; }
        const date = cleanDate(row[iDate]);
        if (!date) { skipped++; continue; }
        const amt = iAmt >= 0 ? parseMoney(row[iAmt]) : { amount: 0, currency: '' };
        const com = iCom >= 0 ? parseMoney(row[iCom]) : { amount: 0, currency: '' };
        const drCom = iDrCom >= 0 ? parseMoney(row[iDrCom]) : { amount: 0, currency: '' };

        await window.tasklet.sqlExec(`
          INSERT INTO tax_remit_out
          (date,sender,receiver,agency,ref_no,amount,currency,com,dr_com,details,docs,info,status,by)
          VALUES
          ('${esc(date)}',
           '${esc(String(row[iSender] ?? ''))}','${esc(String(row[iReceiver] ?? ''))}',
           '${esc(String(row[iAgency] ?? ''))}','${esc(String(row[iRef] ?? ''))}',
           ${amt.amount},'${esc(amt.currency)}',
           ${com.amount},${drCom.amount},
           '${esc(String(row[iDet] ?? ''))}','${esc(String(row[iDocs] ?? ''))}',
           '${esc(String(row[iInfo] ?? ''))}','${esc(String(row[iStatus] ?? ''))}','${esc(String(row[iBy] ?? ''))}')`);
        inserted++;
      }
      await reload();
      onLog?.('حواله ارسالی', `وارد کردن اکسل: ${inserted} رکورد`);
      setImportMsg({ type: 'ok', text: `${inserted} رکورد وارد شد${skipped ? ` — ${skipped} رد شد` : ''}` });
      onFlash?.(`${inserted} حواله وارد شد ✓`);
    } catch (e: any) {
      setImportMsg({ type: 'err', text: 'خطا در خواندن فایل: ' + (e.message || 'نامشخص') });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const exportExcel = () => {
    const data = filtered.map(r => ({
      'تاریخ': r.date, 'فرستنده': r.sender, 'گیرنده': r.receiver,
      'نمایندگی': r.agency, 'نمبر حواله': r.ref_no,
      'مبلغ': r.amount, 'ارز': r.currency, 'کمیشن': r.com, 'Dr/Com': r.dr_com,
      'جزئیات': r.details, 'اسناد': r.docs, 'معلومات': r.info,
      'وضعیت': r.status, 'توسط': r.by,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'حواله ارسالی');
    XLSX.writeFile(wb, `remittances-out-${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<Send size={16} />} label="تعداد حواله" value={stats.count.toString()} tone="primary" />
        <KpiCard icon={<TrendingUp size={16} />} label="جمع کمیشن" value={fmt(stats.totalCom)} tone="success" />
        {Object.entries(stats.byCur).slice(0, 2).map(([c, v]) => (
          <KpiCard key={c} icon={<FileSpreadsheet size={16} />} label={`جمع ${c}`} value={fmt(v.amount)} tone="info" />
        ))}
      </div>

      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body p-3 flex flex-row flex-wrap gap-2 items-center">
          <div className="join">
            <span className="join-item btn btn-sm btn-ghost pointer-events-none"><Search size={14} /></span>
            <input className="input input-sm input-bordered join-item w-48"
              placeholder="جستجو در حواله‌ها..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="flex-1" />
          <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden
            onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])} />
          <button className="btn btn-sm btn-outline gap-1" disabled={importing}
            onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> {importing ? 'در حال درج...' : 'درج از اکسل'}
          </button>
          <button className="btn btn-sm btn-outline gap-1" onClick={exportExcel} disabled={!filtered.length}>
            <Download size={14} /> خروجی اکسل
          </button>
        </div>
        {importMsg && (
          <div className={`alert ${importMsg.type === 'ok' ? 'alert-success' : 'alert-error'} m-3 py-2 text-sm`}>
            {importMsg.type === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>{importMsg.text}</span>
          </div>
        )}
      </div>

      <details className="collapse collapse-arrow bg-base-100 border border-base-300">
        <summary className="collapse-title font-bold text-sm flex gap-2 items-center">
          <Plus size={14} className="text-primary" /> ثبت حواله ارسالی جدید
        </summary>
        <div className="collapse-content grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <Input label="تاریخ" v={form.date} on={v => setForm({ ...form, date: v })} placeholder="1404/01/01" />
          <Input label="فرستنده" v={form.sender} on={v => setForm({ ...form, sender: v })} />
          <Input label="گیرنده" v={form.receiver} on={v => setForm({ ...form, receiver: v })} />
          <Input label="نمایندگی" v={form.agency} on={v => setForm({ ...form, agency: v })} />
          <Input label="نمبر حواله" v={form.ref_no} on={v => setForm({ ...form, ref_no: v })} />
          <Input label="مبلغ" v={form.amount} on={v => setForm({ ...form, amount: v })} type="number" />
          <Select label="ارز" v={form.currency} on={v => setForm({ ...form, currency: v })} options={['USD', 'AFN', 'EUR', 'PKR', 'IRR', 'AED', 'SAR']} />
          <Input label="کمیشن (Com)" v={form.com} on={v => setForm({ ...form, com: v })} type="number" />
          <Input label="Dr/Com" v={form.dr_com} on={v => setForm({ ...form, dr_com: v })} type="number" />
          <Select label="وضعیت" v={form.status} on={v => setForm({ ...form, status: v })} options={['اجرا شده', 'در انتظار', 'لغو شده']} />
          <Input label="جزئیات" v={form.details} on={v => setForm({ ...form, details: v })} />
          <Input label="معلومات" v={form.info} on={v => setForm({ ...form, info: v })} />
          <Input label="اسناد" v={form.docs} on={v => setForm({ ...form, docs: v })} />
          <Input label="توسط" v={form.by} on={v => setForm({ ...form, by: v })} />
          <div className="col-span-2 md:col-span-4 flex justify-end pt-2">
            <button className="btn btn-sm btn-primary gap-1" onClick={submit}>
              <Plus size={14} /> ثبت حواله
            </button>
          </div>
        </div>
      </details>

      {/* Per-currency summary */}
      {Object.keys(stats.byCur).length > 0 && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-3">
            <div className="text-sm font-bold mb-2 flex items-center gap-2">
              <FileSpreadsheet size={14} className="text-primary" /> خلاصه به تفکیک ارز
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {Object.entries(stats.byCur).map(([c, v]) => (
                <div key={c} className="bg-base-200 rounded-lg p-2">
                  <div className="font-bold">{c}</div>
                  <div className="opacity-70">تعداد: {v.count}</div>
                  <div>مبلغ: {fmt(v.amount)}</div>
                  <div className="text-success">کمیشن: {fmt(v.com)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-base-300 rounded-lg bg-base-100">
        <table className="table table-sm">
          <thead className="bg-base-200">
            <tr>
              <th>#</th><th>تاریخ</th><th>فرستنده</th><th>گیرنده</th><th>نمبر</th>
              <th>مبلغ</th><th>کمیشن</th><th>وضعیت</th><th>توسط</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="text-center opacity-50 py-6">رکوردی نیست</td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.id} className="hover">
                <td className="opacity-60">{r.id}</td>
                <td className="whitespace-nowrap text-xs">{(r.date || '').split(' ')[0]}</td>
                <td className="text-xs">{r.sender}</td>
                <td className="text-xs">{r.receiver}</td>
                <td className="text-xs">{r.ref_no}</td>
                <td className="text-xs font-bold">{r.currency} {fmt2(r.amount)}</td>
                <td className="text-xs text-success">{fmt(r.com)}</td>
                <td className="text-xs">
                  <span className={`badge badge-xs ${r.status === 'اجرا شده' ? 'badge-success' : r.status === 'لغو شده' ? 'badge-error' : 'badge-warning'}`}>
                    {r.status || '-'}
                  </span>
                </td>
                <td className="text-xs">{r.by}</td>
                <td>
                  <button className="btn btn-xs btn-ghost text-error" onClick={() => del(r.id)}>
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════
   UI PRIMITIVES
   ════════════════════════════════════════════ */
const KpiCard: React.FC<{ icon: React.ReactNode; label: string; value: string; tone: string }> = ({ icon, label, value, tone }) => (
  <div className={`card bg-base-100 border-r-4 border-${tone} shadow-sm`}>
    <div className="card-body p-3">
      <div className="flex items-center gap-2 text-xs opacity-70">{icon}{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  </div>
);

const Input: React.FC<{ label: string; v: string; on: (v: string) => void; placeholder?: string; type?: string }> =
  ({ label, v, on, placeholder, type }) => (
    <label className="form-control">
      <span className="label-text text-xs opacity-70 pb-1">{label}</span>
      <input className="input input-sm input-bordered" value={v} onChange={e => on(e.target.value)} placeholder={placeholder} type={type || 'text'} />
    </label>
  );

const Select: React.FC<{ label: string; v: string; on: (v: string) => void; options: string[] }> =
  ({ label, v, on, options }) => (
    <label className="form-control">
      <span className="label-text text-xs opacity-70 pb-1">{label}</span>
      <select className="select select-sm select-bordered" value={v} onChange={e => on(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );

export default TransactionsTab;
