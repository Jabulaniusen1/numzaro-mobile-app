import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchEsimOrders, fetchEsimUsage, isApiErrorWithStatus } from '@/lib/api';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { Icon } from '@/components/Icon';

const USAGE_STATUS = new Set(['got_resource', 'in_use', 'used_up']);

function fieldOrPlaceholder(value: unknown, placeholder = 'Not available yet') {
  if (value === null || value === undefined || value === '') return placeholder;
  return String(value);
}

export default function EsimOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const orderId = String(id ?? '');

  const ordersQuery = useQuery({
    queryKey: ['esim-order-detail', orderId],
    queryFn: () => fetchEsimOrders(1, 100),
    enabled: !!orderId,
  });

  const order = useMemo(() => {
    return ordersQuery.data?.orders?.find((item) => item.id === orderId) ?? null;
  }, [ordersQuery.data, orderId]);

  const canLoadUsage = !!orderId && (!order?.status || USAGE_STATUS.has(String(order.status)));

  const usageQuery = useQuery({
    queryKey: ['esim-usage', orderId],
    queryFn: () => fetchEsimUsage({ orderId }),
    enabled: canLoadUsage,
    retry: false,
  });

  const isLoading = ordersQuery.isLoading && !ordersQuery.data;
  const usageError =
    usageQuery.error && !isApiErrorWithStatus(usageQuery.error, 404)
      ? (usageQuery.error as Error).message
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={22} color="#7C5CFC" />
        </TouchableOpacity>
        <Text style={styles.title}>eSIM Detail</Text>
        <TouchableOpacity onPress={() => router.push('/fund-wallet' as any)} style={styles.topUpBtn}>
          <Text style={styles.topUpText}>Top Up</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C5CFC" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={ordersQuery.isRefetching || usageQuery.isRefetching}
              onRefresh={() => {
                ordersQuery.refetch();
                if (canLoadUsage) usageQuery.refetch();
              }}
              tintColor="#7C5CFC"
            />
          }
        >
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Order</Text>
            <InfoRow label="Order ID" value={orderId} />
            <InfoRow label="Package" value={fieldOrPlaceholder(order?.package_name)} />
            <InfoRow label="Location" value={fieldOrPlaceholder(order?.location)} />
            <InfoRow label="Duration" value={fieldOrPlaceholder(order?.duration)} />
            <InfoRow label="Data Volume" value={fieldOrPlaceholder(order?.data_volume)} />
            <InfoRow label="Status" value={fieldOrPlaceholder(order?.status, 'pending')} />
            <InfoRow label="Order No" value={fieldOrPlaceholder(order?.order_no)} />
            <InfoRow label="ICCID" value={fieldOrPlaceholder(order?.iccid)} />
            <InfoRow label="QR Code URL" value={fieldOrPlaceholder(order?.qr_code_url)} />
            <InfoRow label="Charged" value={order?.charged_amount ? `$${order.charged_amount}` : 'Not available'} />
          </View>

          {canLoadUsage && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Usage</Text>
              {usageQuery.isLoading ? (
                <ActivityIndicator size="small" color="#7C5CFC" />
              ) : usageError ? (
                <Text style={styles.errorText}>{usageError}</Text>
              ) : usageQuery.data?.usage ? (
                <>
                  <InfoRow label="Used" value={fieldOrPlaceholder(usageQuery.data.usage.dataUsedFormatted)} />
                  <InfoRow label="Total" value={fieldOrPlaceholder(usageQuery.data.usage.totalDataFormatted)} />
                  <InfoRow label="Remaining" value={fieldOrPlaceholder(usageQuery.data.usage.remainingFormatted)} />
                  <InfoRow
                    label="Percent Used"
                    value={
                      usageQuery.data.usage.percentUsed !== undefined
                        ? `${usageQuery.data.usage.percentUsed}%`
                        : 'Not available'
                    }
                  />
                </>
              ) : (
                <Text style={styles.subtle}>Usage data is not available yet.</Text>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={stylesRow.row}>
      <Text style={stylesRow.label}>{label}</Text>
      <Text style={stylesRow.value}>{value}</Text>
    </View>
  );
}

const stylesRow = StyleSheet.create({
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 2, fontFamily: 'Poppins_500Medium' },
  value: { fontSize: 14, color: '#111827', fontFamily: 'Poppins_600SemiBold' },
});

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { padding: 4 },
    title: { fontSize: 18, color: c.text, fontFamily: 'Poppins_700Bold' },
    topUpBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    topUpText: { color: '#7C5CFC', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16, paddingTop: 8, paddingBottom: 24, gap: 12 },
    card: { backgroundColor: c.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: c.border, gap: 4 },
    sectionTitle: { fontSize: 15, color: c.text, fontFamily: 'Poppins_700Bold', marginBottom: 4 },
    subtle: { color: c.textSub, fontSize: 13 },
    errorText: { color: '#ef4444', fontSize: 13, fontFamily: 'Poppins_500Medium' },
  });
}
