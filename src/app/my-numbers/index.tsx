import { useState, useEffect } from 'react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { fetchUserNumbers, purchaseAnotherFromActiveNumber, updateNumber } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { NumberCard } from '@/components/NumberCard';
import { Icon } from '@/components/Icon';

type TabType = 'active' | 'history';

const ACTIVE_STATUSES = ['PENDING', 'RECEIVED', 'ACTIVE'];
const HISTORY_STATUSES = ['FINISHED', 'CANCELED', 'TIMEOUT', 'BANNED', 'CANCELLED', 'SUSPENDED'];

export default function MyNumbersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.userId);
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [tab, setTab] = useState<TabType>('active');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [getAnotherLoadingId, setGetAnotherLoadingId] = useState<string | null>(null);

  const { data: numbers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['numbers', userId],
    queryFn: async () => {
      const payload = await fetchUserNumbers({ limit: 100 });
      return (payload as any)?.numbers ?? payload ?? [];
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
    const num = numbers.find((n: any) => n.id === numberId);
    const isRental = num?.number_type === 'rental';

    if (action === 'cancel' && isRental) {
      Alert.alert(
        'Cancel Subscription',
        'Are you sure you want to cancel this rental? This cannot be undone.',
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Cancel Subscription',
            style: 'destructive',
            onPress: async () => {
              setActionLoading('cancel');
              try {
                await updateNumber(numberId, 'cancel');
                queryClient.invalidateQueries({ queryKey: ['numbers', userId] });
                Alert.alert('Cancelled', 'Your rental subscription has been cancelled.');
              } catch (e: any) {
                Alert.alert('Error', e.message);
              } finally {
                setActionLoading(null);
              }
            },
          },
        ]
      );
      return;
    }

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

  const handleGetAnother = async (number: any) => {
    if (!number?.id) return;
    setGetAnotherLoadingId(number.id);

    try {
      await purchaseAnotherFromActiveNumber(number);
      queryClient.invalidateQueries({ queryKey: ['numbers', userId] });
      queryClient.invalidateQueries({ queryKey: ['balance', userId] });
      Alert.alert('Success', 'New number generated successfully.');
    } catch (e: any) {
      const message = e?.message ?? 'Unable to generate another number.';
      const looksLikeMetadataError = String(message).toLowerCase().includes('metadata');

      if (looksLikeMetadataError) {
        Alert.alert(
          'Manual buy required',
          'This number is missing metadata for instant re-buy. Open Buy Number flow instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Buy Screen', onPress: () => router.push('/(tabs)/numbers' as any) },
          ]
        );
      } else {
        Alert.alert('Error', message, [
          { text: 'Close', style: 'cancel' },
          { text: 'Retry', onPress: () => handleGetAnother(number) },
        ]);
      }
    } finally {
      setGetAnotherLoadingId(null);
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
                  onGetAnother={() => handleGetAnother(prominentNumber)}
                  getAnotherLoading={getAnotherLoadingId === prominentNumber.id}
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

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
    backBtn: { padding: 4, marginRight: 4 },
    headerTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: c.text, flex: 1, textAlign: 'center' },
    buyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7C5CFC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
    buyBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 13 },
    tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, backgroundColor: c.toggleBg, borderRadius: 12, padding: 3 },
    tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    tabBtnActive: { backgroundColor: '#7C5CFC' },
    tabBtnText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: c.textSub },
    tabBtnTextActive: { color: '#fff' },
    search: { backgroundColor: c.input, borderRadius: 12, padding: 12, fontSize: 13, color: c.text, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: c.inputBorder },
    listContent: { padding: 16, paddingTop: 4, paddingBottom: 100 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 10 },
    emptyText: { color: c.textSub, fontSize: 14 },
  });
}
