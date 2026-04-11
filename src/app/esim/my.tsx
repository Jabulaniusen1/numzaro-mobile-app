import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { fetchEsimOrders, EsimOrder } from '@/lib/api';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { Icon } from '@/components/Icon';

const ACTIVE_STATUSES = new Set(['got_resource', 'in_use']);
const ALL_SHOWN_STATUSES = new Set(['got_resource', 'in_use', 'used_up', 'pending', 'expired', 'cancelled']);

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:      { label: 'Pending',    color: '#d97706', bg: '#fef3c7' },
  got_resource: { label: 'Activated',  color: '#2563eb', bg: '#dbeafe' },
  in_use:       { label: 'In Use',     color: '#16a34a', bg: '#dcfce7' },
  used_up:      { label: 'Used Up',    color: '#6b7280', bg: '#f3f4f6' },
  expired:      { label: 'Expired',    color: '#dc2626', bg: '#fee2e2' },
  cancelled:    { label: 'Cancelled',  color: '#dc2626', bg: '#fee2e2' },
};

function getStatusMeta(status?: string) {
  const key = (status ?? '').toLowerCase();
  return STATUS_META[key] ?? { label: status ?? 'Pending', color: '#7C5CFC', bg: '#F4F0FF' };
}

const TABS = ['Active', 'All'] as const;
type Tab = (typeof TABS)[number];

export default function MyEsimsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [activeTab, setActiveTab] = useState<Tab>('Active');

  const ordersQuery = useQuery({
    queryKey: ['esim-orders-dashboard'],
    queryFn: () => fetchEsimOrders(1, 100),
  });

  const orders = ordersQuery.data?.orders ?? [];
  const activeOrders = useMemo(
    () => orders.filter((o) => ACTIVE_STATUSES.has(String(o.status ?? ''))),
    [orders]
  );
  const displayed = activeTab === 'Active' ? activeOrders : orders;

  const renderOrder = ({ item }: { item: EsimOrder }) => {
    const meta = getStatusMeta(item.status);
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push({ pathname: '/esim/[id]', params: { id: item.id } } as any)}
        activeOpacity={0.75}
      >
        <View style={styles.orderTop}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.orderName} numberOfLines={1}>{item.package_name ?? 'eSIM Package'}</Text>
            <View style={styles.locationRow}>
              <Icon name="globe" size={12} color={colors.textSub} />
              <Text style={styles.orderMeta} numberOfLines={1}>{item.location ?? 'Unknown location'}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.footerChips}>
            {item.duration && (
              <View style={styles.chip}>
                <Icon name="time" size={11} color={colors.textMuted} />
                <Text style={styles.chipText}>{item.duration}</Text>
              </View>
            )}
            {item.data_volume && (
              <View style={styles.chip}>
                <Icon name="database" size={11} color={colors.textMuted} />
                <Text style={styles.chipText}>{item.data_volume}</Text>
              </View>
            )}
            {item.iccid && (
              <View style={styles.chip}>
                <Icon name="sim" size={11} color={colors.textMuted} />
                <Text style={styles.chipText} numberOfLines={1}>{item.iccid.slice(0, 10)}…</Text>
              </View>
            )}
          </View>
          <View style={styles.footerRight}>
            {item.charged_amount != null && (
              <Text style={styles.orderAmount}>${item.charged_amount}</Text>
            )}
            <Icon name="arrowRight" size={14} color={colors.textMuted} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={22} color="#7C5CFC" />
        </TouchableOpacity>
        <Text style={styles.title}>My eSIMs</Text>
        <TouchableOpacity onPress={() => router.push('/esim/buy' as any)} style={styles.buyBtn}>
          <Icon name="plus" size={16} color="#7C5CFC" />
          <Text style={styles.buyText}>Buy</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
              {tab === 'Active' && activeOrders.length > 0 ? ` (${activeOrders.length})` : ''}
              {tab === 'All' && orders.length > 0 ? ` (${orders.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {ordersQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C5CFC" />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={ordersQuery.isRefetching}
              onRefresh={() => ordersQuery.refetch()}
              tintColor="#7C5CFC"
            />
          }
          renderItem={renderOrder}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Icon name="sim" size={32} color="#7C5CFC" />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'Active' ? 'No active eSIMs' : 'No eSIMs yet'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'Active'
                  ? 'Your activated eSIMs will appear here.'
                  : 'Purchase your first eSIM to get connected instantly.'}
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/esim/buy' as any)}>
                <Text style={styles.emptyBtnText}>Buy eSIM</Text>
              </TouchableOpacity>
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
    header: {
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: { padding: 4 },
    title: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: c.text },
    buyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
    buyText: { color: '#7C5CFC', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Tabs
    tabRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 4,
    },
    tab: {
      paddingVertical: 7,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: c.cardAlt,
    },
    tabActive: { backgroundColor: '#7C5CFC' },
    tabText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.textSub },
    tabTextActive: { color: '#fff' },

    content: { padding: 16, paddingTop: 8, paddingBottom: 24 },

    // Order card
    orderCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 14,
      gap: 10,
    },
    orderTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    orderName: { color: c.text, fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
    orderMeta: { color: c.textSub, fontSize: 12, fontFamily: 'Poppins_400Regular' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    statusText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },

    orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    footerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.cardAlt,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    chipText: { fontSize: 11, color: c.textMuted, fontFamily: 'Poppins_500Medium' },
    footerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    orderAmount: { color: '#7C5CFC', fontSize: 13, fontFamily: 'Poppins_700Bold' },

    // Empty state
    emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 8 },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: '#F4F0FF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: c.text },
    emptyText: { fontSize: 13, color: c.textSub, textAlign: 'center', lineHeight: 20 },
    emptyBtn: {
      backgroundColor: '#7C5CFC',
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 24,
      marginTop: 8,
    },
    emptyBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  });
}
