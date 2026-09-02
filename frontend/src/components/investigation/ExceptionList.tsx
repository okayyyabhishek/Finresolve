import React from 'react';
import { ExceptionItem } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatINR } from '../../utils/format';

interface ExceptionListProps {
  exceptions: ExceptionItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  counts: Record<string, number>;
  filters: any;
  onFilterChange: (filters: any) => void;
  loading: boolean;
}

export const ExceptionList: React.FC<ExceptionListProps> = ({
  exceptions,
  selectedId,
  onSelect,
  counts,
  filters,
  onFilterChange,
  loading
}) => {
  const autoResolvedCount = counts.auto_resolved || 0;
  const escalatedCount = counts.escalated || 0;
  const totalCount = exceptions.length;

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-200 dark:border-indigo-500/20 bg-white/85 dark:bg-[#12121e]/80 backdrop-blur-xl p-3.5 sm:p-4 shadow-sm transition-colors">
      {/* Top Header & Live Counter Badges */}
      <div className="border-b border-slate-200 dark:border-indigo-500/20 pb-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Exception Queue
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
            {totalCount} Total
          </span>
        </div>

        {/* Count Summary Chips */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            {autoResolvedCount} Auto-Resolved
          </span>
          <span className="px-2.5 py-0.5 rounded-full font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
            {escalatedCount} Escalated
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2 mb-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            id="exception-search-input"
            name="exceptionSearch"
            type="text"
            placeholder="Search payment or exception ID..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            autoComplete="off"
            aria-label="Search payment or exception ID"
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 dark:bg-[#0a0a0f] border border-slate-300 dark:border-indigo-500/20 rounded-xl text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Status Filter */}
          <select
            id="exception-status-filter"
            name="exceptionStatusFilter"
            aria-label="Filter by exception status"
            value={filters.status || ''}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value || undefined })}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-[#0a0a0f] border border-slate-300 dark:border-indigo-500/20 rounded-xl text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="auto_resolved">Auto Resolved</option>
            <option value="escalated">Escalated</option>
            <option value="detected">Detected</option>
            <option value="investigating">Investigating</option>
            <option value="human_approved">Approved</option>
            <option value="human_rejected">Rejected</option>
          </select>

          {/* Type Filter */}
          <select
            id="exception-type-filter"
            name="exceptionTypeFilter"
            aria-label="Filter by anomaly type"
            value={filters.type || ''}
            onChange={(e) => onFilterChange({ ...filters, type: e.target.value || undefined })}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-[#0a0a0f] border border-slate-300 dark:border-indigo-500/20 rounded-xl text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="">All Anomaly Types</option>
            <option value="fee_mismatch">Fee Mismatch</option>
            <option value="gst_mismatch">GST Mismatch</option>
            <option value="missing_settlement">Missing Settlement</option>
            <option value="duplicate_settlement">Duplicate Settlement</option>
            <option value="partial_settlement">Partial Settlement</option>
            <option value="refund_not_adjusted">Refund Not Adjusted</option>
            <option value="duplicate_refund">Duplicate Refund</option>
            <option value="unexpected_adjustment">Unexpected Adj.</option>
            <option value="amount_mismatch">Amount Mismatch</option>
            <option value="multi_factor">Multi-Factor</option>
          </select>
        </div>
      </div>

      {/* Exception Scroll List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[500px] lg:max-h-none">
        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400 font-medium">Loading exceptions...</div>
        ) : exceptions.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400 font-medium">No exceptions found</div>
        ) : (
          exceptions.map((item, idx) => {
            const isSelected = selectedId === item.exceptionId;
            const discNum = parseFloat(item.discrepancy || '0');
            const isDiscrepancyPositive = discNum > 0.0001;
            const isDiscrepancyNegative = discNum < -0.0001;

            return (
              <motion.div
                key={`${item.exceptionId || 'exp'}-${item.batchId || 'b'}-${idx}`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSelect(item.exceptionId)}
                className={`
                  p-3.5 rounded-xl cursor-pointer border transition-all duration-200
                  ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-500/80 shadow-xs'
                      : 'bg-slate-50 dark:bg-[#0e0e18]/80 hover:bg-slate-100 dark:hover:bg-[#151525] border-slate-200 dark:border-slate-800'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-200 tracking-tight">
                    {item.exceptionId}
                  </span>
                  <StatusBadge status={item.status} size="sm" />
                </div>

                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">
                    {item.paymentId}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium capitalize text-xs">
                    {item.type.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 dark:border-slate-800/80 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Expected: {formatINR(item.expectedAmount)}
                  </span>
                  <span
                    className={`font-bold text-xs font-mono ${
                      isDiscrepancyNegative
                        ? 'text-rose-600 dark:text-rose-400'
                        : isDiscrepancyPositive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500'
                    }`}
                  >
                    Δ {formatINR(item.discrepancy, { showSign: true })}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
