import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useExceptions } from '../hooks/useExceptions';
import { useInvestigation } from '../hooks/useInvestigation';
import { ExceptionList } from '../components/investigation/ExceptionList';
import { ExceptionDetail } from '../components/investigation/ExceptionDetail';
import { ListFilter, FileText } from 'lucide-react';

export const InvestigationView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryExceptionId = searchParams.get('exceptionId');
  
  const {
    exceptions,
    counts,
    loading: exceptionsLoading,
    filters,
    setFilters,
    refetch: refetchExceptions
  } = useExceptions();

  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(queryExceptionId);
  const [mobileTab, setMobileTab] = useState<'queue' | 'detail'>(queryExceptionId ? 'detail' : 'queue');

  // Auto-select first exception if none selected on desktop
  useEffect(() => {
    if (!selectedExceptionId && exceptions.length > 0) {
      const firstId = exceptions[0].exceptionId;
      setSelectedExceptionId(firstId);
      setSearchParams({ exceptionId: firstId });
    } else if (queryExceptionId && queryExceptionId !== selectedExceptionId) {
      setSelectedExceptionId(queryExceptionId);
    }
  }, [exceptions, queryExceptionId, selectedExceptionId, setSearchParams]);

  // Listen to soft batch upload event from UploadView
  useEffect(() => {
    const handler = () => {
      refetchExceptions();
    };
    window.addEventListener('finresolve:batch-uploaded', handler);
    return () => window.removeEventListener('finresolve:batch-uploaded', handler);
  }, [refetchExceptions]);

  const {
    detail,
    loading: detailLoading,
    refetch: refetchDetail,
    submitReview
  } = useInvestigation(selectedExceptionId);

  const handleSelectException = (id: string) => {
    setSelectedExceptionId(id);
    setSearchParams({ exceptionId: id });
    setMobileTab('detail');
  };

  const handleReview = async (
    action: 'approve' | 'reject' | 'request_more_evidence',
    reviewer?: string,
    comment?: string
  ) => {
    await submitReview(action, reviewer, comment);
    await refetchExceptions();
    await refetchDetail();
  };

  const totalPipeline = (counts.detected || 0) + (counts.investigating || 0) + (counts.auto_resolved || 0) + (counts.escalated || 0);

  return (
    <div className="min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)] flex flex-col space-y-4 animate-fade-in">
      {/* Header and Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Active Investigations
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Review and resolve flagged discrepancies with autonomous AI evidence
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 w-fit">
          <div className="text-xs">
            <span className="text-slate-500 dark:text-slate-400">Total: </span>
            <span className="font-bold text-slate-900 dark:text-white ml-1">
              {totalPipeline}
            </span>
          </div>
          <div className="w-px h-3 bg-slate-300 dark:bg-white/10" />
          <div className="text-xs">
            <span className="text-slate-500 dark:text-slate-400">Escalated: </span>
            <span className="font-bold text-amber-600 dark:text-amber-400 ml-1">
              {counts.escalated || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile View Toggle Switch */}
      <div className="lg:hidden flex rounded-xl bg-slate-200/80 dark:bg-[#0e0e18] p-1 border border-slate-200 dark:border-white/5">
        <button
          onClick={() => setMobileTab('queue')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
            mobileTab === 'queue'
              ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <ListFilter size={14} />
          <span>Queue ({exceptions.length})</span>
        </button>

        <button
          onClick={() => setMobileTab('detail')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
            mobileTab === 'detail'
              ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileText size={14} />
          <span>Investigation Detail {selectedExceptionId ? `(${selectedExceptionId})` : ''}</span>
        </button>
      </div>

      {/* Main Responsive Two-Panel Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Left Panel: Exception Queue */}
        <div
          className={`lg:col-span-4 h-full overflow-hidden flex-col ${
            mobileTab === 'queue' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <ExceptionList
            exceptions={exceptions}
            selectedId={selectedExceptionId}
            onSelect={handleSelectException}
            counts={counts}
            filters={filters}
            onFilterChange={setFilters}
            loading={exceptionsLoading}
          />
        </div>

        {/* Right Panel: Investigation & Policy Detail */}
        <div
          className={`lg:col-span-8 h-full overflow-hidden flex-col ${
            mobileTab === 'detail' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <ExceptionDetail
            detail={detail}
            loading={detailLoading}
            onBackToQueue={() => setMobileTab('queue')}
            onSubmitReview={handleReview}
          />
        </div>
      </div>
    </div>
  );
};
