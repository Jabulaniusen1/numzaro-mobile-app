import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchNumberMessages } from '@/lib/api';
import { format } from 'date-fns';
import { Icon } from '@/components/Icon';

export default function MessagesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: messages = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['messages', id],
    queryFn: async () => {
      if (!id) return [];
      const data = await fetchNumberMessages(id);
      if (Array.isArray(data)) return data;
      return data?.messages ?? data?.data ?? [];
    },
    enabled: !!id,
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={22} color="#7C5CFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C5CFC" />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#7C5CFC" />}
          renderItem={({ item }: { item: any }) => (
            <View style={styles.messageCard}>
              <View style={styles.messageHeader}>
                <Text style={styles.from}>From: {item.from ?? item.sender ?? 'Unknown'}</Text>
                <Text style={styles.time}>
                  {(() => {
                    const createdAt = item.created_at ?? item.createdAt ?? item.received_at;
                    if (!createdAt) return 'Unknown time';
                    const date = new Date(createdAt);
                    if (Number.isNaN(date.getTime())) return 'Unknown time';
                    return format(date, 'MMM d, HH:mm');
                  })()}
                </Text>
              </View>
              <Text style={styles.body}>{item.body ?? item.message ?? ''}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="message" size={40} color="#d1d5db" />
              <Text style={styles.emptyText}>No messages received yet</Text>
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
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  from: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  time: { fontSize: 11, color: '#9ca3af' },
  body: { fontSize: 14, color: '#111827', lineHeight: 20 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: '#6b7280', fontSize: 14 },
});
