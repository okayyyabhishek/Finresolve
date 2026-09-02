import React, { useState } from 'react';
import { ExceptionFullDetail } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { ConfidenceMeter } from '../shared/ConfidenceMeter';
import { GlassCard } from '../shared/GlassCard';
import { FinancialBreakdown } from './FinancialBreakdown';
import { EvidenceChain } from './EvidenceChain';
import { PolicyDecisionCard } from './PolicyDecisionCard';
import { HumanReviewPanel } from './HumanReviewPanel';
import {
  Bot,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';
import { formatINR } from '../../utils/format';

interface ExceptionDetailProps {
  detail: ExceptionFullDetail | null;
  loading: boolean;
  onBackToQueue?: () => void;
  onSubmitReview: (
    action: 'approve' | 'reject' | 'request_more_evidence',
    reviewer?: string,
    comment?: string
  ) => Promise<void>;
}

export const ExceptionDetail: React.FC<ExceptionDetailProps> = ({
  detail,
  loading,
  onBackToQueue,
  onSubmitReview
}) => {
  const [showRelated, setShowRelated] = useState(false);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-indigo-500/20 bg-white/80 dark:bg-[#12121e]/80 backdrop-blur-xl">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading comprehensive investigation record...</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="h-full flex items-center justify-center p-8 sm:p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-[#12121e]/40 text-center">
        <div className="max-w-md space-y-2">
          <AlertCircle size={32} className="text-indigo-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Select an Exception</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Choose an item from the exception queue on the left to inspect its deterministic breakdown, audit-grade evidence, and policy gate decision.
          </p>
        </div>
      </div>
    );
  }

  const { exception, payment, settlements, fees, refunds, adjustments, investigation, auditRecord, financialBreakdown } = detail;
  const discrepancyNum = parseFloat(exception.discrepancy || '0');
  const isNegative = discrepancyNum < -0.0001;
  const isPositive = discrepancyNum > 0.0001;

  const confidenceVal = investigation ? parseFloat(investigation.confidence) : 0;
  const completenessVal = investigation ? parseFloat(investigation.evidenceCompleteness) : 0;

  return (
    <div className="h-full overflow-y-auto pr-1 sm:pr-2 space-y-4 sm:space-y-6 pb-12">
      {/* Mobile Back to Queue Button */}
      {onBackToQueue && (
        <button
          onClick={onBackToQueue}
          className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs w-fit"
        >
          <ChevronLeft size={16} />
          <span>Back to Exception Queue</span>
        </button>
      )}

      {/* SECTION 1: HEADER */}
      <GlassCard className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tracking-tight font-mono">
                {exception.exceptionId}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                Payment: {exception.paymentId}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                Severity: {exception.severity}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 capitalize tracking-tight">
              {exception.type.replace(/_/g, ' ')}
            </h2>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-white/5">
            <div className="text-left sm:text-right">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Discrepancy Amount
              </div>
              <div
                className={`text-xl sm:text-2xl font-bold tracking-tight font-mono ${
                  isNegative
                    ? 'text-rose-600 dark:text-rose-400'
                    : isPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {formatINR(exception.discrepancy, { showSign: true })}
              </div>
            </div>

            <StatusBadge status={exception.status} size="lg" />
          </div>
        </div>
      </GlassCard>

      {/* SECTION 2: FINANCIAL BREAKDOWN */}
      <FinancialBreakdown breakdown={financialBreakdown} />

      {/* SECTION 3: COLLAPSIBLE RELATED RECORDS */}
      <GlassCard className="p-4">
        <button
          onClick={() => setShowRelated(!showRelated)}
          className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 select-none hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Layers size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span>Underlying Ledger Documents</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
              {settlements.length} Settlements • {fees.length} Fees • {refunds.length} Refunds • {adjustments.length} Adjustments
            </span>
          </div>
          {showRelated ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showRelated && (
          <div className="mt-4 space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
            {/* Payment Record */}
            {payment && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="text-indigo-600 dark:text-indigo-400 font-bold mb-2">Payment Record:</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <div><span className="text-slate-400">Amount:</span> {formatINR(payment.amount)}</div>
                  <div><span className="text-slate-400">Method:</span> <span className="uppercase font-semibold">{payment.method}</span></div>
                  <div><span className="text-slate-400">Merchant:</span> {payment.merchantId}</div>
                  <div><span className="text-slate-400">Captured:</span> {new Date(payment.capturedAt).toLocaleDateString()}</div>
                </div>
              </div>
            )}

            {/* Settlements */}
            {settlements.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="text-indigo-600 dark:text-indigo-400 font-bold mb-2">Settlement Entries:</div>
                {settlements.map((s, idx) => (
                  <div key={`${s.settlementId || 'settle'}-${s.utr || idx}-${idx}`} className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800/40 pb-1.5 mb-1.5 last:border-0 last:pb-0 last:mb-0">
                    <div><span className="text-slate-400">ID:</span> {s.settlementId}</div>
                    <div><span className="text-slate-400">Net:</span> <span className="font-bold">{formatINR(s.netAmount)}</span></div>
                    <div><span className="text-slate-400">Fee:</span> {formatINR(s.feeAmount)}</div>
                    <div className="truncate"><span className="text-slate-400">UTR:</span> {s.utr}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Refunds */}
            {refunds.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="text-indigo-600 dark:text-indigo-400 font-bold mb-2">Refund Entries:</div>
                {refunds.map((r, idx) => (
                  <div key={`${r.refundId || 'ref'}-${idx}`} className="text-xs text-slate-700 dark:text-slate-300 mb-1 last:mb-0">
                    <span className="font-semibold">Refund {r.refundId}:</span> {formatINR(r.amount)} — Reason: "{r.reason}"
                  </div>
                ))}
              </div>
            )}

            {/* Adjustments */}
            {adjustments.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="text-indigo-600 dark:text-indigo-400 font-bold mb-2">Adjustment Entries:</div>
                {adjustments.map((a, idx) => (
                  <div key={`${a.adjustmentId || 'adj'}-${a.type || idx}-${idx}`} className="text-xs text-slate-700 dark:text-slate-300 mb-1 last:mb-0">
                    <span className="font-semibold">Adjustment {a.adjustmentId} ({a.type}):</span> {formatINR(a.amount)} — "{a.reason}"
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* SECTION 4: AI INVESTIGATION RESULT */}
      {investigation && (
        <GlassCard className="p-4 sm:p-6 border border-slate-200 dark:border-indigo-500/30">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-indigo-500/20 mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <Bot size={18} />
              <span>Autonomous Investigation Agent Output</span>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
              Model: {investigation.agentModel}
            </span>
          </div>

          {/* Root Cause Card */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/25 mb-4 sm:mb-5">
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider mb-1">
              Identified Root Cause:
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
              {investigation.rootCause}
            </p>
          </div>

          {/* Meters & Action Recommendation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-center p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 mb-4 sm:mb-5">
            <ConfidenceMeter
              score={confidenceVal}
              label="Investigation Confidence"
              size={100}
            />

            <ConfidenceMeter
              score={completenessVal}
              label="Evidence Completeness"
              size={100}
            />

            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Recommended Action
              </span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40">
                {investigation.recommendedAction.replace(/_/g, ' ')}
              </span>
              <span className="text-[11px] text-slate-500">
                Duration: {investigation.durationMs}ms
              </span>
            </div>
          </div>

          {/* Reasoning Quote Block */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-100 dark:bg-slate-950/60 border-l-4 border-indigo-500 text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
            "{investigation.reasoning}"
          </div>
        </GlassCard>
      )}

      {/* SECTION 5: EVIDENCE CHAIN */}
      {investigation && (
        <EvidenceChain evidence={investigation.evidence || []} />
      )}

      {/* SECTION 6: POLICY DECISION */}
      <PolicyDecisionCard auditRecord={auditRecord} />

      {/* SECTION 7: HUMAN REVIEW WORKSPACE */}
      {(exception.status === 'escalated' || exception.status === 'human_approved' || exception.status === 'human_rejected') && (
        <HumanReviewPanel
          exception={exception}
          onSubmitReview={onSubmitReview}
        />
      )}
    </div>
  );
};
