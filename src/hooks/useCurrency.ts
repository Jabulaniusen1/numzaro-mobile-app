export function useCurrency() {
  const format = (amount: number): string =>
    `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  return { format, currencyMode: 'NGN' as const };
}
