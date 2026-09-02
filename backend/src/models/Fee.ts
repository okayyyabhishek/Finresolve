import mongoose, { Document, Schema } from 'mongoose';

export interface IFee extends Document {
  feeId: string;
  paymentId: string;
  baseFee: mongoose.Types.Decimal128;
  gstOnFee: mongoose.Types.Decimal128;
  totalFee: mongoose.Types.Decimal128;
  method: string;
  rateApplied: mongoose.Types.Decimal128;
  batchId: string;
  createdAt: Date;
}

const FeeSchema: Schema = new Schema<IFee>(
  {
    feeId: { type: String, required: true, unique: true, index: true },
    paymentId: { type: String, required: true, index: true },
    baseFee: { type: Schema.Types.Decimal128, required: true },
    gstOnFee: { type: Schema.Types.Decimal128, required: true },
    totalFee: { type: Schema.Types.Decimal128, required: true },
    method: { type: String, required: true },
    rateApplied: { type: Schema.Types.Decimal128, required: true },
    batchId: { type: String, required: true, index: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        if (ret.baseFee) ret.baseFee = ret.baseFee.toString();
        if (ret.gstOnFee) ret.gstOnFee = ret.gstOnFee.toString();
        if (ret.totalFee) ret.totalFee = ret.totalFee.toString();
        if (ret.rateApplied) ret.rateApplied = ret.rateApplied.toString();
        return ret;
      }
    }
  }
);

export const Fee = mongoose.model<IFee>('Fee', FeeSchema);
