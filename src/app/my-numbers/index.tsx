import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { updateNumber } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { NumberCard } from '@/components/NumberCard';
import { StatusBadge } from '@/components/StatusBadge';
import { CountdownTimer } from '@/components/CountdownTimer';
import { Icon } from '@/components/Icon';

type TabType = 'active' | 'history';

const ACTIVE_STATUSES = ['PENDING', 'RECEIVED', 'ACTIVE'];
const HISTORY_STATUSES = ['FINISHED', 'CANCELED', 'TIMEOUT', 'BANNED', 'CANCELLED', 'SUSPENDED'];

export default function MyNumbersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.userId);
  const [tab, setTab] = useState<TabType>('active');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: numbers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['numbers', userId],
    queryFn: async () => {
      const { data: rawNumbers, error } = await supabase
        .from('virtual_numbers')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!rawNumbers) return [];

      const enriched = await Promise.all(
        rawNumbers.map(async (number: any) => {
          const [{ count: messageCount }, { data: latestOtp }, { count: otpCount }] =
            await Promise.all([
              supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('number_id', number.id),
              supabase
                .from('otp_codes')
                .select('code, status')
                .eq('number_id', number.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
              supabase
                .from('otp_codes')
                .select('*', { count: 'exact', head: true })
                .eq('number_id', number.id)
                .eq('status', 'pending'),
            ]);

          return {
            ...number,
            message_count: messageCount ?? 0,
            pending_otp_count: otpCount ?? 0,
            otp_code: latestOtp?.code ?? null,
            otp_status: latestOtp?.status ?? null,
          };
        })
      );

      return enriched;
    },
    enabled: !!userId,
  });

  // Realtime OTP subscription for the first active number
  const firstActive = numbers.find((n: any) => ACTIVE_STATUSES.includes(n.status?.toUpperCase()));

  useEffect(() => {
    if (!firstActive) return;

    const channel = supabase
      .channel(`otp-${firstActive.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'otp_codes',
          filter: `number_id=eq.${firstActive.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['numbers', userId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [firstActive?.id]);

  const handleAction = async (numberId: string, action: string) => {
    setActionLoading(action);
    try {
      await updateNumber(numberId, action);
      queryClient.invalidateQueries({ queryKey: ['numbers', userId] });
      Alert.alert('Success', `Action "${action}" completed.`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredNumbers = numbers.filter((n: any) => {
    const statusUpper = n.status?.toUpperCase() ?? '';
    const inTab = tab === 'active'
      ? ACTIVE_STATUSES.includes(statusUpper)
      : HISTORY_STATUSES.includes(statusUpper);
    if (!inTab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        n.phone_number?.toLowerCase().includes(q) ||
        n.product?.toLowerCase().includes(q) ||
        n.country_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const prominentNumber = tab === 'active' ? filteredNumbers[0] : null;
  const restNumbers = tab === 'active' ? filteredNumbers.slice(1) : filteredNumbers;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={22} color="#7C5CFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Numbers</Text>
        <TouchableOpacity
          style={styles.buyBtn}
          onPress={() => router.push('/(tabs)/numbers' as any)}
        >
          <Icon name="plus" size={13} color="#fff" />
          <Text style={styles.buyBtnText}>Buy</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        {(['active', 'history'] as TabType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search by number, product, country..."
        placeholderTextColor="#9ca3af"
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C5CFC" />
        </View>
      ) : (
        <FlatList
          data={[{ isHeader: true }, ...restNumbers]}
          keyExtractor={(item: any) => item.isHeader ? '__header__' : item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#7C5CFC" />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: { item: any }) => {
            if (item.isHeader) {
              if (!prominentNumber) {
                return (
                  <View style={styles.emptyBox}>
                    <Icon name={tab === 'active' ? 'phone' : 'clipboard'} size={40} color="#d1d5db" />
                    <Text style={styles.emptyText}>
                      {tab === 'active' ? 'No active numbers' : 'No number history'}
                    </Text>
                  </View>
                );
              }
              return (
                <NumberCard
                  number={prominentNumber}
                  onAction={handleAction}
                  actionLoading={actionLoading}
                  isProminent
                  onViewMessages={() => router.push(`/numbers/${prominentNumber.id}/messages` as any)}
                  onViewOtps={() => router.push(`/numbers/${prominentNumber.id}/otps` as any)}
                />
              );
            }

            return (
              <TouchableOpacity
                onPress={() => router.push(`/numbers/${item.id}/otps` as any)}
              >
                <NumberCard number={item} onAction={() => {}} isProminent={false} />
              </TouchableOpacity>
            );
          }}
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
  backBtn: { padding: 4, marginRight: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  buyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7C5CFC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  buyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#7C5CFC' },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  tabBtnTextActive: { color: '#fff' },
  search: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#111827',
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  listContent: { padding: 16, paddingTop: 4, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { color: '#6b7280', fontSize: 14 },
});
