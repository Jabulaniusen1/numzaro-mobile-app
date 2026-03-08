import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { NotificationItem } from '@/components/NotificationItem';
import { Icon } from '@/components/Icon';

const TYPES = [
  { key: 'all', label: 'All' },
  { key: 'transaction', label: 'Transactions' },
  { key: 'billing', label: 'Billing' },
  { key: 'subscription_reminder', label: 'Reminders' },
  { key: 'expiration_reminder', label: 'Expiration' },
  { key: 'payment_failed', label: 'Failed' },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.userId);
  const [selectedType, setSelectedType] = useState('all');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications', userId, selectedType],
    queryFn: async () => {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(100);

      if (selectedType !== 'all') query = query.eq('type', selectedType);

      const [{ data: notifications }, { count: unreadCount }] = await Promise.all([
        query,
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId!)
          .eq('read', false),
      ]);

      return { notifications: notifications ?? [], unreadCount: unreadCount ?? 0 };
    },
    enabled: !!userId,
  });

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('notifications-screen')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId!);
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
  };

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId!)
      .eq('read', false);
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
  };

  const handleNotifPress = (notif: any) => {
    markAsRead(notif.id);
    if (notif.data?.order_id) {
      router.push('/(tabs)/orders' as any);
    }
  };

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={22} color="#7C5CFC" />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Icon name="bell" size={18} color="#111827" />
          <Text style={styles.headerTitle}>
            Notifications
            {unreadCount > 0 && (
              <Text style={styles.unreadBadge}> ({unreadCount})</Text>
            )}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark All</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Type Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.pill, selectedType === t.key && styles.pillActive]}
            onPress={() => setSelectedType(t.key)}
          >
            <Text style={[styles.pillText, selectedType === t.key && styles.pillTextActive]}>
              {t.label}
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
          data={notifications}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#7C5CFC" />
          }
          renderItem={({ item }) => (
            <NotificationItem item={item} onPress={handleNotifPress} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="bell" size={40} color="#d1d5db" />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  backBtn: { padding: 4 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  unreadBadge: { color: '#7C5CFC' },
  markAllBtn: { paddingHorizontal: 4 },
  markAllText: { color: '#7C5CFC', fontSize: 13, fontWeight: '600' },
  filterScroll: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
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
  listContent: { padding: 16, paddingTop: 4, paddingBottom: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: '#6b7280', fontSize: 14 },
});
