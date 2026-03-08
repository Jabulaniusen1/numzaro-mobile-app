import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useBalance } from '@/hooks/useBalance';
import { useCurrency } from '@/hooks/useCurrency';
import { useAppStore } from '@/lib/store';
import { Icon } from '@/components/Icon';

export function BalanceCard() {
  const router = useRouter();
  const userId = useAppStore((s) => s.userId);
  const { data: balance, isLoading, refetch } = useBalance(userId ?? '');
  const { format } = useCurrency();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>Account Balance</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <Icon name="refresh" size={16} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#fff" style={{ marginVertical: 8 }} />
      ) : (
        <Text style={styles.amount}>{format(balance ?? 0)}</Text>
      )}

      <TouchableOpacity
        style={styles.fundBtn}
        onPress={() => router.push('/fund-wallet' as any)}
      >
        <Icon name="plus" size={14} color="#fff" />
        <Text style={styles.fundBtnText}>Fund Wallet</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#7C5CFC',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#7C5CFC',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  refreshBtn: { padding: 4 },
  amount: { color: '#fff', fontSize: 32, fontWeight: '700', marginBottom: 16 },
  fundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  fundBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
