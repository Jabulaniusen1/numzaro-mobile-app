import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { fetchEsimOrders } from '@/lib/api';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { Icon } from '@/components/Icon';

const ACTIVE_STATUSES = new Set(['got_resource', 'in_use', 'used_up']);

export default function MyEsimsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const ordersQuery = useQuery({
    queryKey: ['esim-orders-dashboard'],
    queryFn: () => fetchEsimOrders(1, 100),
  });

  const orders = ordersQuery.data?.orders ?? [];
  const activeOrders = useMemo(
    () => orders.filter((order) => ACTIVE_STATUSES.has(String(order.status ?? ''))),
    [orders]
  );
  const purchasedOrders = useMemo(
    () => orders.filter((order) => !ACTIVE_STATUSES.has(String(order.status ?? ''))),
    [orders]
  );

  const renderOrder = (item: any) => (
    <TouchableOpacity
      key={item.id}
      style={styles.orderCard}
      onPress={() => router.push({ pathname: '/esim/[id]', params: { id: item.id } } as any)}
    >
      <Text style={styles.orderName}>{item.package_name ?? 'eSIM Order'}</Text>
      <Text style={styles.orderMeta}>{item.location ?? 'Unknown location'}</Text>
      <View style={styles.row}>
        <Text style={styles.orderStatus}>{item.status ?? 'pending'}</Text>
        <Text style={styles.orderAmount}>{item.charged_amount ? `$${item.charged_amount}` : ''}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={22} color="#7C5CFC" />
        </TouchableOpacity>
        <Text style={styles.title}>My eSIMs</Text>
        <TouchableOpacity onPress={() => router.push('/esim/buy' as any)} style={styles.buyBtn}>
          <Text style={styles.buyText}>Buy</Text>
        </TouchableOpacity>
      </View>

      {ordersQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C5CFC" />
        </View>
      ) : (
        <FlatList
          data={purchasedOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={ordersQuery.isRefetching} onRefresh={() => ordersQuery.refetch()} tintColor="#7C5CFC" />}
          ListHeaderComponent={
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Active eSIMs</Text>
              {activeOrders.length === 0 ? (
                <Text style={styles.emptyText}>No active eSIM yet.</Text>
              ) : (
                activeOrders.map(renderOrder)
              )}

              <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Purchased eSIMs</Text>
              {purchasedOrders.length === 0 && <Text style={styles.emptyText}>No purchased eSIM history yet.</Text>}
            </View>
          }
          renderItem={({ item }) => renderOrder(item)}
          ListEmptyComponent={null}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { padding: 4 },
    title: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: c.text },
    buyBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    buyText: { color: '#7C5CFC', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 16, paddingTop: 8, paddingBottom: 24 },
    sectionBlock: { marginBottom: 10 },
    sectionTitle: { color: c.text, fontSize: 15, fontFamily: 'Poppins_700Bold', marginBottom: 8 },
    orderCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
    },
    orderName: { color: c.text, fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
    orderMeta: { color: c.textSub, fontSize: 12, marginTop: 2 },
    row: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    orderStatus: { color: '#7C5CFC', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
    orderAmount: { color: c.text, fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
    emptyText: { color: c.textSub, fontSize: 13, marginBottom: 10 },
  });
}
