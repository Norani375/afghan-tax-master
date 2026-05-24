import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { TaxType, TaxResult as TaxResultType, TaxRecord, TAX_TYPES } from './types';
import { TaxTypeSelector } from './components/TaxTypeSelector';
import { TaxForm } from './components/TaxForm';
import { TaxResultCard } from './components/TaxResultCard';
import { TaxRatesReference } from './components/TaxRatesReference';
import { TaxHistory } from './components/TaxHistory';
import { Dashboard } from './components/Dashboard';
import { DeclarationsTable } from './components/DeclarationsTable';
import { saveTaxRecord, loadTaxRecords, deleteTaxRecord } from './utils/database';
import { ArrowRight, RotateCcw, Calculator, Clock, BarChart3, FileText, Database } from 'lucide-react';

type TabType = 'dashboard' | 'declarations' | 'calculator' | 'history';

const App: React.FC<{}> = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedType, setSelectedType] = useState<TaxType | null>(null);
  const [result, setResult] = useState<TaxResultType | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [taxpayerName, setTaxpayerName] = useState('');
  const [records, setRecords] = useState<TaxRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  useEffect(() => {
    loadTaxRecords(1)
      .then(() => setDbConnected(true))
      .catch(() => setDbConnected(false));
  }, []);

  const handleTypeSelect = (t: TaxType) => { setSelectedType(t); setResult(null); setSaved(false); };
  const handleReset = () => { setSelectedType(null); setResult(null); setSaved(false); setTaxpayerName(''); };

  const handleSave = useCallback(async () => {
    if (!result || !selectedType) return;
    setSaving(true);
    try {
      const newRec = await saveTaxRecord(selectedType, taxpayerName, result.taxableAmount, 0, result.taxableAmount, result.totalTax, result.effectiveRate, selectedType === 'salary' ? 'ماهوار' : 'سالانه', result.breakdown.map((b) => b.label).join(' | '));
      setSaved(true);
      setRecords((prev) => [newRec, ...prev]);
    } catch (err) { console.error('Failed to save:', err); }
    finally { setSaving(false); }
  }, [result, selectedType, taxpayerName]);

  const handleLoadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try { setRecords(await loadTaxRecords(50)); }
    catch (err) { console.error('Failed to load history:', err); }
    finally { setHistoryLoading(false); }
  }, []);

  const handleDeleteRecord = useCallback(async (id: number) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    try { await deleteTaxRecord(id); }
    catch (err) { console.error('Failed to delete:', err); handleLoadHistory(); }
  }, [handleLoadHistory]);

  useEffect(() => { if (activeTab === 'history') handleLoadHistory(); }, [activeTab, handleLoadHistory]);

  const selectedInfo = TAX_TYPES.find((t) => t.id === selectedType);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'داشبورد', icon: <BarChart3 size={16} /> },
    { id: 'declarations', label: 'اظهارنامه‌ها', icon: <FileText size={16} /> },
    { id: 'calculator', label: 'محاسبه', icon: <Calculator size={16} /> },
    { id: 'history', label: 'تاریخچه', icon: <Clock size={16} /> },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-base-100 p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold mb-1">🏛️ سیستم مالیات افغانستان</h1>
        <p className="text-base-content/60 text-sm">مطابق قانون مالیات بر عایدات سال ۱۳۸۸</p>
        {dbConnected !== null && (
          <div className="flex items-center justify-center gap-1 mt-1">
            <Database size={12} className={dbConnected ? 'text-success' : 'text-error'} />
            <span className={`text-xs ${dbConnected ? 'text-success' : 'text-error'}`}>
              {dbConnected ? 'متصل به دیتابیس Neon' : 'عدم اتصال'}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-200 mb-6 justify-center flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab gap-2 ${activeTab === tab.id ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && <Dashboard />}

      {/* Declarations Tab */}
      {activeTab === 'declarations' && <DeclarationsTable />}

      {/* Calculator Tab */}
      {activeTab === 'calculator' && (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">نوع مالیه را انتخاب کنید</h2>
              {selectedType && (
                <button className="btn btn-ghost btn-sm gap-1" onClick={handleReset}>
                  <RotateCcw size={14} /> شروع دوباره
                </button>
              )}
            </div>
            <TaxTypeSelector selected={selectedType} onSelect={handleTypeSelect} />
          </div>
          {selectedType && (
            <div className="mb-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight size={16} className="text-primary" />
                <h2 className="font-bold text-lg">{selectedInfo?.icon} {selectedInfo?.label}</h2>
              </div>
              <div className="mb-3">
                <label className="input input-bordered flex items-center gap-2">
                  <span className="text-base-content/50 text-sm whitespace-nowrap">نام مالیه‌دهنده:</span>
                  <input type="text" className="grow" placeholder="اختیاری" value={taxpayerName} onChange={(e) => setTaxpayerName(e.target.value)} />
                </label>
              </div>
              <div className="mb-3"><TaxRatesReference taxType={selectedType} /></div>
              <TaxForm taxType={selectedType} onResult={(r) => { setResult(r); setSaved(false); }} />
            </div>
          )}
          {result && selectedInfo && (
            <div className="mb-6 animate-fade-in">
              <h2 className="font-bold text-lg mb-3">📊 نتیجه محاسبه</h2>
              <TaxResultCard result={result} taxLabel={selectedInfo.label} onSave={handleSave} saving={saving} saved={saved} />
            </div>
          )}
        </>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <TaxHistory records={records} loading={historyLoading} onDelete={handleDeleteRecord} />
      )}

      {/* Footer */}
      <div className="text-center text-xs text-base-content/40 mt-8 pb-4">
        <p>منبع: قانون مالیات بر عایدات (سال ۱۳۸۸) — ریاست عمومی عواید وزارت مالیه</p>
        <p className="mt-1">این اپ صرفاً جهت اطلاع‌رسانی بوده و جایگزین مشاوره مالیاتی رسمی نمی‌شود.</p>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
