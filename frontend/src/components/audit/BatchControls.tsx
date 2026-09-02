import React, { useState } from 'react';
import { Database, Play, CheckCircle2, Clock, Sparkles } from 'lucide-react';

interface BatchControlsProps {
  batchId?: string;
  onGenerate: (seed?: number) => Promise<any>;
  onProcess: () => Promise<any>;
  onBatchChange?: (newBatchId: string) => void;
  isProcessing: boolean;
  progressMessage?: string;
}

export const BatchControls: React.FC<BatchControlsProps> = ({
  batchId,
  onGenerate,
  onProcess,
  onBatchChange,
  isProcessing,
  progressMessage
}) => {
  const [generating, setGenerating] = useState(false);
  const [seed, setSeed] = useState(42);
  const [message, setMessage] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await onGenerate(seed);
      setMessage(`Generated benchmark batch with seed ${seed}`);
      if (onBatchChange && res.batchId) {
        onBatchChange(res.batchId);
      }
    } catch (err: any) {
      setMessage(`Generation error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleProcess = async () => {
    setMessage(null);
    try {
      await onProcess();
      setMessage('Full batch reconciliation and investigation pipeline finished.');
    } catch (err: any) {
      setMessage(`Processing error: ${err.message}`);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            <Sparkles size={16} />
            <span>Audit Pipeline Controller</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Active Batch: <span className="text-slate-900 dark:text-white font-mono font-medium bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded ml-1">{batchId || 'None'}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-sm">
            <label htmlFor="pipeline-seed-input" className="text-slate-500 dark:text-slate-400 cursor-pointer">Seed:</label>
            <input
              id="pipeline-seed-input"
              name="pipelineSeed"
              type="number"
              aria-label="Random seed for synthetic generation"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value, 10) || 42)}
              className="w-16 bg-transparent text-slate-900 dark:text-white font-mono focus:outline-none"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || isProcessing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            <Database size={16} />
            {generating ? 'Generating...' : 'Generate Synthetic Data'}
          </button>

          <button
            onClick={handleProcess}
            disabled={generating || isProcessing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all disabled:opacity-50 shadow-sm"
          >
            <Play size={16} />
            {isProcessing ? 'Processing Pipeline...' : 'Run Audit'}
          </button>
        </div>
      </div>

      {(isProcessing || progressMessage || message) && (
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium">
            {isProcessing ? (
              <>
                <Clock size={16} className="animate-spin" />
                <span>{progressMessage || 'Executing Reconciliation Pipeline...'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="text-slate-700 dark:text-slate-300">{message}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
