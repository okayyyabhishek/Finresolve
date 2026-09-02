import React from 'react';
import { GlassCard } from '../shared/GlassCard';
import { AuditRecordItem } from '../../types';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Lock } from 'lucide-react';

interface PolicyDecisionCardProps {
  auditRecord: AuditRecordItem | null;
}

export const PolicyDecisionCard: React.FC<PolicyDecisionCardProps> = ({ auditRecord }) => {
  if (!auditRecord) return null;

  const isAutoResolve = auditRecord.policyDecision === 'auto_resolve';

  return (
    <GlassCard className="p-6 border border-slate-200 dark:border-indigo-500/25">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-indigo-500/20 pb-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl ${
              isAutoResolve
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
            }`}
          >
            {isAutoResolve ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Deterministic Policy Gate Decision
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pure safety evaluator: LLMs propose hypotheses, Policy Gates authorize funds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Lock size={14} className="text-slate-400" />
          <span
            className={`px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isAutoResolve
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
            }`}
          >
            {auditRecord.policyDecision.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Decision Summary Card */}
      <div
        className={`p-4 rounded-2xl mb-5 border ${
          isAutoResolve
            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
            : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200'
        }`}
      >
        <div className="text-xs font-bold uppercase tracking-wider mb-1">
          Policy Evaluation Rationale:
        </div>
        <p className="text-xs leading-relaxed font-normal">{auditRecord.policyReason}</p>
      </div>

      {/* 6-Checkpoint Safety Rules Applied */}
      {auditRecord.policyRulesApplied && auditRecord.policyRulesApplied.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Safety Gate Rule Verifications:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {auditRecord.policyRulesApplied.map((rule, idx) => (
              <div
                key={`${rule.rule || 'rule'}-${idx}`}
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs transition-all ${
                  rule.passed
                    ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300'
                    : 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
                }`}
              >
                {rule.passed ? (
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-200">{rule.rule}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{rule.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
};
