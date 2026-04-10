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
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { NotificationItem } from '@/components/NotificationItem';
import { Icon } from '@/components/Icon';

const TYPES = [
  { key: 'all',                   label: 'All',          color: '#6b7280' },
  { key: 'transaction',           label: 'Transactions', color: '#22c55e' },
  { key: 'billing',               label: 'Billing',      color: '#3b82f6' },
  { key: 'subscription_reminder', label: 'Reminders',    color: '#f59e0b' },
  { key: 'expiration_reminder',   label: 'Expiration',   color: '#8b5cf6' },
  { key: 'payment_failed',        label: 'Failed',       color: '#ef4444' },
  { key: 'esim_purchased',        label: 'eSIM',         color: '#7C5CFC' },
  { key: 'esim_status_update',    label: 'eSIM Status',  color: '#2563eb' },
  { key: 'esim_data_usage',       label: 'eSIM Usage',   color: '#f59e0b' },
  { key: 'esim_expiring',         label: 'eSIM Expiry',  color: '#ef4444' },
];

const ESIM_NOTIFICATION_TYPES = new Set([
  'esim_purchased',
  'esim_status_update',
  'esim_data_usage',
  'esim_expiring',
]);

function parseNotificationData(data: unknown): Record<string, any> {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof data === 'object') return data as Record<string, any>;
  return {};
}

function getEsimOrderId(notif: any): string | null {
  const payload = parseNotificationData(notif?.data);
  const id =
    payload.esim_order_id ??
    payload.esimOrderId ??
    payload.order_id ??
    payload.orderId ??
    null;
  return id ? String(id) : null;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.userId);
  const [selectedType, setSelectedType] = useState('all');
  const { colors } = useTheme();
  const styles = makeStyles(colors);

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
    const esimOrderId = getEsimOrderId(notif);

    if (ESIM_NOTIFICATION_TYPES.has(notif.type) && esimOrderId) {
      router.push({ pathname: '/esim/[id]', params: { id: esimOrderId } } as any);
      return;
    }

    if (esimOrderId) {
      router.push({ pathname: '/esim/[id]', params: { id: esimOrderId } } as any);
      return;
    }

    if (parseNotificationData(notif.data).order_id) {
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
          <Icon name="bell" size={18} color={colors.text} />
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
            style={[styles.filterChip, selectedType === t.key && { backgroundColor: t.color, borderColor: t.color }]}
            onPress={() => setSelectedType(t.key)}
          >
            {selectedType !== t.key && <View style={[styles.filterDot, { backgroundColor: t.color }]} />}
            <Text style={[styles.filterChipText, selectedType === t.key && { color: '#fff' }]}>
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

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
    backBtn: { padding: 4 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: c.text, textAlign: 'center' },
    unreadBadge: { color: '#7C5CFC' },
    markAllBtn: { paddingHorizontal: 4 },
    markAllText: { color: '#7C5CFC', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
    filterScroll: { paddingHorizontal: 16, paddingBottom: 10, gap: 8, alignItems: 'center' },
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
