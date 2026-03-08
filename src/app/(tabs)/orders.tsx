import { useState } from 'react';
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
import { OrderCard } from '@/components/OrderCard';
import { Icon } from '@/components/Icon';

const STATUSES = ['all', 'Pending', 'In Progress', 'Partial', 'Completed', 'Cancelled'];

export default function OrdersScreen() {
  const router = useRouter();
  const userId = useAppStore((s) => s.userId);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['orders', page, selectedStatus, userId],
    queryFn: async () => {
      const from = (page - 1) * 20;
      const to = from + 19;

      let query = supabase
        .from('orders')
        .select('*, services(name, category, type)', { count: 'exact' })
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Icon name="box" size={22} color="#111827" />
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <Icon name="refresh" size={20} color="#7C5CFC" />
        </TouchableOpacity>
      </View>

      {/* Status Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {STATUSES.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.pill, selectedStatus === s && styles.pillActive]}
            onPress={() => {
              setSelectedStatus(s);
              setPage(1);
            }}
          >
            <Text style={[styles.pillText, selectedStatus === s && styles.pillTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
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
          renderItem={({ item }) => <OrderCard item={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="box" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptyText}>
                {selectedStatus !== 'all' ? `No ${selectedStatus.toLowerCase()} orders.` : 'You haven\'t placed any orders yet.'}
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
                  <Text style={[styles.pageBtnText, page === 1 && styles.pageBtnTextDisabled]}>
                    Prev
                  </Text>
                </TouchableOpacity>
                <Text style={styles.pageLabel}>
                  Page {page} of {totalPages}
                </Text>
                <TouchableOpacity
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                >
                  <Text style={[styles.pageBtnText, page === totalPages && styles.pageBtnTextDisabled]}>
                    Next
                  </Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  refreshBtn: { padding: 8 },
  filterScroll: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pillActive: { backgroundColor: '#7C5CFC', borderColor: '#7C5CFC' },
  pillText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  pillTextActive: { color: '#fff' },
  listContent: { padding: 16, paddingTop: 4, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  emptyBtn: {
    backgroundColor: '#7C5CFC',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingBottom: 20,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7C5CFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pageBtnDisabled: { backgroundColor: '#e5e7eb' },
  pageBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  pageBtnTextDisabled: { color: '#9ca3af' },
  pageLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
});
