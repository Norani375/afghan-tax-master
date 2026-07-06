import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Building2, DollarSign, Users, FileText, Calculator, Plus, Trash2, Printer,
  AlertTriangle, CheckCircle, TrendingUp, BarChart3, Shield, ArrowLeft,
  Landmark, Briefcase, CircleDollarSign, Receipt, ChevronRight, Eye, EyeOff, LogOut,
  Clock, ScrollText, Moon, Sun, Search, UserPlus, Lock, PieChart, Activity,
  Download, Filter, RefreshCw, Settings, ChevronDown, X, Menu, ArrowLeftRight
} from 'lucide-react';
import TransactionsTab from './modules/TransactionsTab';
import CustomsDeclarationsTab from './modules/CustomsDeclarationsTab';

async function runSQL(sql: string, params: any[] = []): Promise<any> {
  try {
    const resp = await fetch("/api/sql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params })
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (e: any) {
    console.error("SQL Error:", e);
    return { rows: [] };
  }
}


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
const CAT_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

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

/* ── SVG Chart Components ── */
const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[]; size?: number }> = ({ data, size = 160 }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="flex items-center justify-center opacity-30" style={{ width: size, height: size }}>بدون داده</div>;
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  let cumAngle = -90;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.filter(d => d.value > 0).map((d, i) => {
        const pct = d.value / total;
        const angle = pct * 360;
        const startAngle = cumAngle;
        cumAngle += angle;
        const endAngle = cumAngle;
        const largeArc = angle > 180 ? 1 : 0;
        const rad = (a: number) => (a * Math.PI) / 180;
        const x1 = cx + r * Math.cos(rad(startAngle));
        const y1 = cy + r * Math.sin(rad(startAngle));
        const x2 = cx + r * Math.cos(rad(endAngle));
        const y2 = cy + r * Math.sin(rad(endAngle));
        const path = data.filter(d => d.value > 0).length === 1
          ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
          : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        return <path key={i} d={path} fill={d.color} opacity={0.85} stroke="oklch(var(--b1))" strokeWidth="2">
          <title>{d.label}: {fmt(d.value)} ؋ ({fmtPct(pct * 100)})</title>
        </path>;
      })}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="oklch(var(--b1))" />
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-base-content" fontSize="14" fontWeight="bold">{fmt(total)}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-base-content" fontSize="9" opacity={0.5}>؋ مجموع</text>
    </svg>
  );
};

const BarChart: React.FC<{ data: { label: string; value: number; color: string }[]; height?: number }> = ({ data, height = 140 }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  const barW = 100 / data.length;
  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 30);
        return (
          <g key={i}>
            <rect x={i * barW + barW * 0.15} y={height - 20 - h} width={barW * 0.7} height={h} fill={d.color} rx={2} opacity={0.8}>
              <title>{d.label}: {fmt(d.value)} ؋</title>
            </rect>
            <text x={i * barW + barW / 2} y={height - 6} textAnchor="middle" className="fill-base-content" fontSize="3.5" opacity={0.5}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

/* ── Area Chart (trend) ── */
const AreaChart: React.FC<{ points: { label: string; value: number }[]; color?: string; height?: number }> = ({ points, color = '#3b82f6', height = 140 }) => {
  const max = Math.max(...points.map(p => p.value), 1);
  const W = 100, H = height, pad = 8;
  const stepX = points.length > 1 ? (W - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => [pad + i * stepX, H - 24 - (p.value / max) * (H - 40)] as [number, number]);
  const line = coords.map((c, i) => (i === 0 ? `M ${c[0]} ${c[1]}` : `L ${c[0]} ${c[1]}`)).join(' ');
  const area = `${line} L ${coords[coords.length - 1]?.[0] ?? pad} ${H - 24} L ${pad} ${H - 24} Z`;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${color.replace('#','')})`} />
      <path d={line} stroke={color} strokeWidth="1.2" fill="none" />
      {coords.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="1.5" fill={color}><title>{points[i].label}: {fmt(points[i].value)} ؋</title></circle>
          <text x={x} y={H - 8} textAnchor="middle" className="fill-base-content" fontSize="3.5" opacity={0.5}>{points[i].label}</text>
        </g>
      ))}
    </svg>
  );
};

/* ── Horizontal Bars (employee tax comparison) ── */
const HBar: React.FC<{ rows: { label: string; value: number; color?: string }[] }> = ({ rows }) => {
  const max = Math.max(...rows.map(r => r.value), 1);
  return (
    <div className="space-y-2">
      {rows.length === 0 && <div className="text-xs opacity-40 text-center py-4">داده‌ای نیست</div>}
      {rows.map((r, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1">
            <span className="opacity-60 truncate max-w-[60%]">{r.label}</span>
            <span className="font-bold">{fmt(r.value)} ؋</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-base-300">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(r.value / max) * 100}%`, background: r.color || 'oklch(var(--p))' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

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
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: right; }
  th { background: #f0f4ff; font-weight: bold; }
  tr:nth-child(even) { background: #fafafa; }
  .no-print { display: none !important; }
  .footer { text-align: center; font-size: 10px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
  @media print { body { padding: 0; } }
</style></head><body>`);
  w.document.write(`<div style="text-align:center"><h2>${title}</h2></div>`);
  w.document.write(el.innerHTML);
  w.document.write(`<div class="footer">سیستم حسابداری مالیاتی صرافی — ${new Date().toLocaleDateString('fa-AF')} — طراحی: منوچهر نورانی — 📞 0744173723</div>`);
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(() => { w.print(); }, 300);
}

/* ═══════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════ */
const AnimNum: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>();
  useEffect(() => {
    const start = display;
    const diff = value - start;
    const duration = 600;
    const t0 = performance.now();
    const animate = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * eased));
      if (p < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);
  return <span className={className}>{display.toLocaleString('fa-AF')} ؋</span>;
};

/* ═══════════════════════════════════════
   PRINT BUTTON
   ═══════════════════════════════════════ */
const PrintBtn: React.FC<{ sectionId: string; title: string }> = ({ sectionId, title }) => (
  <button className="btn btn-ghost btn-sm gap-1 opacity-50 hover:opacity-100 transition-opacity" onClick={() => printSection(sectionId, title)}>
    <Printer size={14} /> چاپ
  </button>
);

/* ═══════════════════════════════════════
   LOGIN SCREEN — LUXURIOUS v6
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
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-base-100 via-base-200 to-base-100">
      {/* Ambient blobs — navy + gold */}
      <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-20 bg-primary" />
      <div className="absolute -bottom-28 -left-28 w-[22rem] h-[22rem] rounded-full blur-3xl opacity-20 bg-secondary" />
      <div className="absolute top-1/3 left-1/4 w-56 h-56 rounded-full blur-2xl opacity-10 bg-accent" />
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-primary/30 ring-1 ring-secondary/30 transition-transform hover:scale-105">
            <Landmark size={36} className="text-secondary drop-shadow" />
          </div>
          <h1 className="text-2xl font-black mb-1 bg-gradient-to-l from-primary via-accent to-secondary bg-clip-text text-transparent">
            سیستم مالیاتی صرافی
          </h1>
          <p className="text-xs opacity-50 tracking-wide">نسخهٔ ۶٫۰ — حرفه‌ای</p>
        </div>

        <div className="card bg-base-100/70 backdrop-blur-2xl shadow-2xl border border-base-300/60 ring-1 ring-secondary/10">
          <div className="card-body gap-5 p-7">
            <div>
              <label className="label pb-1"><span className="label-text text-xs font-semibold opacity-70">نام کاربری</span></label>
              <label className="input input-bordered flex items-center gap-2 bg-base-200/50 border-base-300/70 transition-all focus-within:ring-2 focus-within:ring-secondary/50 focus-within:border-secondary/60">
                <Users className="h-[1em] opacity-50 text-secondary" />
                <input className="grow bg-transparent" placeholder="admin" value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
              </label>
            </div>

            <div>
              <label className="label pb-1"><span className="label-text text-xs font-semibold opacity-70">رمز عبور</span></label>
              <label className="input input-bordered flex items-center gap-2 bg-base-200/50 border-base-300/70 transition-all focus-within:ring-2 focus-within:ring-secondary/50 focus-within:border-secondary/60">
                <Lock className="h-[1em] opacity-50 text-secondary" />
                <input className="grow bg-transparent" placeholder="••••••••" type={showPass ? 'text' : 'password'}
                  value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                <button type="button" className="btn btn-ghost btn-xs btn-circle opacity-50 hover:opacity-100 hover:text-secondary" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </label>
            </div>

            {error && (
              <div className="alert alert-error py-2 shadow-sm text-sm">
                <AlertTriangle size={14} /> <span>{error}</span>
              </div>
            )}

            <button
              className={`btn w-full border-0 text-primary-content shadow-lg shadow-primary/30 bg-gradient-to-l from-primary via-primary to-primary/90 hover:from-primary hover:to-secondary hover:text-secondary-content hover:shadow-secondary/40 transition-all duration-300 ${loading ? 'btn-disabled' : ''}`}
              onClick={handleLogin}>
              {loading ? <span className="loading loading-spinner loading-sm" /> : <><Shield size={16} /> ورود به سیستم</>}
            </button>

            <div className="divider text-[10px] opacity-40 my-0">حساب پیش‌فرض</div>
            <div className="text-[11px] text-center opacity-60" dir="ltr">admin / admin</div>
          </div>
        </div>

        <div className="text-center mt-8 space-y-2">
          <p className="text-xs opacity-30">طراحی و توسعه: <span className="font-bold">منوچهر نورانی</span></p>
          <p className="text-xs opacity-30" dir="ltr">📞 0744173723</p>
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
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [company, setCompany] = useState<Company>({
    name: '', license: '', tin: '', fiscalStart: '1404/01/01',
    fiscalEnd: '1404/12/29', address: '', phone: '', manager: ''
  });
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [derivedIncomes, setDerivedIncomes] = useState<Income[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [nextId, setNextId] = useState(1);
  const [toast, setToast] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);

  /* ── Smart derivation: transactions → incomes ── */
  const quarterFromDate = (d: string): number => {
    if (!d) return 1;
    // supports 2025-03-15 or 1404/03/15 (shamsi already 1..12 → quarters same mapping)
    const parts = d.split(/[-\/]/).map(x => parseInt(x, 10));
    const m = parts.length >= 2 ? parts[1] : 1;
    if (m <= 3) return 1; if (m <= 6) return 2; if (m <= 9) return 3; return 4;
  };
  const loadDerivedIncomes = async () => {
    try {
      const ex = await window.tasklet.sqlQuery(`SELECT id, date, profit, buy_currency, sell_currency FROM tax_exchanges`);
      const rm = await window.tasklet.sqlQuery(`SELECT id, date, com, currency, sender, receiver FROM tax_remit_out`);
      const out: Income[] = [];
      let vid = -1;
      (ex || []).forEach((r: any) => {
        const amt = Number(r.profit) || 0;
        if (amt === 0) return;
        out.push({
          id: vid--, category: 'تبادله اسعار',
          description: `مفاد تبادله #${r.id} (${r.buy_currency || ''}→${r.sell_currency || ''})`,
          amount: amt, quarter: quarterFromDate(r.date as string), date: (r.date as string) || today()
        });
      });
      (rm || []).forEach((r: any) => {
        const amt = Number(r.com) || 0;
        if (amt === 0) return;
        out.push({
          id: vid--, category: 'کمیشن',
          description: `کمیشن حواله #${r.id} ${r.currency || ''} (${r.sender || ''}→${r.receiver || ''})`,
          amount: amt, quarter: quarterFromDate(r.date as string), date: (r.date as string) || today()
        });
      });
      setDerivedIncomes(out);
    } catch { setDerivedIncomes([]); }
  };

  /* ── Theme ── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  /* ── Logo (shared with reports via localStorage) ── */
  const [logoUrl, setLogoUrl] = useState<string>(() => localStorage.getItem('tax_logo') || '');
  useEffect(() => {
    const sync = () => setLogoUrl(localStorage.getItem('tax_logo') || '');
    window.addEventListener('tax_logo_updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('tax_logo_updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  /* ── Log function ── */
  const addLog = (tabName: string, action: string, detail: string) => {
    logIdRef.current += 1;
    const entry: LogEntry = { id: logIdRef.current, timestamp: nowStr(), tab: tabName, action, detail };
    setLogs(prev => [entry, ...prev].slice(0, 200));
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

      const lg = await window.tasklet.sqlQuery(`SELECT * FROM tax_logs ORDER BY id DESC LIMIT 200`);
      setLogs(lg.map(r => ({ id: r.id as number, timestamp: r.timestamp as string, tab: r.tab as string, action: r.action as string, detail: r.detail as string })));
      logIdRef.current = lg.length > 0 ? (lg[0].id as number) : 0;

      const mx = await window.tasklet.sqlQuery(`SELECT MAX(m) as maxid FROM (SELECT MAX(id) as m FROM tax_incomes2 UNION ALL SELECT MAX(id) FROM tax_employees2 UNION ALL SELECT MAX(id) FROM tax_deductions2)`);
      setNextId(((mx[0]?.maxid as number) || 0) + 1);
      await loadDerivedIncomes();
      setLoading(false);
    })();
  }, []);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  /* ── CRUD ── */
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

  /* ── Calculations (merges manual incomes + auto-derived transactions) ── */
  const mergedIncomes = useMemo<Income[]>(() => [...incomes, ...derivedIncomes], [incomes, derivedIncomes]);

  const calc = useMemo(() => {
    const src = mergedIncomes;
    const totalIncome = src.reduce((s, i) => s + i.amount, 0);
    const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
    const totalInsurance = employees.reduce((s, e) => s + e.insurance, 0) * 12;
    const totalSalaries = employees.reduce((s, e) => s + e.salary, 0) * 12;
    const totalSalaryTax = employees.reduce((s, e) => s + calcSalaryTax(e.salary), 0) * 12;
    const operatingExpenses = totalDeductions + totalSalaries + totalInsurance;
    const netIncome = totalIncome - operatingExpenses;

    const byCategory = CATS.map((cat, idx) => ({
      category: cat, amount: src.filter(i => i.category === cat).reduce((s, i) => s + i.amount, 0), color: CAT_COLORS[idx]
    }));
    const byQuarter = [1, 2, 3, 4].map(q => {
      const qInc = src.filter(i => i.quarter === q).reduce((s, i) => s + i.amount, 0);
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
    if (src.length === 0) warnings.push('درآمدی ثبت نشده');
    if (employees.length > 0 && totalSalaryTax === 0) warnings.push('مالیات معاش صفر');
    [1,2,3,4].forEach(q => { if (!src.some(i => i.quarter === q)) warnings.push(`ربع ${q} بدون درآمد`); });
    if (netIncome < 0) warnings.push('عواید خالص منفی');
    if (deductions.length === 0 && src.length > 0) warnings.push('کسوراتی ثبت نشده');

    const validations: string[] = [];
    if (company.name && company.tin && src.length > 0) validations.push('اطلاعات پایه کامل');
    if (new Set(src.map(i => i.quarter)).size === 4) validations.push('هر ۴ ربع ثبت شده');
    if (employees.length > 0) validations.push('کارمندان ثبت شده');
    if (deductions.length > 0) validations.push('کسورات اعمال شده');
    if (derivedIncomes.length > 0) validations.push(`${derivedIncomes.length} تراکنش خودکار الحاق شد`);

    // completion score
    let score = 0;
    if (company.name) score += 15;
    if (company.tin) score += 15;
    if (src.length > 0) score += 20;
    if (new Set(src.map(i => i.quarter)).size === 4) score += 15;
    if (employees.length > 0) score += 15;
    if (deductions.length > 0) score += 10;
    if (company.license) score += 5;
    if (company.manager) score += 5;

    return { totalIncome, totalDeductions, totalInsurance, totalSalaries, totalSalaryTax, operatingExpenses, netIncome, byCategory, byQuarter, quarterlyTaxTotal, annualTax, totalTax, effectiveRate, warnings, validations, score, derivedCount: derivedIncomes.length };
  }, [mergedIncomes, employees, deductions, company, derivedIncomes.length]);

  /* ── Auth Gate ── */
  if (!user) return <LoginScreen onLogin={(u) => { setUser(u); }} />;

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-xl shadow-primary/20">
        <Landmark size={28} className="text-primary-content animate-pulse" />
      </div>
      <span className="text-sm opacity-50">در حال بارگذاری سیستم...</span>
      <span className="loading loading-dots loading-md text-primary" />
    </div>
  );

  const tabs = [
    { icon: <BarChart3 size={16} />, label: 'داشبورد' },
    { icon: <Building2 size={16} />, label: 'شرکت' },
    { icon: <DollarSign size={16} />, label: 'درآمد' },
    { icon: <Users size={16} />, label: 'کارمندان' },
    { icon: <Calculator size={16} />, label: 'کسورات' },
    { icon: <ArrowLeftRight size={16} />, label: 'معاملات' },
    { icon: <FileText size={16} />, label: 'گزارش' },
    { icon: <PieChart size={16} />, label: 'گزارش ربع‌وار' },
    { icon: <ScrollText size={16} />, label: 'لاگ' },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-base-100 transition-colors duration-300">
      {/* Toast */}
      {toast && (
        <div className="toast toast-top toast-start z-50">
          <div className="alert alert-success py-2 px-4 shadow-lg">
            <CheckCircle size={14} /> <span className="text-sm">{toast}</span>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
              {logoUrl
                ? <img src={logoUrl} alt="لوگو" className="w-full h-full object-contain bg-base-100" />
                : <Landmark size={22} className="text-primary-content" />}
            </div>
            <div>
              <h1 className="font-black text-lg">سیستم مالیاتی صرافی</h1>
              {company.name && <p className="text-xs opacity-40">{company.name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="تغییر تم">
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            {/* Tax badge */}
            {calc.totalTax > 0 && (
              <div className="hidden sm:block text-left">
                <div className="text-[10px] opacity-30">مالیات کل</div>
                <div className="font-bold text-sm text-error">{fmt(calc.totalTax)} ؋</div>
              </div>
            )}
            {/* User */}
            <div className="flex items-center gap-2 mr-1">
              <div className="avatar placeholder">
                <div className="bg-gradient-to-br from-primary to-secondary text-primary-content w-9 rounded-full shadow-md">
                  <span className="text-xs font-bold">{user.fullName.charAt(0)}</span>
                </div>
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold">{user.fullName}</div>
                <div className="text-[10px] opacity-25">{user.role === 'admin' ? 'مدیر' : user.role}</div>
              </div>
              <button className="btn btn-ghost btn-xs btn-circle opacity-40 hover:opacity-100" onClick={() => setUser(null)} title="خروج">
                <LogOut size={14} />
              </button>
            </div>
            {/* Mobile menu toggle */}
            <button className="btn btn-ghost btn-sm btn-circle sm:hidden" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Accent line */}
        <div className="h-0.5 bg-gradient-to-l from-primary via-secondary to-transparent mb-5 rounded-full opacity-60" />

        {/* Tab Navigation — Desktop */}
        <div className="hidden sm:flex">
          <div role="tablist" className="tabs tabs-bordered mb-6 flex-nowrap overflow-x-auto w-full">
            {tabs.map((t, i) => (
              <button key={i} role="tab"
                className={`tab gap-2 whitespace-nowrap transition-all ${tab === i ? 'tab-active font-bold text-primary' : 'opacity-60 hover:opacity-100'}`}
                onClick={() => setTab(i)}>
                {t.icon} {t.label}
                {i === 8 && logs.length > 0 && <span className="badge badge-xs badge-primary">{logs.length}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation — Mobile */}
        {mobileMenu && (
          <div className="sm:hidden mb-5 card bg-base-200 shadow-lg">
            <div className="card-body p-3 gap-1">
              {tabs.map((t, i) => (
                <button key={i}
                  className={`btn btn-ghost btn-sm justify-start gap-3 ${tab === i ? 'btn-active text-primary font-bold' : ''}`}
                  onClick={() => { setTab(i); setMobileMenu(false); }}>
                  {t.icon} {t.label}
                  {i === 8 && logs.length > 0 && <span className="badge badge-xs badge-primary mr-auto">{logs.length}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mobile current tab indicator */}
        <div className="sm:hidden mb-4">
          <button className="btn btn-ghost btn-sm gap-2 text-primary font-bold" onClick={() => setMobileMenu(true)}>
            {tabs[tab].icon} {tabs[tab].label} <ChevronDown size={14} />
          </button>
        </div>

        {/* Tab Content */}
        <div key={`t-${tab}`} className="animate-[fadeIn_0.3s_ease-out]" onMouseEnter={() => { if (tab === 0 || tab === 2 || tab === 6 || tab === 7) loadDerivedIncomes(); }}>
          {tab === 0 && <DashboardTab calc={calc} incomes={mergedIncomes} employees={employees} />}
          {tab === 1 && <CompanyTab company={company} onSave={saveCompany} />}
          {tab === 2 && <IncomeTab incomes={incomes} onAdd={addIncome} onDel={delIncome} calc={calc} />}
          {tab === 3 && <EmployeeTab employees={employees} onAdd={addEmployee} onDel={delEmployee} calc={calc} />}
          {tab === 4 && <DeductionTab deductions={deductions} onAdd={addDeduction} onDel={delDeduction} calc={calc} />}
          {tab === 5 && <TransactionsTab onLog={(a, d) => addLog('معاملات', a + ' — ' + d, '')} onFlash={(m) => { flash(m); loadDerivedIncomes(); }} />}
          {tab === 6 && <ReportTab company={company} calc={calc} employees={employees} incomes={mergedIncomes} deductions={deductions} />}
          {tab === 7 && <QuarterlyReportTab company={company} incomes={mergedIncomes} deductions={deductions} employees={employees} />}
          {tab === 8 && <LogTab logs={logs} onClear={() => { setLogs([]); window.tasklet.sqlExec(`DELETE FROM tax_logs`); }} />}
        </div>

        {/* Footer */}
        <div className="mt-10 mb-4 text-center border-t border-base-300/50 pt-4">
          <p className="text-[11px] opacity-30">سیستم حسابداری مالیاتی صرافی — نسخه ۶.۰</p>
          <p className="text-[11px] opacity-30 mt-1">طراحی و توسعه: <span className="font-bold">منوچهر نورانی</span> — <span dir="ltr">📞 0744173723</span></p>
        </div>
      </div>

      {/* Global styles for animation */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

/* ═══════════════════════════════════════
   DASHBOARD TAB — ENHANCED v6
   ═══════════════════════════════════════ */
const DashboardTab: React.FC<{ calc: any; incomes: Income[]; employees: Employee[] }> = ({ calc, incomes, employees }) => {
  const [qFilter, setQFilter] = useState<number | 'all'>('all');

  const filteredIncomes = qFilter === 'all' ? incomes : incomes.filter(i => i.quarter === qFilter);
  const filteredTotal = filteredIncomes.reduce((s, i) => s + i.amount, 0);

  const margin = calc.totalIncome > 0 ? (calc.netIncome / calc.totalIncome) * 100 : 0;
  const taxPressure = calc.totalIncome > 0 ? (calc.totalTax / calc.totalIncome) * 100 : 0;

  const empTaxRows = employees
    .map(e => ({ label: e.name || 'بدون نام', value: calcSalaryTax(e.salary) * 12, color: '#f59e0b' }))
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          <span className="font-bold">نمای کلی</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Quarter filter */}
          <div className="join">
            <button className={`btn btn-xs join-item ${qFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setQFilter('all')}>کل سال</button>
            {[1,2,3,4].map(q => (
              <button key={q} className={`btn btn-xs join-item ${qFilter === q ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setQFilter(q)}>ربع {q}</button>
            ))}
          </div>
          <PrintBtn sectionId="print-dashboard" title="داشبورد — خلاصه مالی" />
        </div>
      </div>

      <div id="print-dashboard">
        {/* Readiness + Hero KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <div className="card bg-gradient-to-br from-primary/10 via-base-200 to-base-200 border border-primary/20">
            <div className="card-body p-4 flex-row items-center gap-4">
              <div className="radial-progress text-primary" style={{ "--value": calc.score, "--size": "4rem", "--thickness": "5px" } as any}>
                <span className="text-xs font-bold">{calc.score}٪</span>
              </div>
              <div>
                <div className="font-bold text-sm">آمادگی گزارش</div>
                <div className="text-[11px] opacity-50 leading-tight mt-1">
                  {calc.score >= 80 ? 'گزارش آماده ارسال به مستوفیت' : calc.score >= 50 ? 'بخشی از اطلاعات وارد نشده' : 'اطلاعات پایه را تکمیل کنید'}
                </div>
              </div>
            </div>
          </div>
          <div className="card bg-base-200">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 opacity-50 text-xs"><TrendingUp size={14} /> حاشیه سود</div>
              <div className={`font-black text-2xl ${margin >= 0 ? 'text-success' : 'text-error'}`}>{margin.toFixed(1)}٪</div>
              <div className="text-[10px] opacity-40">عواید خالص ÷ درآمد</div>
            </div>
          </div>
          <div className="card bg-base-200">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 opacity-50 text-xs"><Receipt size={14} /> فشار مالیاتی</div>
              <div className="font-black text-2xl text-warning">{taxPressure.toFixed(1)}٪</div>
              <div className="text-[10px] opacity-40">مالیات ÷ درآمد</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: qFilter === 'all' ? 'مجموع درآمد' : `درآمد ربع ${qFilter}`, value: qFilter === 'all' ? calc.totalIncome : filteredTotal, cls: 'text-success', icon: <TrendingUp size={16} />, bg: 'from-success/10 to-transparent' },
            { label: 'هزینه‌ها', value: calc.operatingExpenses, cls: 'text-warning', icon: <Calculator size={16} />, bg: 'from-warning/10 to-transparent' },
            { label: 'عواید خالص', value: calc.netIncome, cls: calc.netIncome >= 0 ? 'text-info' : 'text-error', icon: <BarChart3 size={16} />, bg: 'from-info/10 to-transparent' },
            { label: 'مالیات کل', value: calc.totalTax, cls: 'text-error', icon: <DollarSign size={16} />, bg: 'from-error/10 to-transparent' },
          ].map((s, i) => (
            <div key={i} className="card bg-base-200 hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className={`card-body p-4 bg-gradient-to-b ${s.bg} rounded-2xl`}>
                <div className="flex items-center gap-2 opacity-40 text-xs">{s.icon} {s.label}</div>
                <AnimNum value={s.value} className={`font-black text-lg ${s.cls}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Trend (Area) — full width */}
        <div className="card bg-base-200 mb-5">
          <div className="card-body p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2"><Activity size={14} className="text-primary" /> روند درآمد فصلی</h3>
              <span className="text-[11px] opacity-40">سال جاری</span>
            </div>
            <AreaChart points={calc.byQuarter.map((q: any) => ({ label: `ربع ${q.quarter}`, value: q.income }))} color="#3b82f6" />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          <div className="card bg-base-200">
            <div className="card-body p-5">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><PieChart size={14} className="text-primary" /> تفکیک درآمد</h3>
              <div className="flex items-center justify-center gap-4">
                <DonutChart data={calc.byCategory.map((c: any) => ({ label: c.category, value: c.amount, color: c.color }))} />
                <div className="space-y-2">
                  {calc.byCategory.filter((c: any) => c.amount > 0).map((c: any) => (
                    <div key={c.category} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
                      <span className="opacity-60 truncate max-w-[100px]">{c.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body p-5">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Users size={14} className="text-primary" /> بیشترین مالیات معاش</h3>
              <HBar rows={empTaxRows} />
            </div>
          </div>
        </div>

        {/* Quarterly numbers grid */}
        <div className="card bg-base-200 mb-5">
          <div className="card-body p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><BarChart3 size={14} className="text-primary" /> جزئیات ربع‌وار</h3>
            <BarChart data={calc.byQuarter.map((q: any) => ({ label: `ربع ${q.quarter}`, value: q.income, color: CAT_COLORS[q.quarter - 1] }))} />
            <div className="grid grid-cols-4 gap-2 mt-3">
              {calc.byQuarter.map((q: any) => (
                <div key={q.quarter} className="text-center p-2 rounded-lg bg-base-300/40">
                  <div className="text-[10px] opacity-40">ربع {q.quarter}</div>
                  <div className="text-xs font-bold">{fmt(q.income)}</div>
                  <div className="text-[10px] opacity-50">مالیات: {fmt(q.tax)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tax Breakdown */}
        <div className="card bg-base-200 mb-5">
          <div className="card-body p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2"><Receipt size={14} className="text-primary" /> تفکیک مالیات</h3>
              <span className="badge badge-sm badge-outline">نرخ مؤثر: {fmtPct(calc.effectiveRate)}</span>
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
                      <span className="opacity-60">{t.label} <span className="opacity-40">({t.rate})</span></span>
                      <span className="font-bold">{fmt(t.value)} ؋</span>
                    </div>
                    <progress className={`progress ${t.cls} w-full h-2.5`} value={pct} max={100} />
                  </div>
                );
              })}
              <div className="divider my-1" />
              <div className="flex justify-between items-center">
                <span className="font-bold">مجموع قابل پرداخت</span>
                <AnimNum value={calc.totalTax} className="font-black text-xl text-error" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {calc.warnings.length > 0 && (
        <div className="card bg-warning/10 border border-warning/30">
          <div className="card-body p-4">
            <h4 className="font-bold text-sm flex items-center gap-2 text-warning"><AlertTriangle size={14} /> هشدارها ({calc.warnings.length})</h4>
            <ul className="text-xs mt-1 grid sm:grid-cols-2 gap-1">
              {calc.warnings.map((w: string, i: number) => <li key={i} className="flex items-center gap-1 opacity-80"><ChevronRight size={10} /> {w}</li>)}
            </ul>
          </div>
        </div>
      )}

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
};

/* ═══════════════════════════════════════
   COMPANY TAB
   ═══════════════════════════════════════ */
const CompanyTab: React.FC<{ company: Company; onSave: (c: Company) => void }> = ({ company, onSave }) => {
  const [form, setForm] = useState(company);
  const [logo, setLogo] = useState<string>(() => localStorage.getItem('tax_logo') || '');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g|svg\+xml|webp)$/.test(f.type)) {
      alert('فقط تصاویر PNG/JPG/SVG/WEBP قابل بارگذاری‌اند');
      return;
    }
    if (f.size > 1024 * 1024) {
      alert('حجم لوگو باید کمتر از ۱ مگابایت باشد');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || '');
      setLogo(url);
      localStorage.setItem('tax_logo', url);
      window.dispatchEvent(new Event('tax_logo_updated'));
    };
    reader.readAsDataURL(f);
  };
  const clearLogo = () => {
    setLogo('');
    localStorage.removeItem('tax_logo');
    window.dispatchEvent(new Event('tax_logo_updated'));
  };

  const fields: { key: keyof Company; label: string; ph: string; required?: boolean; icon: React.ReactNode }[] = [
    { key: 'name', label: 'نام شرکت صرافی', ph: 'مثلاً: صرافی نورانی', required: true, icon: <Building2 size={14} /> },
    { key: 'manager', label: 'نام مدیر عامل', ph: '', icon: <Users size={14} /> },
    { key: 'license', label: 'شماره جواز', ph: '', icon: <FileText size={14} /> },
    { key: 'tin', label: 'شماره TIN', ph: 'شماره تشخیصیه مالیاتی', required: true, icon: <Shield size={14} /> },
    { key: 'address', label: 'آدرس', ph: '', icon: <Landmark size={14} /> },
    { key: 'phone', label: 'تلفن', ph: '', icon: <Activity size={14} /> },
    { key: 'fiscalStart', label: 'شروع دوره مالی', ph: '1404/01/01', required: true, icon: <Clock size={14} /> },
    { key: 'fiscalEnd', label: 'پایان دوره مالی', ph: '1404/12/29', required: true, icon: <Clock size={14} /> },
  ];

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center text-primary"><Building2 size={20} /></div>
          <div>
            <h2 className="font-bold">اطلاعات شرکت</h2>
            <p className="text-xs opacity-40">اطلاعات اصلی شرکت صرافی</p>
          </div>
        </div>
        <PrintBtn sectionId="print-company" title="اطلاعات شرکت" />
      </div>

      {/* Logo uploader */}
      <div className="card bg-base-200/40 border border-base-300/60 p-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-base-100 border border-base-300 flex items-center justify-center overflow-hidden shrink-0">
            {logo
              ? <img src={logo} alt="لوگو شرکت" className="w-full h-full object-contain" />
              : <Building2 size={28} className="opacity-30" />}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold mb-1">لوگو شرکت</div>
            <div className="text-[11px] opacity-50 mb-2">PNG/JPG/SVG • حداکثر ۱ مگابایت • در گزارش‌های چاپی نمایش می‌یابد</div>
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
              <button type="button" className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>
                <Plus size={14} /> {logo ? 'تعویض لوگو' : 'بارگذاری لوگو'}
              </button>
              {logo && (
                <button type="button" className="btn btn-ghost btn-sm text-error" onClick={clearLogo}>
                  <Trash2 size={14} /> حذف
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div id="print-company" className="space-y-3">
        {fields.map(f => (
          <div key={f.key}>
            <label className="label"><span className="label-text text-xs font-medium">{f.label} {f.required && <span className="text-error">*</span>}</span></label>
            <label className="input input-bordered flex items-center gap-2 transition-all focus-within:ring-2 focus-within:ring-primary/20">
              <span className="opacity-30">{f.icon}</span>
              <input className="grow" placeholder={f.ph} value={form[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
            </label>
          </div>
        ))}
      </div>
      <button className="btn btn-primary w-full shadow-lg shadow-primary/20" onClick={() => onSave(form)}>
        <CheckCircle size={16} /> ذخیره اطلاعات
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════
   INCOME TAB — WITH SEARCH
   ═══════════════════════════════════════ */
const IncomeTab: React.FC<{ incomes: Income[]; onAdd: (i: Omit<Income, 'id'>) => void; onDel: (id: number) => void; calc: any }> = ({ incomes, onAdd, onDel, calc }) => {
  const [cat, setCat] = useState(CATS[0]);
  const [desc, setDesc] = useState('');
  const [amt, setAmt] = useState('');
  const [q, setQ] = useState(1);
  const [date, setDate] = useState(today());
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const filtered = incomes.filter(inc => {
    if (search && !inc.description.includes(search)) return false;
    if (filterCat && inc.category !== filterCat) return false;
    return true;
  });

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
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-success/20 to-primary/10 flex items-center justify-center text-success"><TrendingUp size={20} /></div>
          <div>
            <h2 className="font-bold">ثبت درآمد</h2>
            <p className="text-xs opacity-40">درآمدها را به تفکیک دسته و ربع ثبت کنید</p>
          </div>
        </div>
        <PrintBtn sectionId="print-income" title="لیست درآمدها" />
      </div>

      {/* Add Form */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body p-4 gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label py-1"><span className="label-text text-xs font-medium">دسته‌بندی</span></label>
              <select className="select select-bordered w-full select-sm" value={cat} onChange={e => setCat(e.target.value)}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs font-medium">ربع مالی</span></label>
              <select className="select select-bordered w-full select-sm" value={q} onChange={e => setQ(Number(e.target.value))}>
                {[1,2,3,4].map(n => <option key={n} value={n}>ربع {n}</option>)}
              </select>
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs font-medium">شرح <span className="text-error">*</span></span></label>
              <input className="input input-bordered w-full input-sm" placeholder="شرح درآمد" value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs font-medium">مبلغ (؋) <span className="text-error">*</span></span></label>
              <input className="input input-bordered w-full input-sm" placeholder="0" type="number" min="0" value={amt} onChange={e => setAmt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs font-medium">تاریخ</span></label>
              <input className="input input-bordered w-full input-sm" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          {err && <div className="alert alert-error py-1 text-xs"><AlertTriangle size={12} /> {err}</div>}
          <button className="btn btn-primary btn-sm shadow-sm" onClick={handleAdd}><Plus size={14} /> ثبت درآمد</button>
        </div>
      </div>

      <div id="print-income">
        {/* Search & Filter */}
        {incomes.length > 2 && (
          <div className="flex flex-wrap gap-2 mb-4 no-print">
            <label className="input input-bordered input-sm flex items-center gap-2 flex-1 min-w-[150px]">
              <Search size={14} className="opacity-30" />
              <input className="grow" placeholder="جستجو..." value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setSearch('')}><X size={12} /></button>}
            </label>
            <select className="select select-bordered select-sm" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">همه دسته‌ها</option>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* Category chips */}
        {calc.byCategory.some((c: any) => c.amount > 0) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {calc.byCategory.filter((c: any) => c.amount > 0).map((c: any) => (
              <div key={c.category} className="badge badge-lg gap-2 py-3 shadow-sm">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                <span className="text-xs opacity-50">{c.category}</span>
                <span className="font-bold">{fmt(c.amount)} ؋</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center px-1 mb-4">
          <span className="opacity-50 text-sm">{filtered.length} درآمد {search || filterCat ? '(فیلتر شده)' : ''}</span>
          <span className="font-bold text-lg text-success">{fmt(calc.totalIncome)} ؋</span>
        </div>

        {filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead><tr><th>#</th><th>دسته</th><th>شرح</th><th>ربع</th><th>مبلغ</th><th className="no-print"></th></tr></thead>
              <tbody>
                {filtered.map((inc, idx) => (
                  <tr key={inc.id} className="hover">
                    <td className="opacity-30">{idx + 1}</td>
                    <td><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[CATS.indexOf(inc.category)] || '#888' }} /><span className="text-xs opacity-50">{inc.category}</span></div></td>
                    <td>{inc.description}</td>
                    <td className="text-xs">ربع {inc.quarter}</td>
                    <td className="font-semibold">{fmt(inc.amount)} ؋</td>
                    <td className="no-print"><button className="btn btn-ghost btn-xs text-error opacity-40 hover:opacity-100" onClick={() => onDel(inc.id)}><Trash2 size={12} /></button></td>
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
  const [search, setSearch] = useState('');

  const filtered = employees.filter(e => !search || e.name.includes(search) || e.position.includes(search));

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
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-info/20 to-primary/10 flex items-center justify-center text-info"><Users size={20} /></div>
          <div>
            <h2 className="font-bold">مدیریت کارمندان</h2>
            <p className="text-xs opacity-40">معاش و بیمه کارمندان</p>
          </div>
        </div>
        <PrintBtn sectionId="print-employees" title="لیست کارمندان و مالیات معاش" />
      </div>

      <div className="card bg-base-200 shadow-sm">
        <div className="card-body p-4 gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label py-1"><span className="label-text text-xs font-medium">نام <span className="text-error">*</span></span></label>
              <input className="input input-bordered w-full input-sm" placeholder="نام کارمند" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs font-medium">وظیفه</span></label>
              <input className="input input-bordered w-full input-sm" placeholder="عنوان شغل" value={pos} onChange={e => setPos(e.target.value)} />
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs font-medium">معاش ماهانه (؋) <span className="text-error">*</span></span></label>
              <input className="input input-bordered w-full input-sm" placeholder="0" type="number" min="0" value={sal} onChange={e => setSal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs font-medium">بیمه ماهانه (؋)</span></label>
              <input className="input input-bordered w-full input-sm" placeholder="0" type="number" min="0" value={ins} onChange={e => setIns(e.target.value)} />
            </div>
          </div>
          {err && <div className="alert alert-error py-1 text-xs"><AlertTriangle size={12} /> {err}</div>}
          <button className="btn btn-primary btn-sm shadow-sm" onClick={handleAdd}><Plus size={14} /> ثبت کارمند</button>
        </div>
      </div>

      <div id="print-employees">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="card bg-base-200"><div className="card-body p-3 text-center">
            <div className="text-[10px] opacity-30">تعداد</div>
            <div className="font-black text-lg">{employees.length}</div>
          </div></div>
          <div className="card bg-base-200"><div className="card-body p-3 text-center">
            <div className="text-[10px] opacity-30">معاش سالانه</div>
            <div className="font-bold text-sm">{fmt(calc.totalSalaries)} ؋</div>
          </div></div>
          <div className="card bg-base-200"><div className="card-body p-3 text-center">
            <div className="text-[10px] opacity-30">مالیات سالانه</div>
            <div className="font-bold text-sm text-error">{fmt(calc.totalSalaryTax)} ؋</div>
          </div></div>
        </div>

        {/* Search */}
        {employees.length > 2 && (
          <label className="input input-bordered input-sm flex items-center gap-2 mb-4 no-print">
            <Search size={14} className="opacity-30" />
            <input className="grow" placeholder="جستجوی کارمند..." value={search} onChange={e => setSearch(e.target.value)} />
          </label>
        )}

        {filtered.map(e => (
          <div key={e.id} className="card bg-base-200 mb-3 hover:shadow-md transition-shadow">
            <div className="card-body p-4 flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="avatar placeholder">
                  <div className="bg-gradient-to-br from-primary to-secondary text-primary-content w-10 rounded-full shadow-sm">
                    <span className="text-sm font-bold">{e.name.charAt(0)}</span>
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-sm">{e.name}</div>
                  <div className="text-xs opacity-30">{e.position}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-end">
                <div className="text-left">
                  <div className="font-bold text-sm">{fmt(e.salary)} ؋</div>
                  <div className="text-[10px] opacity-30">مالیات: {fmt(calcSalaryTax(e.salary))} ؋/ماه</div>
                </div>
                <span className="badge badge-primary badge-outline badge-sm">{taxBracketLabel(e.salary)}</span>
                <button className="btn btn-ghost btn-xs text-error opacity-30 hover:opacity-100 no-print" onClick={() => onDel(e.id)}><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        ))}

        {/* Tax brackets */}
        <div className="card bg-base-200 mt-4">
          <div className="card-body p-4">
            <h4 className="font-medium text-sm mb-2 opacity-60">جدول نرخ مالیات معاش (سالانه)</h4>
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

  const byType = DED_TYPES.map((t, i) => ({ type: t, total: deductions.filter(d => d.type === t).reduce((s, d) => s + d.amount, 0), color: CAT_COLORS[i] })).filter(t => t.total > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-warning/20 to-error/10 flex items-center justify-center text-warning"><Receipt size={20} /></div>
          <div>
            <h2 className="font-bold">کسورات و هزینه‌ها</h2>
            <p className="text-xs opacity-40">هزینه‌ها و معافیت‌های قانونی</p>
          </div>
        </div>
        <PrintBtn sectionId="print-deductions" title="لیست کسورات و هزینه‌ها" />
      </div>

      <div className="card bg-base-200 shadow-sm">
        <div className="card-body p-4 gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label py-1"><span className="label-text text-xs font-medium">نوع</span></label>
              <select className="select select-bordered w-full select-sm" value={type} onChange={e => setType(e.target.value)}>
                {DED_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs font-medium">شرح <span className="text-error">*</span></span></label>
              <input className="input input-bordered w-full input-sm" placeholder="شرح کسر" value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
            <div>
              <label className="label py-1"><span className="label-text text-xs font-medium">مبلغ (؋) <span className="text-error">*</span></span></label>
              <input className="input input-bordered w-full input-sm" placeholder="0" type="number" min="0" value={amt} onChange={e => setAmt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
          </div>
          {err && <div className="alert alert-error py-1 text-xs"><AlertTriangle size={12} /> {err}</div>}
          <button className="btn btn-primary btn-sm shadow-sm" onClick={handleAdd}><Plus size={14} /> ثبت کسر</button>
        </div>
      </div>

      <div id="print-deductions">
        {byType.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {byType.map(t => (
              <div key={t.type} className="badge badge-lg gap-2 py-3 shadow-sm">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                <span className="text-xs opacity-50">{t.type}</span>
                <span className="font-bold">{fmt(t.total)} ؋</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center px-1 mb-4">
          <span className="opacity-50 text-sm">{deductions.length} کسر</span>
          <span className="font-bold text-lg">{fmt(calc.totalDeductions)} ؋</span>
        </div>

        {deductions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead><tr><th>#</th><th>نوع</th><th>شرح</th><th>مبلغ</th><th className="no-print"></th></tr></thead>
              <tbody>
                {deductions.map((d, idx) => (
                  <tr key={d.id} className="hover">
                    <td className="opacity-30">{idx + 1}</td>
                    <td className="text-xs opacity-50">{d.type}</td>
                    <td>{d.description}</td>
                    <td className="font-semibold">{fmt(d.amount)} ؋</td>
                    <td className="no-print"><button className="btn btn-ghost btn-xs text-error opacity-30 hover:opacity-100" onClick={() => onDel(d.id)}><Trash2 size={12} /></button></td>
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
      <div className="bg-base-100 p-6 sm:p-8 text-sm" dir="rtl">
        <div className="flex gap-2 mb-6 no-print">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowPrint(false)}><ArrowLeft size={14} /> بازگشت</button>
          <button className="btn btn-primary btn-sm shadow-sm" onClick={() => window.print()}><Printer size={14} /> چاپ / PDF</button>
        </div>

        <div className="text-center mb-8 pb-5 border-b-2 border-base-300">
          <div className="text-xs opacity-30 mb-2">بسم الله الرحمن الرحیم</div>
          <h1 className="text-2xl font-black mb-1">گزارش تصفیه مالیاتی</h1>
          <h2 className="text-lg font-bold text-primary">{company.name || '[نام شرکت]'}</h2>
          <div className="opacity-40 mt-2 text-sm">دوره مالی: {company.fiscalStart} الی {company.fiscalEnd}</div>
          <div className="flex justify-center gap-8 text-xs mt-3 opacity-30">
            {company.tin && <span>TIN: {company.tin}</span>}
            {company.license && <span>جواز: {company.license}</span>}
            {company.phone && <span>تلفن: {company.phone}</span>}
          </div>
        </div>

        <div className="mb-8 p-5 bg-base-200 rounded-2xl text-justify leading-8 opacity-70">{introText}</div>

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
        ) : <p className="opacity-30 mb-8 text-sm">کارمندی ثبت نشده</p>}

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

        <h3 className="font-bold mb-3 pb-2 border-b border-base-300 flex items-center gap-2">
          <span className="badge badge-primary badge-sm">{deductions.length > 0 ? '۵' : '۴'}</span> جمع‌بندی نهایی
        </h3>
        <div className="bg-base-200 rounded-2xl p-5 mb-8">
          <table className="table table-sm w-full">
            <tbody>
              <tr><td className="font-medium">الف) مجموع درآمد</td><td className="text-left font-bold">{fmt(calc.totalIncome)} ؋</td></tr>
              <tr><td className="opacity-50">ب) کسورات</td><td className="text-left">({fmt(calc.totalDeductions)}) ؋</td></tr>
              <tr><td className="opacity-50">ج) معاشات</td><td className="text-left">({fmt(calc.totalSalaries)}) ؋</td></tr>
              <tr><td className="opacity-50">د) بیمه</td><td className="text-left">({fmt(calc.totalInsurance)}) ؋</td></tr>
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
            <span className="font-black text-2xl text-error">{fmt(calc.totalTax)} ؋</span>
          </div>
          <div className="text-xs opacity-30 mt-1 text-left">نرخ مؤثر: {fmtPct(calc.effectiveRate)}</div>
        </div>

        <div className="grid grid-cols-3 gap-8 text-center text-sm mt-12">
          {[
            { title: 'تهیه‌کننده', sub: company.manager },
            { title: 'مهر شرکت', sub: company.name },
            { title: 'تأیید مستوفیت', sub: '' },
          ].map((s, i) => (
            <div key={i}>
              <div className="h-16" />
              <div className="border-t border-base-300 pt-3 opacity-50">{s.title}</div>
              {s.sub && <div className="text-xs opacity-30 mt-1">{s.sub}</div>}
            </div>
          ))}
        </div>

        <div className="text-center text-xs opacity-20 mt-10 pt-3 border-t border-base-300">
          سیستم حسابداری مالیاتی صرافی — {new Date().toLocaleDateString('fa-AF')} — طراحی: منوچهر نورانی — 📞 0744173723
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-error/20 to-warning/10 flex items-center justify-center text-error"><FileText size={20} /></div>
        <div>
          <h2 className="font-bold">گزارش مالیاتی</h2>
          <p className="text-xs opacity-40">گزارش رسمی جهت ارائه به مستوفیت</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card bg-gradient-to-br from-success/10 to-base-200"><div className="card-body p-4">
          <div className="text-xs opacity-40">مجموع درآمد</div>
          <AnimNum value={calc.totalIncome} className="font-black text-xl text-success" />
        </div></div>
        <div className="card bg-gradient-to-br from-error/10 to-base-200"><div className="card-body p-4">
          <div className="text-xs opacity-40">مالیات کل</div>
          <AnimNum value={calc.totalTax} className="font-black text-xl text-error" />
        </div></div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body p-5 gap-2 text-sm">
          <div className="flex justify-between"><span className="opacity-50">مجموع درآمد</span><span className="font-bold">{fmt(calc.totalIncome)} ؋</span></div>
          <div className="flex justify-between"><span className="opacity-30">کسورات</span><span className="opacity-50">- {fmt(calc.totalDeductions)} ؋</span></div>
          <div className="flex justify-between"><span className="opacity-30">معاشات</span><span className="opacity-50">- {fmt(calc.totalSalaries)} ؋</span></div>
          <div className="flex justify-between"><span className="opacity-30">بیمه</span><span className="opacity-50">- {fmt(calc.totalInsurance)} ؋</span></div>
          <div className="divider my-0" />
          <div className="flex justify-between font-bold"><span>عواید خالص</span><span>{fmt(calc.netIncome)} ؋</span></div>
          <div className="divider my-0" />
          <div className="flex justify-between text-xs"><span className="opacity-40">انتفاعی ۴٪</span><span>{fmt(calc.quarterlyTaxTotal)} ؋</span></div>
          <div className="flex justify-between text-xs"><span className="opacity-40">عواید ۲۰٪</span><span>{fmt(calc.annualTax)} ؋</span></div>
          <div className="flex justify-between text-xs"><span className="opacity-40">مالیات معاش</span><span>{fmt(calc.totalSalaryTax)} ؋</span></div>
          <div className="divider my-0" />
          <div className="flex justify-between font-bold text-lg">
            <span>مجموع مالیات</span>
            <span className="text-error">{fmt(calc.totalTax)} ؋</span>
          </div>
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body p-4 text-sm text-justify leading-7 opacity-50">
          <div className="text-xs font-medium opacity-50 mb-2">متن مقدمه گزارش</div>
          {introText}
        </div>
      </div>

      {calc.warnings.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {calc.warnings.map((w: string, i: number) => (
            <div key={i} className="badge badge-warning badge-outline gap-1 py-2 text-xs">
              <AlertTriangle size={10} /> {w}
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-primary w-full shadow-lg shadow-primary/20" onClick={() => setShowPrint(true)}>
        <Printer size={16} /> مشاهده و چاپ گزارش رسمی
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════
   QUARTERLY REPORT TAB
   ═══════════════════════════════════════ */
const QuarterlyReportTab: React.FC<{
  company: Company; incomes: Income[]; deductions: Deduction[]; employees: Employee[];
}> = ({ company, incomes, deductions, employees }) => {
  const [qFilter, setQFilter] = useState<'all' | 1 | 2 | 3 | 4>('all');
  const [branchFilter, setBranchFilter] = useState('');
  const [search, setSearch] = useState('');

  const monthlySalaryTax = useMemo(
    () => employees.reduce((s, e) => s + calcSalaryTax(e.salary), 0),
    [employees]
  );

  const filteredIncomes = useMemo(() => {
    const s = search.trim().toLowerCase();
    const b = branchFilter.trim().toLowerCase();
    return incomes.filter(i =>
      (qFilter === 'all' || i.quarter === qFilter) &&
      (!s || i.description.toLowerCase().includes(s) || i.category.toLowerCase().includes(s)) &&
      (!b || i.description.toLowerCase().includes(b))
    );
  }, [incomes, qFilter, branchFilter, search]);

  const rows = useMemo(() => {
    const quarters = qFilter === 'all' ? [1, 2, 3, 4] : [qFilter as number];
    const totalDed = deductions.reduce((s, d) => s + d.amount, 0);
    return quarters.map(q => {
      const qIncomes = filteredIncomes.filter(i => i.quarter === q);
      const income = qIncomes.reduce((s, i) => s + i.amount, 0);
      // distribute deductions & salary equally per quarter (4)
      const ded = totalDed / 4;
      const salTax = monthlySalaryTax * 3; // 3 months per quarter
      const net = income - ded;
      const profitTax = Math.max(0, net) * 0.04;
      const totalTax = profitTax + salTax;
      return { quarter: q, income, ded, net, profitTax, salTax, totalTax, count: qIncomes.length };
    });
  }, [filteredIncomes, deductions, monthlySalaryTax, qFilter]);

  const totals = rows.reduce(
    (a, r) => ({
      income: a.income + r.income, ded: a.ded + r.ded, net: a.net + r.net,
      profitTax: a.profitTax + r.profitTax, salTax: a.salTax + r.salTax, totalTax: a.totalTax + r.totalTax,
    }),
    { income: 0, ded: 0, net: 0, profitTax: 0, salTax: 0, totalTax: 0 }
  );

  const reportTitle = `گزارش ربع‌وار مالیات و سود خالص — ${company.name || 'شرکت'}`;
  const filterLabel = qFilter === 'all' ? 'تمام ربع‌ها' : `ربع ${qFilter}`;

  const exportExcel = () => {
    const header = ['ربع', 'تعداد رکورد', 'درآمد (؋)', 'کسورات (؋)', 'سود خالص (؋)', 'مالیات ۴٪ (؋)', 'مالیات معاش (؋)', 'مجموع مالیات (؋)'];
    const lines = [
      [reportTitle], [`فیلتر: ${filterLabel}`, branchFilter ? `شعبه: ${branchFilter}` : '', search ? `جستجو: ${search}` : ''].filter(Boolean) as string[],
      [`تاریخ تولید: ${nowStr()}`], [],
      header,
      ...rows.map(r => [`ربع ${r.quarter}`, r.count, Math.round(r.income), Math.round(r.ded), Math.round(r.net), Math.round(r.profitTax), Math.round(r.salTax), Math.round(r.totalTax)]),
      ['مجموع', filteredIncomes.length, Math.round(totals.income), Math.round(totals.ded), Math.round(totals.net), Math.round(totals.profitTax), Math.round(totals.salTax), Math.round(totals.totalTax)],
    ];
    const csv = lines.map(row => row.map(c => {
      const v = String(c ?? '');
      return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',')).join('\n');
    // BOM for Excel UTF-8 + RTL
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quarterly-report-${qFilter}-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    const tableRows = rows.map(r => `
      <tr>
        <td>ربع ${r.quarter}</td><td>${r.count}</td>
        <td>${fmt(r.income)}</td><td>${fmt(r.ded)}</td>
        <td>${fmt(r.net)}</td><td>${fmt(r.profitTax)}</td>
        <td>${fmt(r.salTax)}</td><td><b>${fmt(r.totalTax)}</b></td>
      </tr>`).join('');
    w.document.write(`<!doctype html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>${reportTitle}</title>
      <style>
        body{font-family:Tahoma,Vazirmatn,sans-serif;padding:24px;color:#111}
        h1{margin:0 0 4px;font-size:18px}
        .meta{font-size:11px;color:#666;margin-bottom:14px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #999;padding:6px 8px;text-align:right}
        thead{background:#f0f0f0}
        tfoot td{background:#fafafa;font-weight:bold}
        .sig{display:flex;justify-content:space-between;margin-top:60px;font-size:11px;color:#555}
        .sig div{width:30%;border-top:1px solid #999;padding-top:6px;text-align:center}
      </style></head><body>
      <h1>${reportTitle}</h1>
      <div class="meta">
        دوره: ${company.fiscalStart || ''} الی ${company.fiscalEnd || ''} •
        فیلتر: ${filterLabel} ${branchFilter ? ' • شعبه: ' + branchFilter : ''} ${search ? ' • جستجو: ' + search : ''} •
        تاریخ تولید: ${nowStr()}
      </div>
      <table>
        <thead><tr>
          <th>ربع</th><th>تعداد</th><th>درآمد (؋)</th><th>کسورات (؋)</th>
          <th>سود خالص (؋)</th><th>مالیات ۴٪</th><th>مالیات معاش</th><th>مجموع مالیات</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
        <tfoot><tr>
          <td>مجموع</td><td>${filteredIncomes.length}</td>
          <td>${fmt(totals.income)}</td><td>${fmt(totals.ded)}</td>
          <td>${fmt(totals.net)}</td><td>${fmt(totals.profitTax)}</td>
          <td>${fmt(totals.salTax)}</td><td>${fmt(totals.totalTax)}</td>
        </tr></tfoot>
      </table>
      <div class="sig"><div>تهیه‌کننده<br/>${company.manager || ''}</div><div>مهر شرکت<br/>${company.name || ''}</div><div>تأیید مستوفیت</div></div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-info/10 flex items-center justify-center text-primary"><PieChart size={20} /></div>
        <div>
          <h2 className="font-bold">گزارش ربع‌وار مالیات و سود خالص</h2>
          <p className="text-xs opacity-40">فیلتر بر اساس ربع، شرکت و شعبه + خروجی PDF و Excel</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card bg-base-200">
        <div className="card-body p-4 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs opacity-50 flex items-center gap-1"><Filter size={12} /> ربع:</span>
            {(['all', 1, 2, 3, 4] as const).map(q => (
              <button key={String(q)}
                className={`btn btn-xs ${qFilter === q ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setQFilter(q)}>
                {q === 'all' ? 'همه' : `ربع ${q}`}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="input input-sm input-bordered flex items-center gap-2">
              <Building2 size={12} className="opacity-50" />
              <input className="grow" disabled value={company.name || 'شرکت تعیین نشده'} />
            </label>
            <label className="input input-sm input-bordered flex items-center gap-2">
              <Landmark size={12} className="opacity-50" />
              <input className="grow" placeholder="فیلتر شعبه (در شرح)" value={branchFilter} onChange={e => setBranchFilter(e.target.value)} />
            </label>
            <label className="input input-sm input-bordered flex items-center gap-2">
              <Search size={12} className="opacity-50" />
              <input className="grow" placeholder="جستجو در شرح/دسته" value={search} onChange={e => setSearch(e.target.value)} />
            </label>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button className="btn btn-sm btn-primary gap-1" onClick={exportPDF}><Printer size={14} /> خروجی PDF</button>
            <button className="btn btn-sm btn-success gap-1" onClick={exportExcel}><Download size={14} /> خروجی Excel</button>
            <button className="btn btn-sm btn-ghost gap-1 mr-auto" onClick={() => { setQFilter('all'); setBranchFilter(''); setSearch(''); }}>
              <RefreshCw size={14} /> پاک‌سازی
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { l: 'درآمد', v: totals.income, c: 'text-success' },
          { l: 'سود خالص', v: totals.net, c: totals.net >= 0 ? 'text-info' : 'text-error' },
          { l: 'مالیات انتفاعی ۴٪', v: totals.profitTax, c: 'text-warning' },
          { l: 'مجموع مالیات', v: totals.totalTax, c: 'text-error' },
        ].map((k, i) => (
          <div key={i} className="card bg-base-200"><div className="card-body p-3">
            <div className="text-xs opacity-40">{k.l}</div>
            <div className={`font-black text-lg ${k.c}`}>{fmt(k.v)} ؋</div>
          </div></div>
        ))}
      </div>

      {/* Quarter table */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-3 overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>ربع</th><th>تعداد</th><th>درآمد</th><th>کسورات</th>
                <th>سود خالص</th><th>مالیات ۴٪</th><th>مالیات معاش</th><th>مجموع مالیات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.quarter}>
                  <td className="font-bold">ربع {r.quarter}</td>
                  <td>{r.count}</td>
                  <td>{fmt(r.income)}</td>
                  <td>{fmt(r.ded)}</td>
                  <td className={r.net >= 0 ? 'text-info' : 'text-error'}>{fmt(r.net)}</td>
                  <td>{fmt(r.profitTax)}</td>
                  <td>{fmt(r.salTax)}</td>
                  <td className="font-bold text-error">{fmt(r.totalTax)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="text-center opacity-40 py-6">رکوردی برای فیلتر انتخاب‌شده نیست</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="font-bold bg-base-200">
                <td>مجموع</td>
                <td>{filteredIncomes.length}</td>
                <td>{fmt(totals.income)}</td>
                <td>{fmt(totals.ded)}</td>
                <td>{fmt(totals.net)}</td>
                <td>{fmt(totals.profitTax)}</td>
                <td>{fmt(totals.salTax)}</td>
                <td className="text-error">{fmt(totals.totalTax)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Income details for selected quarter */}
      {qFilter !== 'all' && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-3 overflow-x-auto">
            <div className="text-xs opacity-60 mb-2">جزئیات درآمدها — ربع {qFilter} ({filteredIncomes.length} رکورد)</div>
            <table className="table table-xs">
              <thead><tr><th>#</th><th>تاریخ</th><th>دسته</th><th>شرح</th><th>مبلغ</th></tr></thead>
              <tbody>
                {filteredIncomes.map((i, idx) => (
                  <tr key={i.id}><td>{idx + 1}</td><td>{i.date}</td><td>{i.category}</td><td>{i.description}</td><td className="font-medium">{fmt(i.amount)} ؋</td></tr>
                ))}
                {filteredIncomes.length === 0 && <tr><td colSpan={5} className="text-center opacity-30 py-4">بدون رکورد</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-secondary/20 to-primary/10 flex items-center justify-center text-secondary"><ScrollText size={20} /></div>
          <div>
            <h2 className="font-bold">لاگ فعالیت‌ها</h2>
            <p className="text-xs opacity-40">تاریخچه تمام عملیات‌ها</p>
          </div>
        </div>
        <div className="flex gap-2">
          <PrintBtn sectionId="print-logs" title="لاگ فعالیت‌های سیستم" />
          {logs.length > 0 && (
            <button className="btn btn-ghost btn-sm text-error gap-1 opacity-60 hover:opacity-100" onClick={onClear}>
              <Trash2 size={14} /> پاک‌سازی
            </button>
          )}
        </div>
      </div>

      <div id="print-logs">
        {logs.length === 0 ? (
          <div className="text-center py-16 opacity-30">
            <ScrollText size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium">هنوز فعالیتی ثبت نشده</p>
            <p className="text-xs mt-1">با ثبت درآمد، کارمند یا کسورات، لاگ اینجا نمایش داده می‌شود</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="card bg-base-200 hover:shadow-sm transition-shadow">
                <div className="card-body p-3 flex-row items-center gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                    <Clock size={12} className="opacity-20 shrink-0" />
                    <span className="text-xs opacity-30 shrink-0 font-mono" dir="ltr">{log.timestamp}</span>
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
        <div className="text-center text-xs opacity-20">
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

export default App;
