import React, { useState } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { ExceptionItem } from '../../types';
import { UserCheck, Check, X, FileQuestion, Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface HumanReviewPanelProps {
  exception: ExceptionItem;
  onSubmitReview: (
    action: 'approve' | 'reject' | 'request_more_evidence',
    reviewer?: string,
    comment?: string
  ) => Promise<void>;
}

export const HumanReviewPanel: React.FC<HumanReviewPanelProps> = ({
  exception,
  onSubmitReview
}) => {
  const [action, setAction] = useState<'approve' | 'reject' | 'request_more_evidence'>('approve');
  const [reviewer, setReviewer] = useState('Senior Finance Officer');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const quickComments = [
    'Verified with Bank clearing statement. Approving discrepancy adjustment.',
    'Rate card mismatch confirmed with merchant contract. Approving fee clawback.',
    'Insufficient bank UTR trail. Escalating to banking ops partner.',
    'Rejecting duplicate refund debit after customer reconciliation.'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmitReview(action, reviewer, comment);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to submit review', err);
    } finally {
      setSubmitting(false);
    }
  };

  const isAlreadyReviewed = exception.status === 'human_approved' || exception.status === 'human_rejected';

  return (
    <GlassCard className="p-6 border border-slate-200 dark:border-indigo-500/25">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-indigo-500/20 pb-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <UserCheck size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Human Controller Review Workspace
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supervisor sign-off required for escalated high-impact settlement discrepancies
            </p>
          </div>
        </div>

        {isAlreadyReviewed && (
          <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
            Reviewed: {exception.status.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Action Selection Buttons */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Select Controller Decision:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setAction('approve')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                action === 'approve'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
              }`}
            >
              <Check size={16} />
              <span>Approve Action</span>
            </button>

            <button
              type="button"
              onClick={() => setAction('reject')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                action === 'reject'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/30'
                  : 'bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-rose-400'
              }`}
            >
              <X size={16} />
              <span>Reject Proposal</span>
            </button>

            <button
              type="button"
              onClick={() => setAction('request_more_evidence')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                action === 'request_more_evidence'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-lg shadow-amber-600/30'
                  : 'bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
              }`}
            >
              <FileQuestion size={16} />
              <span>Request Evidence</span>
            </button>
          </div>
        </div>

        {/* Reviewer Identifier Input */}
        <div>
          <label htmlFor="reviewer-identifier" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Supervisor Identifier:
          </label>
          <input
            id="reviewer-identifier"
            name="reviewerIdentifier"
            type="text"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            autoComplete="name"
            className="w-full p-2.5 text-xs bg-slate-50 dark:bg-[#0a0a0f] border border-slate-300 dark:border-indigo-500/30 rounded-xl text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        {/* Audit Comment with Quick Chips */}
        <div>
          <label htmlFor="audit-justification-comment" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Audit Comment & Justification:
          </label>
          <textarea
            id="audit-justification-comment"
            name="auditJustificationComment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Enter reason for supervisor decision (will be stored in immutable audit trail)..."
            className="w-full p-3 text-xs bg-slate-50 dark:bg-[#0a0a0f] border border-slate-300 dark:border-indigo-500/30 rounded-xl text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 mb-2 leading-relaxed"
          />

          {/* Quick Comment Chips */}
          <div className="flex flex-wrap gap-1.5">
            {quickComments.map((qc, idx) => (
              <button
                key={qc || `qc-${idx}`}
                type="button"
                onClick={() => setComment(qc)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-indigo-950/40 hover:bg-indigo-50 dark:hover:bg-indigo-900/60 border border-slate-200 dark:border-indigo-500/20 text-slate-600 dark:text-indigo-300 text-left transition-colors"
              >
                + "{qc.slice(0, 38)}..."
              </button>
            ))}
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-indigo-500/20">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Recorded to immutable Audit Ledger
          </span>

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            <Send size={14} />
            <span>{submitting ? 'Recording Audit...' : 'Submit Controller Decision'}</span>
          </button>
        </div>

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs text-center font-bold"
          >
            ✓ Controller decision and audit justification successfully recorded!
          </motion.div>
        )}
      </form>
    </GlassCard>
  );
};
