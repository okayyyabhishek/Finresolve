import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { AuditRecordItem } from '../types';

export function useAudit(initialParams = {}) {
  const [records, setRecords] = useState<AuditRecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState(initialParams);

  useEffect(() => {
    setParams(initialParams);
  }, [JSON.stringify(initialParams)]);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAuditRecords(params);
      setRecords(data.records || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch audit records');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  return {
    records,
    total,
    page,
    totalPages,
    loading,
    error,
    params,
    setParams,
    refetch: fetchAudit
  };
}
