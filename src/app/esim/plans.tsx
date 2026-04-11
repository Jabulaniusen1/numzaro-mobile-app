import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchEsimPackages, isApiErrorWithStatus, purchaseEsim } from '@/lib/api';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { Icon } from '@/components/Icon';

function formatDuration(duration?: number, durationUnit?: string) {
  if (!duration || !durationUnit) return 'N/A';
  return `${duration} ${durationUnit}`;
}

function formatDataVolume(dataFormatted?: string, volume?: number) {
  if (dataFormatted) return dataFormatted;
  if (!volume || volume <= 0) return 'N/A';
  const gb = volume / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

export default function EsimPlansScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const { countryCode, countryName, countryFlag } = useLocalSearchParams<{
    countryCode: string;
    countryName: string;
    countryFlag: string;
  }>();

  const [selectedPackageCode, setSelectedPackageCode] = useState<string | null>(null);
  const [plansOpen, setPlansOpen] = useState(false);

  const packagesQuery = useQuery({
    queryKey: ['esim-packages', countryCode],
    queryFn: () => fetchEsimPackages(countryCode ?? undefined),
    enabled: !!countryCode,
  });

  const packages = packagesQuery.data?.packages ?? [];
  const selectedPackage = packages.find((item) => String(item.packageCode) === selectedPackageCode) ?? null;

  const purchaseMutation = useMutation({
    mutationFn: purchaseEsim,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['esim-orders-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['esim-order-detail'] });
      Alert.alert('eSIM Purchased!', 'Your eSIM is being provisioned. Activate it from My eSIMs.', [
        { text: 'View My eSIMs', onPress: () => router.replace('/esim/my' as any) },
      ]);
    },
    onError: (error) => {
      if (isApiErrorWithStatus(error, 402)) {
        Alert.alert('Insufficient Balance', (error as Error).message, [
          { text: 'Top Up Wallet', onPress: () => router.push('/fund-wallet' as any) },
          { text: 'Cancel', style: 'cancel' },
        ]);
        return;
      }
      Alert.alert('Purchase Failed', (error as Error).message);
    },
  });

  const onOrder = () => {
    if (!selectedPackage) return;
    purchaseMutation.mutate({
      packageCode: String(selectedPackage.packageCode),
      packageName: selectedPackage.name,
      location: selectedPackage.location ?? countryName ?? 'Unknown',
      duration: formatDuration(selectedPackage.duration, selectedPackage.durationUnit),
      dataVolume: formatDataVolume(selectedPackage.dataFormatted, selectedPackage.volume),
      providerPrice: Number(selectedPackage.price),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={22} color="#7C5CFC" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {countryFlag ? <Text style={styles.headerFlag}>{countryFlag}</Text> : null}
          <Text style={styles.title} numberOfLines={1}>{countryName ?? 'Select Plan'}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/esim/my' as any)} style={styles.topBtn}>
          <Text style={styles.topBtnText}>My eSIMs</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={packagesQuery.isRefetching}
            onRefresh={() => packagesQuery.refetch()}
            tintColor="#7C5CFC"
          />
        }
      >
        {/* Important Notice */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeHeader}>
            <Icon name="sim" size={16} color="#d97706" />
            <Text style={styles.noticeTitle}>Important Information</Text>
          </View>
          <Text style={styles.noticeText}>
            • eSIM must be activated within 180 days of purchase.{'\n'}
            • Data-only SIM — voice and SMS not included.{'\n'}
            • Non-refundable once purchased.{'\n'}
            • Verify your device supports eSIM before ordering.
          </Text>
        </View>

        {/* Plans */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Available Plans</Text>

          {packagesQuery.isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#7C5CFC" />
              <Text style={styles.loadingText}>Loading plans…</Text>
            </View>
          ) : packages.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Icon name="sim" size={28} color={colors.textMuted} />
              <Text style={styles.emptyText}>No plans available for {countryName} right now.</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.dropdownHeader} onPress={() => setPlansOpen((v) => !v)}>
                <Text style={styles.dropdownHeaderText}>
                  {selectedPackage
                    ? `${selectedPackage.name} — $${selectedPackage.chargedUsd}`
                    : 'Choose a plan'}
                </Text>
                <Icon name={plansOpen ? 'chevronUp' : 'chevronDown'} size={18} color={colors.textSub} />
              </TouchableOpacity>

              {plansOpen && (
                <View style={styles.dropdownList}>
                  {packages.map((item) => {
                    const active = String(item.packageCode) === selectedPackageCode;
                    const data = formatDataVolume(item.dataFormatted, item.volume);
                    const duration = formatDuration(item.duration, item.durationUnit);
                    return (
                      <TouchableOpacity
                        key={item.packageCode}
                        style={[styles.planRow, active && styles.planRowActive]}
                        onPress={() => {
                          setSelectedPackageCode(String(item.packageCode));
                          setPlansOpen(false);
                        }}
                      >
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={[styles.planName, active && styles.planNameActive]}>{item.name}</Text>
                          <View style={styles.planChips}>
                            <View style={styles.planChip}>
                              <Icon name="database" size={11} color={active ? '#7C5CFC' : colors.textMuted} />
                              <Text style={[styles.planChipText, active && { color: '#7C5CFC' }]}>{data}</Text>
                            </View>
                            <View style={styles.planChip}>
                              <Icon name="time" size={11} color={active ? '#7C5CFC' : colors.textMuted} />
                              <Text style={[styles.planChipText, active && { color: '#7C5CFC' }]}>{duration}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.planPriceCol}>
                          <Text style={[styles.planPrice, active && styles.planPriceActive]}>${item.chargedUsd}</Text>
                          {active && <Icon name="checkCircle" size={16} color="#7C5CFC" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>

        {/* Order Summary + CTA */}
        {selectedPackage && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>

            <View style={styles.summaryRows}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Country</Text>
                <Text style={styles.summaryVal}>
                  {countryFlag ? `${countryFlag} ` : ''}{countryName}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Package</Text>
                <Text style={styles.summaryVal}>{selectedPackage.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Data</Text>
                <Text style={styles.summaryVal}>
                  {formatDataVolume(selectedPackage.dataFormatted, selectedPackage.volume)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Duration</Text>
                <Text style={styles.summaryVal}>
                  {formatDuration(selectedPackage.duration, selectedPackage.durationUnit)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                <Text style={styles.summaryTotalKey}>Total</Text>
                <Text style={styles.summaryTotalVal}>${selectedPackage.chargedUsd}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.orderBtn, purchaseMutation.isPending && styles.orderBtnDisabled]}
              onPress={onOrder}
              disabled={purchaseMutation.isPending}
            >
              {purchaseMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="sim" size={18} color="#fff" />
                  <Text style={styles.orderBtnText}>Order eSIM — ${selectedPackage.chargedUsd}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    headerCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      justifyContent: 'center',
    },
    headerFlag: { fontSize: 22 },
    title: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: c.text },
    topBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    topBtnText: { color: '#7C5CFC', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },

    content: { padding: 16, paddingTop: 8, paddingBottom: 40, gap: 12 },

    // Notice
    noticeCard: {
      backgroundColor: '#fffbeb',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#fcd34d',
      padding: 14,
      gap: 8,
    },
    noticeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    noticeTitle: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: '#d97706' },
    noticeText: { color: '#92400e', fontSize: 12, lineHeight: 20, fontFamily: 'Poppins_400Regular' },

    // Plans card
    card: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      gap: 12,
    },
    sectionTitle: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: c.text },

    loadingWrap: { alignItems: 'center', paddingVertical: 24, gap: 10 },
    loadingText: { color: c.textSub, fontSize: 13, fontFamily: 'Poppins_500Medium' },
    emptyWrap: { alignItems: 'center', paddingVertical: 20, gap: 8 },
    emptyText: { color: c.textSub, fontSize: 13, textAlign: 'center', fontFamily: 'Poppins_500Medium' },

    // Dropdown
    dropdownHeader: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.cardAlt,
    },
    dropdownHeaderText: { color: c.text, fontSize: 13, fontFamily: 'Poppins_500Medium', flex: 1, paddingRight: 8 },
    dropdownList: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      overflow: 'hidden',
    },
    planRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: 8,
      backgroundColor: c.card,
    },
    planRowActive: { backgroundColor: '#F4F0FF' },
    planName: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.text },
    planNameActive: { color: '#7C5CFC' },
    planChips: { flexDirection: 'row', gap: 6 },
    planChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.cardAlt,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    planChipText: { fontSize: 11, color: c.textMuted, fontFamily: 'Poppins_500Medium' },
    planPriceCol: { alignItems: 'flex-end', gap: 2 },
    planPrice: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: c.text },
    planPriceActive: { color: '#7C5CFC' },

    // Summary card
    summaryCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      gap: 14,
    },
    summaryTitle: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: c.text },
    summaryRows: { gap: 0 },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    summaryKey: { color: c.textSub, fontSize: 13, fontFamily: 'Poppins_400Regular' },
    summaryVal: { color: c.text, fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
    summaryTotalRow: { borderBottomWidth: 0, paddingTop: 10 },
    summaryTotalKey: { color: c.text, fontSize: 14, fontFamily: 'Poppins_700Bold' },
    summaryTotalVal: { color: '#7C5CFC', fontSize: 18, fontFamily: 'Poppins_700Bold' },

    // Order button
    orderBtn: {
      backgroundColor: '#7C5CFC',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    orderBtnDisabled: { opacity: 0.5 },
    orderBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  });
}
