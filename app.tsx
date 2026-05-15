import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Building2, DollarSign, Users, FileText, Calculator, Plus, Trash2, Printer,
  AlertTriangle, CheckCircle, TrendingUp, BarChart3, Shield, ArrowLeft,
  Landmark, Briefcase, CircleDollarSign, Receipt, ChevronRight, Eye, EyeOff, LogOut,
  Clock, ScrollText
} from 'lucide-react';

/* ═══════════════════════════════════════
   TYPES
   ═══════════════════════════════════════ */
interface Company {
  name: string; license: string; tin: string;
  fiscalStart: string; fiscalEnd: string;
  address: string; phone: string; manager: string;
}
interface Income { id: number; category: string; description: string; amount: number; quarter: number; date: string; }
interface Employee { id: number; name: string; position: string; salary: number; insurance: number; }
interface Deduction { id: number; description: string; amount: number; type: string; }
interface User { username: string; fullName: string; role: string; }
interface LogEntry { id: number; timestamp: string; tab: string; action: string; detail: string; }

/* ═══════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════ */
const CATS = ['فروش کالا و خدمات', 'تبادله اسعار', 'کمیشن', 'کرایه و مستغلات', 'سایر درآمدها'];
const DED_TYPES = ['هزینه عملیاتی', 'معافیت مالیاتی', 'بیمه و تأمین اجتماعی', 'استهلاک دارایی', 'سایر کسورات'];

/* ═══════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════ */
function calcSalaryTax(monthly: number): number {
  const a = monthly * 12;
  if (a <= 12500) return 0;
  if (a <= 100000) return ((a - 12500) * 0.02) / 12;
  if (a <= 200000) return (1750 + (a - 100000) * 0.1) / 12;
  return (11750 + (a - 200000) * 0.2) / 12;
}

function taxBracketLabel(monthly: number): string {
  const a = monthly * 12;
  if (a <= 12500) return 'معاف';
  if (a <= 100000) return '۲٪';
  if (a <= 200000) return '۱۰٪';
  return '۲۰٪';
}

function fmt(n: number): string { return Math.round(n).toLocaleString('fa-AF'); }
function fmtPct(n: number): string { return n.toFixed(1) + '٪'; }
function today(): string { return new Date().toISOString().split('T')[0]; }
function esc(s: string): string { return s.replace(/'/g, "''"); }
function nowStr(): string {
  const d = new Date();
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/* ── Print helper ── */
function printSection(elementId: string, title: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const w = window.open('', '_blank', 'width=800,height=600');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>${title}</title>
<style>
  * { font-family: Tahoma, 'Segoe UI', Arial, sans-serif; }
  body { padding: 20px; direction: rtl; font-size: 13px; color: #333; }
  h2 { font-size: 18px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 16px; color: #1e40af; }
  h3 { font-size: 15px; margin-top: 16px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: right; }
  th { background: #f0f4ff; font-weight: bold; }
  tr:nth-child(even) { background: #fafafa; }
  .stat-box { display: inline-block; border: 1px solid #ddd; border-radius: 8px; padding: 10px 16px; margin: 4px; min-width: 120px; text-align: center; }
  .stat-label { font-size: 11px; color: #888; }
  .stat-value { font-size: 16px; font-weight: bold; margin-top: 4px; }
  .header-info { text-align: center; margin-bottom: 20px; }
  .footer { text-align: center; font-size: 10px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
  @media print { body { padding: 0; } }
</style></head><body>`);
  w.document.write(`<div class="header-info"><h2>${title}</h2></div>`);
  w.document.write(el.innerHTML);
  w.document.write(`<div class="footer">سیستم حسابداری مالیاتی صرافی — ${new Date().toLocaleDateString('fa-AF')} — طراحی: منوچهر نورانی — 📞 0744173723</div>`);
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(() => { w.print(); }, 300);
}

/* ═══════════════════════════════════════
   PRINT BUTTON COMPONENT
   ═══════════════════════════════════════ */
const PrintBtn: React.FC<{ sectionId: string; title: string }> = ({ sectionId, title }) => (
  <button className="btn btn-ghost btn-sm gap-1 opacity-60 hover:opacity-100" onClick={() => printSection(sectionId, title)}>
    <Printer size={14} /> چاپ
  </button>
);

/* ═══════════════════════════════════════
   LOGIN SCREEN
   ═══════════════════════════════════════ */
const LoginScreen: React.FC<{ onLogin: (u: User) => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) { setError('نام کاربری و رمز عبور الزامی است'); return; }
    setLoading(true); setError('');
    try {
      const rows = await window.tasklet.sqlQuery(
        `SELECT username, fullName, role FROM tax_users WHERE username='${esc(username.trim())}' AND password='${esc(password)}'`
      );
      if (rows.length > 0) {
        onLogin({ username: rows[0].username as string, fullName: rows[0].fullName as string, role: rows[0].role as string });
      } else {
        setError('نام کاربری یا رمز عبور اشتباه است');
      }
    } catch { setError('خطا در اتصال به سیستم'); }
    setLoading(false);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-base-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold mb-1">سیستم مالیاتی صرافی</h1>
          <p className="text-sm opacity-50">وارد حساب کاربری خود شوید</p>
        </div>

        <div className="card bg-base-200">
          <div className="card-body gap-4">
            <div>
              <label className="label"><span className="label-text text-xs">نام کاربری</span></label>
              <label className="input input-bordered flex items-center gap-2">
                <Users className="h-[1em] opacity-50" />
                <input className="grow" placeholder="admin" value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
              </label>
            </div>

            <div>
              <label className="label"><span className="label-text text-xs">رمز عبور</span></label>
              <label className="input input-bordered flex items-center gap-2">
                <Shield className="h-[1em] opacity-50" />
                <input className="grow" placeholder="••••••••" type={showPass ? 'text' : 'password'}
                  value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                <button type="button" className="btn btn-ghost btn-xs btn-circle" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </label>
            </div>

            {error && (
              <div className="alert alert-error py-2">
                <AlertTriangle size={14} /> <span className="text-sm">{error}</span>
              </div>
            )}

            <button className={`btn btn-primary w-full ${loading ? 'btn-disabled' : ''}`} onClick={handleLogin}>
              {loading ? <span className="loading loading-spinner loading-sm" /> : 'ورود به سیستم'}
            </button>
          </div>
        </div>

        <p className="text-center mt-6 text-xs opacity-30">سیستم حسابداری مالیاتی صرافی — نسخه ۵.۰</p>
        <div className="text-center mt-3 space-y-1">
          <p className="text-xs opacity-40">طراحی و توسعه: <span className="font-semibold">منوچهر نورانی</span></p>
          <p className="text-xs opacity-40" dir="ltr">📞 0744173723</p>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════ */
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company>({
    name: '', license: '', tin: '', fiscalStart: '1404/01/01',
    fiscalEnd: '1404/12/29', address: '', phone: '', manager: ''
  });
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [nextId, setNextId] = useState(1);
  const [toast, setToast] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const logIdRef = useRef(0);

  /* ── Log function ── */
  const addLog = (tabName: string, action: string, detail: string) => {
    logIdRef.current += 1;
    const entry: LogEntry = { id: logIdRef.current, timestamp: nowStr(), tab: tabName, action, detail };
    setLogs(prev => [entry, ...prev].slice(0, 200)); // Keep last 200
    // Also save to DB
    window.tasklet.sqlExec(`INSERT INTO tax_logs (timestamp, tab, action, detail) VALUES ('${esc(entry.timestamp)}','${esc(tabName)}','${esc(action)}','${esc(detail)}')`);
  };

  /* ── DB Init & Load ── */
  useEffect(() => {
    (async () => {
      await window.tasklet.sqlExec(`CREATE TABLE IF NOT EXISTS tax_company (id INTEGER PRIMARY KEY DEFAULT 1, data TEXT NOT NULL)`);
      await window.tasklet.sqlExec(`CREATE TABLE IF NOT EXISTS tax_incomes2 (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT, description TEXT, amount REAL, quarter INTEGER, date TEXT)`);
      await window.tasklet.sqlExec(`CREATE TABLE IF NOT EXISTS tax_employees2 (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, position TEXT, salary REAL, insurance REAL DEFAULT 0)`);
      await window.tasklet.sqlExec(`CREATE TABLE IF NOT EXISTS tax_deductions2 (id INTEGER PRIMARY KEY AUTOINCREMENT, description TEXT, amount REAL, type TEXT)`);
      await window.tasklet.sqlExec(`CREATE TABLE IF NOT EXISTS tax_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT, tab TEXT, action TEXT, detail TEXT)`);

      const c = await window.tasklet.sqlQuery(`SELECT data FROM tax_company WHERE id=1`);
      if (c.length > 0) setCompany(prev => ({ ...prev, ...JSON.parse(c[0].data as string) }));

      const i = await window.tasklet.sqlQuery(`SELECT * FROM tax_incomes2 ORDER BY id`);
      setIncomes(i.map(r => ({ id: r.id as number, category: r.category as string, description: r.description as string, amount: r.amount as number, quarter: (r.quarter as number) || 1, date: (r.date as string) || today() })));

      const e = await window.tasklet.sqlQuery(`SELECT * FROM tax_employees2 ORDER BY id`);
      setEmployees(e.map(r => ({ id: r.id as number, name: r.name as string, position: r.position as string, salary: r.salary as number, insurance: (r.insurance as number) || 0 })));

      const d = await window.tasklet.sqlQuery(`SELECT * FROM tax_deductions2 ORDER BY id`);
      setDeductions(d.map(r => ({ id: r.id as number, description: r.description as string, amount: r.amount as number, type: r.type as string })));

      // Load logs
      const lg = await window.tasklet.sqlQuery(`SELECT * FROM tax_logs ORDER BY id DESC LIMIT 200`);
      setLogs(lg.map(r => ({ id: r.id as number, timestamp: r.timestamp as string, tab: r.tab as string, action: r.action as string, detail: r.detail as string })));
      logIdRef.current = lg.length > 0 ? (lg[0].id as number) : 0;

      const mx = await window.tasklet.sqlQuery(`SELECT MAX(m) as maxid FROM (SELECT MAX(id) as m FROM tax_incomes2 UNION ALL SELECT MAX(id) FROM tax_employees2 UNION ALL SELECT MAX(id) FROM tax_deductions2)`);
      setNextId(((mx[0]?.maxid as number) || 0) + 1);
      setLoading(false);
    })();
  }, []);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  /* ── CRUD Functions ── */
  const saveCompany = (c: Company) => {
    setCompany(c);
    window.tasklet.sqlExec(`INSERT OR REPLACE INTO tax_company (id, data) VALUES (1, '${esc(JSON.stringify(c))}')`);
    addLog('شرکت', 'ذخیره', `اطلاعات شرکت ${c.name} ذخیره شد`);
    flash('ذخیره شد ✓');
  };

  const addIncome = (inc: Omit<Income, 'id'>) => {
    const id = nextId; setNextId(id + 1);
    setIncomes(prev => [...prev, { ...inc, id }]);
    window.tasklet.sqlExec(`INSERT INTO tax_incomes2 (category,description,amount,quarter,date) VALUES ('${esc(inc.category)}','${esc(inc.description)}',${inc.amount},${inc.quarter},'${inc.date}')`);
    addLog('درآمد', 'ثبت', `${inc.description} — ${fmt(inc.amount)} ؋ (${inc.category})`);
    flash('درآمد ثبت شد');
  };
  const delIncome = (id: number) => {
    const item = incomes.find(x => x.id === id);
    setIncomes(prev => prev.filter(x => x.id !== id));
    window.tasklet.sqlExec(`DELETE FROM tax_incomes2 WHERE id=${id}`);
    if (item) addLog('درآمد', 'حذف', `${item.description} — ${fmt(item.amount)} ؋`);
  };

  const addEmployee = (emp: Omit<Employee, 'id'>) => {
    const id = nextId; setNextId(id + 1);
    setEmployees(prev => [...prev, { ...emp, id }]);
    window.tasklet.sqlExec(`INSERT INTO tax_employees2 (name,position,salary,insurance) VALUES ('${esc(emp.name)}','${esc(emp.position)}',${emp.salary},${emp.insurance})`);
    addLog('کارمندان', 'ثبت', `${emp.name} — معاش: ${fmt(emp.salary)} ؋`);
    flash('کارمند ثبت شد');
  };
  const delEmployee = (id: number) => {
    const item = employees.find(x => x.id === id);
    setEmployees(prev => prev.filter(x => x.id !== id));
    window.tasklet.sqlExec(`DELETE FROM tax_employees2 WHERE id=${id}`);
    if (item) addLog('کارمندان', 'حذف', `${item.name}`);
  };

  const addDeduction = (ded: Omit<Deduction, 'id'>) => {
    const id = nextId; setNextId(id + 1);
    setDeductions(prev => [...prev, { ...ded, id }]);
    window.tasklet.sqlExec(`INSERT INTO tax_deductions2 (description,amount,type) VALUES ('${esc(ded.description)}',${ded.amount},'${esc(ded.type)}')`);
    addLog('کسورات', 'ثبت', `${ded.description} — ${fmt(ded.amount)} ؋ (${ded.type})`);
    flash('کسر ثبت شد');
  };
  const delDeduction = (id: number) => {
    const item = deductions.find(x => x.id === id);
    setDeductions(prev => prev.filter(x => x.id !== id));
    window.tasklet.sqlExec(`DELETE FROM tax_deductions2 WHERE id=${id}`);
    if (item) addLog('کسورات', 'حذف', `${item.description}`);
  };

  /* ── Calculations ── */
  const calc = useMemo(() => {
    const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
    const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
    const totalInsurance = employees.reduce((s, e) => s + e.insurance, 0) * 12;
    const totalSalaries = employees.reduce((s, e) => s + e.salary, 0) * 12;
    const totalSalaryTax = employees.reduce((s, e) => s + calcSalaryTax(e.salary), 0) * 12;
    const operatingExpenses = totalDeductions + totalSalaries + totalInsurance;
    const netIncome = totalIncome - operatingExpenses;

    const byCategory = CATS.map(cat => ({
      category: cat, amount: incomes.filter(i => i.category === cat).reduce((s, i) => s + i.amount, 0)
    }));
    const byQuarter = [1, 2, 3, 4].map(q => {
      const qInc = incomes.filter(i => i.quarter === q).reduce((s, i) => s + i.amount, 0);
      const qDed = totalDeductions / 4;
      const qNet = Math.max(0, qInc - qDed);
      return { quarter: q, income: qInc, deductions: qDed, net: qNet, tax: qNet * 0.04 };
    });
    const quarterlyTaxTotal = byQuarter.reduce((s, q) => s + q.tax, 0);
    const annualTax = Math.max(0, netIncome) * 0.20;
    const totalTax = totalSalaryTax + quarterlyTaxTotal + annualTax;
    const effectiveRate = totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0;

    const warnings: string[] = [];
    if (!company.name) warnings.push('نام شرکت وارد نشده');
    if (!company.tin) warnings.push('TIN وارد نشده — برای مستوفیت الزامی');
    if (incomes.length === 0) warnings.push('درآمدی ثبت نشده');
    if (employees.length > 0 && totalSalaryTax === 0) warnings.push('مالیات معاش صفر');
    [1,2,3,4].forEach(q => { if (!incomes.some(i => i.quarter === q)) warnings.push(`ربع ${q} بدون درآمد`); });
    if (netIncome < 0) warnings.push('عواید خالص منفی');
    if (deductions.length === 0 && incomes.length > 0) warnings.push('کسوراتی ثبت نشده');

    const validations: string[] = [];
    if (company.name && company.tin && incomes.length > 0) validations.push('اطلاعات پایه کامل');
    if (new Set(incomes.map(i => i.quarter)).size === 4) validations.push('هر ۴ ربع ثبت شده');
    if (employees.length > 0) validations.push('کارمندان ثبت شده');
    if (deductions.length > 0) validations.push('کسورات اعمال شده');

    return { totalIncome, totalDeductions, totalInsurance, totalSalaries, totalSalaryTax, operatingExpenses, netIncome, byCategory, byQuarter, quarterlyTaxTotal, annualTax, totalTax, effectiveRate, warnings, validations };
  }, [incomes, employees, deductions, company]);

  /* ── Auth Gate ── */
  if (!user) return <LoginScreen onLogin={(u) => { setUser(u); }} />;

  if (loading) return (
    <div className="flex items-center justify-center h-screen gap-3">
      <span className="loading loading-spinner loading-lg text-primary" />
      <span className="text-sm opacity-60">در حال بارگذاری...</span>
    </div>
  );

  const tabs = [
    { icon: <BarChart3 size={16} />, label: 'داشبورد' },
    { icon: <Building2 size={16} />, label: 'شرکت' },
    { icon: <DollarSign size={16} />, label: 'درآمد' },
    { icon: <Users size={16} />, label: 'کارمندان' },
    { icon: <Calculator size={16} />, label: 'کسورات' },
    { icon: <FileText size={16} />, label: 'گزارش' },
    { icon: <ScrollText size={16} />, label: 'لاگ' },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-base-100 max-w-4xl mx-auto px-4 py-5">
      {/* Toast */}
      {toast && (
        <div className="toast toast-top toast-start z-50">
          <div className="alert alert-success py-2 px-4">
            <CheckCircle size={14} /> <span className="text-sm">{toast}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Landmark size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-bold">سیستم مالیاتی صرافی</h1>
            {company.name && <p className="text-xs opacity-50">{company.name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {calc.totalTax > 0 && (
            <div className="text-left hidden sm:block">
              <div className="text-xs opacity-40">مالیات کل</div>
              <div className="font-bold text-sm text-error">{fmt(calc.totalTax)} ؋</div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="avatar placeholder">
              <div className="bg-primary text-primary-content w-8 rounded-full">
                <span className="text-xs">{user.fullName.charAt(0)}</span>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-medium">{user.fullName}</div>
              <div className="text-xs opacity-30">{user.username}</div>
            </div>
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setUser(null)} title="خروج">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Accent line */}
      <div className="h-0.5 bg-gradient-to-l from-primary via-secondary to-transparent mb-5 rounded-full" />

      {/* Tab Navigation */}
      <div role="tablist" className="tabs tabs-bordered mb-6 flex-nowrap overflow-x-auto">
        {tabs.map((t, i) => (
          <button key={i} role="tab"
            className={`tab gap-2 whitespace-nowrap ${tab === i ? 'tab-active font-semibold text-primary' : ''}`}
            onClick={() => setTab(i)}>
            {t.icon} {t.label}
            {i === 6 && logs.length > 0 && <span className="badge badge-xs badge-primary">{logs.length}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div key={`t-${tab}`}>
        {tab === 0 && <DashboardTab calc={calc} />}
        {tab === 1 && <CompanyTab company={company} onSave={saveCompany} />}
        {tab === 2 && <IncomeTab incomes={incomes} onAdd={addIncome} onDel={delIncome} calc={calc} />}
        {tab === 3 && <EmployeeTab employees={employees} onAdd={addEmployee} onDel={delEmployee} calc={calc} />}
        {tab === 4 && <DeductionTab deductions={deductions} onAdd={addDeduction} onDel={delDeduction} calc={calc} />}
        {tab === 5 && <ReportTab company={company} calc={calc} employees={employees} incomes={incomes} deductions={deductions} />}
        {tab === 6 && <LogTab logs={logs} onClear={() => { setLogs([]); window.tasklet.sqlExec(`DELETE FROM tax_logs`); }} />}
      </div>

      {/* Footer - Marketing */}
      <div className="mt-10 mb-4 text-center border-t border-base-300 pt-4">
        <p className="text-xs opacity-40">سیستم حسابداری مالیاتی صرافی — نسخه ۵.۰</p>
        <p className="text-xs opacity-40 mt-1">طراحی و توسعه: <span className="font-semibold">منوچهر نورانی</span> — <span dir="ltr">📞 0744173723</span></p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   DASHBOARD TAB
   ═══════════════════════════════════════ */
const DashboardTab: React.FC<{ calc: any }> = ({ calc }) => (
  <div className="space-y-5">
    <div className="flex justify-between items-center">
      <div />
      <PrintBtn sectionId="print-dashboard" title="داشبورد — خلاصه مالی" />
    </div>
    <div id="print-dashboard">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'مجموع درآمد', value: `${fmt(calc.totalIncome)} ؋`, cls: 'text-success', icon: <TrendingUp size={16} /> },
          { label: 'هزینه‌ها', value: `${fmt(calc.operatingExpenses)} ؋`, cls: 'text-warning', icon: <Calculator size={16} /> },
          { label: 'عواید خالص', value: `${fmt(calc.netIncome)} ؋`, cls: calc.netIncome >= 0 ? 'text-info' : 'text-error', icon: <BarChart3 size={16} /> },
          { label: 'مالیات کل', value: `${fmt(calc.totalTax)} ؋`, cls: 'text-error', icon: <DollarSign size={16} /> },
        ].map((s, i) => (
          <div key={i} className="card bg-base-200">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 opacity-50 text-xs">{s.icon} {s.label}</div>
              <div className={`font-bold text-lg ${s.cls}`}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tax Breakdown */}
      <div className="card bg-base-200 mb-5">
        <div className="card-body p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">تفکیک مالیات</h3>
            <span className="badge badge-sm">نرخ مؤثر: {fmtPct(calc.effectiveRate)}</span>
          </div>
          <div className="space-y-4">
            {[
              { label: 'انتفاعی ربع‌وار', rate: '۴٪', value: calc.quarterlyTaxTotal, cls: 'progress-primary' },
              { label: 'عواید خالص سالانه', rate: '۲۰٪', value: calc.annualTax, cls: 'progress-secondary' },
              { label: 'معاش کارمندان', rate: 'تصاعدی', value: calc.totalSalaryTax, cls: 'progress-accent' },
            ].map((t, i) => {
              const pct = calc.totalTax > 0 ? (t.value / calc.totalTax) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="opacity-70">{t.label} <span className="opacity-50">({t.rate})</span></span>
                    <span className="font-semibold">{fmt(t.value)} ؋</span>
                  </div>
                  <progress className={`progress ${t.cls} w-full h-2`} value={pct} max={100} />
                </div>
              );
            })}
            <div className="divider my-1" />
            <div className="flex justify-between items-center">
              <span className="font-bold">مجموع قابل پرداخت</span>
              <span className="font-bold text-xl text-error">{fmt(calc.totalTax)} ؋</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quarterly */}
      <div className="card bg-base-200 mb-5">
        <div className="card-body p-5">
          <h3 className="font-bold mb-4">درآمد و مالیات ربع‌وار</h3>
          <div className="grid grid-cols-4 gap-3">
            {calc.byQuarter.map((q: any) => (
              <div key={q.quarter} className="text-center">
                <div className="text-xs opacity-40 mb-2">ربع {q.quarter}</div>
                <div className="font-bold">{fmt(q.income)}</div>
                <div className="text-xs opacity-50 mt-1">مالیات: {fmt(q.tax)} ؋</div>
                <progress className="progress progress-primary w-full h-1 mt-2" value={calc.totalIncome > 0 ? (q.income / calc.totalIncome) * 100 : 0} max={100} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Warnings */}
    {calc.warnings.length > 0 && (
      <div className="alert alert-warning">
        <div>
          <AlertTriangle size={16} />
          <div>
            <h4 className="font-bold text-sm">هشدارها</h4>
            <ul className="text-xs mt-1 space-y-1">
              {calc.warnings.map((w: string, i: number) => <li key={i} className="flex items-center gap-1"><ChevronRight size={10} /> {w}</li>)}
            </ul>
          </div>
        </div>
      </div>
    )}

    {/* Validations */}
    {calc.validations.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {calc.validations.map((v: string, i: number) => (
          <div key={i} className="badge badge-success badge-outline gap-1 py-3">
            <CheckCircle size={10} /> {v}
          </div>
        ))}
      </div>
    )}
  </div>
);

/* ═══════════════════════════════════════
   COMPANY TAB
   ═══════════════════════════════════════ */
const CompanyTab: React.FC<{ company: Company; onSave: (c: Company) => void }> = ({ company, onSave }) => {
  const [form, setForm] = useState(company);
  const fields: { key: keyof Company; label: string; ph: string; required?: boolean }[] = [
    { key: 'name', label: 'نام شرکت صرافی', ph: 'مثلاً: صرافی نورانی', required: true },
    { key: 'manager', label: 'نام مدیر عامل', ph: '' },
    { key: 'license', label: 'شماره جواز', ph: '' },
    { key: 'tin', label: 'شماره TIN', ph: 'شماره تشخیصیه مالیاتی', required: true },
    { key: 'address', label: 'آدرس', ph: '' },
    { key: 'phone', label: 'تلفن', ph: '' },
    { key: 'fiscalStart', label: 'شروع دوره مالی', ph: '1404/01/01', required: true },
    { key: 'fiscalEnd', label: 'پایان دوره مالی', ph: '1404/12/29', required: true },
  ];

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Building2 size={18} /></div>
          <div>
            <h2 className="font-bold">اطلاعات شرکت</h2>
            <p className="text-xs opacity-50">اطلاعات اصلی شرکت صرافی</p>
          </div>
        </div>
        <PrintBtn sectionId="print-company" title="اطلاعات شرکت" />
      </div>
      <div id="print-company" className="space-y-3">
        {fields.map(f => (
          <div key={f.key}>
            <label className="label"><span className="label-text text-xs">{f.label} {f.required && <span className="text-error">*</span>}</span></label>
            <input className="input input-bordered w-full" placeholder={f.ph} value={form[f.key]}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary w-full" onClick={() => onSave(form)}>ذخیره اطلاعات</button>
    </div>
  );
};

/* ═══════════════════════════════════════
   INCOME TAB
   ═══════════════════════════════════════ */
const IncomeTab: React.FC<{ incomes: Income[]; onAdd: (i: Omit<Income, 'id'>) => void; onDel: (id: number) => void; calc: any }> = ({ incomes, onAdd, onDel, calc }) => {
  const [cat, setCat] = useState(CATS[0]);
  const [desc, setDesc] = useState('');
  const [amt, setAmt] = useState('');
  const [q, setQ] = useState(1);
  const [date, setDate] = useState(today());
  const [err, setErr] = useState('');

  const handleAdd = () => {
    if (!desc.trim()) { setErr('شرح درآمد الزامی'); return; }
    const amount = parseFloat(amt);
    if (!amount || amount <= 0) { setErr('مبلغ باید مثبت باشد'); return; }
    setErr('');
    onAdd({ category: cat, description: desc.trim(), amount, quarter: q, date });
    setDesc(''); setAmt('');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><TrendingUp size={18} /></div>
          <div>
            <h2 className="font-bold">ثبت درآمد</h2>
            <p className="text-xs opacity-50">درآمدها را به تفکیک دسته و ربع ثبت کنید</p>
          </div>
        </div>
        <PrintBtn sectionId="print-income" title="لیست درآمدها" />
      </div>

      {/* Add Form */}
      <div className="card bg-base-200">
        <div className="card-body p-4 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label py-1"><span className="label-text text-xs">دسته‌بندی</span></label>
              <select className="select select-bordered w-full select-sm" value={cat} onChange={e => setCat(e.target.value)}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs">ربع مالی</span></label>
              <select className="select select-bordered w-full select-sm" value={q} onChange={e => setQ(Number(e.target.value))}>
                {[1,2,3,4].map(n => <option key={n} value={n}>ربع {n}</option>)}
              </select>
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs">شرح <span className="text-error">*</span></span></label>
              <input className="input input-bordered w-full input-sm" placeholder="شرح درآمد" value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs">مبلغ (؋) <span className="text-error">*</span></span></label>
              <input className="input input-bordered w-full input-sm" placeholder="0" type="number" min="0" value={amt} onChange={e => setAmt(e.target.value)} />
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs">تاریخ</span></label>
              <input className="input input-bordered w-full input-sm" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          {err && <div className="alert alert-error py-1 text-xs"><AlertTriangle size={12} /> {err}</div>}
          <button className="btn btn-primary btn-sm" onClick={handleAdd}><Plus size={14} /> ثبت درآمد</button>
        </div>
      </div>

      <div id="print-income">
        {/* Category chips */}
        {calc.byCategory.some((c: any) => c.amount > 0) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {calc.byCategory.filter((c: any) => c.amount > 0).map((c: any) => (
              <div key={c.category} className="badge badge-lg gap-2 py-3">
                <span className="text-xs opacity-50">{c.category}</span>
                <span className="font-bold">{fmt(c.amount)} ؋</span>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between items-center px-1 mb-4">
          <span className="opacity-60">مجموع درآمد</span>
          <span className="font-bold text-lg text-success">{fmt(calc.totalIncome)} ؋</span>
        </div>

        {/* Table */}
        {incomes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead><tr><th>#</th><th>دسته</th><th>شرح</th><th>ربع</th><th>مبلغ</th><th className="no-print"></th></tr></thead>
              <tbody>
                {incomes.map((inc, idx) => (
                  <tr key={inc.id}>
                    <td className="opacity-40">{idx + 1}</td>
                    <td className="text-xs opacity-60">{inc.category}</td>
                    <td>{inc.description}</td>
                    <td className="text-xs">ربع {inc.quarter}</td>
                    <td className="font-semibold">{fmt(inc.amount)} ؋</td>
                    <td className="no-print"><button className="btn btn-ghost btn-xs text-error" onClick={() => onDel(inc.id)}><Trash2 size={12} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   EMPLOYEE TAB
   ═══════════════════════════════════════ */
const EmployeeTab: React.FC<{ employees: Employee[]; onAdd: (e: Omit<Employee, 'id'>) => void; onDel: (id: number) => void; calc: any }> = ({ employees, onAdd, onDel, calc }) => {
  const [name, setName] = useState('');
  const [pos, setPos] = useState('');
  const [sal, setSal] = useState('');
  const [ins, setIns] = useState('0');
  const [err, setErr] = useState('');

  const handleAdd = () => {
    if (!name.trim()) { setErr('نام الزامی'); return; }
    const salary = parseFloat(sal);
    if (!salary || salary <= 0) { setErr('معاش باید مثبت باشد'); return; }
    setErr('');
    onAdd({ name: name.trim(), position: pos.trim(), salary, insurance: parseFloat(ins) || 0 });
    setName(''); setPos(''); setSal(''); setIns('0');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Users size={18} /></div>
          <div>
            <h2 className="font-bold">مدیریت کارمندان</h2>
            <p className="text-xs opacity-50">معاش و بیمه کارمندان</p>
          </div>
        </div>
        <PrintBtn sectionId="print-employees" title="لیست کارمندان و مالیات معاش" />
      </div>

      {/* Form */}
      <div className="card bg-base-200">
        <div className="card-body p-4 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label py-1"><span className="label-text text-xs">نام <span className="text-error">*</span></span></label>
              <input className="input input-bordered w-full input-sm" placeholder="نام کارمند" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs">وظیفه</span></label>
              <input className="input input-bordered w-full input-sm" placeholder="عنوان شغل" value={pos} onChange={e => setPos(e.target.value)} />
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs">معاش ماهانه (؋) <span className="text-error">*</span></span></label>
              <input className="input input-bordered w-full input-sm" placeholder="0" type="number" min="0" value={sal} onChange={e => setSal(e.target.value)} />
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs">بیمه ماهانه (؋)</span></label>
              <input className="input input-bordered w-full input-sm" placeholder="0" type="number" min="0" value={ins} onChange={e => setIns(e.target.value)} />
            </div>
          </div>
          {err && <div className="alert alert-error py-1 text-xs"><AlertTriangle size={12} /> {err}</div>}
          <button className="btn btn-primary btn-sm" onClick={handleAdd}><Plus size={14} /> ثبت کارمند</button>
        </div>
      </div>

      <div id="print-employees">
        {/* Stats */}
        <div className="stats stats-horizontal w-full bg-base-200 mb-5">
          <div className="stat py-3 px-4">
            <div className="stat-title text-xs">تعداد</div>
            <div className="stat-value text-lg">{employees.length}</div>
          </div>
          <div className="stat py-3 px-4">
            <div className="stat-title text-xs">معاش سالانه</div>
            <div className="stat-value text-lg">{fmt(calc.totalSalaries)} ؋</div>
          </div>
          <div className="stat py-3 px-4">
            <div className="stat-title text-xs">مالیات سالانه</div>
            <div className="stat-value text-lg text-error">{fmt(calc.totalSalaryTax)} ؋</div>
          </div>
        </div>

        {/* Employee cards */}
        {employees.map(e => (
          <div key={e.id} className="card bg-base-200 mb-3">
            <div className="card-body p-4 flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content w-9 rounded-full">
                    <span className="text-sm">{e.name.charAt(0)}</span>
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-sm">{e.name}</div>
                  <div className="text-xs opacity-40">{e.position}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-left">
                  <div className="font-semibold text-sm">{fmt(e.salary)} ؋</div>
                  <div className="text-xs opacity-40">مالیات: {fmt(calcSalaryTax(e.salary))} ؋/ماه</div>
                </div>
                <span className="badge badge-primary badge-outline badge-sm">{taxBracketLabel(e.salary)}</span>
                <button className="btn btn-ghost btn-xs text-error no-print" onClick={() => onDel(e.id)}><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        ))}

        {/* Tax brackets */}
        <div className="card bg-base-200 mt-4">
          <div className="card-body p-4">
            <h4 className="font-medium text-sm mb-2 opacity-70">جدول نرخ مالیات معاش (سالانه)</h4>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span>۰ – ۱۲,۵۰۰ ؋</span><span className="text-success font-medium">معاف</span>
              <span>۱۲,۵۰۱ – ۱۰۰,۰۰۰ ؋</span><span className="font-medium">۲٪</span>
              <span>۱۰۰,۰۰۱ – ۲۰۰,۰۰۰ ؋</span><span className="font-medium">۱۰٪</span>
              <span>بالاتر از ۲۰۰,۰۰۰ ؋</span><span className="text-error font-medium">۲۰٪</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   DEDUCTION TAB
   ═══════════════════════════════════════ */
const DeductionTab: React.FC<{ deductions: Deduction[]; onAdd: (d: Omit<Deduction, 'id'>) => void; onDel: (id: number) => void; calc: any }> = ({ deductions, onAdd, onDel, calc }) => {
  const [desc, setDesc] = useState('');
  const [amt, setAmt] = useState('');
  const [type, setType] = useState(DED_TYPES[0]);
  const [err, setErr] = useState('');

  const handleAdd = () => {
    if (!desc.trim()) { setErr('شرح الزامی'); return; }
    const amount = parseFloat(amt);
    if (!amount || amount <= 0) { setErr('مبلغ باید مثبت باشد'); return; }
    setErr('');
    onAdd({ description: desc.trim(), amount, type });
    setDesc(''); setAmt('');
  };

  const byType = DED_TYPES.map(t => ({ type: t, total: deductions.filter(d => d.type === t).reduce((s, d) => s + d.amount, 0) })).filter(t => t.total > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Receipt size={18} /></div>
          <div>
            <h2 className="font-bold">کسورات و هزینه‌ها</h2>
            <p className="text-xs opacity-50">هزینه‌ها و معافیت‌های قانونی</p>
          </div>
        </div>
        <PrintBtn sectionId="print-deductions" title="لیست کسورات و هزینه‌ها" />
      </div>

      {/* Form */}
      <div className="card bg-base-200">
        <div className="card-body p-4 gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label py-1"><span className="label-text text-xs">نوع</span></label>
              <select className="select select-bordered w-full select-sm" value={type} onChange={e => setType(e.target.value)}>
                {DED_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs">شرح <span className="text-error">*</span></span></label>
              <input className="input input-bordered w-full input-sm" placeholder="شرح کسر" value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs">مبلغ (؋) <span className="text-error">*</span></span></label>
              <input className="input input-bordered w-full input-sm" placeholder="0" type="number" min="0" value={amt} onChange={e => setAmt(e.target.value)} />
            </div>
          </div>
          {err && <div className="alert alert-error py-1 text-xs"><AlertTriangle size={12} /> {err}</div>}
          <button className="btn btn-primary btn-sm" onClick={handleAdd}><Plus size={14} /> ثبت کسر</button>
        </div>
      </div>

      <div id="print-deductions">
        {/* Type chips */}
        {byType.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {byType.map(t => (
              <div key={t.type} className="badge badge-lg gap-2 py-3">
                <span className="text-xs opacity-50">{t.type}</span>
                <span className="font-bold">{fmt(t.total)} ؋</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center px-1 mb-4">
          <span className="opacity-60">مجموع کسورات</span>
          <span className="font-bold text-lg">{fmt(calc.totalDeductions)} ؋</span>
        </div>

        {/* Table */}
        {deductions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead><tr><th>#</th><th>نوع</th><th>شرح</th><th>مبلغ</th><th className="no-print"></th></tr></thead>
              <tbody>
                {deductions.map((d, idx) => (
                  <tr key={d.id}>
                    <td className="opacity-40">{idx + 1}</td>
                    <td className="text-xs opacity-60">{d.type}</td>
                    <td>{d.description}</td>
                    <td className="font-semibold">{fmt(d.amount)} ؋</td>
                    <td className="no-print"><button className="btn btn-ghost btn-xs text-error" onClick={() => onDel(d.id)}><Trash2 size={12} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   REPORT TAB
   ═══════════════════════════════════════ */
const ReportTab: React.FC<{
  company: Company; calc: any; employees: Employee[];
  incomes: Income[]; deductions: Deduction[];
}> = ({ company, calc, employees, incomes, deductions }) => {
  const [showPrint, setShowPrint] = useState(false);

  const introText = `این گزارش به منظور ارائه وضعیت دقیق مالی و محاسبه مالیات شرکت صرافی ${company.name || '[نام شرکت]'} برای دوره مالی ${company.fiscalStart || '[شروع]'} تا ${company.fiscalEnd || '[پایان]'} تهیه گردیده است. تمام محاسبات مطابق قوانین مالیاتی جمهوری اسلامی افغانستان انجام شده و شامل درآمد حاصل از فروش، تبادله اسعار، کمیشن، کرایه و سایر درآمدها می‌باشد. همچنین مالیات بر معاش کارمندان، مالیات انتفاعی ربع‌وار و مالیات از عواید خالص سالانه به طور دقیق محاسبه و جمع‌بندی شده است.`;

  if (showPrint) {
    return (
      <div className="bg-base-100 p-8 text-sm" dir="rtl">
        <div className="flex gap-2 mb-6 no-print">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowPrint(false)}><ArrowLeft size={14} /> بازگشت</button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}><Printer size={14} /> چاپ / PDF</button>
        </div>

        {/* Official Header */}
        <div className="text-center mb-8 pb-5 border-b-2 border-base-300">
          <div className="text-xs opacity-40 mb-2">بسم الله الرحمن الرحیم</div>
          <h1 className="text-2xl font-bold mb-1">گزارش تصفیه مالیاتی</h1>
          <h2 className="text-lg font-bold text-primary">{company.name || '[نام شرکت]'}</h2>
          <div className="opacity-50 mt-2 text-sm">دوره مالی: {company.fiscalStart} الی {company.fiscalEnd}</div>
          <div className="flex justify-center gap-8 text-xs mt-3 opacity-40">
            {company.tin && <span>TIN: {company.tin}</span>}
            {company.license && <span>جواز: {company.license}</span>}
            {company.phone && <span>تلفن: {company.phone}</span>}
          </div>
        </div>

        {/* Introduction */}
        <div className="mb-8 p-5 bg-base-200 rounded-2xl text-justify leading-8 opacity-80">{introText}</div>

        {/* 1. Income */}
        <h3 className="font-bold mb-3 pb-2 border-b border-base-300 flex items-center gap-2">
          <span className="badge badge-primary badge-sm">۱</span> خلاصه درآمدها
        </h3>
        <table className="table table-sm mb-8 w-full">
          <thead><tr><th>ردیف</th><th>دسته درآمد</th><th>مبلغ (؋)</th><th>درصد</th></tr></thead>
          <tbody>
            {calc.byCategory.map((c: any, i: number) => (
              <tr key={c.category}><td>{i+1}</td><td>{c.category}</td><td className="font-medium">{fmt(c.amount)}</td><td>{calc.totalIncome > 0 ? fmtPct((c.amount/calc.totalIncome)*100) : '۰٪'}</td></tr>
            ))}
            <tr className="font-bold bg-base-200"><td></td><td>مجموع</td><td>{fmt(calc.totalIncome)}</td><td>۱۰۰٪</td></tr>
          </tbody>
        </table>

        {/* 2. Quarterly */}
        <h3 className="font-bold mb-3 pb-2 border-b border-base-300 flex items-center gap-2">
          <span className="badge badge-primary badge-sm">۲</span> مالیات ربع‌وار
        </h3>
        <table className="table table-sm mb-8 w-full">
          <thead><tr><th>ربع</th><th>درآمد</th><th>کسورات</th><th>سود خالص</th><th>مالیات ۴٪</th></tr></thead>
          <tbody>
            {calc.byQuarter.map((q: any) => (
              <tr key={q.quarter}><td>ربع {q.quarter}</td><td>{fmt(q.income)}</td><td>{fmt(q.deductions)}</td><td>{fmt(q.net)}</td><td>{fmt(q.tax)}</td></tr>
            ))}
            <tr className="font-bold bg-base-200"><td>مجموع</td><td>{fmt(calc.totalIncome)}</td><td>{fmt(calc.totalDeductions)}</td><td>{fmt(calc.byQuarter.reduce((s:number,q:any)=>s+q.net,0))}</td><td>{fmt(calc.quarterlyTaxTotal)}</td></tr>
          </tbody>
        </table>

        {/* 3. Employees */}
        <h3 className="font-bold mb-3 pb-2 border-b border-base-300 flex items-center gap-2">
          <span className="badge badge-primary badge-sm">۳</span> مالیات معاش
        </h3>
        {employees.length > 0 ? (
          <table className="table table-sm mb-8 w-full">
            <thead><tr><th>نام</th><th>وظیفه</th><th>معاش</th><th>نرخ</th><th>مالیات/ماه</th><th>مالیات/سال</th></tr></thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id}><td>{e.name}</td><td className="text-xs">{e.position}</td><td>{fmt(e.salary)} ؋</td><td><span className="badge badge-primary badge-outline badge-xs">{taxBracketLabel(e.salary)}</span></td><td>{fmt(calcSalaryTax(e.salary))} ؋</td><td className="font-medium">{fmt(calcSalaryTax(e.salary)*12)} ؋</td></tr>
              ))}
              <tr className="font-bold bg-base-200"><td colSpan={5}>مجموع</td><td>{fmt(calc.totalSalaryTax)} ؋</td></tr>
            </tbody>
          </table>
        ) : <p className="opacity-40 mb-8 text-sm">کارمندی ثبت نشده</p>}

        {/* 4. Deductions */}
        {deductions.length > 0 && (
          <>
            <h3 className="font-bold mb-3 pb-2 border-b border-base-300 flex items-center gap-2">
              <span className="badge badge-primary badge-sm">۴</span> کسورات و معافیت‌ها
            </h3>
            <table className="table table-sm mb-8 w-full">
              <thead><tr><th>ردیف</th><th>نوع</th><th>شرح</th><th>مبلغ</th></tr></thead>
              <tbody>
                {deductions.map((d, i) => (
                  <tr key={d.id}><td>{i+1}</td><td className="text-xs">{d.type}</td><td>{d.description}</td><td className="font-medium">{fmt(d.amount)}</td></tr>
                ))}
                <tr className="font-bold bg-base-200"><td></td><td colSpan={2}>مجموع</td><td>{fmt(calc.totalDeductions)}</td></tr>
              </tbody>
            </table>
          </>
        )}

        {/* 5. Final Summary */}
        <h3 className="font-bold mb-3 pb-2 border-b border-base-300 flex items-center gap-2">
          <span className="badge badge-primary badge-sm">{deductions.length > 0 ? '۵' : '۴'}</span> جمع‌بندی نهایی
        </h3>
        <div className="bg-base-200 rounded-2xl p-5 mb-8">
          <table className="table table-sm w-full">
            <tbody>
              <tr><td className="font-medium">الف) مجموع درآمد</td><td className="text-left font-bold">{fmt(calc.totalIncome)} ؋</td></tr>
              <tr><td className="opacity-60">ب) کسورات</td><td className="text-left">({fmt(calc.totalDeductions)}) ؋</td></tr>
              <tr><td className="opacity-60">ج) معاشات</td><td className="text-left">({fmt(calc.totalSalaries)}) ؋</td></tr>
              <tr><td className="opacity-60">د) بیمه</td><td className="text-left">({fmt(calc.totalInsurance)}) ؋</td></tr>
              <tr className="font-bold border-t-2 border-base-300"><td>هـ) عواید خالص</td><td className="text-left">{fmt(calc.netIncome)} ؋</td></tr>
            </tbody>
          </table>
          <div className="divider my-2" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>۱. مالیات انتفاعی ربع‌وار (۴٪)</span><span>{fmt(calc.quarterlyTaxTotal)} ؋</span></div>
            <div className="flex justify-between"><span>۲. مالیات عواید خالص (۲۰٪)</span><span>{fmt(calc.annualTax)} ؋</span></div>
            <div className="flex justify-between"><span>۳. مالیات معاش کارمندان</span><span>{fmt(calc.totalSalaryTax)} ؋</span></div>
          </div>
          <div className="divider my-2" />
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg">مجموع مالیات قابل پرداخت</span>
            <span className="font-bold text-2xl text-error">{fmt(calc.totalTax)} ؋</span>
          </div>
          <div className="text-xs opacity-40 mt-1 text-left">نرخ مؤثر: {fmtPct(calc.effectiveRate)}</div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 text-center text-sm mt-12">
          {[
            { title: 'تهیه‌کننده', sub: company.manager },
            { title: 'مهر شرکت', sub: company.name },
            { title: 'تأیید مستوفیت', sub: '' },
          ].map((s, i) => (
            <div key={i}>
              <div className="h-16" />
              <div className="border-t border-base-300 pt-3 opacity-60">{s.title}</div>
              {s.sub && <div className="text-xs opacity-40 mt-1">{s.sub}</div>}
            </div>
          ))}
        </div>

        <div className="text-center text-xs opacity-30 mt-10 pt-3 border-t border-base-300">
          سیستم حسابداری مالیاتی صرافی — {new Date().toLocaleDateString('fa-AF')} — طراحی: منوچهر نورانی — 📞 0744173723
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><FileText size={18} /></div>
        <div>
          <h2 className="font-bold">گزارش مالیاتی</h2>
          <p className="text-xs opacity-50">گزارش رسمی جهت ارائه به مستوفیت</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card bg-base-200"><div className="card-body p-4">
          <div className="text-xs opacity-50">مجموع درآمد</div>
          <div className="font-bold text-xl text-success">{fmt(calc.totalIncome)} ؋</div>
        </div></div>
        <div className="card bg-base-200"><div className="card-body p-4">
          <div className="text-xs opacity-50">مالیات کل</div>
          <div className="font-bold text-xl text-error">{fmt(calc.totalTax)} ؋</div>
        </div></div>
      </div>

      {/* Breakdown */}
      <div className="card bg-base-200">
        <div className="card-body p-5 gap-2 text-sm">
          <div className="flex justify-between"><span className="opacity-60">مجموع درآمد</span><span className="font-semibold">{fmt(calc.totalIncome)} ؋</span></div>
          <div className="flex justify-between"><span className="opacity-40">کسورات</span><span className="opacity-60">- {fmt(calc.totalDeductions)} ؋</span></div>
          <div className="flex justify-between"><span className="opacity-40">معاشات</span><span className="opacity-60">- {fmt(calc.totalSalaries)} ؋</span></div>
          <div className="flex justify-between"><span className="opacity-40">بیمه</span><span className="opacity-60">- {fmt(calc.totalInsurance)} ؋</span></div>
          <div className="divider my-0" />
          <div className="flex justify-between font-bold"><span>عواید خالص</span><span>{fmt(calc.netIncome)} ؋</span></div>
          <div className="divider my-0" />
          <div className="flex justify-between text-xs"><span className="opacity-50">انتفاعی ۴٪</span><span>{fmt(calc.quarterlyTaxTotal)} ؋</span></div>
          <div className="flex justify-between text-xs"><span className="opacity-50">عواید ۲۰٪</span><span>{fmt(calc.annualTax)} ؋</span></div>
          <div className="flex justify-between text-xs"><span className="opacity-50">مالیات معاش</span><span>{fmt(calc.totalSalaryTax)} ؋</span></div>
          <div className="divider my-0" />
          <div className="flex justify-between font-bold text-lg">
            <span>مجموع مالیات</span>
            <span className="text-error">{fmt(calc.totalTax)} ؋</span>
          </div>
        </div>
      </div>

      {/* Intro preview */}
      <div className="card bg-base-200">
        <div className="card-body p-4 text-sm text-justify leading-7 opacity-60">
          <div className="text-xs font-medium opacity-60 mb-2">متن مقدمه گزارش</div>
          {introText}
        </div>
      </div>

      {/* Warnings */}
      {calc.warnings.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {calc.warnings.map((w: string, i: number) => (
            <div key={i} className="badge badge-warning badge-outline gap-1 py-2 text-xs">
              <AlertTriangle size={10} /> {w}
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-primary w-full" onClick={() => setShowPrint(true)}>
        <Printer size={16} /> مشاهده و چاپ گزارش رسمی
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════
   LOG TAB
   ═══════════════════════════════════════ */
const LogTab: React.FC<{ logs: LogEntry[]; onClear: () => void }> = ({ logs, onClear }) => {
  const actionColor = (action: string) => {
    if (action === 'ثبت') return 'badge-success';
    if (action === 'حذف') return 'badge-error';
    if (action === 'ذخیره') return 'badge-info';
    return 'badge-ghost';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><ScrollText size={18} /></div>
          <div>
            <h2 className="font-bold">لاگ فعالیت‌ها</h2>
            <p className="text-xs opacity-50">تاریخچه تمام عملیات‌های انجام‌شده</p>
          </div>
        </div>
        <div className="flex gap-2">
          <PrintBtn sectionId="print-logs" title="لاگ فعالیت‌های سیستم" />
          {logs.length > 0 && (
            <button className="btn btn-ghost btn-sm text-error gap-1" onClick={onClear}>
              <Trash2 size={14} /> پاک‌سازی
            </button>
          )}
        </div>
      </div>

      <div id="print-logs">
        {logs.length === 0 ? (
          <div className="text-center py-12 opacity-40">
            <ScrollText size={40} className="mx-auto mb-3 opacity-30" />
            <p>هنوز فعالیتی ثبت نشده</p>
            <p className="text-xs mt-1">با ثبت درآمد، کارمند یا کسورات، لاگ فعالیت‌ها اینجا نمایش داده می‌شود</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="card bg-base-200">
                <div className="card-body p-3 flex-row items-center gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Clock size={12} className="opacity-30 shrink-0" />
                    <span className="text-xs opacity-40 shrink-0 font-mono" dir="ltr">{log.timestamp}</span>
                    <span className={`badge badge-sm ${actionColor(log.action)}`}>{log.action}</span>
                    <span className="badge badge-sm badge-outline">{log.tab}</span>
                    <span className="text-sm truncate">{log.detail}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <div className="text-center text-xs opacity-30">
          {logs.length} فعالیت ثبت شده — آخرین ۲۰۰ مورد نگهداری می‌شود
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════
   MOUNT
   ═══════════════════════════════════════ */
createRoot(document.getElementById('root')!).render(<App />);
