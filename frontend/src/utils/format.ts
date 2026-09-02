/**
 * Financial and number formatting utilities for FINRESOLVE
 */

export interface FormatCurrencyOptions {
  showSign?: boolean;
  decimals?: number;
}

/**
 * Format a number or numeric string as Indian Rupee (INR) currency.
 * Properly formats negative amounts as `-₹13,241.88` instead of `₹-13241.88`.
 */
export function formatINR(
  amount: number | string | undefined | null,
  options: FormatCurrencyOptions = {}
): string {
  if (amount === undefined || amount === null || amount === '') {
    return '₹0.00';
  }

  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) {
    return '₹0.00';
  }

  const { showSign = false, decimals = 2 } = options;
  const isNegative = num < -0.000001;
  const isPositive = num > 0.000001;
  const absVal = Math.abs(num);

  const formattedNum = absVal.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  if (isNegative) {
    return `-₹${formattedNum}`;
  }

  if (showSign && isPositive) {
    return `+₹${formattedNum}`;
  }

  return `₹${formattedNum}`;
}

/**
 * Format a percentage number or string.
 */
export function formatPercent(value: number | string | undefined | null, decimals: number = 1): string {
  if (value === undefined || value === null || value === '') {
    return '0%';
  }
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) {
    return '0%';
  }
  return `${num.toFixed(decimals)}%`;
}
