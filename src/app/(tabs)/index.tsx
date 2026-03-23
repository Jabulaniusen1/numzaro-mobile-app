import { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { BalanceCard } from '@/components/BalanceCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Icon, IconName } from '@/components/Icon';
import { format, parseISO } from 'date-fns';

interface QuickLink {
  icon: IconName;
  label: string;
  desc: string;
  route: string;
  color: string;
}

const QUICK_LINKS: QuickLink[] = [
  { icon: 'rocket',  label: 'Boost Socials',   desc: 'Grow followers & engagement', route: '/(tabs)/services', color: '#7C5CFC' },
  { icon: 'phone',   label: 'Virtual Numbers', desc: 'Get temporary phone numbers',  route: '/(tabs)/numbers',  color: '#0ea5e9' },
  { icon: 'box',     label: 'My Orders',       desc: 'Track all your orders',        route: '/(tabs)/orders',   color: '#f59e0b' },
  { icon: 'bell',    label: 'Notifications',   desc: 'Alerts & updates',             route: '/notifications',   color: '#22c55e' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.userId);
  const { format: formatCurrency } = useCurrency();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('full_name, wallet_balance')
        .eq('id', userId!)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  const { data: recentOrders, isLoading: ordersLoading, refetch } = useQuery({
    queryKey: ['recent-orders', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, status, charge, quantity, created_at, services(name, category)')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!userId,
  });

  const onRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['balance', userId] });
    await refetch();
  }, [userId]);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="#7C5CFC" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleRow}>
            <Image
              source={require('@/assets/images/logos/icon color.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>numzaro</Text>
          </View>
          <Text style={styles.headerSub}>Hey {firstName}, what would you like to do?</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => router.push('/notifications' as any)}
        >
          <Icon name="bell" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Compact Balance Strip */}
      <BalanceCard />

      {/* Quick Access — hero section */}
      <Text style={styles.sectionTitle}>Services</Text>
      <View style={styles.heroGrid}>
        {QUICK_LINKS.map((link) => (
          <TouchableOpacity
            key={link.label}
            style={styles.heroItem}
            onPress={() => router.push(link.route as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.heroIconWrap, { backgroundColor: `${link.color}18` }]}>
              <Icon name={link.icon} size={30} color={link.color} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroLabel}>{link.label}</Text>
              <Text style={styles.heroDesc}>{link.desc}</Text>
            </View>
            <Icon name="arrowRight" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Orders */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/orders' as any)}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

      {ordersLoading ? (
        <ActivityIndicator color="#7C5CFC" style={{ marginTop: 24 }} />
      ) : recentOrders?.length === 0 ? (
        <View style={styles.emptyBox}>
          <Icon name="box" size={40} color="#d1d5db" />
          <Text style={styles.emptyText}>No orders yet</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/services' as any)}>
            <Text style={styles.emptyBtnText}>Browse Services</Text>
          </TouchableOpacity>
        </View>
      ) : (
        recentOrders?.map((order: any) => (
          <View key={order.id} style={styles.orderRow}>
            <View style={styles.orderLeft}>
              <Text style={styles.orderName} numberOfLines={1}>
                {order.services?.name ?? 'Unknown'}
              </Text>
              <Text style={styles.orderDate}>
                {format(parseISO(order.created_at), 'MMM d, yyyy')}
              </Text>
            </View>
            <View style={styles.orderRight}>
              <StatusBadge status={order.status} />
              <Text style={styles.orderCharge}>{formatCurrency(Number(order.charge))}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { paddingBottom: 100 },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      paddingTop: 60,
      marginBottom: 12,
    },
    headerLeft: { flex: 1 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerLogo: { width: 22, height: 22 },
    headerTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: c.text },
    headerSub: { fontSize: 13, color: c.textSub, marginTop: 2 },
    notifBtn: {
      padding: 8,
      backgroundColor: c.card,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },

    sectionTitle: {
      fontSize: 16,
      fontFamily: 'Poppins_700Bold',
      color: c.text,
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingRight: 16,
      marginTop: 8,
      marginBottom: 2,
    },
    viewAll: { color: c.accent, fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

    // Hero quick-access list
    heroGrid: { paddingHorizontal: 16, gap: 10, marginBottom: 28 },
    heroItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      gap: 14,
    },
    heroIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroText: { flex: 1 },
    heroLabel: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: c.text },
    heroDesc: { fontSize: 12, color: c.textSub, marginTop: 2 },

    // Orders
    orderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 8,
    },
    orderLeft: { flex: 1, marginRight: 8 },
    orderName: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.text },
    orderDate: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    orderRight: { alignItems: 'flex-end', gap: 4 },
    orderCharge: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: c.text },

    emptyBox: { alignItems: 'center', padding: 32, gap: 8 },
    emptyText: { color: c.textSub, fontSize: 14, marginBottom: 8 },
    emptyBtn: { backgroundColor: c.accent, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
    emptyBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  });
}
