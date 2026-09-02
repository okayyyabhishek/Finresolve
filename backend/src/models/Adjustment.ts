import mongoose, { Document, Schema } from 'mongoose';

export interface IAdjustment extends Document {
  adjustmentId: string;
  paymentId?: string | null;
  settlementId?: string | null;
  merchantId: string;
  type: string;
  amount: mongoose.Types.Decimal128;
  reason: string;
  batchId: string;
  createdAt: Date;
}

const AdjustmentSchema: Schema = new Schema<IAdjustment>(
  {
    adjustmentId: { type: String, required: true, unique: true, index: true },
    paymentId: { type: String, default: null, index: true },
    settlementId: { type: String, default: null, index: true },
    merchantId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      index: true
    },
    amount: { type: Schema.Types.Decimal128, required: true },
    reason: { type: String, required: true },
    batchId: { type: String, required: true, index: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        if (ret.amount) ret.amount = ret.amount.toString();
        return ret;
      }
    }
  }
);

export const Adjustment = mongoose.model<IAdjustment>('Adjustment', AdjustmentSchema);
