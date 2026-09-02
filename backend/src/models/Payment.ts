import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  paymentId: string;
  merchantId: string;
  customerId: string;
  amount: mongoose.Types.Decimal128;
  currency: string;
  method: string;
  status: string;
  capturedAt: Date;
  metadata: Record<string, any>;
  batchId: string;
  createdAt: Date;
}

const PaymentSchema: Schema = new Schema<IPayment>(
  {
    paymentId: { type: String, required: true, unique: true, index: true },
    merchantId: { type: String, required: true, index: true },
    customerId: { type: String, required: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    currency: { type: String, default: 'INR' },
    method: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      required: true,
      default: 'captured',
      index: true
    },
    capturedAt: { type: Date, required: true, default: Date.now },
    metadata: { type: Schema.Types.Mixed, default: {} },
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

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
