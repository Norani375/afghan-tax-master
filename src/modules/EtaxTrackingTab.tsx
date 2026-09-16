import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, RefreshCw, Save, Send, History, Search, AlertCircle,
  CheckCircle2, Clock, XCircle, Link2,
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';

interface Props {
  onFlash?: (m: string) => void;
  onLog?: (action: string, detail: string) => void;
}

interface Decl {
  id: string;
  declaration_no: string;
  declaration_type: 'import' | 'export';
  customs_office: string;
  declaration_date: string;
  importer_tin: string | null;
  total_tax: number;
  payment_status: string;
  etax_ref_no: string | null;
  etax_status: string;
  etax_submitted_at: string | null;
  etax_clearance_no: string | null;
  etax_cleared_at: string | null;
  etax_last_message: string | null;
  etax_synced_at: string | null;
}

interface Ev {
  id: string;
  declaration_id: string;
  status: string;
  ref_no: string | null;
  source: string;
  message: string | null;
  created_at: string;
}

const STATUSES: { key: string; label: string; cls: string; icon: React.ReactNode }[] = [
  { key: 'draft', label: 'پیش‌نویس', cls: 'badge-ghost', icon: <Clock size={12} /> },
  { key: 'submitted', label: 'ارسال‌شده به E-Tax', cls: 'badge-info', icon: <Send size={12} /> },
  { key: 'under_review', label: 'در حال بررسی', cls: 'badge-warning', icon: <Clock size={12} /> },
  { key: 'approved', label: 'تأیید‌شده', cls: 'badge-success', icon: <CheckCircle2 size={12} /> },
  { key: 'rejected', label: 'رد‌شده', cls: 'badge-error', icon: <XCircle size={12} /> },
  { key: 'cleared', label: 'تصفیه‌شده', cls: 'badge-primary', icon: <ShieldCheck size={12} /> },
];

const statusMeta = (k: string) => STATUSES.find(s => s.key === k) || STATUSES[0];
const fmt = (n: number) => Math.round(n || 0).toLocaleString('fa-AF');
const dt = (s: string | null) => (s ? new Date(s).toLocaleString('fa-AF') : '—');
const today = () => new Date().toISOString().slice(0, 10);

const EtaxTrackingTab: React.FC<Props> = ({ onFlash, onLog }) => {
  const [items, setItems] = useState<Decl[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  const [settings, setSettings] = useState({ base_url: '', taxpayer_id: '', enabled: false, notes: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [draft, setDraft] = useState<Record<string, { status: string; ref_no: string; clearance_no: string; cleared_at: string; message: string }>>({});

  const flash = (m: string) => onFlash?.(m);

  const load = async () => {
    setLoading(true);
    try {
      const [d, e, s] = await Promise.all([
        supabase.from('customs_declarations')
          .select('id, declaration_no, declaration_type, customs_office, declaration_date, importer_tin, total_tax, payment_status, etax_ref_no, etax_status, etax_submitted_at, etax_clearance_no, etax_cleared_at, etax_last_message, etax_synced_at')
          .order('declaration_date', { ascending: false }).limit(500),
        supabase.from('etax_events').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('etax_settings').select('base_url, taxpayer_id, enabled, notes').maybeSingle(),
      ]);
      if (d.data) setItems(d.data as any);
      if (e.data) setEvents(e.data as any);
      if (s.data) setSettings({
        base_url: s.data.base_url || '', taxpayer_id: s.data.taxpayer_id || '',
        enabled: !!s.data.enabled, notes: s.data.notes || '',
      });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { flash('لطفاً وارد شوید'); return; }
      const { error } = await supabase.from('etax_settings').upsert({
        user_id: user.id,
        base_url: settings.base_url.trim() || null,
        taxpayer_id: settings.taxpayer_id.trim() || null,
        enabled: settings.enabled,
        notes: settings.notes.trim() || null,
      }, { onConflict: 'user_id' });
      if (error) { flash('خطا در ذخیره تنظیمات'); return; }
      flash('تنظیمات اتصال ذخیره شد');
      onLog?.('تنظیمات E-Tax', settings.enabled ? 'اتصال آنلاین فعال' : 'اتصال آنلاین غیرفعال');
    } finally { setSavingSettings(false); }
  };

  const rowDraft = (d: Decl) => draft[d.id] || {
    status: d.etax_status || 'draft',
    ref_no: d.etax_ref_no || '',
    clearance_no: d.etax_clearance_no || '',
    cleared_at: d.etax_cleared_at || '',
    message: '',
  };

  const setRowDraft = (id: string, patch: Partial<ReturnType<typeof rowDraft>>) =>
    setDraft(p => ({ ...p, [id]: { ...(p[id] || { status: 'draft', ref_no: '', clearance_no: '', cleared_at: '', message: '' }), ...patch } }));

  const saveRow = async (d: Decl) => {
    const r = rowDraft(d);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { flash('لطفاً وارد شوید'); return; }
    const isCleared = r.status === 'cleared';
    const { error } = await supabase.from('customs_declarations').update({
      etax_status: r.status,
      etax_ref_no: r.ref_no.trim() || null,
      etax_clearance_no: r.clearance_no.trim() || null,
      etax_cleared_at: isCleared ? (r.cleared_at || today()) : (r.cleared_at || null),
      etax_last_message: r.message.trim() || null,
      etax_submitted_at: d.etax_submitted_at || (r.status !== 'draft' ? new Date().toISOString() : null),
    }).eq('id', d.id);
    if (error) { flash('خطا در ثبت وضعیت'); return; }
    await supabase.from('etax_events').insert({
      user_id: user.id,
      declaration_id: d.id,
      status: r.status,
      ref_no: r.ref_no.trim() || null,
      source: 'manual',
      message: r.message.trim() || null,
    });
    flash(`وضعیت اظهارنامه ${d.declaration_no} ثبت شد`);
    onLog?.('رهگیری E-Tax', `${d.declaration_no} → ${statusMeta(r.status).label}`);
    setDraft(p => { const n = { ...p }; delete n[d.id]; return n; });
    load();
  };

  const syncOnline = async (action: 'submit' | 'status', ids: string[]) => {
    if (ids.length === 0) { flash('اظهارنامه‌ای انتخاب نشده'); return; }
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('etax-sync', {
        body: { action, declaration_ids: ids },
      });
      if (error) { flash('اتصال آنلاین ناموفق بود — از ثبت دستی استفاده کنید'); return; }
      if (data && data.configured === false) {
        flash(data.reason || 'اتصال آنلاین پیکربندی نشده است');
        return;
      }
      const ok = (data?.results || []).filter((r: any) => r.ok).length;
      const bad = (data?.results || []).length - ok;
      flash(`همگام‌سازی: ${ok} موفق${bad ? `، ${bad} ناموفق` : ''}`);
      onLog?.('همگام‌سازی E-Tax', `${action === 'submit' ? 'ارسال' : 'استعلام وضعیت'} — ${ok} مورد`);
      load();
    } finally { setSyncing(false); }
  };

  const filtered = useMemo(() => items.filter(d => {
    if (filter !== 'all' && (d.etax_status || 'draft') !== filter) return false;
    if (q) {
      const s = q.toLowerCase();
      return d.declaration_no.toLowerCase().includes(s)
        || (d.etax_ref_no || '').toLowerCase().includes(s)
        || (d.importer_tin || '').includes(s)
        || (d.etax_clearance_no || '').toLowerCase().includes(s);
    }
    return true;
  }), [items, q, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const d of items) c[d.etax_status || 'draft'] = (c[d.etax_status || 'draft'] || 0) + 1;
    return c;
  }, [items]);

  const clearedTax = useMemo(
    () => items.filter(d => d.etax_status === 'cleared').reduce((s, d) => s + Number(d.total_tax || 0), 0),
    [items],
  );

  return (
    <div className="space-y-4" dir="rtl">
      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ShieldCheck size={18} className="text-primary" />
          رهگیری تصفیه و وضعیت E-Tax
        </h2>
        <div className="flex gap-2">
          <button className="btn btn-sm btn-ghost gap-1" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> بازخوانی
          </button>
          <button className="btn btn-sm btn-primary gap-1" disabled={syncing}
            onClick={() => syncOnline('status', filtered.filter(d => d.etax_ref_no).map(d => d.id))}>
            <Link2 size={14} className={syncing ? 'animate-pulse' : ''} /> استعلام آنلاین وضعیت
          </button>
        </div>
      </div>

      {!settings.enabled && (
        <div className="alert alert-warning text-sm">
          <AlertCircle size={16} />
          <span>
            اتصال آنلاین به سرویس وزارت مالیه فعال نیست. تا دریافت دسترسی رسمی، وضعیت و شماره مکتوب تصفیه را دستی ثبت کنید؛
            تاریخچه کامل تغییرات نگه‌داری می‌شود و با فعال شدن اتصال، همان داده‌ها آنلاین همگام می‌شوند.
          </span>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {STATUSES.map(s => (
          <div key={s.key} className="card bg-base-200/60 border border-base-300">
            <div className="card-body p-3">
              <div className="text-xs opacity-70 flex items-center gap-1">{s.icon}{s.label}</div>
              <div className="text-xl font-bold">{(counts[s.key] || 0).toLocaleString('fa-AF')}</div>
            </div>
          </div>
        ))}
        <div className="card bg-primary/10 border border-primary/30">
          <div className="card-body p-3">
            <div className="text-xs opacity-70">مالیات تصفیه‌شده (افغانی)</div>
            <div className="text-xl font-bold text-primary">{fmt(clearedTax)}</div>
          </div>
        </div>
      </div>

      {/* تنظیمات اتصال */}
      <div className="collapse collapse-arrow bg-base-200/50 border border-base-300">
        <input type="checkbox" />
        <div className="collapse-title font-semibold text-sm flex items-center gap-2">
          <Link2 size={15} /> تنظیمات اتصال به سرویس E-Tax وزارت مالیه
        </div>
        <div className="collapse-content space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label-text text-xs">آدرس سرویس (Base URL)</span>
              <input className="input input-bordered input-sm" dir="ltr" placeholder="https://etax.mof.gov.af/api/v1"
                value={settings.base_url} onChange={e => setSettings(s => ({ ...s, base_url: e.target.value }))} />
            </label>
            <label className="form-control">
              <span className="label-text text-xs">شناسه مؤدی / TIN ثبت‌شده در E-Tax</span>
              <input className="input input-bordered input-sm" dir="ltr"
                value={settings.taxpayer_id} onChange={e => setSettings(s => ({ ...s, taxpayer_id: e.target.value }))} />
            </label>
          </div>
          <label className="form-control">
            <span className="label-text text-xs">یادداشت (شماره مکتوب درخواست دسترسی، نام رابط و…)</span>
            <textarea className="textarea textarea-bordered textarea-sm" rows={2}
              value={settings.notes} onChange={e => setSettings(s => ({ ...s, notes: e.target.value }))} />
          </label>
          <label className="label cursor-pointer justify-start gap-3">
            <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={settings.enabled}
              onChange={e => setSettings(s => ({ ...s, enabled: e.target.checked }))} />
            <span className="label-text text-sm">اتصال آنلاین فعال باشد (فقط پس از دریافت دسترسی رسمی)</span>
          </label>
          <div className="text-xs opacity-60">
            کلید دسترسی سرویس به صورت محرمانه در سرور ذخیره می‌شود و در این صفحه نمایش داده نمی‌شود.
          </div>
          <button className="btn btn-sm btn-primary gap-1" onClick={saveSettings} disabled={savingSettings}>
            <Save size={14} /> ذخیره تنظیمات
          </button>
        </div>
      </div>

      {/* فیلترها */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="join">
          <span className="join-item btn btn-sm btn-ghost pointer-events-none"><Search size={14} /></span>
          <input className="join-item input input-bordered input-sm w-56" placeholder="شماره اظهارنامه، ارجاع، TIN، مکتوب"
            value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <select className="select select-bordered select-sm" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">همه وضعیت‌ها</option>
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <span className="text-xs opacity-60">{filtered.length.toLocaleString('fa-AF')} اظهارنامه</span>
      </div>

      {/* جدول */}
      <div className="overflow-x-auto border border-base-300 rounded-box">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>اظهارنامه</th>
              <th>تاریخ</th>
              <th>TIN</th>
              <th>مالیات (افغانی)</th>
              <th>وضعیت E-Tax</th>
              <th>شماره ارجاع</th>
              <th>مکتوب تصفیه</th>
              <th>تاریخ تصفیه</th>
              <th>یادداشت</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => {
              const r = rowDraft(d);
              const meta = statusMeta(d.etax_status || 'draft');
              const dirty = !!draft[d.id];
              const hist = events.filter(e => e.declaration_id === d.id);
              return (
                <React.Fragment key={d.id}>
                  <tr className={dirty ? 'bg-warning/5' : ''}>
                    <td className="font-bold whitespace-nowrap">
                      {d.declaration_no}
                      <div className="text-[10px] opacity-60">{d.declaration_type === 'import' ? 'واردات' : 'صادرات'} — {d.customs_office}</div>
                    </td>
                    <td className="whitespace-nowrap text-xs">{d.declaration_date}</td>
                    <td className="text-xs" dir="ltr">{d.importer_tin || '—'}</td>
                    <td className="whitespace-nowrap">{fmt(Number(d.total_tax))}</td>
                    <td>
                      <div className={`badge badge-sm gap-1 mb-1 ${meta.cls}`}>{meta.icon}{meta.label}</div>
                      <select className="select select-bordered select-xs w-full" value={r.status}
                        onChange={e => setRowDraft(d.id, { status: e.target.value })}>
                        {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <input className="input input-bordered input-xs w-28" dir="ltr" placeholder="ETX-…"
                        value={r.ref_no} onChange={e => setRowDraft(d.id, { ref_no: e.target.value })} />
                    </td>
                    <td>
                      <input className="input input-bordered input-xs w-28" dir="ltr" placeholder="شماره مکتوب"
                        value={r.clearance_no} onChange={e => setRowDraft(d.id, { clearance_no: e.target.value })} />
                    </td>
                    <td>
                      <input type="date" className="input input-bordered input-xs w-32"
                        value={r.cleared_at || ''} onChange={e => setRowDraft(d.id, { cleared_at: e.target.value })} />
                    </td>
                    <td>
                      <input className="input input-bordered input-xs w-36" placeholder="یادداشت این تغییر"
                        value={r.message} onChange={e => setRowDraft(d.id, { message: e.target.value })} />
                      {d.etax_last_message && <div className="text-[10px] opacity-60 mt-1">{d.etax_last_message}</div>}
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex gap-1">
                        <button className={`btn btn-xs ${dirty ? 'btn-primary' : 'btn-ghost'}`} onClick={() => saveRow(d)}>
                          <Save size={12} /> ثبت
                        </button>
                        <button className="btn btn-xs btn-ghost" onClick={() => syncOnline('submit', [d.id])} disabled={syncing}>
                          <Send size={12} /> ارسال
                        </button>
                        <button className="btn btn-xs btn-ghost" onClick={() => setOpenHistory(openHistory === d.id ? null : d.id)}>
                          <History size={12} /> {hist.length.toLocaleString('fa-AF')}
                        </button>
                      </div>
                      <div className="text-[10px] opacity-50 mt-1">همگام: {dt(d.etax_synced_at)}</div>
                    </td>
                  </tr>
                  {openHistory === d.id && (
                    <tr>
                      <td colSpan={10} className="bg-base-200/40">
                        {hist.length === 0 ? (
                          <span className="text-xs opacity-60">تاریخچه‌ای ثبت نشده است.</span>
                        ) : (
                          <ul className="text-xs space-y-1">
                            {hist.map(e => (
                              <li key={e.id} className="flex flex-wrap gap-2 items-center">
                                <span className={`badge badge-xs ${statusMeta(e.status).cls}`}>{statusMeta(e.status).label}</span>
                                <span className="opacity-70">{dt(e.created_at)}</span>
                                <span className="badge badge-xs badge-outline">{e.source === 'online' ? 'آنلاین' : 'دستی'}</span>
                                {e.ref_no && <span dir="ltr" className="opacity-70">{e.ref_no}</span>}
                                {e.message && <span className="opacity-80">— {e.message}</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="text-center opacity-60 py-6">اظهارنامه‌ای یافت نشد.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EtaxTrackingTab;
