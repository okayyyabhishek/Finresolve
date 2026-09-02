import mongoose, { Document, Schema } from 'mongoose';

export interface IRefund extends Document {
  refundId: string;
  paymentId: string;
  settlementId?: string | null;
  amount: mongoose.Types.Decimal128;
  reason: string;
  status: 'processed' | 'pending' | 'failed';
  processedAt: Date;
  batchId: string;
  createdAt: Date;
}

const RefundSchema: Schema = new Schema<IRefund>(
  {
    refundId: { type: String, required: true, unique: true, index: true },
    paymentId: { type: String, required: true, index: true },
    settlementId: { type: String, default: null, index: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['processed', 'pending', 'failed'],
      default: 'processed',
      index: true
    },
    processedAt: { type: Date, required: true, default: Date.now },
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

export const Refund = mongoose.model<IRefund>('Refund', RefundSchema);
