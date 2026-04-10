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
import { useRouter } from 'expo-router';
import { fetchEsimCountries, fetchEsimPackages, isApiErrorWithStatus, purchaseEsim } from '@/lib/api';
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

export default function BuyEsimScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedPackageCode, setSelectedPackageCode] = useState<string | null>(null);
  const [plansOpen, setPlansOpen] = useState(false);

  const countriesQuery = useQuery({
    queryKey: ['esim-countries'],
    queryFn: fetchEsimCountries,
  });

  const countries = useMemo(() => countriesQuery.data?.countries ?? [], [countriesQuery.data?.countries]);

  const packagesQuery = useQuery({
    queryKey: ['esim-packages', selectedCountry],
    queryFn: () => fetchEsimPackages(selectedCountry ?? undefined),
    enabled: !!selectedCountry,
  });

  const packages = packagesQuery.data?.packages ?? [];
  const selectedPackage = packages.find((item) => String(item.packageCode) === selectedPackageCode) ?? null;

  const purchaseMutation = useMutation({
    mutationFn: purchaseEsim,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['esim-orders-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['esim-order-detail'] });
      Alert.alert('eSIM purchased', 'Purchase successful. You will be redirected to My eSIMs.', [
        { text: 'Go to My eSIMs', onPress: () => router.replace('/esim/my' as any) },
      ]);
    },
    onError: (error) => {
      if (isApiErrorWithStatus(error, 402)) {
        Alert.alert('Insufficient balance', (error as Error).message, [
          { text: 'Top Up Wallet', onPress: () => router.push('/fund-wallet' as any) },
          { text: 'Cancel', style: 'cancel' },
        ]);
        return;
      }
      Alert.alert('Purchase failed', (error as Error).message);
    },
  });

  const onSelectCountry = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setSelectedPackageCode(null);
    setPlansOpen(false);
  };

  const onOrder = () => {
    if (!selectedPackage) return;
    purchaseMutation.mutate({
      packageCode: String(selectedPackage.packageCode),
      packageName: selectedPackage.name,
      location: selectedPackage.location ?? 'Unknown',
      duration: formatDuration(selectedPackage.duration, selectedPackage.durationUnit),
      dataVolume: formatDataVolume(selectedPackage.dataFormatted, selectedPackage.volume),
      providerPrice: Number(selectedPackage.price),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={22} color="#7C5CFC" />
        </TouchableOpacity>
        <Text style={styles.title}>Buy eSIM</Text>
        <TouchableOpacity onPress={() => router.push('/esim/my' as any)} style={styles.topBtn}>
          <Text style={styles.topBtnText}>My eSIMs</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={countriesQuery.isRefetching || packagesQuery.isRefetching}
            onRefresh={() => {
              countriesQuery.refetch();
              if (selectedCountry) packagesQuery.refetch();
            }}
            tintColor="#7C5CFC"
          />
        }
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Country</Text>
          {countriesQuery.isLoading ? (
            <ActivityIndicator size="small" color="#7C5CFC" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.countryScroll}>
              {countries.map((country) => {
                const active = selectedCountry === country.code;
                return (
                  <TouchableOpacity
                    key={country.code}
                    style={[styles.countryChip, active && styles.countryChipActive]}
                    onPress={() => onSelectCountry(country.code)}
                  >
                    <Text style={styles.countryChipText}>{country.flag ? `${country.flag} ` : ''}{country.name}</Text>
                    <Text style={styles.countryChipSub}>from ${country.startingChargedUsd ?? country.startingPriceUsd ?? '-'}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {!!selectedCountry && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Important Information</Text>
            <Text style={styles.noticeText}>
              You are purchasing an eSIM, please make sure that eSIMs are supported on your device and that the eSIM
              is activated within 180 days. After purchase, you will be redirected to your eSIMs page and you can
              activate it instantly.
            </Text>
            <Text style={styles.noticeText}>
              Important: eSIMs are non-refundable and non-transferable, please keep in mind that these are data-only
              SIMs. The eSIM can only be redeemed in the country of the eSIM, as we require roaming the eSIM IP might
              not always match the country.
            </Text>
            <Text style={styles.noticeText}>
              We cannnot refund your eSIM in case your device does not support eSIM, please make sure to check if your
              device supports it before purchasing
            </Text>
          </View>
        )}

        {!!selectedCountry && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Select Plan</Text>
            {packagesQuery.isLoading ? (
              <ActivityIndicator size="small" color="#7C5CFC" />
            ) : packages.length === 0 ? (
              <Text style={styles.emptyText}>No plans available for this country right now.</Text>
            ) : (
              <>
                <TouchableOpacity style={styles.dropdownHeader} onPress={() => setPlansOpen((v) => !v)}>
                  <Text style={styles.dropdownHeaderText}>
                    {selectedPackage ? `${selectedPackage.name} • $${selectedPackage.chargedUsd}` : 'Choose a plan'}
                  </Text>
                  <Icon name={plansOpen ? 'chevronUp' : 'chevronDown'} size={18} color={colors.textSub} />
                </TouchableOpacity>

                {plansOpen && (
                  <View style={styles.dropdownList}>
                    {packages.map((item) => {
                      const active = String(item.packageCode) === selectedPackageCode;
                      return (
                        <TouchableOpacity
                          key={item.packageCode}
                          style={[styles.planRow, active && styles.planRowActive]}
                          onPress={() => {
                            setSelectedPackageCode(String(item.packageCode));
                            setPlansOpen(false);
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.planName}>{item.name}</Text>
                            <Text style={styles.planMeta}>
                              {formatDataVolume(item.dataFormatted, item.volume)} • {formatDuration(item.duration, item.durationUnit)}
                            </Text>
                          </View>
                          <Text style={styles.planPrice}>${item.chargedUsd}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.orderBtn, (!selectedPackage || purchaseMutation.isPending) && styles.orderBtnDisabled]}
                  onPress={onOrder}
                  disabled={!selectedPackage || purchaseMutation.isPending}
                >
                  {purchaseMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.orderBtnText}>Order eSIM</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { padding: 4 },
    title: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: c.text },
    topBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    topBtnText: { color: '#7C5CFC', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    content: { padding: 16, paddingTop: 8, paddingBottom: 24, gap: 10 },
    card: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 8,
    },
    sectionTitle: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: c.text },
    countryScroll: { gap: 8, paddingRight: 6 },
    countryChip: {
      backgroundColor: c.cardAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 8,
      paddingHorizontal: 10,
      minWidth: 120,
    },
    countryChipActive: { borderColor: '#7C5CFC', backgroundColor: '#F4F0FF' },
    countryChipText: { color: c.text, fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
    countryChipSub: { color: c.textSub, fontSize: 11, marginTop: 2 },
    noticeText: { color: c.textSub, fontSize: 12, lineHeight: 18 },
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
      marginTop: 8,
    },
    planRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: 8,
      backgroundColor: c.card,
    },
    planRowActive: { backgroundColor: '#F4F0FF' },
    planName: { color: c.text, fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
    planMeta: { color: c.textSub, fontSize: 12, marginTop: 2 },
    planPrice: { color: c.text, fontSize: 13, fontFamily: 'Poppins_700Bold' },
    orderBtn: { backgroundColor: '#7C5CFC', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
    orderBtnDisabled: { opacity: 0.55 },
    orderBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
    emptyText: { color: c.textSub, fontSize: 13 },
  });
}
