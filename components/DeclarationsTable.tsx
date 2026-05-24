import React, { useState, useEffect, useCallback } from 'react';
import { TaxDeclaration, TAX_CATEGORIES } from '../types';
import { loadDeclarations, saveDeclaration, updateDeclaration, deleteDeclaration } from '../utils/database';
import { formatCurrency } from '../utils/taxCalculations';
import { Edit3, Trash2, Plus, Save, X, RefreshCw, Search, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface EditState {
  id: number;
  field: string;
  value: string;
}

const EMPTY_DECLARATION: Omit<TaxDeclaration, 'id' | 'created_at' | 'updated_at'> = {
  tax_category: 'مالیه بر معاملات انتقاضی ۴٪',
  period: '',
  filing_due_date: '',
  payment_due_date: '',
  submission_date: '',
  assessment: 0,
  paid: 0,
  balance: 0,
  notes: '',
};

export const DeclarationsTable: React.FC<{}> = () => {
  const [declarations, setDeclarations] = useState<TaxDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDecl, setNewDecl] = useState(EMPTY_DECLARATION);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadDeclarations();
      setDeclarations(data);
    } catch (err) {
      console.error('Failed to load declarations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group by category
  const grouped = declarations.reduce<Record<string, TaxDeclaration[]>>((acc, d) => {
    if (!acc[d.tax_category]) acc[d.tax_category] = [];
    acc[d.tax_category].push(d);
    return acc;
  }, {});

  const filteredCategories = Object.keys(grouped).filter((cat) => {
    if (filterCategory !== 'all' && cat !== filterCategory) return false;
    if (searchTerm) {
      const items = grouped[cat];
      return items.some((d) => d.period.includes(searchTerm));
    }
    return true;
  });

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const getCategoryIcon = (category: string) => {
    const found = TAX_CATEGORIES.find((c) => c.label === category);
    return found ? found.icon : '📄';
  };

  // Edit handlers
  const startEdit = (decl: TaxDeclaration) => {
    setEditingRow(decl.id);
    setEditData({
      period: decl.period,
      filing_due_date: decl.filing_due_date || '',
      payment_due_date: decl.payment_due_date || '',
      submission_date: decl.submission_date || '',
      assessment: String(decl.assessment),
      paid: String(decl.paid),
      balance: String(decl.balance),
    });
  };

  const cancelEdit = () => {
    setEditingRow(null);
    setEditData({});
  };

  const saveEdit = async (id: number) => {
    setSaving(true);
    try {
      const updated = await updateDeclaration(id, {
        period: editData.period,
        filing_due_date: editData.filing_due_date,
        payment_due_date: editData.payment_due_date,
        submission_date: editData.submission_date,
        assessment: Number(editData.assessment),
        paid: Number(editData.paid),
        balance: Number(editData.balance),
      });
      setDeclarations((prev) => prev.map((d) => (d.id === id ? updated : d)));
      setEditingRow(null);
    } catch (err) {
      console.error('Failed to save edit:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeclarations((prev) => prev.filter((d) => d.id !== id));
    try {
      await deleteDeclaration(id);
    } catch (err) {
      console.error('Failed to delete declaration:', err);
      load();
    }
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      const created = await saveDeclaration(newDecl);
      setDeclarations((prev) => [...prev, created]);
      setShowAddForm(false);
      setNewDecl(EMPTY_DECLARATION);
    } catch (err) {
      console.error('Failed to add declaration:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="loading loading-spinner loading-lg text-primary" />
        <span className="text-base-content/60 text-sm">بارگذاری اظهارنامه‌ها...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="input input-bordered input-sm flex items-center gap-2 flex-1 min-w-[150px]">
          <Search className="h-[1em] opacity-50" />
          <input
            type="text"
            className="grow"
            placeholder="جستجو دوره..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </label>
        <select
          className="select select-bordered select-sm"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">همه انواع</option>
          {Object.keys(grouped).map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button className="btn btn-primary btn-sm gap-1" onClick={() => setShowAddForm(true)}>
          <Plus size={14} /> افزودن
        </button>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="card bg-base-200 border border-primary/30">
          <div className="card-body p-4 gap-3">
            <h3 className="card-title text-sm">➕ افزودن اظهارنامه جدید</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <select
                className="select select-bordered select-sm col-span-2 sm:col-span-3"
                value={newDecl.tax_category}
                onChange={(e) => setNewDecl({ ...newDecl, tax_category: e.target.value })}
              >
                {Object.keys(grouped).length > 0
                  ? Object.keys(grouped).map((cat) => <option key={cat} value={cat}>{cat}</option>)
                  : TAX_CATEGORIES.map((c) => <option key={c.id} value={c.label}>{c.label}</option>)
                }
              </select>
              <input className="input input-bordered input-sm" placeholder="دوره (مثلاً 12/1404)" value={newDecl.period} onChange={(e) => setNewDecl({ ...newDecl, period: e.target.value })} />
              <input className="input input-bordered input-sm" placeholder="تاریخ ارایه" value={newDecl.filing_due_date} onChange={(e) => setNewDecl({ ...newDecl, filing_due_date: e.target.value })} />
              <input className="input input-bordered input-sm" placeholder="تاریخ پرداخت" value={newDecl.payment_due_date} onChange={(e) => setNewDecl({ ...newDecl, payment_due_date: e.target.value })} />
              <input className="input input-bordered input-sm" placeholder="تاریخ ارایه شما" value={newDecl.submission_date} onChange={(e) => setNewDecl({ ...newDecl, submission_date: e.target.value })} />
              <input className="input input-bordered input-sm" type="number" placeholder="معینه" value={newDecl.assessment || ''} onChange={(e) => setNewDecl({ ...newDecl, assessment: Number(e.target.value) })} />
              <input className="input input-bordered input-sm" type="number" placeholder="پرداخت" value={newDecl.paid || ''} onChange={(e) => setNewDecl({ ...newDecl, paid: Number(e.target.value) })} />
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddForm(false)}><X size={14} /> لغو</button>
              <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={saving || !newDecl.period}>
                {saving ? <span className="loading loading-spinner loading-xs" /> : <Save size={14} />} ذخیره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tables grouped by category */}
      {filteredCategories.map((category) => {
        const items = grouped[category].filter((d) =>
          !searchTerm || d.period.includes(searchTerm)
        );
        if (items.length === 0) return null;
        const isCollapsed = collapsedCategories.has(category);
        const catTotal = items.reduce((sum, d) => sum + Math.abs(Number(d.assessment)), 0);
        const catPaid = items.reduce((sum, d) => sum + Number(d.paid), 0);

        return (
          <div key={category} className="card bg-base-200">
            {/* Category Header */}
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-base-300 rounded-t-2xl transition-colors"
              onClick={() => toggleCategory(category)}
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                <span className="text-lg">{getCategoryIcon(category)}</span>
                <span className="font-bold text-sm">{category}</span>
                <span className="badge badge-sm badge-ghost">{items.length}</span>
              </div>
              <div className="flex gap-3 text-xs text-base-content/60">
                <span>معینه: <span className="font-mono" dir="ltr">{formatCurrency(catTotal)}</span></span>
                <span>پرداخت: <span className="font-mono text-success" dir="ltr">{formatCurrency(catPaid)}</span></span>
              </div>
            </div>

            {/* Table */}
            {!isCollapsed && (
              <div className="overflow-x-auto px-2 pb-3">
                <table className="table table-sm table-zebra">
                  <thead>
                    <tr className="text-xs">
                      <th>دوره</th>
                      <th>تاریخ ارایه اظهارنامه</th>
                      <th>تاریخ پرداخت</th>
                      <th>تاریخ ارایه شما</th>
                      <th className="text-left" dir="ltr">معینه</th>
                      <th className="text-left" dir="ltr">پرداخت شده</th>
                      <th className="text-left" dir="ltr">بلانس</th>
                      <th>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((d) => (
                      <tr key={d.id}>
                        {editingRow === d.id ? (
                          <>
                            <td><input className="input input-bordered input-xs w-20" value={editData.period} onChange={(e) => setEditData({ ...editData, period: e.target.value })} /></td>
                            <td><input className="input input-bordered input-xs w-24" value={editData.filing_due_date} onChange={(e) => setEditData({ ...editData, filing_due_date: e.target.value })} /></td>
                            <td><input className="input input-bordered input-xs w-24" value={editData.payment_due_date} onChange={(e) => setEditData({ ...editData, payment_due_date: e.target.value })} /></td>
                            <td><input className="input input-bordered input-xs w-24" value={editData.submission_date} onChange={(e) => setEditData({ ...editData, submission_date: e.target.value })} /></td>
                            <td><input className="input input-bordered input-xs w-24" type="number" value={editData.assessment} onChange={(e) => setEditData({ ...editData, assessment: e.target.value })} /></td>
                            <td><input className="input input-bordered input-xs w-24" type="number" value={editData.paid} onChange={(e) => setEditData({ ...editData, paid: e.target.value })} /></td>
                            <td><input className="input input-bordered input-xs w-20" type="number" value={editData.balance} onChange={(e) => setEditData({ ...editData, balance: e.target.value })} /></td>
                            <td>
                              <div className="flex gap-1">
                                <button className="btn btn-success btn-xs" onClick={() => saveEdit(d.id)} disabled={saving}>
                                  {saving ? <span className="loading loading-spinner loading-xs" /> : <Save size={12} />}
                                </button>
                                <button className="btn btn-ghost btn-xs" onClick={cancelEdit}><X size={12} /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="font-bold text-sm">{d.period}</td>
                            <td className="text-xs">{d.filing_due_date || '—'}</td>
                            <td className="text-xs">{d.payment_due_date || '—'}</td>
                            <td className="text-xs">{d.submission_date || '—'}</td>
                            <td className="font-mono text-xs text-left" dir="ltr">{formatCurrency(Math.abs(Number(d.assessment)))}</td>
                            <td className="font-mono text-xs text-success text-left" dir="ltr">{formatCurrency(Number(d.paid))}</td>
                            <td className={`font-mono text-xs text-left ${Number(d.balance) > 0 ? 'text-error' : 'text-success'}`} dir="ltr">
                              {Number(d.balance) === 0 ? '✅ 0' : formatCurrency(Number(d.balance))}
                            </td>
                            <td>
                              <div className="flex gap-1">
                                <button className="btn btn-ghost btn-xs" onClick={() => startEdit(d)}>
                                  <Edit3 size={12} />
                                </button>
                                <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(d.id)}>
                                  <Trash2 size={12} />
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
            )}
          </div>
        );
      })}

      {filteredCategories.length === 0 && (
        <div className="flex flex-col items-center py-12 gap-3 text-base-content/40">
          <FileText size={40} className="opacity-40" />
          <p className="text-sm">هیچ اظهارنامه‌ای یافت نشد</p>
        </div>
      )}
    </div>
  );
};
