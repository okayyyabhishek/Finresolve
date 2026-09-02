import React, { useState, useRef, useMemo } from 'react';
import {
  UploadCloud,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  Edit3,
  Plus,
  Trash2,
  Sparkles,
  Calculator,
  IndianRupee,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { formatINR } from '../utils/format';

interface ManualRecord {
  paymentId: string;
  merchantId: string;
  customerId: string;
  amount: string;
  method: 'upi' | 'card' | 'netbanking' | 'wallet' | 'international';
  status: string;
  capturedAt: string;
  settlementGross: string;
  settlementFee: string;
  settlementTax: string;
  settlementNet: string;
  utr: string;
  refundAmount: string;
  refundReason: string;
  adjustmentAmount: string;
  adjustmentType: string;
  adjustmentReason: string;
}

const DEFAULT_RECORD: ManualRecord = {
  paymentId: '',
  merchantId: '',
  customerId: '',
  amount: '',
  method: 'upi',
  status: 'captured',
  capturedAt: new Date().toISOString().slice(0, 16),
  settlementGross: '',
  settlementFee: '',
  settlementTax: '',
  settlementNet: '',
  utr: '',
  refundAmount: '',
  refundReason: '',
  adjustmentAmount: '',
  adjustmentType: 'credit',
  adjustmentReason: ''
};

const METHOD_RATES: Record<string, number> = {
  upi: 0.0025,
  card: 0.02,
  netbanking: 0.015,
  wallet: 0.01,
  international: 0.035
};

export const UploadView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'file' | 'text' | 'manual'>('file');
  const [batchId, setBatchId] = useState(`BATCH-CUST-${Date.now().toString().slice(-4)}`);
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Manual entry state
  const [manualForm, setManualForm] = useState<ManualRecord>({ ...DEFAULT_RECORD });
  const [manualRecordsList, setManualRecordsList] = useState<ManualRecord[]>([]);
  const [showAdvancedManual, setShowAdvancedManual] = useState(false);

  const handleResetBenchmark = async () => {
    if (
      !window.confirm(
        'Are you sure you want to reset all data? All settlement batches, exceptions, and audit entries will be permanently cleared.'
      )
    ) {
      return;
    }
    setIsResetting(true);
    try {
      await api.resetBatch();
      setSuccessMsg('All batch data and ledger entries have been completely cleared.');
      window.dispatchEvent(new CustomEvent('finresolve:batch-uploaded'));
      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset data');
    } finally {
      setIsResetting(false);
    }
  };

  // Auto-calculate standard theoretical fee for the manual form
  const theoretical = useMemo(() => {
    const amt = parseFloat(manualForm.amount) || 0;
    const rate = METHOD_RATES[manualForm.method] || 0.02;
    const baseFee = amt * rate;
    const gst = baseFee * 0.18;
    const totalFee = baseFee + gst;
    const refund = parseFloat(manualForm.refundAmount) || 0;
    const adj = parseFloat(manualForm.adjustmentAmount) || 0;
    const expectedNet = amt > 0 ? amt - totalFee - refund - adj : 0;

    const actualNet = parseFloat(manualForm.settlementNet) || 0;
    const discrepancy = actualNet > 0 || amt > 0 ? actualNet - expectedNet : 0;

    return {
      hasAmount: amt > 0,
      baseFee: baseFee.toFixed(2),
      gst: gst.toFixed(2),
      totalFee: totalFee.toFixed(2),
      ratePercent: (rate * 100).toFixed(2),
      expectedNet: expectedNet.toFixed(2),
      actualNet: actualNet.toFixed(2),
      discrepancy: discrepancy.toFixed(2),
      hasDiscrepancy: Math.abs(discrepancy) > 0.01
    };
  }, [
    manualForm.amount,
    manualForm.method,
    manualForm.settlementNet,
    manualForm.refundAmount,
    manualForm.adjustmentAmount
  ]);

  const applyPreset = (presetType: 'clean_upi' | 'fee_mismatch' | 'refund_anomaly' | 'high_escalation') => {
    const timestamp = new Date().toISOString().slice(0, 16);
    const suffix = Date.now().toString().slice(-4);

    if (presetType === 'clean_upi') {
      setManualForm({
        paymentId: `PAY-UPI-${suffix}`,
        merchantId: 'MER-001',
        customerId: 'CUST-1001',
        amount: '10000.00',
        method: 'upi',
        status: 'captured',
        capturedAt: timestamp,
        settlementGross: '10000.00',
        settlementFee: '25.00',
        settlementTax: '4.50',
        settlementNet: '9970.50',
        utr: `UTR-UPI-${suffix}`,
        refundAmount: '',
        refundReason: '',
        adjustmentAmount: '',
        adjustmentType: 'credit',
        adjustmentReason: ''
      });
    } else if (presetType === 'fee_mismatch') {
      // Card transaction with 3.5% overcharge fee applied instead of 2.0%
      setManualForm({
        paymentId: `PAY-CARD-${suffix}`,
        merchantId: 'MER-003',
        customerId: 'CUST-2004',
        amount: '25000.00',
        method: 'card',
        status: 'captured',
        capturedAt: timestamp,
        settlementGross: '25000.00',
        settlementFee: '875.00', // Overcharge fee: 3.5% instead of 2.0%
        settlementTax: '157.50',
        settlementNet: '23967.50', // Actual payout short by ₹442.50
        utr: `UTR-CARD-${suffix}`,
        refundAmount: '',
        refundReason: '',
        adjustmentAmount: '',
        adjustmentType: 'credit',
        adjustmentReason: ''
      });
    } else if (presetType === 'refund_anomaly') {
      // ₹15,000 Netbanking with ₹3,000 refund omitted from net settlement
      setManualForm({
        paymentId: `PAY-REF-${suffix}`,
        merchantId: 'MER-005',
        customerId: 'CUST-3012',
        amount: '15000.00',
        method: 'netbanking',
        status: 'captured',
        capturedAt: timestamp,
        settlementGross: '15000.00',
        settlementFee: '225.00',
        settlementTax: '40.50',
        settlementNet: '14734.50', // Settlement does not deduct refund
        utr: `UTR-NETB-${suffix}`,
        refundAmount: '3000.00',
        refundReason: 'Customer order cancelled prior to dispatch',
        adjustmentAmount: '',
        adjustmentType: 'credit',
        adjustmentReason: ''
      });
    } else if (presetType === 'high_escalation') {
      // ₹1,50,000 International Card triggering human review
      setManualForm({
        paymentId: `PAY-INTL-${suffix}`,
        merchantId: 'MER-008',
        customerId: 'CUST-8041',
        amount: '150000.00',
        method: 'international',
        status: 'captured',
        capturedAt: timestamp,
        settlementGross: '150000.00',
        settlementFee: '5250.00',
        settlementTax: '945.00',
        settlementNet: '132000.00', // ₹11,805 discrepancy -> > ₹10,000 Policy Gate threshold
        utr: `UTR-INTL-${suffix}`,
        refundAmount: '',
        refundReason: '',
        adjustmentAmount: '11805.00',
        adjustmentType: 'chargeback',
        adjustmentReason: 'High value clearing variance under investigation'
      });
    }
  };

  const autoFillStandardSettlement = () => {
    const amt = parseFloat(manualForm.amount) || 0;
    const rate = METHOD_RATES[manualForm.method] || 0.02;
    const baseFee = amt * rate;
    const gst = baseFee * 0.18;
    const totalFee = baseFee + gst;
    const refund = parseFloat(manualForm.refundAmount) || 0;
    const adj = parseFloat(manualForm.adjustmentAmount) || 0;
    const net = amt - totalFee - refund - adj;

    setManualForm((prev) => ({
      ...prev,
      settlementGross: amt.toFixed(2),
      settlementFee: baseFee.toFixed(2),
      settlementTax: gst.toFixed(2),
      settlementNet: net.toFixed(2)
    }));
  };

  const handleAddManualRecord = () => {
    const recordToAdd: ManualRecord = {
      ...manualForm,
      paymentId: manualForm.paymentId.trim() || `PAY-MANUAL-${Date.now().toString().slice(-4)}`
    };
    setManualRecordsList((prev) => [...prev, recordToAdd]);
    // Reset form with new random ID
    setManualForm({
      ...DEFAULT_RECORD,
      paymentId: `PAY-MANUAL-${(Date.now() + 1).toString().slice(-4)}`
    });
    setSuccessMsg('Record added to batch queue. You can add more or submit the batch.');
  };

  const handleRemoveManualRecord = (index: number) => {
    setManualRecordsList((prev) => prev.filter((_, i) => i !== index));
  };

  const parseAndPreview = (content: string) => {
    try {
      if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
        const json = JSON.parse(content);
        const records = Array.isArray(json) ? json : json.records || json.payments || [];
        setPreviewRows(records.slice(0, 5));
      } else {
        const lines = content.trim().split(/\r?\n/);
        if (lines.length > 1) {
          const headers = lines[0].split(',').map((h) => h.trim());
          const preview: any[] = [];
          for (let i = 1; i < Math.min(lines.length, 6); i++) {
            if (!lines[i].trim()) continue;
            const vals = lines[i].split(',').map((v) => v.trim());
            const row: any = {};
            headers.forEach((h, idx) => {
              row[h] = vals[idx] || '';
            });
            preview.push(row);
          }
          setPreviewRows(preview);
        }
      }
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg('Could not parse file content: ' + err.message);
    }
  };

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileContent(text);
      parseAndPreview(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const downloadSampleTemplate = async () => {
    try {
      const templateData = await api.getBatchTemplate();
      const blob = new Blob([templateData.csvTemplate], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'finresolve_sample.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download template', err);
    }
  };

  const handleUploadAndRun = async () => {
    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let payload: any = { batchId };

      if (activeTab === 'manual') {
        // If user has records in list, send all; otherwise send the current form
        const recordsToSubmit =
          manualRecordsList.length > 0
            ? manualRecordsList
            : [
                {
                  ...manualForm,
                  paymentId:
                    manualForm.paymentId.trim() || `PAY-MANUAL-${Date.now().toString().slice(-4)}`
                }
              ];
        payload.records = recordsToSubmit;
      } else {
        if (!fileContent.trim()) {
          setErrorMsg('Please select a CSV/JSON file or paste data before uploading.');
          setIsUploading(false);
          return;
        }
        if (fileContent.trim().startsWith('[') || fileContent.trim().startsWith('{')) {
          const json = JSON.parse(fileContent);
          payload.records = Array.isArray(json) ? json : json.records || json.payments || [];
        } else {
          payload.csvContent = fileContent;
        }
      }

      const result = await api.uploadBatch(payload);
      setSuccessMsg(`Successfully processed & reconciled batch: ${result.batchId}`);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('finresolve:batch-uploaded'));
        navigate('/investigations');
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to upload batch');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Data Ingestion</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Upload settlement files or manually enter transactions for automated reconciliation and AI triage.
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-6 space-y-6">
        {/* First Time User Onboarding Steps */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/70 via-indigo-50/40 to-transparent dark:from-indigo-950/30 dark:via-indigo-950/10 dark:to-transparent border border-indigo-100 dark:border-indigo-900/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2">
            <BookOpen size={14} />
            <span>Getting Started with Settlement Reconciliation</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="p-2.5 rounded-lg bg-white/70 dark:bg-[#0b101e] border border-indigo-100 dark:border-indigo-950">
              <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">1. Ingest Data</span>
              Upload your CSV/JSON settlement file, paste raw ledger text, or use Manual Entry.
            </div>
            <div className="p-2.5 rounded-lg bg-white/70 dark:bg-[#0b101e] border border-indigo-100 dark:border-indigo-950">
              <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">2. Automated Math Match</span>
              The deterministic engine recalculates MDR fees, GST, refunds, and detects variances.
            </div>
            <div className="p-2.5 rounded-lg bg-white/70 dark:bg-[#0b101e] border border-indigo-100 dark:border-indigo-950">
              <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">3. AI Triage &amp; Policy Gate</span>
              AI investigates root causes and auto-resolves safe cases or escalates high-risk discrepancies.
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-3">
            <label htmlFor="upload-batch-id-input" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Batch Identifier:
            </label>
            <input
              id="upload-batch-id-input"
              name="uploadBatchId"
              type="text"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              placeholder="e.g. BATCH-CUST-001"
              autoComplete="off"
              className="px-3 py-1.5 text-sm font-mono font-medium bg-white dark:bg-[#0a0f1c] border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetBenchmark}
              disabled={isResetting}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              title="Reset database to clean benchmark dataset"
            >
              {isResetting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              <span>Restore Benchmark Demo (75 Records)</span>
            </button>

            <button
              onClick={downloadSampleTemplate}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <Download size={14} />
              <span>Download CSV Template</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-white/10 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('file')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'file'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <UploadCloud size={16} />
            <span>1. File Upload (.csv, .json)</span>
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'text'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <FileText size={16} />
            <span>2. Raw CSV / JSON Text</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'manual'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Edit3 size={16} />
            <span>3. Single Record Simulator</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-[300px]">
          {/* FILE UPLOAD TAB */}
          {activeTab === 'file' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="h-[300px] border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all"
            >
              <input
                id="upload-file-input"
                name="uploadBatchFile"
                ref={fileInputRef}
                type="file"
                aria-label="Upload settlement batch CSV or JSON file"
                accept=".csv,.json,text/csv,application/json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <UploadCloud size={48} className="text-slate-400 mb-4" />
              <p className="text-base font-medium text-slate-900 dark:text-white mb-1">
                {fileName ? `Selected: ${fileName}` : 'Click or drag file to upload'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Supports CSV or JSON formats
              </p>
            </div>
          )}

          {/* RAW TEXT TAB */}
          {activeTab === 'text' && (
            <textarea
              id="upload-raw-text-area"
              name="uploadRawText"
              aria-label="Raw CSV data or JSON array"
              value={fileContent}
              onChange={(e) => {
                setFileContent(e.target.value);
                parseAndPreview(e.target.value);
              }}
              placeholder="Paste CSV data or JSON array here..."
              className="w-full h-[300px] p-4 font-mono text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
          )}

          {/* MANUAL ENTRY TAB */}
          {activeTab === 'manual' && (
            <div className="space-y-6">
              {/* Presets Bar */}
              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  <Sparkles size={14} />
                  <span>Quick Test Scenarios (1-Click Fill)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('clean_upi')}
                    className="p-2.5 text-left rounded-lg bg-white dark:bg-[#0c1222] border border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all group"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                      <span>Clean Matched</span>
                      <CheckCircle2 size={12} className="text-emerald-500" />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      ₹10k UPI (0.25% fee)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('fee_mismatch')}
                    className="p-2.5 text-left rounded-lg bg-white dark:bg-[#0c1222] border border-amber-200 dark:border-amber-800/60 hover:border-amber-500 dark:hover:border-amber-400 transition-all group"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                      <span>Fee Mismatch</span>
                      <AlertCircle size={12} className="text-amber-500" />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      ₹25k Card (3.5% fee charged)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('refund_anomaly')}
                    className="p-2.5 text-left rounded-lg bg-white dark:bg-[#0c1222] border border-sky-200 dark:border-sky-800/60 hover:border-sky-500 dark:hover:border-sky-400 transition-all group"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                      <span>Unadjusted Refund</span>
                      <AlertCircle size={12} className="text-sky-500" />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      ₹15k NetB + ₹3k refund omitted
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('high_escalation')}
                    className="p-2.5 text-left rounded-lg bg-white dark:bg-[#0c1222] border border-rose-200 dark:border-rose-800/60 hover:border-rose-500 dark:hover:border-rose-400 transition-all group"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                      <span>High Escalation</span>
                      <ShieldAlert size={12} className="text-rose-500" />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      ₹1.5L Intl (&gt;₹10k variance)
                    </p>
                  </button>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Payment Capture Form */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      1. Payment Capture Details
                    </span>
                    <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                      Merchant & Gateway
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="manual-payment-id" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        Payment ID
                      </label>
                      <input
                        id="manual-payment-id"
                        name="manualPaymentId"
                        type="text"
                        value={manualForm.paymentId}
                        onChange={(e) =>
                          setManualForm({ ...manualForm, paymentId: e.target.value })
                        }
                        placeholder="Auto-generated if blank"
                        autoComplete="off"
                        className="w-full mt-1 px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0a0f1c] border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="manual-merchant-id" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        Merchant ID
                      </label>
                      <input
                        id="manual-merchant-id"
                        name="manualMerchantId"
                        type="text"
                        value={manualForm.merchantId}
                        onChange={(e) =>
                          setManualForm({ ...manualForm, merchantId: e.target.value })
                        }
                        autoComplete="off"
                        className="w-full mt-1 px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0a0f1c] border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="manual-gross-amount" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        Gross Amount (₹)
                      </label>
                      <div className="relative mt-1">
                        <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-semibold">
                          ₹
                        </span>
                        <input
                          id="manual-gross-amount"
                          name="manualGrossAmount"
                          type="number"
                          step="0.01"
                          value={manualForm.amount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualForm({
                              ...manualForm,
                              amount: val,
                              settlementGross: val
                            });
                          }}
                          className="w-full pl-6 pr-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-[#0a0f1c] border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="manual-payment-method" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        Payment Method
                      </label>
                      <select
                        id="manual-payment-method"
                        name="manualPaymentMethod"
                        value={manualForm.method}
                        onChange={(e) =>
                          setManualForm({
                            ...manualForm,
                            method: e.target.value as any
                          })
                        }
                        className="w-full mt-1 px-3 py-1.5 text-xs bg-white dark:bg-[#0a0f1c] border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                      >
                        <option value="upi">UPI (0.25% standard MDR)</option>
                        <option value="card">Domestic Card (2.00% MDR)</option>
                        <option value="netbanking">Netbanking (1.50% MDR)</option>
                        <option value="wallet">Wallet (1.00% MDR)</option>
                        <option value="international">International Card (3.50% MDR)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="manual-payment-status" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        Status
                      </label>
                      <select
                        id="manual-payment-status"
                        name="manualPaymentStatus"
                        value={manualForm.status}
                        onChange={(e) =>
                          setManualForm({ ...manualForm, status: e.target.value })
                        }
                        className="w-full mt-1 px-3 py-1.5 text-xs bg-white dark:bg-[#0a0f1c] border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="captured">Captured (Successful)</option>
                        <option value="refunded">Refunded</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="manual-captured-timestamp" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        Captured Timestamp
                      </label>
                      <input
                        id="manual-captured-timestamp"
                        name="manualCapturedTimestamp"
                        type="datetime-local"
                        value={manualForm.capturedAt}
                        onChange={(e) =>
                          setManualForm({ ...manualForm, capturedAt: e.target.value })
                        }
                        className="w-full mt-1 px-2 py-1.5 text-xs bg-white dark:bg-[#0a0f1c] border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Bank Settlement Entry */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      2. Bank Settlement &amp; Clearing
                    </span>
                    <button
                      type="button"
                      onClick={autoFillStandardSettlement}
                      className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <Calculator size={12} /> Auto-compute standard
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="manual-settlement-fee" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        Settlement Fee (₹)
                      </label>
                      <input
                        id="manual-settlement-fee"
                        name="manualSettlementFee"
                        type="number"
                        step="0.01"
                        value={manualForm.settlementFee}
                        onChange={(e) =>
                          setManualForm({ ...manualForm, settlementFee: e.target.value })
                        }
                        className="w-full mt-1 px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0a0f1c] border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="manual-settlement-tax" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        Settlement GST 18% (₹)
                      </label>
                      <input
                        id="manual-settlement-tax"
                        name="manualSettlementTax"
                        type="number"
                        step="0.01"
                        value={manualForm.settlementTax}
                        onChange={(e) =>
                          setManualForm({ ...manualForm, settlementTax: e.target.value })
                        }
                        className="w-full mt-1 px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0a0f1c] border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="manual-settlement-net" className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
                        <span>Actual Net Settlement</span>
                      </label>
                      <div className="relative mt-1">
                        <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-semibold">
                          ₹
                        </span>
                        <input
                          id="manual-settlement-net"
                          name="manualSettlementNet"
                          type="number"
                          step="0.01"
                          value={manualForm.settlementNet}
                          onChange={(e) =>
                            setManualForm({ ...manualForm, settlementNet: e.target.value })
                          }
                          className="w-full pl-6 pr-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-[#0a0f1c] border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="manual-bank-utr" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        Bank UTR Reference
                      </label>
                      <input
                        id="manual-bank-utr"
                        name="manualBankUtr"
                        type="text"
                        value={manualForm.utr}
                        onChange={(e) => setManualForm({ ...manualForm, utr: e.target.value })}
                        autoComplete="off"
                        className="w-full mt-1 px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0a0f1c] border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedManual(!showAdvancedManual)}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 font-medium"
                    >
                      <span>{showAdvancedManual ? '− Hide' : '+ Show'} Optional Refund &amp; Adjustment Fields</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Advanced Optional Fields (Refund & Adjustment) */}
              {showAdvancedManual && (
                <div className="p-4 rounded-xl bg-slate-50/60 dark:bg-white/[0.01] border border-slate-200/80 dark:border-white/5 space-y-3 animate-fade-in">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    3. Optional Refund &amp; Adjustment Overrides
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="manual-refund-amount" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          Refund Amount (₹)
                        </label>
                        <input
                          id="manual-refund-amount"
                          name="manualRefundAmount"
                          type="number"
                          step="0.01"
                          value={manualForm.refundAmount}
                          onChange={(e) =>
                            setManualForm({ ...manualForm, refundAmount: e.target.value })
                          }
                          placeholder="e.g. 1500.00"
                          className="w-full mt-1 px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0a0f1c] border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="manual-refund-reason" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          Refund Reason
                        </label>
                        <input
                          id="manual-refund-reason"
                          name="manualRefundReason"
                          type="text"
                          value={manualForm.refundReason}
                          onChange={(e) =>
                            setManualForm({ ...manualForm, refundReason: e.target.value })
                          }
                          placeholder="Order returned"
                          className="w-full mt-1 px-3 py-1.5 text-xs bg-white dark:bg-[#0a0f1c] border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label htmlFor="manual-adjustment-amount" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          Adjustment (₹)
                        </label>
                        <input
                          id="manual-adjustment-amount"
                          name="manualAdjustmentAmount"
                          type="number"
                          step="0.01"
                          value={manualForm.adjustmentAmount}
                          onChange={(e) =>
                            setManualForm({ ...manualForm, adjustmentAmount: e.target.value })
                          }
                          placeholder="e.g. 500.00"
                          className="w-full mt-1 px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0a0f1c] border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="manual-adjustment-type" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          Type
                        </label>
                        <select
                          id="manual-adjustment-type"
                          name="manualAdjustmentType"
                          value={manualForm.adjustmentType}
                          onChange={(e) =>
                            setManualForm({ ...manualForm, adjustmentType: e.target.value })
                          }
                          className="w-full mt-1 px-2 py-1.5 text-xs bg-white dark:bg-[#0a0f1c] border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="credit">Credit</option>
                          <option value="chargeback">Chargeback</option>
                          <option value="penalty">Penalty</option>
                          <option value="fee_adjustment">Fee Adjustment</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="manual-adjustment-reason" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          Reason
                        </label>
                        <input
                          id="manual-adjustment-reason"
                          name="manualAdjustmentReason"
                          type="text"
                          value={manualForm.adjustmentReason}
                          onChange={(e) =>
                            setManualForm({ ...manualForm, adjustmentReason: e.target.value })
                          }
                          placeholder="Chargeback hold"
                          className="w-full mt-1 px-2 py-1.5 text-xs bg-white dark:bg-[#0a0f1c] border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Theoretical vs Actual Reconciliation Preview Card */}
              <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Calculator size={14} className="text-indigo-400" />
                    <span>Real-Time Math &amp; Discrepancy Estimator</span>
                  </span>
                  {theoretical.hasAmount && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        theoretical.hasDiscrepancy
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {theoretical.hasDiscrepancy
                        ? `⚠️ Discrepancy: ₹${Math.abs(parseFloat(theoretical.discrepancy)).toFixed(2)} (${
                            parseFloat(theoretical.discrepancy) < 0 ? 'Underpaid' : 'Overpaid'
                          })`
                        : '✅ Balanced (100% Matched)'}
                    </span>
                  )}
                </div>

                {!theoretical.hasAmount ? (
                  <div className="py-2.5 text-center text-xs text-slate-400">
                    💡 <span className="font-semibold text-slate-200">Awaiting Transaction Input:</span> Enter a payment amount or click any{' '}
                    <span className="text-indigo-300 font-medium">1-Click Quick Test Scenario</span> above to preview live reconciliation math and fee schedules.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Gross Payment</span>
                      <span className="font-mono font-bold text-white text-sm">
                        ₹{parseFloat(manualForm.amount || '0').toFixed(2)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">
                        Standard Fee ({theoretical.ratePercent}%) + GST
                      </span>
                      <span className="font-mono font-bold text-indigo-300 text-sm">
                        ₹{theoretical.totalFee}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Expected Net Payout</span>
                      <span className="font-mono font-bold text-emerald-300 text-sm">
                        ₹{theoretical.expectedNet}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Actual Bank Net</span>
                      <span className="font-mono font-bold text-white text-sm">
                        ₹{theoretical.actualNet}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Add to Queue Button Bar */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {manualRecordsList.length > 0
                    ? `${manualRecordsList.length} transaction(s) queued for this batch`
                    : 'Submit single entry or queue multiple transactions'}
                </span>
                <button
                  type="button"
                  onClick={handleAddManualRecord}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-all"
                >
                  <Plus size={14} />
                  <span>Add to Batch Queue</span>
                </button>
              </div>

              {/* Queued Records Table (if user added multiple) */}
              {manualRecordsList.length > 0 && (
                <div className="space-y-2 border-t border-slate-200 dark:border-white/10 pt-4">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Queued Batch Transactions ({manualRecordsList.length})
                  </span>
                  <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-lg">
                    <table className="w-full text-xs font-mono text-left whitespace-nowrap">
                      <thead className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="p-2.5 font-semibold">Payment ID</th>
                          <th className="p-2.5 font-semibold">Merchant</th>
                          <th className="p-2.5 font-semibold">Amount</th>
                          <th className="p-2.5 font-semibold">Method</th>
                          <th className="p-2.5 font-semibold">Bank Net</th>
                          <th className="p-2.5 font-semibold">UTR</th>
                          <th className="p-2.5 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {manualRecordsList.map((rec, idx) => (
                          <tr key={`${rec.paymentId || 'rec'}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                              {rec.paymentId}
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400">
                              {rec.merchantId}
                            </td>
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white font-mono">
                              {formatINR(rec.amount)}
                            </td>
                            <td className="p-2.5 uppercase text-indigo-600 dark:text-indigo-400">
                              {rec.method}
                            </td>
                            <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              {formatINR(rec.settlementNet)}
                            </td>
                            <td className="p-2.5 text-slate-500 font-mono">{rec.utr}</td>
                            <td className="p-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveManualRecord(idx)}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview for File/Text Tabs */}
        {activeTab !== 'manual' && previewRows.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Data Preview
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={14} /> Parsed Successfully
              </span>
            </div>
            <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-lg">
              <table className="w-full text-xs font-mono text-left whitespace-nowrap">
                <thead className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-white/10">
                  <tr>
                    {Object.keys(previewRows[0])
                      .slice(0, 8)
                      .map((key, hIdx) => (
                        <th key={`head-${key}-${hIdx}`} className="p-3 font-semibold">
                          {key}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-transparent">
                  {previewRows.map((row, i) => (
                    <tr key={`row-${i}-${Object.values(row)[0] || 'r'}`} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      {Object.values(row)
                        .slice(0, 8)
                        .map((val: any, j) => (
                          <td key={`cell-${i}-${j}`} className="p-3 text-slate-600 dark:text-slate-400">
                            {String(val || '-')}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Alerts */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg text-sm text-rose-700 dark:text-rose-400">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end pt-4 border-t border-slate-200 dark:border-white/5">
          <button
            onClick={handleUploadAndRun}
            disabled={
              isUploading ||
              (activeTab !== 'manual' && !fileContent.trim()) ||
              (activeTab === 'manual' &&
                !manualForm.amount &&
                manualRecordsList.length === 0)
            }
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg shadow-indigo-500/20"
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Reconciling &amp; Investigating...</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>
                  {activeTab === 'manual' && manualRecordsList.length > 0
                    ? `Reconcile ${manualRecordsList.length} Transactions`
                    : 'Reconcile & Run AI Investigation'}
                </span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

