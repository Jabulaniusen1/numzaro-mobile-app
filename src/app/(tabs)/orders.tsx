import { useEffect, useState } from 'react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { OrderCard } from '@/components/OrderCard';
import { Icon } from '@/components/Icon';

const STATUSES = [
  { key: 'all',         label: 'All',         color: '#6b7280' },
  { key: 'Pending',     label: 'Pending',      color: '#f59e0b' },
  { key: 'In Progress', label: 'In Progress',  color: '#3b82f6' },
  { key: 'Partial',     label: 'Partial',      color: '#8b5cf6' },
  { key: 'Completed',   label: 'Completed',    color: '#22c55e' },
  { key: 'Cancelled',   label: 'Cancelled',    color: '#ef4444' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.userId);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(1);
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  // Realtime subscription — invalidates the orders query whenever any row
  // belonging to this user changes status, remains, or start_count
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`orders-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['order-detail'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['orders', page, selectedStatus, userId],
    queryFn: async () => {
      const from = (page - 1) * 20;
      const to = from + 19;
      let query = supabase
        .from('orders')
        .select('id, status, charge, quantity, start_count, remains, link, created_at, services(name, category, type)', { count: 'exact' })
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (selectedStatus !== 'all') query = query.eq('status', selectedStatus);
      const { data: orders, count, error } = await query;
      if (error) throw error;
      const totalPages = count ? Math.ceil(count / 20) : 1;
      return { orders: orders ?? [], totalPages, count: count ?? 0 };
    },
    enabled: !!userId,
  });

  const orders = data?.orders ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Icon name="box" size={22} color={colors.text} />
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <Icon name="refresh" size={20} color="#7C5CFC" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {STATUSES.map((s) => {
          const active = selectedStatus === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.filterChip, active && { backgroundColor: s.color, borderColor: s.color }]}
              onPress={() => { setSelectedStatus(s.key); setPage(1); }}
            >
              {!active && <View style={[styles.filterDot, { backgroundColor: s.color }]} />}
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C5CFC" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#7C5CFC" />
          }
          renderItem={({ item }) => (
            <OrderCard
              item={item}
              onPress={() => router.push({ pathname: '/orders/[id]', params: { id: item.id } } as any)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="box" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptyText}>
                {selectedStatus !== 'all'
                  ? `No ${selectedStatus.toLowerCase()} orders yet.`
                  : "You haven't placed any orders yet."}
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(tabs)/services' as any)}
              >
                <Text style={styles.emptyBtnText}>Browse Services</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            orders.length > 0 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                >
                  <Icon name="arrowLeft" size={13} color={page === 1 ? '#9ca3af' : '#fff'} />
                  <Text style={[styles.pageBtnText, page === 1 && styles.pageBtnTextDisabled]}>Prev</Text>
                </TouchableOpacity>
                <Text style={styles.pageLabel}>Page {page} of {totalPages}</Text>
                <TouchableOpacity
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                >
                  <Text style={[styles.pageBtnText, page === totalPages && styles.pageBtnTextDisabled]}>Next</Text>
                  <Icon name="arrowRight" size={13} color={page === totalPages ? '#9ca3af' : '#fff'} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 10 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: c.text },
    refreshBtn: { padding: 8 },
    filterScroll: { paddingHorizontal: 16, paddingBottom: 10, paddingTop: 2, gap: 6 },
    filterChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border, height: 30,
    },
    filterDot: { width: 6, height: 6, borderRadius: 3 },
    filterChipText: { fontSize: 12, color: c.text, fontFamily: 'Poppins_500Medium' },
    filterChipTextActive: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
    listContent: { padding: 16, paddingTop: 4, paddingBottom: 100 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: c.text },
    emptyText: { fontSize: 13, color: c.textSub, textAlign: 'center' },
    emptyBtn: { backgroundColor: c.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
    emptyBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 14 },
    pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingBottom: 20 },
    pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    pageBtnDisabled: { backgroundColor: c.border },
    pageBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
    pageBtnTextDisabled: { color: c.textMuted },
    pageLabel: { fontSize: 13, color: c.text, fontFamily: 'Poppins_500Medium' },
  });
}
