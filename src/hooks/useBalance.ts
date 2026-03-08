import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useBalance(userId: string) {
  return useQuery({
    queryKey: ['balance', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { data } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', userId)
        .single();
      return parseFloat(data?.wallet_balance ?? '0');
    },
    enabled: !!userId,
    refetchInterval: 30000,
  });
}
