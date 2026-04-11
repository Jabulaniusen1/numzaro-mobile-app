import { useMemo, useState } from 'react';
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
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchEsimOrders, fetchEsimUsage, isApiErrorWithStatus } from '@/lib/api';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { Icon } from '@/components/Icon';
import Toast from 'react-native-toast-message';

const USAGE_STATUS = new Set(['got_resource', 'in_use', 'used_up']);

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:      { label: 'Pending',    color: '#d97706', bg: '#fef3c7' },
  got_resource: { label: 'Activated',  color: '#2563eb', bg: '#dbeafe' },
  in_use:       { label: 'In Use',     color: '#16a34a', bg: '#dcfce7' },
  used_up:      { label: 'Used Up',    color: '#6b7280', bg: '#f3f4f6' },
  expired:      { label: 'Expired',    color: '#dc2626', bg: '#fee2e2' },
  cancelled:    { label: 'Cancelled',  color: '#dc2626', bg: '#fee2e2' },
};

function getStatusMeta(status?: string) {
  const key = (status ?? '').toLowerCase();
  return STATUS_META[key] ?? { label: status ?? 'Pending', color: '#7C5CFC', bg: '#F4F0FF' };
}

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
  const [showDetails, setShowDetails] = useState(false);

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

  const statusMeta = getStatusMeta(order?.status);
  const isLoading = ordersQuery.isLoading && !ordersQuery.data;
  const usageError =
    usageQuery.error && !isApiErrorWithStatus(usageQuery.error, 404)
      ? (usageQuery.error as Error).message
      : null;

  const lpaCode = order?.smdp_address && order?.iccid
    ? `LPA:1$${order.smdp_address}$${order.iccid}`
    : null;

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Toast.show({ type: 'success', text1: `${label} copied!` });
  };

  const addToIOS = async () => {
    if (lpaCode) {
      const url = `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpaCode)}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Activate on iPhone',
          'Open your iPhone Camera app and scan the QR code above, or go to Settings → General → VPN & Device Management → Add eSIM.',
        );
      }
    } else {
      Alert.alert(
        'Activate on iPhone',
        'Open your iPhone Camera app and scan the QR code above, or go to Settings → General → VPN & Device Management → Add eSIM.',
      );
    }
  };

  const addToAndroid = async () => {
    if (lpaCode) {
      const url = `https://esimsetup.google.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpaCode)}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Activate on Android',
          'Go to Settings → Network & Internet → SIMs → Add eSIM, then scan the QR code above.',
        );
      }
    } else {
      Alert.alert(
        'Activate on Android',
        'Go to Settings → Network & Internet → SIMs → Add eSIM, then scan the QR code above.',
      );
    }
  };

  const usage = usageQuery.data?.usage;
  const usagePct = usage?.percentUsed != null ? Math.min(100, Math.max(0, Number(usage.percentUsed))) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
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
          {/* Status + Package Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName}>{order?.package_name ?? 'eSIM Package'}</Text>
                <Text style={styles.heroLocation}>
                  <Icon name="globe" size={13} color={colors.textSub} /> {order?.location ?? 'Unknown location'}
                </Text>
                <View style={styles.heroBadgeRow}>
                  <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                  </View>
                  {order?.duration && (
                    <View style={styles.metaChip}>
                      <Icon name="time" size={12} color={colors.textSub} />
                      <Text style={styles.metaChipText}>{order.duration}</Text>
                    </View>
                  )}
                  {order?.data_volume && (
                    <View style={styles.metaChip}>
                      <Icon name="database" size={12} color={colors.textSub} />
                      <Text style={styles.metaChipText}>{order.data_volume}</Text>
                    </View>
                  )}
                </View>
              </View>
              {order?.charged_amount != null && (
                <Text style={styles.heroPrice}>${order.charged_amount}</Text>
              )}
            </View>
          </View>

          {/* QR Code */}
          {order?.qr_code_url ? (
            <View style={styles.qrCard}>
              <Text style={styles.sectionTitle}>Scan to Activate</Text>
              <Text style={styles.qrHint}>Point your camera at this QR code to install the eSIM</Text>
              <View style={styles.qrWrapper}>
                <Image
                  source={{ uri: order.qr_code_url }}
                  style={styles.qrImage}
                  contentFit="contain"
                  placeholder={{ color: colors.cardAlt }}
                />
              </View>

              {/* Add to iOS / Add to Android */}
              <View style={styles.activateRow}>
                <TouchableOpacity style={[styles.activateBtn, styles.iosBtn]} onPress={addToIOS}>
                  <Icon name="logoApple" size={18} color="#fff" />
                  <Text style={styles.activateBtnText}>Add to iPhone</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.activateBtn, styles.androidBtn]} onPress={addToAndroid}>
                  <Icon name="logoAndroid" size={18} color="#fff" />
                  <Text style={styles.activateBtnText}>Add to Android</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : order?.iccid ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Activation</Text>
              <Text style={styles.subtle}>QR code not available yet. Use the buttons below once your eSIM is provisioned.</Text>
              <View style={styles.activateRow}>
                <TouchableOpacity style={[styles.activateBtn, styles.iosBtn]} onPress={addToIOS}>
                  <Icon name="logoApple" size={18} color="#fff" />
                  <Text style={styles.activateBtnText}>Add to iPhone</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.activateBtn, styles.androidBtn]} onPress={addToAndroid}>
                  <Icon name="logoAndroid" size={18} color="#fff" />
                  <Text style={styles.activateBtnText}>Add to Android</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* ICCID + SM-DP */}
          {(order?.iccid || order?.smdp_address) && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Activation Details</Text>
              {order?.iccid && (
                <CopyRow
                  label="ICCID"
                  value={order.iccid}
                  colors={colors}
                  onCopy={() => copyToClipboard(order.iccid!, 'ICCID')}
                />
              )}
              {order?.smdp_address && (
                <CopyRow
                  label="SM-DP+ Address"
                  value={order.smdp_address}
                  colors={colors}
                  onCopy={() => copyToClipboard(order.smdp_address!, 'SM-DP+ address')}
                />
              )}
              {lpaCode && (
                <CopyRow
                  label="LPA Code"
                  value={lpaCode}
                  colors={colors}
                  onCopy={() => copyToClipboard(lpaCode, 'LPA code')}
                />
              )}
            </View>
          )}

          {/* Data Usage */}
          {canLoadUsage && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Data Usage</Text>
              {usageQuery.isLoading ? (
                <ActivityIndicator size="small" color="#7C5CFC" />
              ) : usageError ? (
                <Text style={styles.errorText}>{usageError}</Text>
              ) : usage ? (
                <>
                  {usagePct !== null && (
                    <View style={styles.usageBarWrap}>
                      <View style={styles.usageBar}>
                        <View style={[styles.usageFill, { width: `${usagePct}%` as any, backgroundColor: usagePct >= 90 ? '#ef4444' : usagePct >= 70 ? '#f59e0b' : '#16a34a' }]} />
                      </View>
                      <Text style={styles.usagePct}>{usagePct}% used</Text>
                    </View>
                  )}
                  <View style={styles.usageStats}>
                    <UsageStat label="Used" value={fieldOrPlaceholder(usage.dataUsedFormatted)} colors={colors} />
                    <UsageStat label="Total" value={fieldOrPlaceholder(usage.totalDataFormatted)} colors={colors} />
                    <UsageStat label="Remaining" value={fieldOrPlaceholder(usage.remainingFormatted)} colors={colors} />
                  </View>
                </>
              ) : (
                <Text style={styles.subtle}>Usage data not available yet.</Text>
              )}
            </View>
          )}

          {/* Order Details (collapsible) */}
          <View style={styles.card}>
            <TouchableOpacity style={styles.collapseHeader} onPress={() => setShowDetails((v) => !v)}>
              <Text style={styles.sectionTitle}>Order Details</Text>
              <Icon name={showDetails ? 'chevronUp' : 'chevronDown'} size={18} color={colors.textSub} />
            </TouchableOpacity>
            {showDetails && (
              <View style={{ marginTop: 8, gap: 6 }}>
                <InfoRow label="Order ID" value={orderId} colors={colors} />
                <InfoRow label="Order No" value={fieldOrPlaceholder(order?.order_no)} colors={colors} />
                <InfoRow label="Status" value={fieldOrPlaceholder(order?.status, 'pending')} colors={colors} />
                <InfoRow label="Location" value={fieldOrPlaceholder(order?.location)} colors={colors} />
                <InfoRow label="Duration" value={fieldOrPlaceholder(order?.duration)} colors={colors} />
                <InfoRow label="Data Volume" value={fieldOrPlaceholder(order?.data_volume)} colors={colors} />
                <InfoRow label="Charged" value={order?.charged_amount ? `$${order.charged_amount}` : 'N/A'} colors={colors} />
              </View>
            )}
          </View>

          {/* Help */}
          <View style={[styles.card, styles.helpCard]}>
            <Icon name="sim" size={20} color="#7C5CFC" />
            <View style={{ flex: 1 }}>
              <Text style={styles.helpTitle}>How to activate your eSIM</Text>
              <Text style={styles.helpText}>
                iOS: Settings → General → VPN & Device Management → Add eSIM{'\n'}
                Android: Settings → Network & Internet → SIMs → Add eSIM{'\n'}
                Then scan the QR code or enter details manually.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function CopyRow({
  label,
  value,
  colors,
  onCopy,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
  onCopy: () => void;
}) {
  return (
    <View style={copyRowStyles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[copyRowStyles.label, { color: colors.textSub }]}>{label}</Text>
        <Text style={[copyRowStyles.value, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      </View>
      <TouchableOpacity onPress={onCopy} style={copyRowStyles.copyBtn}>
        <Icon name="copy" size={16} color="#7C5CFC" />
      </TouchableOpacity>
    </View>
  );
}

const copyRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  label: { fontSize: 11, fontFamily: 'Poppins_500Medium', marginBottom: 2 },
  value: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  copyBtn: { padding: 6 },
});

function InfoRow({ label, value, colors }: { label: string; value: string; colors: ThemeColors }) {
  return (
    <View style={infoRowStyles.row}>
      <Text style={[infoRowStyles.label, { color: colors.textSub }]}>{label}</Text>
      <Text style={[infoRowStyles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const infoRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  label: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
  value: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', textAlign: 'right', flex: 1, paddingLeft: 12 },
});

function UsageStat({ label, value, colors }: { label: string; value: string; colors: ThemeColors }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 15, fontFamily: 'Poppins_700Bold', color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.textSub, fontFamily: 'Poppins_500Medium' }}>{label}</Text>
    </View>
  );
}

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
    title: { fontSize: 18, color: c.text, fontFamily: 'Poppins_700Bold' },
    topUpBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    topUpText: { color: '#7C5CFC', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16, paddingTop: 8, paddingBottom: 32, gap: 12 },

    // Hero card
    heroCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    heroName: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: c.text, marginBottom: 2 },
    heroLocation: { fontSize: 13, color: c.textSub, fontFamily: 'Poppins_500Medium', marginBottom: 8 },
    heroBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 20,
    },
    statusBadgeText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.cardAlt,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    metaChipText: { fontSize: 11, color: c.textSub, fontFamily: 'Poppins_500Medium' },
    heroPrice: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#7C5CFC' },

    // QR card
    qrCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      gap: 10,
    },
    qrHint: { fontSize: 12, color: c.textSub, textAlign: 'center', fontFamily: 'Poppins_500Medium' },
    qrWrapper: {
      width: 200,
      height: 200,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    qrImage: { width: 190, height: 190 },

    // Activate buttons
    activateRow: { flexDirection: 'row', gap: 10, width: '100%' },
    activateBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
    },
    iosBtn: { backgroundColor: '#1c1c1e' },
    androidBtn: { backgroundColor: '#34a853' },
    activateBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

    // Shared card
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      gap: 8,
    },
    sectionTitle: { fontSize: 15, color: c.text, fontFamily: 'Poppins_700Bold' },
    subtle: { color: c.textSub, fontSize: 13, fontFamily: 'Poppins_500Medium' },
    errorText: { color: '#ef4444', fontSize: 13, fontFamily: 'Poppins_500Medium' },

    // Usage bar
    usageBarWrap: { gap: 6 },
    usageBar: {
      height: 8,
      borderRadius: 4,
      backgroundColor: c.cardAlt,
      overflow: 'hidden',
    },
    usageFill: { height: 8, borderRadius: 4 },
    usagePct: { fontSize: 12, color: c.textSub, fontFamily: 'Poppins_500Medium', textAlign: 'right' },
    usageStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },

    // Collapsible
    collapseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

    // Help
    helpCard: { flexDirection: 'row', gap: 12, backgroundColor: '#F4F0FF', borderColor: '#7C5CFC33' },
    helpTitle: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: '#7C5CFC', marginBottom: 4 },
    helpText: { fontSize: 12, color: '#5b4db5', lineHeight: 18, fontFamily: 'Poppins_400Regular' },
  });
}
