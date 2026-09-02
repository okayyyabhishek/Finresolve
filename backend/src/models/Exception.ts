import mongoose, { Document, Schema } from 'mongoose';

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

export interface IException extends Document {
  exceptionId: string;
  paymentId: string;
  settlementId?: string | null;
  type: ExceptionType;
  severity: ExceptionSeverity;
  expectedAmount: mongoose.Types.Decimal128;
  actualAmount: mongoose.Types.Decimal128;
  discrepancy: mongoose.Types.Decimal128;
  status: ExceptionStatus;
  batchId: string;
  createdAt: Date;
}

const ExceptionSchema: Schema = new Schema<IException>(
  {
    exceptionId: { type: String, required: true, unique: true, index: true },
    paymentId: { type: String, required: true, index: true },
    settlementId: { type: String, default: null, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'fee_mismatch',
        'gst_mismatch',
        'missing_settlement',
        'duplicate_settlement',
        'partial_settlement',
        'refund_not_adjusted',
        'duplicate_refund',
        'unexpected_adjustment',
        'amount_mismatch',
        'multi_factor'
      ],
      index: true
    },
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true
    },
    expectedAmount: { type: Schema.Types.Decimal128, required: true },
    actualAmount: { type: Schema.Types.Decimal128, required: true },
    discrepancy: { type: Schema.Types.Decimal128, required: true },
    status: {
      type: String,
      required: true,
      enum: [
        'detected',
        'investigating',
        'auto_resolved',
        'escalated',
        'human_approved',
        'human_rejected'
      ],
      default: 'detected',
      index: true
    },
    batchId: { type: String, required: true, index: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        if (ret.expectedAmount) ret.expectedAmount = ret.expectedAmount.toString();
        if (ret.actualAmount) ret.actualAmount = ret.actualAmount.toString();
        if (ret.discrepancy) ret.discrepancy = ret.discrepancy.toString();
        return ret;
      }
    }
  }
);

export const Exception = mongoose.model<IException>('Exception', ExceptionSchema);
