import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchEsimOrders } from '@/lib/api';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { Icon } from '@/components/Icon';

const ACTIVE_STATUSES = new Set(['got_resource', 'in_use']);

export default function EsimHomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const ordersQuery = useQuery({
    queryKey: ['esim-orders-dashboard'],
    queryFn: () => fetchEsimOrders(1, 50),
  });

  const orders = ordersQuery.data?.orders ?? [];
  const activeCount = orders.filter((o) => ACTIVE_STATUSES.has(String(o.status ?? ''))).length;
  const totalCount = orders.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={22} color="#7C5CFC" />
        </TouchableOpacity>
        <Text style={styles.title}>eSIM</Text>
        <TouchableOpacity onPress={() => router.push('/fund-wallet' as any)}>
          <Text style={styles.topUpText}>Top Up</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Compact Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Icon name="sim" size={22} color="#fff" />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Global eSIM</Text>
            <Text style={styles.bannerSub}>190+ countries · No physical SIM · Instant activation</Text>
          </View>
        </View>

        {/* Stats */}
        {ordersQuery.isLoading ? (
          <ActivityIndicator size="small" color="#7C5CFC" style={{ marginVertical: 8 }} />
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalCount}</Text>
              <Text style={styles.statLabel}>Purchased</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, activeCount > 0 && { color: '#16a34a' }]}>
                {activeCount}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalCount - activeCount}</Text>
              <Text style={styles.statLabel}>Expired</Text>
            </View>
          </View>
        )}

        {/* Divider */}
        <Text style={styles.groupLabel}>Actions</Text>

        {/* Action Cards */}
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/esim/buy' as any)} activeOpacity={0.75}>
          <View style={[styles.actionIcon, { backgroundColor: '#EDE9FF' }]}>
            <Icon name="plus" size={20} color="#7C5CFC" />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Buy eSIM</Text>
            <Text style={styles.actionSub}>Browse plans from $2 · 190+ countries</Text>
          </View>
          <Icon name="arrowRight" size={15} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/esim/my' as any)} activeOpacity={0.75}>
          <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="clipboard" size={20} color="#4f46e5" />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>My eSIMs</Text>
            <Text style={styles.actionSub}>
              {activeCount > 0
                ? `${activeCount} active eSIM${activeCount > 1 ? 's' : ''} — tap to view`
                : 'View and manage your eSIMs'}
            </Text>
          </View>
          <Icon name="arrowRight" size={15} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: { padding: 4 },
    title: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: c.text },
    topUpText: { color: '#7C5CFC', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },

    content: { padding: 16, paddingTop: 8, gap: 12 },

    // Banner
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: '#7C5CFC',
      borderRadius: 16,
      padding: 16,
    },
    bannerIcon: {
      width: 44,
      height: 44,
      borderRadius: 13,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    bannerText: { flex: 1 },
    bannerTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#fff' },
    bannerSub: { fontSize: 11, color: '#e9d5ff', fontFamily: 'Poppins_400Regular', marginTop: 2, lineHeight: 16 },

    // Stats
    statsRow: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
    statDivider: { width: 1, backgroundColor: c.border },
    statValue: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: c.text },
    statLabel: { fontSize: 11, color: c.textMuted, fontFamily: 'Poppins_500Medium', marginTop: 2 },

    // Section label
    groupLabel: {
      fontSize: 12,
      fontFamily: 'Poppins_600SemiBold',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: -4,
    },

    // Action cards
    actionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    actionIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    actionText: { flex: 1 },
    actionTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: c.text },
    actionSub: { fontSize: 12, color: c.textSub, fontFamily: 'Poppins_400Regular', marginTop: 2 },
  });
}
