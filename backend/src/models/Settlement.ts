import mongoose, { Document, Schema } from 'mongoose';

export interface ISettlement extends Document {
  settlementId: string;
  paymentId: string;
  merchantId: string;
  grossAmount: mongoose.Types.Decimal128;
  feeAmount: mongoose.Types.Decimal128;
  taxAmount: mongoose.Types.Decimal128;
  netAmount: mongoose.Types.Decimal128;
  status: 'processed' | 'pending' | 'failed';
  settledAt: Date;
  utr: string;
  batchId: string;
  createdAt: Date;
}

const SettlementSchema: Schema = new Schema<ISettlement>(
  {
    settlementId: { type: String, required: true, unique: true, index: true },
    paymentId: { type: String, required: true, index: true },
    merchantId: { type: String, required: true, index: true },
    grossAmount: { type: Schema.Types.Decimal128, required: true },
    feeAmount: { type: Schema.Types.Decimal128, required: true },
    taxAmount: { type: Schema.Types.Decimal128, required: true },
    netAmount: { type: Schema.Types.Decimal128, required: true },
    status: {
      type: String,
      required: true,
      enum: ['processed', 'pending', 'failed'],
      default: 'processed',
      index: true
    },
    settledAt: { type: Date, required: true, default: Date.now },
    utr: { type: String, required: true },
    batchId: { type: String, required: true, index: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        if (ret.grossAmount) ret.grossAmount = ret.grossAmount.toString();
        if (ret.feeAmount) ret.feeAmount = ret.feeAmount.toString();
        if (ret.taxAmount) ret.taxAmount = ret.taxAmount.toString();
        if (ret.netAmount) ret.netAmount = ret.netAmount.toString();
        return ret;
      }
    }
  }
);

export const Settlement = mongoose.model<ISettlement>('Settlement', SettlementSchema);
