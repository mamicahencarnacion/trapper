export const CURRENCY_CONFIG = {
  USD: { symbol: '$', rate: 1.0, label: 'USD ($)' },
  GBP: { symbol: '£', rate: 0.79, label: 'GBP (£)' },
  PHP: { symbol: '₱', rate: 58.0, label: 'PHP (₱)' }
} as const;

export type CurrencyType = keyof typeof CURRENCY_CONFIG;

/**
 * Formats amount (in local currency) with its respective symbol.
 * @param amountInUSD The cost in USD
 * @param currency The active selected currency
 */
export function formatCurrency(amountInLocalCurrency: number, currency: CurrencyType = 'PHP'): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.PHP;
  
  return `${config.symbol}${amountInLocalCurrency.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}
