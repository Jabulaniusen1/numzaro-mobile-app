import { useQuery } from '@tanstack/react-query';
import { fetchBalanceConverted } from '@/lib/api';

export function useBalance(userId: string) {
  return useQuery({
    queryKey: ['balance', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const data = await fetchBalanceConverted();
      return parseFloat(data.balance ?? '0');
    },
    enabled: !!userId,
    refetchInterval: 30000,
  });
}
