import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Download, X, AlertCircle, CheckCircle2, Loader2, Play } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { api } from '../../api/client';

interface BatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (batchId: string) => void;
}

export const BatchUploadModal: React.FC<BatchUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [batchId, setBatchId] = useState(`BATCH-CUSTOM-${Date.now().toString().slice(-4)}`);
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parseAndPreview = (content: string) => {
    try {
      if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
        const json = JSON.parse(content);
        const records = Array.isArray(json) ? json : json.records || json.payments || [];
        setPreviewRows(records.slice(0, 5));
      } else {
        // CSV
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
      link.setAttribute('download', 'finresolve_sample_settlement_batch.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download template', err);
    }
  };

  const handleUploadAndRun = async () => {
    if (!fileContent.trim()) {
      setErrorMsg('Please select a CSV/JSON file or paste data before uploading.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let payload: any = { batchId };
      if (fileContent.trim().startsWith('[') || fileContent.trim().startsWith('{')) {
        const json = JSON.parse(fileContent);
        payload.records = Array.isArray(json) ? json : json.records || json.payments || [];
      } else {
        payload.csvContent = fileContent;
      }

      const result = await api.uploadBatch(payload);
      setSuccessMsg(`Successfully uploaded & reconciled batch: ${result.batchId}`);
      setTimeout(() => {
        onSuccess(result.batchId);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to upload batch');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <GlassCard className="p-6 border-indigo-500/40 shadow-2xl space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-indigo-500/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <UploadCloud size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Upload Settlement Batch Data</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Import transaction records (CSV / JSON) for automated reconciliation & investigation
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-indigo-950/40 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Controls Bar: Batch ID & Template Download */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-indigo-950/20 p-3 rounded-xl border border-slate-200 dark:border-indigo-500/20">
            <div className="flex items-center gap-2">
              <label htmlFor="modal-batch-id-input" className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-mono cursor-pointer">
                Batch Identifier:
              </label>
              <input
                id="modal-batch-id-input"
                name="modalBatchId"
                type="text"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                autoComplete="off"
                className="px-2.5 py-1 text-xs font-mono font-bold bg-white dark:bg-[#0a0a0f] border border-slate-300 dark:border-indigo-500/30 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={downloadSampleTemplate}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <Download size={14} />
              <span>Download Sample CSV Template</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-indigo-500/20">
            <button
              onClick={() => setActiveTab('file')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'file'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <UploadCloud size={16} />
              <span>Drag & Drop File (.csv / .json)</span>
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'text'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <FileText size={16} />
              <span>Direct Text Editor</span>
            </button>
          </div>

          {/* Tab 1: File Drag & Drop */}
          {activeTab === 'file' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-indigo-500/40 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-8 text-center cursor-pointer bg-slate-50/50 dark:bg-indigo-950/10 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all"
            >
              <input
                id="modal-file-upload-input"
                name="modalBatchFile"
                ref={fileInputRef}
                type="file"
                aria-label="Upload settlement batch file"
                accept=".csv,.json,text/csv,application/json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="flex flex-col items-center gap-2">
                <UploadCloud size={40} className="text-indigo-500 animate-bounce" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {fileName ? `Selected: ${fileName}` : 'Click to browse or drag & drop settlement batch file'}
                </p>
                <p className="text-xs text-slate-500 font-mono">Supports standard Razorpay/Bank CSV or JSON export files</p>
              </div>
            </div>
          )}

          {/* Tab 2: Raw Text Editor */}
          {activeTab === 'text' && (
            <div className="space-y-2">
              <textarea
                id="modal-raw-csv-textarea"
                name="modalRawCsvContent"
                aria-label="Raw CSV or JSON batch content"
                value={fileContent}
                onChange={(e) => {
                  setFileContent(e.target.value);
                  parseAndPreview(e.target.value);
                }}
                placeholder="Paste CSV (with header) or JSON records array here..."
                rows={7}
                className="w-full p-3 font-mono text-xs bg-white dark:bg-[#0a0a0f] border border-slate-300 dark:border-indigo-500/30 rounded-xl text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Live Preview Section */}
          {previewRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold font-mono text-slate-700 dark:text-slate-300">
                  Data Preview (First {previewRows.length} Rows):
                </span>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">✓ Parsed Successfully</span>
              </div>
              <div className="overflow-x-auto border border-slate-200 dark:border-indigo-500/20 rounded-xl max-h-36">
                <table className="w-full text-[11px] font-mono text-left">
                  <thead className="bg-slate-100 dark:bg-indigo-950/40 text-slate-600 dark:text-slate-300">
                    <tr>
                      {Object.keys(previewRows[0]).slice(0, 6).map((key, hIdx) => (
                        <th key={`modal-th-${key}-${hIdx}`} className="p-2 font-semibold">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-indigo-500/10">
                    {previewRows.map((row, i) => (
                      <tr key={`modal-row-${i}-${Object.values(row)[0] || 'r'}`} className="hover:bg-slate-50 dark:hover:bg-indigo-950/20">
                        {Object.values(row).slice(0, 6).map((val: any, j) => (
                          <td key={`modal-cell-${i}-${j}`} className="p-2 text-slate-700 dark:text-slate-300">
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
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={16} className="flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-indigo-500/20">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-indigo-950/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadAndRun}
              disabled={isUploading || !fileContent.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Processing Pipeline...</span>
                </>
              ) : (
                <>
                  <Play size={15} />
                  <span>Upload & Run Investigation</span>
                </>
              )}
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
