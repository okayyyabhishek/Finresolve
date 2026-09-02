import React, { useState } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { Calculator, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatINR } from '../../utils/format';

interface FinancialBreakdownProps {
  breakdown: {
    expected: {
      paymentAmount: string;
      baseFee: string;
      feeRate: string;
      gst: string;
      totalFee: string;
      totalRefunds: string;
      totalAdjustments: string;
      expectedNetAmount: string;
    };
    actual: {
      grossAmount: string;
      feeAmount: string;
      taxAmount: string;
      netAmount: string;
      utr: string;
      settledAt: string;
    } | null;
    discrepancy: string;
    direction: 'shortfall' | 'excess' | 'matched';
  } | null;
}

export const FinancialBreakdown: React.FC<FinancialBreakdownProps> = ({ breakdown }) => {
  const [showFormula, setShowFormula] = useState(false);

  if (!breakdown) return null;

  const { expected, actual, discrepancy, direction } = breakdown;
  const discNum = parseFloat(discrepancy);
  const isShortfall = direction === 'shortfall' || discNum < 0;
  const isExcess = direction === 'excess' || discNum > 0;
  const isMatched = direction === 'matched' || Math.abs(discNum) < 0.01;

  return (
    <GlassCard className="p-6 border border-slate-200 dark:border-indigo-500/25">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-indigo-500/20 pb-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Calculator size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Deterministic Financial Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluated with Decimal.js 20-precision arithmetic (Zero Floating-Point Drift)
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowFormula(!showFormula)}
          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          <span>Formula Explorer</span>
          {showFormula ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Formula Explainer Banner */}
      {showFormula && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-5 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 text-xs text-slate-700 dark:text-slate-300 space-y-1.5"
        >
          <div className="font-bold text-indigo-700 dark:text-indigo-300">
            Expected Net Settlement Calculation Formula:
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-black/40 border border-indigo-200 dark:border-indigo-500/20 text-xs text-slate-900 dark:text-slate-200 font-semibold overflow-x-auto">
            Expected Net = Payment (₹{expected.paymentAmount}) - Base Fee ({expected.feeRate} = ₹{expected.baseFee}) - GST (18% = ₹{expected.gst}) - Refunds (₹{expected.totalRefunds}) - Adjustments (₹{expected.totalAdjustments}) = ₹{expected.expectedNetAmount}
          </div>
        </motion.div>
      )}

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Card 1: Theoretical Expected Ledger */}
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-indigo-950/20 border border-slate-200 dark:border-indigo-500/25 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-indigo-500/20 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Theoretical Expected
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
              Contract Schedule
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Gross Captured Amount:</span>
              <span className="font-bold text-slate-900 dark:text-slate-200 font-mono">{formatINR(expected.paymentAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Base MDR Fee ({expected.feeRate}):</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">-{formatINR(expected.baseFee)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>GST on Fee (18%):</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">-{formatINR(expected.gst)}</span>
            </div>
            {parseFloat(expected.totalRefunds) > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Refund Deductions:</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">-{formatINR(expected.totalRefunds)}</span>
              </div>
            )}
            {parseFloat(expected.totalAdjustments) > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Chargeback / Adjustments:</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">-{formatINR(expected.totalAdjustments)}</span>
              </div>
            )}

            <div className="pt-2.5 border-t border-slate-200 dark:border-indigo-500/20 flex justify-between items-center text-sm font-bold">
              <span className="text-slate-800 dark:text-slate-100">Expected Net Settlement:</span>
              <span className="text-indigo-600 dark:text-indigo-400 text-base font-mono">{formatINR(expected.expectedNetAmount)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Bank Settled Reality */}
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Bank Settled Reality
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Clearing File
            </span>
          </div>

          {actual ? (
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Bank Gross Amount:</span>
                <span className="font-bold text-slate-900 dark:text-slate-200 font-mono">{formatINR(actual.grossAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Bank Deducted Fee:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{formatINR(actual.feeAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Bank Deducted Tax:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{formatINR(actual.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>UTR Reference:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold truncate max-w-[140px] font-mono">{actual.utr}</span>
              </div>

              <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm font-bold">
                <span className="text-slate-800 dark:text-slate-100">Actual Net Disbursed:</span>
                <span className="text-slate-900 dark:text-slate-200 text-base font-mono">{formatINR(actual.netAmount)}</span>
              </div>
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-center text-xs text-rose-500 dark:text-rose-400 space-y-1">
              <AlertTriangle size={24} />
              <span className="font-bold">Missing Bank Settlement Record</span>
              <span className="text-xs text-slate-400">No matching UTR record in clearing batch</span>
            </div>
          )}
        </div>
      </div>

      {/* Discrepancy Status Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          isMatched
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
            : isShortfall
            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300'
        }`}
      >
        <div className="flex items-center gap-2">
          {isMatched ? (
            <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertTriangle size={18} className={`${isShortfall ? 'text-rose-500' : 'text-amber-500'} flex-shrink-0`} />
          )}
          <span className="font-semibold">
            {isMatched
              ? 'Zero Financial Discrepancy (100% Reconciled)'
              : isShortfall
              ? `Shortfall Detected: Bank settled ${formatINR(Math.abs(discNum))} less than contractual calculation.`
              : `Excess Disbursed: Bank settled ${formatINR(discNum)} higher than expected.`}
          </span>
        </div>

        <div className="font-bold text-sm font-mono whitespace-nowrap">
          Δ {formatINR(Math.abs(discNum).toString())}
        </div>
      </div>
    </GlassCard>
  );
};
