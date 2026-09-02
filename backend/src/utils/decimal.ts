import { Decimal } from 'decimal.js';
import mongoose from 'mongoose';

// Configure Decimal.js for high-precision financial arithmetic
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -20,
  toExpPos: 20
});

export { Decimal };

/**
 * Safely converts any value (string, number, Decimal, mongoose.Types.Decimal128) into a Decimal instance.
 */
export function toDecimal(value: string | number | Decimal | mongoose.Types.Decimal128 | null | undefined): Decimal {
  if (value === null || value === undefined) {
    return new Decimal(0);
  }
  if (value instanceof Decimal) {
    return value;
  }
  if (typeof value === 'object' && 'toString' in value) {
    return new Decimal(value.toString());
  }
  return new Decimal(value);
}

/**
 * Converts a Decimal to Mongoose Decimal128 for database storage.
 */
export function toDecimal128(value: Decimal | string | number): mongoose.Types.Decimal128 {
  const dec = toDecimal(value);
  return mongoose.Types.Decimal128.fromString(dec.toFixed(2));
}

/**
 * Converts a Decimal to exact 2-decimal string representation.
 */
export function toFixed2(value: Decimal | string | number | mongoose.Types.Decimal128): string {
  return toDecimal(value).toFixed(2);
}

/**
 * Formats a Decimal value as Indian Rupee (INR) currency string (e.g. ₹12,345.67).
 */
export function formatINR(value: Decimal | string | number | mongoose.Types.Decimal128): string {
  const dec = toDecimal(value);
  const isNegative = dec.isNegative();
  const absoluteValue = dec.abs();
  
  const parts = absoluteValue.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian numbering system formatting: last 3 digits, then groups of 2
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherDigits = integerPart.substring(0, integerPart.length - 3);
    const formattedOther = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    integerPart = `${formattedOther},${lastThree}`;
  }

  const result = `₹${integerPart}.${decimalPart}`;
  return isNegative ? `-${result}` : result;
}

/**
 * Helper to recursively serialize objects for JSON response,
 * converting Decimal and Decimal128 instances to fixed-precision strings.
 */
export function serializeDecimals<T>(obj: T): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Decimal) {
    return obj.toFixed(2);
  }

  if (obj instanceof mongoose.Types.Decimal128) {
    return obj.toString();
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeDecimals(item));
  }

  if (typeof obj === 'object') {
    // If it's a Mongoose document or has toObject
    const rawObj = (obj as any).toObject ? (obj as any).toObject() : obj;
    const transformed: Record<string, any> = {};
    for (const key of Object.keys(rawObj)) {
      transformed[key] = serializeDecimals(rawObj[key]);
    }
    return transformed;
  }

  return obj;
}
