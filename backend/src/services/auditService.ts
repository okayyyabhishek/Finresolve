import crypto from 'crypto';
import { Decimal, toDecimal, toDecimal128, serializeDecimals } from '../utils/decimal';
import {
  AuditRecord,
  IAuditRecord,
  Exception,
  Investigation,
  IException,
  IInvestigation
} from '../models';
import { PolicyGateResult } from './policyGate';

export interface RecordAuditInput {
  exception: IException;
  investigation: IInvestigation;
  policyResult: PolicyGateResult;
  batchId: string;
}

export interface HumanReviewInput {
  exceptionId: string;
  action: 'approve' | 'reject' | 'request_more_evidence';
  reviewer?: string;
  comment?: string;
}

export class AuditService {
  /**
   * Creates an immutable audit record for an exception evaluation.
   */
  public static async recordPolicyEvaluation(input: RecordAuditInput): Promise<IAuditRecord> {
    const { exception, investigation, policyResult, batchId } = input;
    const auditId = `AUD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const discrepancy = toDecimal(exception.discrepancy);
    const financialImpact = discrepancy.abs();

    const finalOutcome =
      policyResult.decision === 'auto_resolve'
        ? 'AUTOMATED_RESOLUTION_COMMITTED'
        : policyResult.decision === 'insufficient_evidence'
        ? 'ESCALATED_DUE_TO_INSUFFICIENT_EVIDENCE'
        : 'ESCALATED_FOR_HUMAN_CONTROLLER_REVIEW';

    const auditRecord = new AuditRecord({
      auditId,
      exceptionId: exception.exceptionId,
      investigationId: investigation.investigationId,
      policyDecision: policyResult.decision,
      policyReason: policyResult.reason,
      policyRulesApplied: policyResult.rulesApplied,
      humanReview: {
        action: null,
        reviewer: null,
        comment: null,
        reviewedAt: null
      },
      finalOutcome,
      financialImpact: toDecimal128(financialImpact),
      batchId
    });

    await auditRecord.save();
    return auditRecord;
  }

  /**
   * Applies a human supervisor review action to an escalated audit record and updates exception state.
   */
  public static async applyHumanReview(input: HumanReviewInput): Promise<{
    auditRecord: any;
    exception: any;
  }> {
    const { exceptionId, action, reviewer = 'Human Controller', comment = '' } = input;

    const exception = await Exception.findOne({ exceptionId });
    if (!exception) {
      throw new Error(`Exception ${exceptionId} not found`);
    }

    const auditRecord = await AuditRecord.findOne({ exceptionId }).sort({ createdAt: -1 });
    if (!auditRecord) {
      throw new Error(`Audit record for Exception ${exceptionId} not found`);
    }

    const reviewedAt = new Date();
    auditRecord.humanReview = {
      action,
      reviewer,
      comment,
      reviewedAt
    };

    let newStatus: string = exception.status;
    let newOutcome = auditRecord.finalOutcome;

    if (action === 'approve') {
      newStatus = 'human_approved';
      newOutcome = 'MANUAL_RESOLUTION_APPROVED_BY_CONTROLLER';
    } else if (action === 'reject') {
      newStatus = 'human_rejected';
      newOutcome = 'MANUAL_RESOLUTION_REJECTED_BY_CONTROLLER';
    } else if (action === 'request_more_evidence') {
      newStatus = 'investigating';
      newOutcome = 'RE_INVESTIGATION_REQUESTED_BY_CONTROLLER';
    }

    auditRecord.finalOutcome = newOutcome;
    exception.status = newStatus as any;

    await Promise.all([auditRecord.save(), exception.save()]);

    return {
      auditRecord: serializeDecimals(auditRecord),
      exception: serializeDecimals(exception)
    };
  }

  /**
   * Retrieves paginated audit records with optional filters.
   */
  public static async getAuditRecords(
    filters: { batchId?: string; exceptionId?: string; policyDecision?: string } = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{ records: any[]; total: number; page: number; totalPages: number }> {
    const query: any = {};
    if (filters.batchId) query.batchId = filters.batchId;
    if (filters.exceptionId) query.exceptionId = filters.exceptionId;
    if (filters.policyDecision) query.policyDecision = filters.policyDecision;

    const [total, docs] = await Promise.all([
      AuditRecord.countDocuments(query),
      AuditRecord.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    return {
      records: serializeDecimals(docs),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1
    };
  }
}
