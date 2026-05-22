import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { TransactionItem } from '@/components/TransactionItem';
import { Icon } from '@/components/Icon';
import { fetchFxRate } from '@/lib/api';

const FILTERS = [
  { key: 'all',      label: 'All',      color: '#6b7280' },
  { key: 'charges',  label: 'Charges',  color: '#ef4444' },
  { key: 'deposits', label: 'Deposits', color: '#22c55e' },
  { key: 'numbers',  label: 'Numbers',  color: '#3b82f6' },
];

export default function TransactionsScreen() {
  const router = useRouter();
  const userId = useAppStore((s) => s.userId);
  const { format } = useCurrency();
  const [filter, setFilter] = useState('all');
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { data: fxRateData } = useQuery({
    queryKey: ['fx-rate', 'USD', 'NGN'],
    queryFn: () => fetchFxRate('USD', 'NGN'),
    staleTime: 10 * 60_000,
  });
  const usdToNgnRate = Number((fxRateData as any)?.rate ?? (fxRateData as any)?.data?.rate ?? 0) || null;

  const { data: transactions = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['transactions', userId, usdToNgnRate],
    queryFn: async () => {
      const [walletTx, numberPurchases, payments] = await Promise.all([
        supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', userId!)
          .order('created_at', { ascending: false }),
        supabase
          .from('number_purchases')
          .select('*, virtual_numbers(phone_number)')
          .eq('user_id', userId!)
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select('*')
          .eq('user_id', userId!)
          .order('created_at', { ascending: false }),
      ]);

      const toNgnIfUsd = (amount: number, currency?: string | null) => {
        if (!Number.isFinite(amount)) return amount;
        if (!currency) return amount;
        const c = String(currency).toUpperCase();
        if (c !== 'USD') return amount;
        if (!usdToNgnRate) return amount;
        return amount * usdToNgnRate;
      };

      const all = [
        ...(walletTx.data ?? []).map((tx: any) => ({
          id: tx.id,
          type: 'wallet',
          transaction_type: tx.type,
          amount: parseFloat(tx.amount),
          balance_after: parseFloat(tx.balance_after),
          description: tx.description,
          created_at: tx.created_at,
          metadata: { payment_id: tx.payment_id, order_id: tx.order_id },
        })),
        ...(numberPurchases.data ?? []).map((p: any) => ({
          id: p.id,
          type: 'number_purchase',
          transaction_type: 'number_purchase',
          amount: -toNgnIfUsd(parseFloat(p.amount), p.currency ?? 'NGN'),
          description: `Phone number purchase: ${p.virtual_numbers?.phone_number ?? 'Unknown'}`,
          created_at: p.created_at,
          metadata: { phone_number: p.virtual_numbers?.phone_number, currency: p.currency ?? 'NGN' },
        })),
        ...(payments.data ?? []).map((p: any) => ({
          id: p.id,
          type: 'payment',
          transaction_type: p.status === 'Success' ? 'deposit' : 'payment_failed',
          amount: toNgnIfUsd(parseFloat(p.amount), p.currency ?? 'NGN'),
          description: `Wallet funding via ${p.payment_provider}`,
          created_at: p.created_at,
          metadata: { status: p.status, currency: p.currency },
        })),
      ];

      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return all;
    },
    enabled: !!userId,
  });

  const filtered = useMemo(() => {
    switch (filter) {
      case 'charges':  return transactions.filter((t: any) => t.amount < 0);
      case 'deposits': return transactions.filter((t: any) => t.amount > 0);
      case 'numbers':  return transactions.filter((t: any) => t.type === 'number_purchase');
      default:         return transactions;
    }
  }, [transactions, filter]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={22} color="#7C5CFC" />
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <View style={styles.headerTitleRow}>
            <Icon name="barChartDollar" size={18} color={colors.text} />
            <Text style={styles.headerTitle}>Transactions</Text>
          </View>
          <Text style={styles.headerSub}>Your financial history</Text>
        </View>
      </View>

      {/* Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && { backgroundColor: f.color, borderColor: f.color }]}
            onPress={() => setFilter(f.key)}
          >
            {filter !== f.key && <View style={[styles.filterDot, { backgroundColor: f.color }]} />}
            <Text style={[styles.filterChipText, filter === f.key && { color: '#fff' }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C5CFC" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#7C5CFC" />
          }
          renderItem={({ item }) => (
            <TransactionItem item={item as any} currencyFormat={format} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="barChartDollar" size={40} color="#d1d5db" />
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8 },
    backBtn: { padding: 4 },
    headerTextBlock: { marginLeft: 8, alignItems: 'flex-start' },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    headerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: c.text },
    headerSub: { fontSize: 12, color: c.textSub },
    filterScroll: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
    filterChip: {
      flexDirection: 'row', alignItems: 'center', height: 30,
      paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border, gap: 5,
    },
    filterDot: { width: 6, height: 6, borderRadius: 3 },
    filterChipText: { fontSize: 12, color: c.text, fontFamily: 'Poppins_500Medium' },
    listContent: { padding: 16, paddingTop: 4, paddingBottom: 60 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyText: { color: c.textSub, fontSize: 14 },
  });
}
