export type ExceptionType =
  | 'fee_mismatch'
  | 'gst_mismatch'
  | 'missing_settlement'
  | 'duplicate_settlement'
  | 'partial_settlement'
  | 'refund_not_adjusted'
  | 'duplicate_refund'
  | 'unexpected_adjustment'
  | 'amount_mismatch'
  | 'multi_factor';

export type ExceptionSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ExceptionStatus =
  | 'detected'
  | 'investigating'
  | 'auto_resolved'
  | 'escalated'
  | 'human_approved'
  | 'human_rejected';

export interface PaymentItem {
  _id: string;
  paymentId: string;
  merchantId: string;
  customerId: string;
  amount: string;
  currency: string;
  method: 'upi' | 'card' | 'netbanking' | 'wallet';
  status: string;
  capturedAt: string;
  metadata?: Record<string, any>;
  batchId: string;
}

export interface SettlementItem {
  _id: string;
  settlementId: string;
  paymentId: string;
  merchantId: string;
  grossAmount: string;
  feeAmount: string;
  taxAmount: string;
  netAmount: string;
  status: string;
  settledAt: string;
  utr: string;
  batchId: string;
}

export interface FeeItem {
  _id: string;
  feeId: string;
  paymentId: string;
  baseFee: string;
  gstOnFee: string;
  totalFee: string;
  method: string;
  rateApplied: string;
}

export interface RefundItem {
  _id: string;
  refundId: string;
  paymentId: string;
  settlementId?: string | null;
  amount: string;
  reason: string;
  status: string;
  processedAt: string;
}

export interface AdjustmentItem {
  _id: string;
  adjustmentId: string;
  paymentId?: string | null;
  settlementId?: string | null;
  merchantId: string;
  type: 'chargeback' | 'reversal' | 'correction' | 'penalty';
  amount: string;
  reason: string;
}

export interface ExceptionItem {
  _id: string;
  exceptionId: string;
  paymentId: string;
  settlementId?: string | null;
  type: ExceptionType;
  severity: ExceptionSeverity;
  expectedAmount: string;
  actualAmount: string;
  discrepancy: string;
  status: ExceptionStatus;
  batchId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EvidenceItem {
  id: string;
  type: string;
  source: string;
  description: string;
  data?: any;
}

export interface InvestigationItem {
  _id: string;
  investigationId: string;
  exceptionId: string;
  rootCause: string;
  evidence: EvidenceItem[];
  confidence: string;
  evidenceCompleteness: string;
  recommendedAction: 'auto_resolve' | 'escalate' | 'insufficient_evidence';
  reasoning: string;
  agentModel: string;
  toolsUsed: string[];
  durationMs: number;
  batchId: string;
  createdAt: string;
}

export interface PolicyRuleApplied {
  rule: string;
  passed: boolean;
  detail: string;
}

export interface HumanReviewData {
  action: 'approve' | 'reject' | 'request_more_evidence' | null;
  reviewer: string | null;
  comment: string | null;
  reviewedAt: string | null;
}

export interface AuditRecordItem {
  _id: string;
  auditId: string;
  exceptionId: string;
  investigationId: string;
  policyDecision: 'auto_resolve' | 'escalate' | 'insufficient_evidence';
  policyReason: string;
  policyRulesApplied: PolicyRuleApplied[];
  humanReview: HumanReviewData;
  finalOutcome: string;
  financialImpact: string;
  batchId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialBreakdownData {
  expected: {
    paymentAmount: string;
    baseFee: string;
    feeRate: string;
    gst: string;
    totalFee: string;
    totalRefunds: string;
    totalAdjustments: string;
    expectedNetAmount: string;
  };
  actual: {
    grossAmount: string;
    feeAmount: string;
    taxAmount: string;
    netAmount: string;
    utr: string;
    settledAt: string;
  } | null;
  discrepancy: string;
  direction: 'excess' | 'shortfall' | 'matched';
}

export interface ExceptionFullDetail {
  exception: ExceptionItem;
  payment: PaymentItem | null;
  settlements: SettlementItem[];
  fees: FeeItem[];
  refunds: RefundItem[];
  adjustments: AdjustmentItem[];
  investigation: InvestigationItem | null;
  auditRecord: AuditRecordItem | null;
  financialBreakdown: FinancialBreakdownData | null;
}

export interface EvaluationMetricsData {
  batchId: string;
  totalRecords: number;
  totalActualMatched: number;
  totalActualExceptions: number;
  matchAccuracy: number;
  exceptionDetectionAccuracy: number;
  rootCauseAccuracy: number;
  autoResolutionAccuracy: number;
  falseAutoResolutionRate: number;
  escalationRate: number;
  coverage: number;
  errorRate: number;
  financialErrorExposure: string;
  financialErrorExposureRaw: number;
  totalAutoResolved: number;
  totalEscalated: number;
  throughput: number;
  durationMs: number;
  evaluatedAt: string;
}

export interface CoverageRiskDataPoint {
  threshold: number;
  coverage: number;
  accuracy: number;
  errorRate: number;
  financialExposure: number;
  financialExposureFormatted: string;
  escalationRate: number;
  autoResolvedCount: number;
  escalatedCount: number;
}

export interface CoverageRiskSweepData {
  batchId: string;
  points: CoverageRiskDataPoint[];
  currentThreshold: number;
  optimalThreshold: number;
  currentMetrics: CoverageRiskDataPoint;
  optimalMetrics: CoverageRiskDataPoint;
  riskSummary: string;
}

export interface BatchMetricsData {
  batchId: string;
  totalPayments: number;
  totalSettlements: number;
  totalExceptions: number;
  totalCapturedVolume: string;
  totalSettledVolume: string;
  totalDiscrepancyVolume: string;
  autoResolvedExceptions: number;
  escalatedExceptions: number;
}
