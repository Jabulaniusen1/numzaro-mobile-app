import { useAppStore } from '@/lib/store';

export function useCurrency() {
  const currencyMode = useAppStore((s) => s.currencyMode);

  const format = (amount: number): string => {
    if (currencyMode === 'NGN') {
      return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  return { format, currencyMode };
}
