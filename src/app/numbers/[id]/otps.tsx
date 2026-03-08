import { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { StatusBadge } from '@/components/StatusBadge';
import { format, parseISO } from 'date-fns';
import { Icon } from '@/components/Icon';

export default function OtpsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.userId);

  const { data: otps = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['otps', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('number_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  // Realtime subscription for new OTPs
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`otps-screen-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'otp_codes',
          filter: `number_id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['otps', id] });
          queryClient.invalidateQueries({ queryKey: ['numbers', userId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={22} color="#7C5CFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>OTP Codes</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C5CFC" />
        </View>
      ) : (
        <FlatList
          data={otps}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#7C5CFC" />}
          renderItem={({ item }: { item: any }) => (
            <View style={styles.otpCard}>
              <View style={styles.otpHeader}>
                <View style={styles.codeWrap}>
                  <Text style={styles.code}>{item.code}</Text>
                </View>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => Clipboard.setStringAsync(item.code)}
                >
                  <Text style={styles.copyBtnText}>Copy</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.otpFooter}>
                <StatusBadge status={item.status} />
                <Text style={styles.time}>
                  {format(parseISO(item.created_at), 'MMM d, HH:mm:ss')}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="key" size={40} color="#d1d5db" />
              <Text style={styles.emptyText}>No OTPs received yet</Text>
              <Text style={styles.emptySubText}>OTPs will appear here in real-time</Text>
            </View>
          }
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
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 60 },
  otpCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ede9fe',
  },
  otpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  codeWrap: { flex: 1 },
  code: { fontSize: 28, fontWeight: '800', color: '#7C5CFC', letterSpacing: 4 },
  copyBtn: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  copyBtnText: { color: '#7C5CFC', fontWeight: '700', fontSize: 13 },
  otpFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 11, color: '#9ca3af' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: '#374151', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySubText: { color: '#9ca3af', fontSize: 13 },
});
