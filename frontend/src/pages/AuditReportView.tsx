import React, { useState } from 'react';
import { useEvaluation } from '../hooks/useEvaluation';
import { useAudit } from '../hooks/useAudit';
import { api } from '../api/client';
import { BatchControls } from '../components/audit/BatchControls';
import { MetricsDashboard } from '../components/audit/MetricsDashboard';
import { CoverageRiskChart } from '../components/audit/CoverageRiskChart';
import { FinancialSummary } from '../components/audit/FinancialSummary';
import { AuditTimeline } from '../components/audit/AuditTimeline';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';

export const AuditReportView: React.FC = () => {
  const [activeBatchId, setActiveBatchId] = useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | undefined>(undefined);

  const { metrics, coverageRisk, loading: evalLoading, refetch: refetchEval } = useEvaluation(activeBatchId);
  const { records, loading: auditLoading, refetch: refetchAudit } = useAudit({ batchId: activeBatchId });

  const handleGenerate = async (seed: number = 42) => {
    const newBatchId = `BATCH-FR-${Date.now()}`;
    setIsProcessing(true);
    setProgressMsg('Generating synthetic dataset and executing reconciliation pipeline...');
    try {
      const res = await api.generateBatch(seed, newBatchId);
      setActiveBatchId(res.batchId);
      await api.processBatch(res.batchId);
      await refetchEval();
      await refetchAudit();
      return res;
    } finally {
      setIsProcessing(false);
      setProgressMsg(undefined);
    }
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    setProgressMsg('Reconciling payments, evaluating Gemini agent hypotheses, and running Policy Gate...');
    try {
      const currentId = activeBatchId || metrics?.batchId;
      const res = await api.processBatch(currentId);
      if (res.batchId) {
        setActiveBatchId(res.batchId);
      }
      await refetchEval();
      await refetchAudit();
      return res;
    } finally {
      setIsProcessing(false);
      setProgressMsg(undefined);
    }
  };

  const handleBatchChange = async (newBatchId: string) => {
    setActiveBatchId(newBatchId);
    await refetchEval();
    await refetchAudit();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* SECTION 1: BATCH CONTROLS WITH UPLOAD & GENERATE */}
      <ErrorBoundary fallbackTitle="Batch Controls Unavailable">
        <BatchControls
          batchId={metrics?.batchId || activeBatchId}
          onGenerate={handleGenerate}
          onProcess={handleProcess}
          onBatchChange={handleBatchChange}
          isProcessing={isProcessing}
          progressMessage={progressMsg}
        />
      </ErrorBoundary>

      {/* SECTION 2: SUMMARY METRICS */}
      <ErrorBoundary fallbackTitle="Summary Metrics Unavailable">
        <MetricsDashboard metrics={metrics} />
      </ErrorBoundary>

      {/* SECTION 3: HERO COVERAGE-RISK CURVE */}
      <ErrorBoundary fallbackTitle="Coverage-Risk Analytics Unavailable">
        <CoverageRiskChart data={coverageRisk} />
      </ErrorBoundary>

      {/* SECTION 4: FINANCIAL SETTLEMENT SUMMARY */}
      <ErrorBoundary fallbackTitle="Settlement Summary Unavailable">
        <FinancialSummary metrics={metrics} />
      </ErrorBoundary>

      {/* SECTION 5: AUDIT TIMELINE LOG */}
      <ErrorBoundary fallbackTitle="Audit Trail Ledger Unavailable">
        <AuditTimeline records={records} loading={auditLoading} />
      </ErrorBoundary>
    </div>
  );
};
