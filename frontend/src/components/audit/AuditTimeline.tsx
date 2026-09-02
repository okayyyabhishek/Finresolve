import React, { useState } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { AuditRecordItem } from '../../types';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Search, Download, ExternalLink } from 'lucide-react';
import { formatINR } from '../../utils/format';

interface AuditTimelineProps {
  records: AuditRecordItem[];
  loading: boolean;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ records, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('');
  const navigate = useNavigate();

  const filteredRecords = records.filter((r) => {
    const excId = r.exceptionId || '';
    const polReason = r.policyReason || '';
    const matchesSearch =
      excId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      polReason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = decisionFilter ? r.policyDecision === decisionFilter : true;
    return matchesSearch && matchesFilter;
  });

  const exportAuditCsv = () => {
    const headers = ['Audit ID', 'Exception ID', 'Decision', 'Policy Reason', 'Financial Impact', 'Human Review', 'Timestamp'];
    const rows = records.map((r) => [
      r.auditId,
      r.exceptionId,
      r.policyDecision,
      `"${(r.policyReason || '').replace(/"/g, '""')}"`,
      r.financialImpact,
      r.humanReview?.action || 'None',
      r.createdAt
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `finresolve_audit_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <GlassCard className="p-6 border border-slate-200 dark:border-indigo-500/25 space-y-5">
      {/* Header with Search and Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-indigo-500/20 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Immutable Audit Trail & Policy Gate Execution Log
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cryptographic-grade execution trail of all autonomous and human supervisor decisions
          </p>
        </div>

        <button
          onClick={exportAuditCsv}
          disabled={records.length === 0}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-indigo-950/60 hover:bg-slate-200 dark:hover:bg-indigo-900/80 border border-slate-300 dark:border-indigo-500/30 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors shadow-sm disabled:opacity-50"
        >
          <Download size={14} />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            id="audit-search-input"
            name="auditSearchQuery"
            type="text"
            placeholder="Search audit records by exception ID or rule text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search audit records"
            autoComplete="off"
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 dark:bg-[#0a0a0f] border border-slate-300 dark:border-indigo-500/20 rounded-xl text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <select
          id="audit-decision-filter"
          name="auditDecisionFilter"
          aria-label="Filter by policy decision"
          value={decisionFilter}
          onChange={(e) => setDecisionFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-100 dark:bg-[#0a0a0f] border border-slate-300 dark:border-indigo-500/20 rounded-xl text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Policy Decisions</option>
          <option value="auto_resolve">Auto Resolved</option>
          <option value="escalate">Escalated</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-indigo-500/20 rounded-2xl">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 dark:bg-indigo-950/40 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-indigo-500/20">
            <tr>
              <th className="p-3.5 font-bold">Audit ID</th>
              <th className="p-3.5 font-bold">Exception Ref</th>
              <th className="p-3.5 font-bold">Policy Decision</th>
              <th className="p-3.5 font-bold">Checkpoints</th>
              <th className="p-3.5 font-bold">Financial Discrepancy</th>
              <th className="p-3.5 font-bold">Outcome</th>
              <th className="p-3.5 font-bold text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-indigo-500/10">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">Loading audit trail...</td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">No matching audit records found.</td>
              </tr>
            ) : (
              filteredRecords.map((r, idx) => {
                const isAuto = r.policyDecision === 'auto_resolve';
                const passedCount = r.policyRulesApplied?.filter((p) => p.passed).length || 0;
                const totalRules = r.policyRulesApplied?.length || 0;

                return (
                  <tr
                    key={r.auditId || `audit-record-${idx}`}
                    className="hover:bg-slate-50 dark:hover:bg-indigo-950/20 transition-colors"
                  >
                    <td className="p-3.5 font-bold text-indigo-600 dark:text-indigo-400">
                      {r.auditId}
                    </td>

                    <td className="p-3.5 text-slate-900 dark:text-slate-200 font-bold">
                      {r.exceptionId}
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          isAuto
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                        }`}
                      >
                        {isAuto ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                        <span>{(r.policyDecision || '').replace(/_/g, ' ')}</span>
                      </span>
                    </td>

                    <td className="p-3.5 text-slate-600 dark:text-slate-400 text-xs">
                      {passedCount}/{totalRules} rules passed
                    </td>

                    <td className="p-3.5 font-bold text-slate-900 dark:text-slate-200 font-mono">
                      {formatINR(r.financialImpact)}
                    </td>

                    <td className="p-3.5">
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {r.finalOutcome || 'Pending'}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => navigate(`/investigations?exceptionId=${r.exceptionId}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-indigo-900/40 transition-colors"
                        title="Open in Investigation Workspace"
                      >
                        <ExternalLink size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};
