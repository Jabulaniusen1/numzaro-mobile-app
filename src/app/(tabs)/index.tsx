import { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
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
import { Icon, IconName } from '@/components/Icon';
import { formatDistanceToNow, parseISO } from 'date-fns';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

interface ServiceCard {
  icon: IconName;
  label: string;
  desc: string;
  route: string;
  color: string;
  bgColor: string;
}

const SERVICES: ServiceCard[] = [
  {
    icon: 'phone',
    label: 'Virtual Numbers',
    desc: 'Temporary numbers for OTPs & verifications',
    route: '/(tabs)/numbers',
    color: '#fff',
    bgColor: '#0ea5e9',
  },
  {
    icon: 'clipboard',
    label: 'eSIM',
    desc: 'Stay connected in 190+ countries',
    route: '/esim',
    color: '#fff',
    bgColor: '#7C5CFC',
  },
];

interface QuickAction {
  icon: IconName;
  label: string;
  route: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: 'wallet',       label: 'Fund Wallet',   route: '/fund-wallet',     color: '#7C5CFC' },
  { icon: 'barChartDollar', label: 'Transactions', route: '/transactions',    color: '#f59e0b' },
  { icon: 'phone',        label: 'My Numbers',    route: '/my-numbers',      color: '#0ea5e9' },
  { icon: 'sim',          label: 'My eSIMs',      route: '/esim/my',         color: '#22c55e' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.userId);
  const { format } = useCurrency();
  const { colors, dark } = useTheme();
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

  const { data: recentTx = [], isLoading: txLoading } = useQuery({
    queryKey: ['recent-tx', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('wallet_transactions')
        .select('id, type, amount, description, created_at')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(4);
      return data ?? [];
    },
    enabled: !!userId,
  });

  const onRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['balance', userId] }),
      queryClient.invalidateQueries({ queryKey: ['recent-tx', userId] }),
    ]);
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
          <Image
            source={
              dark
                ? require('@/assets/images/logos/logo w&c.png')
                : require('@/assets/images/logos/logo color.png')
            }
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerSub}>Hey {firstName}, what would you like to do?</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => router.push('/notifications' as any)}
          activeOpacity={0.8}
        >
          <Icon name="bell" size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <BalanceCard />

      {/* Services */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Services</Text>
      </View>
      <View style={styles.serviceGrid}>
        {SERVICES.map((svc) => (
          <TouchableOpacity
            key={svc.label}
            style={[styles.serviceCard, { backgroundColor: svc.bgColor }]}
            onPress={() => router.push(svc.route as any)}
            activeOpacity={0.82}
          >
            <View style={styles.serviceCircle} />
            <View style={styles.serviceCircle2} />
            <View style={styles.serviceIconWrap}>
              <Icon name={svc.icon} size={26} color={svc.color} />
            </View>
            <Text style={[styles.serviceLabel, { color: svc.color }]}>{svc.label}</Text>
            <Text style={[styles.serviceDesc, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={2}>
              {svc.desc}
            </Text>
            <View style={styles.serviceArrow}>
              <Icon name="arrowRight" size={13} color="rgba(255,255,255,0.8)" />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>
      <View style={styles.actionsRow}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.actionChip}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: `${action.color}18` }]}>
              <Icon name={action.icon} size={20} color={action.color} />
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Transactions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity onPress={() => router.push('/transactions' as any)}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

      {txLoading ? (
        <ActivityIndicator color="#7C5CFC" style={{ marginTop: 16 }} />
      ) : recentTx.length === 0 ? (
        <View style={styles.emptyBox}>
          <Icon name="barChartDollar" size={36} color="#d1d5db" />
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptyHint}>Fund your wallet to get started</Text>
        </View>
      ) : (
        <View style={styles.txList}>
          {recentTx.map((tx: any) => {
            const isCredit = Number(tx.amount) > 0;
            return (
              <View key={tx.id} style={styles.txRow}>
                <View style={[styles.txIcon, { backgroundColor: isCredit ? '#dcfce7' : '#fee2e2' }]}>
                  <Icon
                    name={isCredit ? 'handDollar' : 'creditCard'}
                    size={16}
                    color={isCredit ? '#16a34a' : '#dc2626'}
                  />
                </View>
                <View style={styles.txDetails}>
                  <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                  <Text style={styles.txTime}>
                    {formatDistanceToNow(parseISO(tx.created_at), { addSuffix: true })}
                  </Text>
                </View>
                <Text style={[styles.txAmount, isCredit ? styles.txCredit : styles.txDebit]}>
                  {isCredit ? '+' : ''}{format(Math.abs(Number(tx.amount)))}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { paddingBottom: 110 },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      paddingTop: 60,
      marginBottom: 12,
    },
    headerLeft: { flex: 1 },
    headerLogo: { width: 140, height: 40 },
    headerSub: { fontSize: 13, color: c.textSub, marginTop: 4 },
    notifBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 12,
    },

    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 10,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: 'Poppins_700Bold',
      color: c.text,
    },
    viewAll: { color: c.accent, fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

    // ── Service cards ──────────────────────────────────────────────
    serviceGrid: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: 24,
    },
    serviceCard: {
      width: CARD_W,
      height: 170,
      borderRadius: 20,
      padding: 16,
      overflow: 'hidden',
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 6,
    },
    serviceCircle: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255,255,255,0.1)',
      bottom: -40,
      right: -30,
    },
    serviceCircle2: {
      position: 'absolute',
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: 'rgba(255,255,255,0.07)',
      top: -20,
      right: 30,
    },
    serviceIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    serviceLabel: {
      fontSize: 15,
      fontFamily: 'Poppins_700Bold',
      marginTop: 8,
    },
    serviceDesc: {
      fontSize: 11,
      fontFamily: 'Poppins_400Regular',
      lineHeight: 16,
      flex: 1,
    },
    serviceArrow: {
      alignSelf: 'flex-end',
      width: 26,
      height: 26,
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    // ── Quick actions ──────────────────────────────────────────────
    actionsRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 10,
      marginBottom: 24,
    },
    actionChip: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.card,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 6,
      borderWidth: 1,
      borderColor: c.border,
    },
    actionIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionLabel: {
      fontSize: 10,
      fontFamily: 'Poppins_600SemiBold',
      color: c.text,
      textAlign: 'center',
    },

    // ── Transactions ───────────────────────────────────────────────
    txList: { paddingHorizontal: 16, gap: 8 },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 12,
      gap: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    txIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
    },
    txDetails: { flex: 1 },
    txDesc: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: c.text },
    txTime: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    txAmount: { fontSize: 13, fontFamily: 'Poppins_700Bold' },
    txCredit: { color: '#16a34a' },
    txDebit: { color: '#dc2626' },

    emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 6 },
    emptyText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: c.textSub },
    emptyHint: { fontSize: 12, color: c.textMuted },
  });
}
