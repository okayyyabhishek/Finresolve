import mongoose, { Document, Schema } from 'mongoose';

export interface IEvidenceItem {
  id: string;
  type: string;
  source: string;
  description: string;
  data: Record<string, any>;
}

export type RecommendedAction = 'auto_resolve' | 'escalate' | 'insufficient_evidence';

export interface IInvestigation extends Document {
  investigationId: string;
  exceptionId: string;
  rootCause: string;
  evidence: IEvidenceItem[];
  confidence: mongoose.Types.Decimal128;
  evidenceCompleteness: mongoose.Types.Decimal128;
  recommendedAction: RecommendedAction;
  reasoning: string;
  agentModel: string;
  toolsUsed: string[];
  durationMs: number;
  batchId: string;
  createdAt: Date;
}

const EvidenceItemSchema = new Schema<IEvidenceItem>(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    source: { type: String, required: true },
    description: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const InvestigationSchema: Schema = new Schema<IInvestigation>(
  {
    investigationId: { type: String, required: true, unique: true, index: true },
    exceptionId: { type: String, required: true, index: true },
    rootCause: { type: String, required: true },
    evidence: { type: [EvidenceItemSchema], default: [] },
    confidence: { type: Schema.Types.Decimal128, required: true },
    evidenceCompleteness: { type: Schema.Types.Decimal128, required: true },
    recommendedAction: {
      type: String,
      required: true,
      enum: ['auto_resolve', 'escalate', 'insufficient_evidence'],
      index: true
    },
    reasoning: { type: String, required: true },
    agentModel: { type: String, required: true },
    toolsUsed: { type: [String], default: [] },
    durationMs: { type: Number, required: true, default: 0 },
    batchId: { type: String, required: true, index: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        if (ret.confidence) ret.confidence = ret.confidence.toString();
        if (ret.evidenceCompleteness) ret.evidenceCompleteness = ret.evidenceCompleteness.toString();
        return ret;
      }
    }
  }
);

export const Investigation = mongoose.model<IInvestigation>('Investigation', InvestigationSchema);
