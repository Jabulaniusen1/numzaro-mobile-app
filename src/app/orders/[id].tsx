import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { cancelOrder, refillOrder } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/StatusBadge';
import Toast from 'react-native-toast-message';

const CANCELLABLE_STATUSES = new Set(['Pending', 'In Progress']);
const REFILLABLE_STATUSES = new Set(['Partial', 'Completed']);

interface OrderDetail {
  id: string;
  status: string;
  charge: number;
  currency?: string;
  quantity: number;
  start_count?: number | null;
  remains?: number | null;
  link: string;
  created_at: string;
  updated_at?: string;
  service_id?: string;
  services?: { name: string; category: string; type: string; refill_allowed: boolean; cancel_allowed: boolean } | null;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.userId);
  const { format: formatCurrency } = useCurrency();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const { data: order, isLoading, refetch, isRefetching } = useQuery<OrderDetail>({
    queryKey: ['order-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, services(name, category, type, refill_allowed, cancel_allowed)')
        .eq('id', id)
        .eq('user_id', userId!)
        .single();
      if (error) throw error;
      return data as OrderDetail;
    },
    enabled: !!id && !!userId,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      Toast.show({ type: 'success', text1: 'Order cancelled' });
    },
    onError: (e: Error) => Alert.alert('Cancel Failed', e.message),
  });

  const refillMutation = useMutation({
    mutationFn: () => refillOrder(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      Toast.show({ type: 'success', text1: 'Refill requested' });
    },
    onError: (e: Error) => Alert.alert('Refill Failed', e.message),
  });

  const onCancel = () => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order? This cannot be undone.', [
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelMutation.mutate() },
      { text: 'Keep Order', style: 'cancel' },
    ]);
  };

  const onRefill = () => {
    Alert.alert('Request Refill', 'Request a refill for dropped quantity on this order?', [
      { text: 'Yes, Refill', onPress: () => refillMutation.mutate() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const copyLink = async () => {
    if (!order?.link) return;
    await Clipboard.setStringAsync(order.link);
    Toast.show({ type: 'success', text1: 'Link copied!' });
  };

  const service = order?.services;
  const canCancel = !!service?.cancel_allowed && CANCELLABLE_STATUSES.has(order?.status ?? '');
  const canRefill = !!service?.refill_allowed && REFILLABLE_STATUSES.has(order?.status ?? '');

  // Progress calculation
  const delivered = order
    ? order.quantity - (order.remains ?? order.quantity)
    : 0;
  const progressPct = order?.quantity
    ? Math.min(100, Math.max(0, (delivered / order.quantity) * 100))
    : 0;
  const hasProgress = order?.remains !== null && order?.remains !== undefined;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={22} color="#7C5CFC" />
        </TouchableOpacity>
        <Text style={styles.title}>Order Details</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <Icon name="refresh" size={18} color="#7C5CFC" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C5CFC" />
        </View>
      ) : !order ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Order not found.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#7C5CFC" />
          }
        >
          {/* Status hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.heroServiceName} numberOfLines={2}>
                  {service?.name ?? 'Unknown Service'}
                </Text>
                {service?.category && (
                  <Text style={styles.heroCategoryText}>{service.category}</Text>
                )}
              </View>
              <StatusBadge status={order.status} />
            </View>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatVal}>{order.quantity.toLocaleString()}</Text>
                <Text style={styles.heroStatLabel}>Ordered</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatVal, { color: '#16a34a' }]}>
                  {delivered.toLocaleString()}
                </Text>
                <Text style={styles.heroStatLabel}>Delivered</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatVal, { color: order.remains ?? 0 > 0 ? '#f59e0b' : '#16a34a' }]}>
                  {(order.remains ?? 0).toLocaleString()}
                </Text>
                <Text style={styles.heroStatLabel}>Remaining</Text>
              </View>
            </View>

            {/* Progress bar */}
            {hasProgress && (
              <View style={styles.progressWrap}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progressPct}%` as any,
                        backgroundColor: progressPct >= 100 ? '#16a34a' : '#7C5CFC',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>{Math.round(progressPct)}% delivered</Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          {(canCancel || canRefill) && (
            <View style={styles.actionsRow}>
              {canRefill && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.refillBtn]}
                  onPress={onRefill}
                  disabled={refillMutation.isPending}
                >
                  {refillMutation.isPending ? (
                    <ActivityIndicator size="small" color="#7C5CFC" />
                  ) : (
                    <>
                      <Icon name="refresh" size={16} color="#7C5CFC" />
                      <Text style={styles.refillBtnText}>Request Refill</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {canCancel && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={onCancel}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <>
                      <Icon name="xmark" size={16} color="#ef4444" />
                      <Text style={styles.cancelBtnText}>Cancel Order</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Order info */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Order Info</Text>

            <InfoRow label="Order ID" value={id!} colors={colors} />
            <InfoRow label="Status" value={order.status} colors={colors} />
            <InfoRow
              label="Charge"
              value={formatCurrency(Number(order.charge))}
              colors={colors}
              highlight
            />
            <InfoRow
              label="Placed"
              value={format(parseISO(order.created_at), 'MMM d, yyyy · h:mm a')}
              colors={colors}
            />
            {order.updated_at && (
              <InfoRow
                label="Last Updated"
                value={format(parseISO(order.updated_at), 'MMM d, yyyy · h:mm a')}
                colors={colors}
              />
            )}
            {order.start_count != null && (
              <InfoRow label="Start Count" value={order.start_count.toLocaleString()} colors={colors} />
            )}
          </View>

          {/* Link */}
          {order.link && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Target Link</Text>
              <View style={styles.linkRow}>
                <Text style={styles.linkText} numberOfLines={2}>{order.link}</Text>
                <View style={styles.linkActions}>
                  <TouchableOpacity onPress={copyLink} style={styles.linkBtn}>
                    <Icon name="copy" size={15} color="#7C5CFC" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => Linking.openURL(order.link)} style={styles.linkBtn}>
                    <Icon name="openInBrowser" size={15} color="#7C5CFC" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Service details */}
          {service && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Service Details</Text>
              <InfoRow label="Name" value={service.name} colors={colors} />
              <InfoRow label="Category" value={service.category} colors={colors} />
              <InfoRow label="Type" value={service.type ?? 'Default'} colors={colors} />
              <View style={styles.featureRow}>
                <View style={[styles.featureChip, service.refill_allowed && styles.featureChipOn]}>
                  <Icon name="refresh" size={12} color={service.refill_allowed ? '#16a34a' : colors.textMuted} />
                  <Text style={[styles.featureChipText, service.refill_allowed && { color: '#16a34a' }]}>
                    Refill {service.refill_allowed ? 'Allowed' : 'N/A'}
                  </Text>
                </View>
                <View style={[styles.featureChip, service.cancel_allowed && styles.featureChipOn]}>
                  <Icon name="xmark" size={12} color={service.cancel_allowed ? '#16a34a' : colors.textMuted} />
                  <Text style={[styles.featureChipText, service.cancel_allowed && { color: '#16a34a' }]}>
                    Cancel {service.cancel_allowed ? 'Allowed' : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  colors,
  highlight,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
  highlight?: boolean;
}) {
  return (
    <View style={infoStyles.row}>
      <Text style={[infoStyles.label, { color: colors.textSub }]}>{label}</Text>
      <Text style={[infoStyles.value, { color: highlight ? '#7C5CFC' : colors.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  label: { fontSize: 13, fontFamily: 'Poppins_500Medium', flex: 1 },
  value: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', flex: 2, textAlign: 'right' },
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
    title: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: c.text },
    refreshBtn: { padding: 4 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorText: { color: '#ef4444', fontSize: 14, fontFamily: 'Poppins_500Medium' },
    content: { padding: 16, paddingTop: 8, paddingBottom: 40, gap: 12 },

    // Hero card
    heroCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      gap: 14,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    heroServiceName: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: c.text },
    heroCategoryText: { fontSize: 12, color: c.textSub, fontFamily: 'Poppins_400Regular' },

    heroStats: {
      flexDirection: 'row',
      backgroundColor: c.cardAlt,
      borderRadius: 12,
      overflow: 'hidden',
    },
    heroStat: { flex: 1, alignItems: 'center', paddingVertical: 12 },
    heroStatDivider: { width: 1, backgroundColor: c.border },
    heroStatVal: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: c.text },
    heroStatLabel: { fontSize: 11, color: c.textSub, fontFamily: 'Poppins_500Medium', marginTop: 2 },

    progressWrap: { gap: 6 },
    progressBar: {
      height: 8,
      borderRadius: 4,
      backgroundColor: c.cardAlt,
      overflow: 'hidden',
    },
    progressFill: { height: 8, borderRadius: 4 },
    progressLabel: { fontSize: 11, color: c.textSub, textAlign: 'right', fontFamily: 'Poppins_500Medium' },

    // Actions
    actionsRow: { flexDirection: 'row', gap: 10 },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    refillBtn: { borderColor: '#7C5CFC', backgroundColor: '#F4F0FF' },
    refillBtnText: { color: '#7C5CFC', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
    cancelBtn: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
    cancelBtnText: { color: '#ef4444', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

    // Info card
    card: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      gap: 2,
    },
    sectionTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: c.text, marginBottom: 4 },

    // Link
    linkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    linkText: { flex: 1, fontSize: 13, color: '#7C5CFC', fontFamily: 'Poppins_500Medium', lineHeight: 20 },
    linkActions: { flexDirection: 'row', gap: 4 },
    linkBtn: { padding: 6 },

    // Service features
    featureRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
    featureChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.border,
    },
    featureChipOn: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
    featureChipText: { fontSize: 11, color: c.textMuted, fontFamily: 'Poppins_500Medium' },
  });
}
