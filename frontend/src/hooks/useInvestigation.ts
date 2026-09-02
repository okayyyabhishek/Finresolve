import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { ExceptionFullDetail } from '../types';

export function useInvestigation(exceptionId: string | null) {
  const [detail, setDetail] = useState<ExceptionFullDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!exceptionId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getExceptionDetail(exceptionId);
      setDetail(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch investigation details');
    } finally {
      setLoading(false);
    }
  }, [exceptionId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const submitReview = async (
    action: 'approve' | 'reject' | 'request_more_evidence',
    reviewer?: string,
    comment?: string
  ) => {
    if (!exceptionId) return;
    try {
      const res = await api.submitHumanReview(exceptionId, action, reviewer, comment);
      await fetchDetail();
      return res;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || 'Review submission failed');
    }
  };

  return {
    detail,
    loading,
    error,
    refetch: fetchDetail,
    submitReview
  };
}
