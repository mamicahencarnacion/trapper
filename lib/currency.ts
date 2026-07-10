export const CURRENCY_CONFIG = {
  USD: { symbol: '$', label: 'USD ($)' },
  GBP: { symbol: '£', label: 'GBP (£)' },
  PHP: { symbol: '₱', label: 'PHP (₱)' }
} as const;

export type CurrencyType = keyof typeof CURRENCY_CONFIG;

/**
 * Formats a value with the active selected currency symbol.
 * No conversion rate is applied as currency options are for symbols only.
 * @param amount The cost amount
 * @param currency The active selected currency
 */
export function formatCurrency(amount: number, currency: CurrencyType = 'USD'): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
  
  return `${config.symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

