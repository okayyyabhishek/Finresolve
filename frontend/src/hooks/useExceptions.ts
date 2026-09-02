import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { ExceptionItem } from '../types';

export function useExceptions(initialFilters = {}) {
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);

  const fetchExceptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getExceptions(filters);
      setExceptions(data.exceptions || []);
      setTotal(data.total || 0);
      setCounts(data.counts || {});
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch exceptions');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  return {
    exceptions,
    total,
    counts,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchExceptions
  };
}
