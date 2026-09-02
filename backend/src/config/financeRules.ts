// SYNTHETIC BENCHMARK RULES — do not represent production Razorpay pricing

import { Decimal } from 'decimal.js';
import { env } from './environment';

export interface FeeRates {
  readonly [method: string]: string;
}

// SYNTHETIC BENCHMARK RULES — do not represent production Razorpay pricing
export const FEE_RATES: FeeRates = {
  upi: '0.0025',        // 0.25%
  card: '0.020',        // 2.00%
  netbanking: '0.015',  // 1.50%
  wallet: '0.010',      // 1.00%
  international: '0.035' // 3.50%
};

// SYNTHETIC BENCHMARK RULES — do not represent production Razorpay pricing
export const GST_RATE = '0.18'; // 18% standard GST on merchant fees

// SYNTHETIC BENCHMARK RULES — do not represent production Razorpay pricing
export const RECONCILIATION_TOLERANCE = '0.01'; // ₹0.01 currency rounding tolerance

// SYNTHETIC BENCHMARK RULES — do not represent production Razorpay pricing
export const CONFIDENCE_THRESHOLD = new Decimal(env.CONFIDENCE_THRESHOLD || '0.85');

// SYNTHETIC BENCHMARK RULES — do not represent production Razorpay pricing
export const EVIDENCE_COMPLETENESS_THRESHOLD = new Decimal(env.EVIDENCE_COMPLETENESS_THRESHOLD || '0.80');

// SYNTHETIC BENCHMARK RULES — do not represent production Razorpay pricing
export const MAX_AUTO_RESOLVE_AMOUNT = new Decimal(env.MAX_AUTO_RESOLVE_AMOUNT || '10000'); // ₹10,000 max financial impact

// SYNTHETIC BENCHMARK RULES — do not represent production Razorpay pricing
export const ALLOWED_AUTO_RESOLVE_TYPES: readonly string[] = [
  'fee_mismatch',
  'gst_mismatch',
  'refund_not_adjusted',
  'amount_mismatch',
  'partial_settlement'
] as const;

export type AllowedAutoResolveType = typeof ALLOWED_AUTO_RESOLVE_TYPES[number];
