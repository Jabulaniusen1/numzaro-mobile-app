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
        <TouchableOpacity onPress={() => router.push('/fund-wallet' as any)} style={styles.topUpBtn}>
          <Text style={styles.topUpText}>Top Up</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroIconWrap}>
            <Icon name="sim" size={32} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Global eSIM</Text>
          <Text style={styles.heroSub}>
            Stay connected in 190+ countries.{'\n'}No physical SIM needed.
          </Text>
          <View style={styles.heroFeatures}>
            <View style={styles.heroFeatureItem}>
              <Icon name="wifi" size={14} color="#c4b5fd" />
              <Text style={styles.heroFeatureText}>Data-only</Text>
            </View>
            <View style={styles.heroFeatureDot} />
            <View style={styles.heroFeatureItem}>
              <Icon name="time" size={14} color="#c4b5fd" />
              <Text style={styles.heroFeatureText}>Instant activation</Text>
            </View>
            <View style={styles.heroFeatureDot} />
            <View style={styles.heroFeatureItem}>
              <Icon name="smartphone" size={14} color="#c4b5fd" />
              <Text style={styles.heroFeatureText}>iOS & Android</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        {ordersQuery.isLoading ? (
          <ActivityIndicator size="small" color="#7C5CFC" style={{ marginVertical: 4 }} />
        ) : totalCount > 0 ? (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalCount}</Text>
              <Text style={styles.statLabel}>Total Purchased</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: activeCount > 0 ? '#16a34a' : colors.textSub }]}>
                {activeCount}
              </Text>
              <Text style={styles.statLabel}>Currently Active</Text>
            </View>
          </View>
        ) : null}

        {/* Actions */}
        <TouchableOpacity style={styles.primaryAction} onPress={() => router.push('/esim/buy' as any)}>
          <View style={[styles.actionIconWrap, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="plus" size={24} color="#16a34a" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Buy eSIM</Text>
            <Text style={styles.actionSub}>Browse plans for 190+ countries — from $2</Text>
          </View>
          <Icon name="arrowRight" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/esim/my' as any)}>
          <View style={[styles.actionIconWrap, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="clipboard" size={22} color="#4f46e5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionCardTitle}>My eSIMs</Text>
            <Text style={styles.actionCardSub}>
              {activeCount > 0
                ? `${activeCount} active eSIM${activeCount > 1 ? 's' : ''} — tap to view`
                : 'View and activate your purchased eSIMs'}
            </Text>
          </View>
          <Icon name="arrowRight" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* How it works */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>How it works</Text>
          <View style={styles.howSteps}>
            <HowStep num="1" label="Choose a country & plan" colors={colors} />
            <HowStep num="2" label="Pay from your wallet balance" colors={colors} />
            <HowStep num="3" label="Scan QR or tap 'Add to iPhone / Android'" colors={colors} />
            <HowStep num="4" label="Connect instantly anywhere" colors={colors} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function HowStep({ num, label, colors }: { num: string; label: string; colors: ThemeColors }) {
  return (
    <View style={howStyles.row}>
      <View style={howStyles.numBadge}>
        <Text style={howStyles.num}>{num}</Text>
      </View>
      <Text style={[howStyles.label, { color: colors.textSub }]}>{label}</Text>
    </View>
  );
}

const howStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7C5CFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { color: '#fff', fontSize: 12, fontFamily: 'Poppins_700Bold' },
  label: { fontSize: 13, fontFamily: 'Poppins_400Regular', flex: 1 },
});

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
    topUpBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    topUpText: { color: '#7C5CFC', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    content: { padding: 16, paddingTop: 4, gap: 12 },

    // Hero banner
    heroBanner: {
      backgroundColor: '#7C5CFC',
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      gap: 6,
    },
    heroIconWrap: {
      width: 60,
      height: 60,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    heroTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: '#fff' },
    heroSub: { fontSize: 13, color: '#e9d5ff', textAlign: 'center', lineHeight: 20, fontFamily: 'Poppins_400Regular' },
    heroFeatures: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 8,
    },
    heroFeatureItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    heroFeatureText: { color: '#e9d5ff', fontSize: 12, fontFamily: 'Poppins_500Medium' },
    heroFeatureDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#c4b5fd' },

    // Stats
    statsRow: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    statCard: { flex: 1, alignItems: 'center', paddingVertical: 14 },
    statDivider: { width: 1, backgroundColor: c.border },
    statValue: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: c.text },
    statLabel: { fontSize: 11, color: c.textSub, fontFamily: 'Poppins_500Medium', marginTop: 2 },

    // Primary action (Buy)
    primaryAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: '#7C5CFC',
      borderRadius: 14,
      padding: 14,
    },

    // Regular action
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
    actionIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionTitle: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },
    actionSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2, fontFamily: 'Poppins_400Regular' },

    // Regular action card text
    actionCardTitle: { color: c.text, fontSize: 15, fontFamily: 'Poppins_700Bold' },
    actionCardSub: { color: c.textSub, fontSize: 12, marginTop: 2, fontFamily: 'Poppins_400Regular' },

    // How it works
    howCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      gap: 10,
    },
    howTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: c.text },
    howSteps: { gap: 10 },
  });
}
