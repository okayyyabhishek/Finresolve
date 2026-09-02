import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { EvaluationMetricsData, CoverageRiskSweepData } from '../types';

export function useEvaluation(batchId?: string) {
  const [metrics, setMetrics] = useState<EvaluationMetricsData | null>(null);
  const [coverageRisk, setCoverageRisk] = useState<CoverageRiskSweepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvaluation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, cr] = await Promise.all([
        api.getEvaluationMetrics(batchId),
        api.getCoverageRiskCurve(batchId)
      ]);
      setMetrics((m as any).status === 'not_evaluated' ? null : m);
      setCoverageRisk((cr as any).status === 'not_evaluated' ? null : cr);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch evaluation data');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchEvaluation();
  }, [fetchEvaluation]);

  return {
    metrics,
    coverageRisk,
    loading,
    error,
    refetch: fetchEvaluation
  };
}
