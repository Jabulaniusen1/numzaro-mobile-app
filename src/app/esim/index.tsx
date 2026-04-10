import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchEsimOrders } from '@/lib/api';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { Icon } from '@/components/Icon';

const ACTIVE_STATUSES = new Set(['got_resource', 'in_use', 'used_up']);

export default function EsimHomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const ordersQuery = useQuery({
    queryKey: ['esim-orders-dashboard'],
    queryFn: () => fetchEsimOrders(1, 50),
  });

  const orders = ordersQuery.data?.orders ?? [];
  const activeCount = orders.filter((order) => ACTIVE_STATUSES.has(String(order.status ?? ''))).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={22} color="#7C5CFC" />
        </TouchableOpacity>
        <Text style={styles.title}>eSIM</Text>
        <TouchableOpacity onPress={() => router.push('/fund-wallet' as any)} style={styles.topUpBtn}>
          <Text style={styles.topUpText}>Top Up</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/esim/buy' as any)}>
          <View style={[styles.iconWrap, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="plus" size={24} color="#16a34a" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Buy eSIM</Text>
            <Text style={styles.actionSub}>Choose country, package, and purchase instantly.</Text>
          </View>
          <Icon name="arrowRight" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/esim/my' as any)}>
          <View style={[styles.iconWrap, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="clipboard" size={24} color="#4f46e5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>My eSIMs</Text>
            <Text style={styles.actionSub}>View purchased eSIMs and active usage status.</Text>
          </View>
          <Icon name="arrowRight" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {ordersQuery.isLoading ? (
          <ActivityIndicator style={{ marginTop: 10 }} size="small" color="#7C5CFC" />
        ) : (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>Purchased: {orders.length}</Text>
            <Text style={styles.summaryText}>Active: {activeCount}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { padding: 4 },
    title: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: c.text },
    topUpBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    topUpText: { color: '#7C5CFC', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    content: { padding: 16, paddingTop: 8, gap: 12 },
    actionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 14,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionTitle: { color: c.text, fontSize: 15, fontFamily: 'Poppins_700Bold' },
    actionSub: { color: c.textSub, fontSize: 12, marginTop: 2 },
    summaryCard: {
      marginTop: 4,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    summaryText: { color: c.text, fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  });
}
