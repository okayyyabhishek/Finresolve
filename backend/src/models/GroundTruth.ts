import mongoose, { Document, Schema } from 'mongoose';

export interface IGroundTruth extends Document {
  paymentId: string;
  expectedSettlement: mongoose.Types.Decimal128;
  actualSettlement: mongoose.Types.Decimal128;
  exceptionType?: string | null;
  rootCause?: string | null;
  supportingEvidenceIds: string[];
  correctDecision: 'matched' | 'auto_resolve' | 'escalate';
  financialImpact: mongoose.Types.Decimal128;
  notes: string;
  batchId: string;
}

const GroundTruthSchema: Schema = new Schema<IGroundTruth>(
  {
    paymentId: { type: String, required: true, index: true },
    expectedSettlement: { type: Schema.Types.Decimal128, required: true },
    actualSettlement: { type: Schema.Types.Decimal128, required: true },
    exceptionType: { type: String, default: null },
    rootCause: { type: String, default: null },
    supportingEvidenceIds: { type: [String], default: [] },
    correctDecision: {
      type: String,
      required: true,
      enum: ['matched', 'auto_resolve', 'escalate'],
      index: true
    },
    financialImpact: { type: Schema.Types.Decimal128, required: true },
    notes: { type: String, default: '' },
    batchId: { type: String, required: true, index: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        if (ret.expectedSettlement) ret.expectedSettlement = ret.expectedSettlement.toString();
        if (ret.actualSettlement) ret.actualSettlement = ret.actualSettlement.toString();
        if (ret.financialImpact) ret.financialImpact = ret.financialImpact.toString();
        return ret;
      }
    }
  }
);

export const GroundTruth = mongoose.model<IGroundTruth>('GroundTruth', GroundTruthSchema);
