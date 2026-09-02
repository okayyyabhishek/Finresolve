import mongoose, { Document, Schema } from 'mongoose';

export interface IPolicyRuleEvaluation {
  rule: string;
  passed: boolean;
  detail: string;
}

export interface IHumanReview {
  action: 'approve' | 'reject' | 'request_more_evidence' | null;
  reviewer: string | null;
  comment: string | null;
  reviewedAt: Date | null;
}

export interface IAuditRecord extends Document {
  auditId: string;
  exceptionId: string;
  investigationId: string;
  policyDecision: 'auto_resolve' | 'escalate' | 'insufficient_evidence';
  policyReason: string;
  policyRulesApplied: IPolicyRuleEvaluation[];
  humanReview: IHumanReview;
  finalOutcome: string;
  financialImpact: mongoose.Types.Decimal128;
  batchId: string;
  createdAt: Date;
  updatedAt: Date;
}

const PolicyRuleSchema = new Schema<IPolicyRuleEvaluation>(
  {
    rule: { type: String, required: true },
    passed: { type: Boolean, required: true },
    detail: { type: String, required: true }
  },
  { _id: false }
);

const HumanReviewSchema = new Schema<IHumanReview>(
  {
    action: {
      type: String,
      enum: ['approve', 'reject', 'request_more_evidence', null],
      default: null
    },
    reviewer: { type: String, default: null },
    comment: { type: String, default: null },
    reviewedAt: { type: Date, default: null }
  },
  { _id: false }
);

const AuditRecordSchema: Schema = new Schema<IAuditRecord>(
  {
    auditId: { type: String, required: true, unique: true, index: true },
    exceptionId: { type: String, required: true, index: true },
    investigationId: { type: String, required: true, index: true },
    policyDecision: {
      type: String,
      required: true,
      enum: ['auto_resolve', 'escalate', 'insufficient_evidence'],
      index: true
    },
    policyReason: { type: String, required: true },
    policyRulesApplied: { type: [PolicyRuleSchema], default: [] },
    humanReview: { type: HumanReviewSchema, default: () => ({}) },
    finalOutcome: { type: String, required: true, index: true },
    financialImpact: { type: Schema.Types.Decimal128, required: true },
    batchId: { type: String, required: true, index: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        if (ret.financialImpact) ret.financialImpact = ret.financialImpact.toString();
        return ret;
      }
    }
  }
);

/**
 * Immutability Enforcement (F-02):
 * Financial settlement audit records must be append-only.
 * Updates are strictly prohibited, except for authorized human supervisor reviews.
 */
AuditRecordSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (this: any, next: any) {
  const update = this.getUpdate() as any;
  if (update) {
    const updateKeys = Object.keys(update.$set || update);
    const allowedFields = [
      'humanReview',
      'humanReview.action',
      'humanReview.reviewer',
      'humanReview.comment',
      'humanReview.reviewedAt',
      'finalOutcome',
      'updatedAt'
    ];
    const disallowedKeys = updateKeys.filter(
      (k) => !allowedFields.some((af) => k === af || k.startsWith('humanReview'))
    );
    if (disallowedKeys.length > 0) {
      return next(
        new Error(
          `AuditRecord is immutable. Cannot modify fields: ${disallowedKeys.join(
            ', '
          )}. Only humanReview updates are permitted.`
        )
      );
    }
  }
  next();
});

AuditRecordSchema.index({ exceptionId: 1, createdAt: -1 });

export const AuditRecord = mongoose.model<IAuditRecord>('AuditRecord', AuditRecordSchema);
