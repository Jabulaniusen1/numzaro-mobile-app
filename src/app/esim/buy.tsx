import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
  const [buyingCode, setBuyingCode] = useState<string | null>(null);

  const countriesQuery = useQuery({
    queryKey: ['esim-countries'],
    queryFn: fetchEsimCountries,
  });

  const countries = useMemo(() => countriesQuery.data?.countries ?? [], [countriesQuery.data?.countries]);

  const packagesQuery = useQuery({
    queryKey: ['esim-packages', selectedCountry],
    queryFn: () => fetchEsimPackages(selectedCountry ?? undefined),
  });

  const purchaseMutation = useMutation({
    mutationFn: purchaseEsim,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['esim-orders-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['esim-order-detail'] });
      Alert.alert('eSIM purchased', 'Your eSIM order was created successfully.', [
        { text: 'View Order', onPress: () => router.push({ pathname: '/esim/[id]', params: { id: result.order.id } } as any) },
        { text: 'My eSIMs', onPress: () => router.push('/esim/my' as any) },
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
    onSettled: () => setBuyingCode(null),
  });

  const packages = packagesQuery.data?.packages ?? [];

  const onBuyPackage = (pkg: any) => {
    setBuyingCode(pkg.packageCode);
    purchaseMutation.mutate({
      packageCode: String(pkg.packageCode),
      packageName: pkg.name,
      location: pkg.location ?? 'Unknown',
      duration: formatDuration(pkg.duration, pkg.durationUnit),
      dataVolume: formatDataVolume(pkg.dataFormatted, pkg.volume),
      providerPrice: Number(pkg.price),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={22} color="#7C5CFC" />
        </TouchableOpacity>
        <Text style={styles.title}>Buy eSIM</Text>
        <TouchableOpacity onPress={() => router.push('/esim/my' as any)} style={styles.topUpBtn}>
          <Text style={styles.topUpText}>My eSIMs</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={packages}
        keyExtractor={(item) => item.packageCode}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={countriesQuery.isRefetching || packagesQuery.isRefetching}
            onRefresh={() => {
              countriesQuery.refetch();
              packagesQuery.refetch();
            }}
            tintColor="#7C5CFC"
          />
        }
        ListHeaderComponent={
          <View style={styles.blockGap}>
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
                        onPress={() => setSelectedCountry(country.code)}
                      >
                        <Text style={styles.countryChipText}>
                          {country.flag ? `${country.flag} ` : ''}
                          {country.name}
                        </Text>
                        <Text style={styles.countryChipSub}>
                          from ${country.startingChargedUsd ?? country.startingPriceUsd ?? '-'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Packages</Text>
              {packagesQuery.isLoading ? (
                <ActivityIndicator size="small" color="#7C5CFC" />
              ) : packages.length === 0 ? (
                <Text style={styles.emptyText}>Select a country to view available eSIM packages.</Text>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isBuying = buyingCode === item.packageCode && purchaseMutation.isPending;
          return (
            <View style={styles.packageCard}>
              <Text style={styles.packageName}>{item.name}</Text>
              <Text style={styles.packageMeta}>
                {formatDataVolume(item.dataFormatted, item.volume)} • {formatDuration(item.duration, item.durationUnit)}
              </Text>
              <Text style={styles.packageMeta}>Location: {item.location ?? 'Unknown'}</Text>
              <View style={styles.packageFooter}>
                <View>
                  <Text style={styles.priceLabel}>You pay</Text>
                  <Text style={styles.priceValue}>${item.chargedUsd}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.buyBtn, isBuying && styles.buyBtnDisabled]}
                  onPress={() => onBuyPackage(item)}
                  disabled={isBuying}
                >
                  {isBuying ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buyBtnText}>Buy eSIM</Text>}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { padding: 4 },
    title: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: c.text },
    topUpBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    topUpText: { color: '#7C5CFC', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    content: { padding: 16, paddingTop: 8, paddingBottom: 24, gap: 10 },
    blockGap: { gap: 10, marginBottom: 10 },
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
    packageCard: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 6,
      marginBottom: 10,
    },
    packageName: { color: c.text, fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
    packageMeta: { color: c.textSub, fontSize: 12 },
    packageFooter: { marginTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    priceLabel: { color: c.textMuted, fontSize: 11 },
    priceValue: { color: c.text, fontSize: 18, fontFamily: 'Poppins_700Bold' },
    buyBtn: { backgroundColor: '#7C5CFC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
    buyBtnDisabled: { opacity: 0.8 },
    buyBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
    emptyText: { color: c.textSub, fontSize: 13 },
  });
}
