import axios from 'axios';
import {
  ExceptionItem,
  ExceptionFullDetail,
  EvaluationMetricsData,
  CoverageRiskSweepData,
  AuditRecordItem
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Centralized API Error Interceptor (F-13)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.error || error.message || 'An unexpected error occurred';

    // Log all API errors consistently
    console.error(
      `[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${status}: ${message}`
    );

    // Enhance error with readable message
    if (error.response?.data?.error) {
      error.message = error.response.data.error;
    }

    return Promise.reject(error);
  }
);

export const api = {
  // Batch Operations
  generateBatch: async (seed: number = 42, batchId?: string) => {
    const res = await apiClient.post('/batch/generate', { seed, batchId });
    return res.data;
  },

  uploadBatch: async (payload: { batchId?: string; records?: any[]; csvContent?: string }) => {
    const res = await apiClient.post('/batch/upload', payload);
    return res.data;
  },

  getBatchTemplate: async () => {
    const res = await apiClient.get('/batch/template');
    return res.data;
  },

  processBatch: async (batchId?: string) => {
    const res = await apiClient.post('/batch/process', { batchId });
    return res.data;
  },

  resetBatch: async () => {
    const res = await apiClient.post('/batch/reset');
    return res.data;
  },

  getBatchStatus: async (batchId: string) => {
    const res = await apiClient.get(`/batch/status/${batchId}`);
    return res.data;
  },

  // Exceptions
  getExceptions: async (params: {
    status?: string;
    type?: string;
    severity?: string;
    batchId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<{
      exceptions: ExceptionItem[];
      total: number;
      page: number;
      totalPages: number;
      counts: Record<string, number>;
    }>('/exceptions', { params });
    return res.data;
  },

  getExceptionDetail: async (id: string) => {
    const res = await apiClient.get<ExceptionFullDetail>(`/exceptions/${id}`);
    return res.data;
  },

  // Investigations
  getInvestigation: async (exceptionId: string) => {
    const res = await apiClient.get(`/investigations/${exceptionId}`);
    return res.data;
  },

  // Human Review
  submitHumanReview: async (
    exceptionId: string,
    action: 'approve' | 'reject' | 'request_more_evidence',
    reviewer: string = 'Human Supervisor',
    comment: string = ''
  ) => {
    const res = await apiClient.post(`/review/${exceptionId}`, {
      action,
      reviewer,
      comment
    });
    return res.data;
  },

  // Audit Records
  getAuditRecords: async (params?: {
    batchId?: string;
    exceptionId?: string;
    policyDecision?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<{
      records: AuditRecordItem[];
      total: number;
      page: number;
      totalPages: number;
      summary: any;
    }>('/audit', { params });
    return res.data;
  },

  getAuditDetail: async (exceptionId: string) => {
    const res = await apiClient.get<AuditRecordItem>(`/audit/${exceptionId}`);
    return res.data;
  },

  // Evaluation & Metrics
  getEvaluationMetrics: async (batchId?: string) => {
    const res = await apiClient.get<EvaluationMetricsData>('/evaluation/metrics', {
      params: { batchId }
    });
    return res.data;
  },

  getCoverageRiskCurve: async (batchId?: string) => {
    const res = await apiClient.get<CoverageRiskSweepData>('/evaluation/coverage-risk', {
      params: { batchId }
    });
    return res.data;
  },

  // AI Copilot Chat
  sendChatMessage: async (params: {
    message: string;
    exceptionId?: string;
    batchId?: string;
    history?: { role: string; content: string }[];
  }) => {
    const res = await apiClient.post<{
      response: string;
      sources: string[];
      timestamp: string;
    }>('/chat/message', params);
    return res.data;
  }
};
