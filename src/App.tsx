import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import {
  LayoutDashboard, Building2, TrendingUp, Users, FileText,
  ClipboardList, LogOut, ChevronDown, Plus, Trash2, ArrowRight,
  CheckCircle, AlertTriangle as AlertIcon, Info, X,
} from 'lucide-react';
import { Company, IncomeEntry, Employee, Deduction, TabId, TaxSummary } from './types';
import { calcTaxSummary } from './utils/taxCalc';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { CompanyInfo } from './components/CompanyInfo';
import { Income } from './components/Income';
import { Employees } from './components/Employees';
import { Deductions } from './components/Deductions';
import { TaxReport } from './components/TaxReport';

/* ── Toast System ──────────────────────────────────────────────────────── */
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });
export const useToast = () => useContext(ToastContext);

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => {
        const colors = {
          success: { bg: 'rgba(16,185,129,0.95)', icon: <CheckCircle size={16} /> },
          error: { bg: 'rgba(239,68,68,0.95)', icon: <AlertIcon size={16} /> },
          info: { bg: 'rgba(99,102,241,0.95)', icon: <Info size={16} /> },
        };
        const c = colors[t.type];
        return (
          <div key={t.id} style={{
            background: c.bg, color: '#fff', padding: '10px 20px',
            borderRadius: 12, fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)',
            animation: 'slideDown 0.3s ease-out',
            pointerEvents: 'auto',
          }}>
            {c.icon}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button onClick={() => onRemove(t.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 2, display: 'flex' }}>
              <X size={14} />
            </button>
          </div>
        );
      })}
      <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

/* ── localStorage helpers ──────────────────────────────────────────────── */
const LS_AUTH       = 'sarafi_auth';
const LS_COMPANIES  = 'sarafi_companies';
const LS_ACTIVE_CO  = 'sarafi_active_company';
const LS_INCOMES    = 'sarafi_incomes';
const LS_EMPLOYEES  = 'sarafi_employees';
const LS_DEDUCTIONS = 'sarafi_deductions';

function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function saveLS<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}
function genId(): string {
  return 'co_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function nextNumId(items: { id: number }[]): number {
  return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
}

function makeNewCompany(): Company {
  return {
    id: genId(), name: '', license_no: '', tin: '', address: '', phone: '',
    period_start: '', period_end: '', year: 1403,
  };
}

/* ── Tab definition ────────────────────────────────────────────────────── */
interface TabDef { id: TabId; label: string; icon: React.ReactNode; }
const TABS: TabDef[] = [
  { id: 'dashboard',  label: 'داشبورد',  icon: <LayoutDashboard size={15} /> },
  { id: 'company',    label: 'شرکت‌ها',  icon: <Building2 size={15} /> },
  { id: 'income',     label: 'درآمدها',  icon: <TrendingUp size={15} /> },
  { id: 'employees',  label: 'کارمندان', icon: <Users size={15} /> },
  { id: 'deductions', label: 'کسورات',   icon: <FileText size={15} /> },
  { id: 'report',     label: 'گزارش',    icon: <ClipboardList size={15} /> },
];

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

/* ══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  /* ── Toast state ── */
  const [toasts, setToasts] = useState<Toast[]>([]);
  let toastIdRef = 0;
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);
  const removeToast = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  /* ── Auth ── */
  const [loggedIn, setLoggedIn] = useState<boolean>(() => loadLS(LS_AUTH, false));

  /* ── Multi-company state ── */
  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = loadLS<Company[]>(LS_COMPANIES, []);
    if (saved.length === 0) {
      const first = makeNewCompany();
      return [first];
    }
    return saved;
  });
  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => {
    const saved = loadLS<string>(LS_ACTIVE_CO, '');
    const cos = loadLS<Company[]>(LS_COMPANIES, []);
    if (cos.find(c => c.id === saved)) return saved;
    return cos.length > 0 ? cos[0].id : '';
  });

  /* ── Show company selector after login ── */
  const [showCompanySelector, setShowCompanySelector] = useState(false);

  /* ── Data per company ── */
  const [allIncomes, setAllIncomes]       = useState<IncomeEntry[]>(() => loadLS(LS_INCOMES, []));
  const [allEmployees, setAllEmployees]   = useState<Employee[]>(() => loadLS(LS_EMPLOYEES, []));
  const [allDeductions, setAllDeductions] = useState<Deduction[]>(() => loadLS(LS_DEDUCTIONS, []));

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);

  /* ── Persist ── */
  useEffect(() => { saveLS(LS_AUTH, loggedIn); }, [loggedIn]);
  useEffect(() => { saveLS(LS_COMPANIES, companies); }, [companies]);
  useEffect(() => { saveLS(LS_ACTIVE_CO, activeCompanyId); }, [activeCompanyId]);
  useEffect(() => { saveLS(LS_INCOMES, allIncomes); }, [allIncomes]);
  useEffect(() => { saveLS(LS_EMPLOYEES, allEmployees); }, [allEmployees]);
  useEffect(() => { saveLS(LS_DEDUCTIONS, allDeductions); }, [allDeductions]);

  /* ── Derived: current company data ── */
  const company = companies.find(c => c.id === activeCompanyId) || companies[0] || makeNewCompany();
  const incomes    = useMemo(() => allIncomes.filter(i => i.companyId === company.id), [allIncomes, company.id]);
  const employees  = useMemo(() => allEmployees.filter(e => e.companyId === company.id), [allEmployees, company.id]);
  const deductions = useMemo(() => allDeductions.filter(d => d.companyId === company.id), [allDeductions, company.id]);
  const taxSummary: TaxSummary = useMemo(() => calcTaxSummary(incomes, employees, deductions), [incomes, employees, deductions]);

  /* ── Get stats for any company ── */
  const getCompanyStats = useCallback((companyId: string) => {
    const inc = allIncomes.filter(i => i.companyId === companyId);
    const emp = allEmployees.filter(e => e.companyId === companyId);
    const ded = allDeductions.filter(d => d.companyId === companyId);
    return {
      incomeCount: inc.length,
      employeeCount: emp.length,
      deductionCount: ded.length,
      totalIncome: inc.reduce((s, i) => s + i.amount, 0),
    };
  }, [allIncomes, allEmployees, allDeductions]);

  /* ── Company CRUD ── */
  function addNewCompany() {
    const nc = makeNewCompany();
    setCompanies(prev => [...prev, nc]);
    setActiveCompanyId(nc.id);
    setActiveTab('company');
    setShowCompanyMenu(false);
    setShowCompanySelector(false);
    showToast('شرکت جدید اضافه شد', 'success');
  }

  function switchCompany(id: string) {
    setActiveCompanyId(id);
    setShowCompanyMenu(false);
    setShowCompanySelector(false);
  }

  function deleteCompany(id: string) {
    if (companies.length <= 1) return;
    if (!confirm('آیا مطمئن هستید؟ تمام اطلاعات این شرکت حذف خواهد شد.')) return;
    const name = companies.find(c => c.id === id)?.name || 'شرکت';
    setCompanies(prev => prev.filter(c => c.id !== id));
    setAllIncomes(prev => prev.filter(i => i.companyId !== id));
    setAllEmployees(prev => prev.filter(e => e.companyId !== id));
    setAllDeductions(prev => prev.filter(d => d.companyId !== id));
    if (activeCompanyId === id) {
      const remaining = companies.filter(c => c.id !== id);
      setActiveCompanyId(remaining[0]?.id || '');
    }
    setShowCompanyMenu(false);
    showToast(`${name} حذف شد`, 'info');
  }

  function saveCompany(c: Company) {
    setCompanies(prev => prev.map(co => co.id === c.id ? c : co));
    showToast('اطلاعات شرکت ذخیره شد', 'success');
  }

  /* ── Income CRUD ── */
  function addIncome(entry: Omit<IncomeEntry, 'id' | 'companyId'>) {
    setAllIncomes(prev => [...prev, { ...entry, id: nextNumId(prev), companyId: company.id }]);
    showToast('درآمد جدید ثبت شد', 'success');
  }
  function editIncome(id: number, updated: Partial<IncomeEntry>) {
    setAllIncomes(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));
    showToast('درآمد ویرایش شد', 'success');
  }
  function deleteIncome(id: number) {
    setAllIncomes(prev => prev.filter(i => i.id !== id));
    showToast('درآمد حذف شد', 'info');
  }

  /* ── Employee CRUD ── */
  function addEmployee(emp: Omit<Employee, 'id' | 'companyId'>) {
    setAllEmployees(prev => [...prev, { ...emp, id: nextNumId(prev), companyId: company.id }]);
    showToast('کارمند جدید ثبت شد', 'success');
  }
  function editEmployee(id: number, updated: Partial<Employee>) {
    setAllEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updated } : e));
    showToast('اطلاعات کارمند ویرایش شد', 'success');
  }
  function deleteEmployee(id: number) {
    setAllEmployees(prev => prev.filter(e => e.id !== id));
    showToast('کارمند حذف شد', 'info');
  }

  /* ── Deduction CRUD ── */
  function addDeduction(ded: Omit<Deduction, 'id' | 'companyId'>) {
    setAllDeductions(prev => [...prev, { ...ded, id: nextNumId(prev), companyId: company.id }]);
    showToast('کسر جدید ثبت شد', 'success');
  }
  function editDeduction(id: number, updated: Partial<Deduction>) {
    setAllDeductions(prev => prev.map(d => d.id === id ? { ...d, ...updated } : d));
    showToast('کسر ویرایش شد', 'success');
  }
  function deleteDeduction(id: number) {
    setAllDeductions(prev => prev.filter(d => d.id !== id));
    showToast('کسر حذف شد', 'info');
  }

  function handleLogin() {
    setLoggedIn(true);
    if (companies.length > 1) {
      setShowCompanySelector(true);
    }
  }

  function handleLogout() {
    saveLS(LS_AUTH, false);
    setLoggedIn(false);
    setShowCompanySelector(false);
  }

  /* ── Render: Login ── */
  if (!loggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  /* ── Render: Company Selector ── */
  if (showCompanySelector && companies.length > 1) {
    const companyIdx = (idx: number) => GRADIENT_COLORS[idx % GRADIENT_COLORS.length];
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
        <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl" />

        <div className="relative z-10 w-full max-w-3xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-indigo-200/50 rounded-full px-5 py-2 mb-4 shadow-sm">
              <Building2 size={18} className="text-indigo-600" />
              <span className="text-gray-700 text-sm font-medium">سیستم مدیریت مالیاتی صرافی‌ها</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-800 mb-2">شرکت خود را انتخاب کنید</h1>
            <p className="text-gray-400 text-sm">{companies.length} شرکت ثبت شده</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {companies.map((co, idx) => {
              const stats = getCompanyStats(co.id);
              const isActive = co.id === activeCompanyId;
              return (
                <div key={co.id} onClick={() => switchCompany(co.id)}
                  className={`group relative bg-white/80 backdrop-blur-xl border rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                    isActive ? 'border-indigo-400 bg-white shadow-lg shadow-indigo-200/40' : 'border-gray-200 hover:border-indigo-300 hover:bg-white'
                  }`}>
                  {isActive && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-[8px]">✓</span>
                    </div>
                  )}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${companyIdx(idx)} flex items-center justify-center text-white font-black text-lg shadow-lg`}>
                      {(co.name || '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-800 font-bold text-base truncate">{co.name || 'شرکت بدون نام'}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-gray-400 text-xs">سال {co.year}</span>
                        {co.tin && <span className="text-gray-300 text-xs">• TIN: {co.tin}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-indigo-50/80 rounded-lg p-2 text-center">
                      <div className="text-gray-800 font-bold text-sm">{stats.incomeCount}</div>
                      <div className="text-gray-400 text-[9px]">درآمد</div>
                    </div>
                    <div className="bg-indigo-50/80 rounded-lg p-2 text-center">
                      <div className="text-gray-800 font-bold text-sm">{stats.employeeCount}</div>
                      <div className="text-gray-400 text-[9px]">کارمند</div>
                    </div>
                    <div className="bg-indigo-50/80 rounded-lg p-2 text-center">
                      <div className="text-gray-800 font-bold text-sm">{stats.totalIncome.toLocaleString()}</div>
                      <div className="text-gray-400 text-[9px]">درآمد (؋)</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">{co.address || 'آدرس ثبت نشده'}</span>
                    <ArrowRight size={14} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button onClick={addNewCompany} className="btn btn-sm bg-indigo-500 hover:bg-indigo-600 border-indigo-500 text-white gap-1.5 shadow-md">
              <Plus size={14} /> شرکت جدید
            </button>
            <button onClick={() => setShowCompanySelector(false)} className="btn btn-sm btn-ghost text-gray-500 hover:text-indigo-600">
              ادامه با شرکت فعلی
            </button>
          </div>

          <div style={{ textAlign: 'center', padding: '24px 0 0', color: 'rgba(0,0,0,0.25)', fontSize: '10px' }}>
            طراحی و توسعه: <span style={{ fontWeight: 600 }}>Manochehr Norani</span> — تماس: 0744173723
          </div>
        </div>
      </div>
    );
  }

  /* ── Render: Main App ── */
  const activeCoIdx = companies.findIndex(c => c.id === activeCompanyId);
  const activeGradient = GRADIENT_COLORS[activeCoIdx >= 0 ? activeCoIdx % GRADIENT_COLORS.length : 0];

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="min-h-screen bg-base-100" dir="rtl">
        {/* Toast Container */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        {/* ── Header ── */}
        <div className="navbar bg-base-200 border-b border-base-300 px-4 min-h-14">
          <div className="flex-1 gap-2 items-center">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${activeGradient} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
              {(company.name || '🏦')[0]}
            </div>

            <div className="relative">
              <button className="btn btn-ghost btn-sm gap-1 font-bold text-sm"
                onClick={() => setShowCompanyMenu(!showCompanyMenu)}>
                {company.name || 'شرکت بدون نام'}
                <ChevronDown size={14} className={`transition-transform ${showCompanyMenu ? 'rotate-180' : ''}`} />
              </button>

              {showCompanyMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCompanyMenu(false)} />
                  <div className="absolute top-full right-0 mt-1 z-50 bg-base-100 border border-base-300 rounded-xl shadow-2xl min-w-[320px] overflow-hidden">
                    <div className="p-3 border-b border-base-300 bg-base-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-base-content/50 font-medium">شرکت‌ها ({companies.length})</span>
                        <button className="btn btn-primary btn-xs gap-0.5" onClick={addNewCompany}>
                          <Plus size={11} /> جدید
                        </button>
                      </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {companies.map((co, idx) => {
                        const stats = getCompanyStats(co.id);
                        const isActive = co.id === activeCompanyId;
                        return (
                          <div key={co.id}
                            className={`flex items-center gap-3 px-3 py-2.5 hover:bg-base-200 cursor-pointer transition-colors ${
                              isActive ? 'bg-primary/5 border-r-3 border-primary' : ''
                            }`}
                            onClick={() => switchCompany(co.id)}>
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${GRADIENT_COLORS[idx % GRADIENT_COLORS.length]} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                              {(co.name || '?')[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{co.name || 'بدون نام'}</div>
                              <div className="flex items-center gap-2 text-[10px] text-base-content/40">
                                <span>سال {co.year}</span><span>•</span>
                                <span>{stats.employeeCount} کارمند</span><span>•</span>
                                <span>{stats.totalIncome.toLocaleString()} ؋</span>
                              </div>
                            </div>
                            {isActive && <span className="badge badge-primary badge-xs">فعال</span>}
                            {companies.length > 1 && (
                              <button className="btn btn-ghost btn-xs text-error opacity-30 hover:opacity-100"
                                onClick={(e) => { e.stopPropagation(); deleteCompany(co.id); }} title="حذف">
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {companies.length > 1 && (
                      <div className="p-2 border-t border-base-300 bg-base-200">
                        <button className="btn btn-ghost btn-xs w-full text-primary"
                          onClick={() => { setShowCompanySelector(true); setShowCompanyMenu(false); }}>
                          <Building2 size={12} /> نمای کامل شرکت‌ها
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {company.name && <span className="badge badge-primary badge-sm">سال {company.year}</span>}
            {companies.length > 1 && (
              <span className="badge badge-ghost badge-sm hidden md:inline-flex">{companies.length} شرکت</span>
            )}
          </div>
          <div className="flex-none gap-2">
            <span className="text-xs text-base-content/40 hidden md:block">v4.0</span>
            <span className="text-xs text-base-content/40 hidden md:block">|</span>
            <span className="text-xs text-base-content/40 hidden md:block">admin</span>
            <button className="btn btn-ghost btn-sm gap-1" onClick={handleLogout}>
              <LogOut size={14} /> خروج
            </button>
          </div>
        </div>

        {/* ── Tab navigation ── */}
        <div className="bg-base-200 border-b border-base-300 overflow-x-auto">
          <div className="flex px-2 min-w-max">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-base-content/60 hover:text-base-content'
                }`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="p-4 max-w-5xl mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard taxSummary={taxSummary} employeeCount={employees.length} companyName={company.name} />
          )}
          {activeTab === 'company' && (
            <CompanyInfo company={company} companies={companies}
              onSave={saveCompany} onAdd={addNewCompany} onDelete={deleteCompany}
              onSwitch={switchCompany} getCompanyStats={getCompanyStats} />
          )}
          {activeTab === 'income' && (
            <Income incomes={incomes} year={company.year}
              onAdd={addIncome} onEdit={editIncome} onDelete={deleteIncome}
              companyName={company.name} companyLogo={company.logo} />
          )}
          {activeTab === 'employees' && (
            <Employees employees={employees} companyName={company.name} companyLogo={company.logo}
              onAdd={addEmployee} onEdit={editEmployee} onDelete={deleteEmployee} />
          )}
          {activeTab === 'deductions' && (
            <Deductions deductions={deductions} companyName={company.name} companyLogo={company.logo}
              onAdd={addDeduction} onEdit={editDeduction} onDelete={deleteDeduction} />
          )}
          {activeTab === 'report' && (
            <TaxReport company={company} taxSummary={taxSummary} employeeCount={employees.length} employees={employees} deductions={deductions} />
          )}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center', padding: '16px 0 24px',
          color: '#6b7280', fontSize: '11px', lineHeight: '1.8',
          borderTop: '1px solid #e5e7eb', marginTop: '32px',
        }}>
          <div>سیستم مدیریت مالیاتی صرافی‌ها — نسخه ۴٫۰</div>
          <div style={{ marginTop: '4px', fontSize: '10px', color: '#9ca3af' }}>
            طراحی و توسعه: <span style={{ fontWeight: 600 }}>Manochehr Norani</span> — تماس: 0744173723
          </div>
        </div>
      </div>
    </ToastContext.Provider>
  );
}
