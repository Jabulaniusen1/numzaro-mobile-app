import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchSmsPoolServices,
  fetchSmsPoolCountries,
  fetchPricing,
  purchaseNumber,
} from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useBalance } from '@/hooks/useBalance';
import { useCurrency } from '@/hooks/useCurrency';
import { Icon } from '@/components/Icon';

type Mode = 'activation' | 'rental';
type Step = 'service' | 'country' | 'confirm';

interface SmsService {
  ID: string;
  name: string;
  logo?: string;
}

interface Country {
  name: string;
  short_name?: string;
}

interface RentalOption {
  duration: string;
  price: number;
  id?: string;
}

const RENTAL_DURATIONS = ['1 Day', '7 Days', '14 Days', '30 Days'];

export default function NumbersScreen() {
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.userId);
  const { data: balance } = useBalance(userId ?? '');
  const { format } = useCurrency();

  const [mode, setMode] = useState<Mode>('activation');
  const [step, setStep] = useState<Step>('service');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState<SmsService | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedRentalDuration, setSelectedRentalDuration] = useState<string>('');

  // Services query
  const { data: servicesData, isLoading: loadingServices } = useQuery({
    queryKey: ['smspool-services', mode, page],
    queryFn: () => fetchSmsPoolServices(mode, page),
    enabled: step === 'service' && mode === 'activation',
  });

  // Countries query
  const { data: countriesData, isLoading: loadingCountries } = useQuery({
    queryKey: ['smspool-countries'],
    queryFn: fetchSmsPoolCountries,
    enabled: step === 'country' || mode === 'rental',
  });

  // Pricing query
  const pricingParams = useMemo(() => {
    if (mode === 'activation' && selectedService && selectedCountry) {
      return `service=${selectedService.ID}&country=${selectedCountry.short_name ?? selectedCountry.name}&mode=activation`;
    }
    return null;
  }, [mode, selectedService, selectedCountry]);

  const { data: pricing, isLoading: loadingPricing } = useQuery({
    queryKey: ['pricing', pricingParams],
    queryFn: () => fetchPricing(pricingParams!),
    enabled: !!pricingParams && step === 'confirm',
  });

  const services: SmsService[] = servicesData?.services ?? servicesData ?? [];
  const countries: Country[] = countriesData?.countries ?? countriesData ?? [];

  const filteredServices = useMemo(() => {
    if (!search.trim()) return services;
    const q = search.toLowerCase();
    return services.filter((s: SmsService) => s.name.toLowerCase().includes(q));
  }, [services, search]);

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return countries;
    const q = search.toLowerCase();
    return countries.filter((c: Country) => c.name.toLowerCase().includes(q));
  }, [countries, search]);

  const mutation = useMutation({
    mutationFn: purchaseNumber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance', userId] });
      queryClient.invalidateQueries({ queryKey: ['numbers', userId] });
      resetFlow();
      Alert.alert('Success', 'Number purchased! Check My Numbers to view it.');
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const resetFlow = () => {
    setStep('service');
    setSelectedService(null);
    setSelectedCountry(null);
    setSelectedRentalDuration('');
    setSearch('');
    setPage(1);
  };

  const handlePurchase = () => {
    const body: any = { mode };
    if (mode === 'activation') {
      body.serviceCode = selectedService?.ID;
      body.country = selectedCountry?.short_name ?? selectedCountry?.name;
    } else {
      body.country = selectedCountry?.short_name ?? selectedCountry?.name;
      body.duration = selectedRentalDuration;
    }
    mutation.mutate(body);
  };

  const price = pricing?.price ?? pricing?.cost ?? 0;

  const renderStep = () => {
    if (step === 'service' && mode === 'activation') {
      return (
        <>
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Search services..."
            placeholderTextColor="#9ca3af"
          />
          {loadingServices ? (
            <ActivityIndicator color="#7C5CFC" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={filteredServices}
              keyExtractor={(item) => item.ID}
              numColumns={2}
              columnWrapperStyle={{ gap: 10 }}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.gridCard}
                  onPress={() => {
                    setSelectedService(item);
                    setSearch('');
                    setStep('country');
                  }}
                >
                  <Icon name="phone" size={24} color="#7C5CFC" />
                  <Text style={styles.gridLabel} numberOfLines={2}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <View style={styles.pagination}>
                  <TouchableOpacity
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                  >
                    <Icon name="arrowLeft" size={13} color="#fff" />
                  <Text style={styles.pageBtnText}>Prev</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageText}>Page {page}</Text>
                  <TouchableOpacity
                    onPress={() => setPage((p) => p + 1)}
                    style={styles.pageBtn}
                  >
                    <Text style={styles.pageBtnText}>Next</Text>
                    <Icon name="arrowRight" size={13} color="#fff" />
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </>
      );
    }

    if (step === 'country' || (step === 'service' && mode === 'rental')) {
      return (
        <>
          {mode === 'activation' && selectedService && (
            <View style={styles.selectedBanner}>
              <View style={styles.selectedBannerInner}>
                <Icon name="phone" size={13} color="#7c3aed" />
                <Text style={styles.selectedBannerText}>{selectedService.name}</Text>
              </View>
              <TouchableOpacity onPress={() => { setStep('service'); setSelectedService(null); }}>
                <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>
            </View>
          )}
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Search countries..."
            placeholderTextColor="#9ca3af"
          />
          {loadingCountries ? (
            <ActivityIndicator color="#7C5CFC" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.name}
              numColumns={2}
              columnWrapperStyle={{ gap: 10 }}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.gridCard}
                  onPress={() => {
                    setSelectedCountry(item);
                    setSearch('');
                    setStep('confirm');
                  }}
                >
                  <Icon name="placeholder" size={24} color="#7C5CFC" />
                  <Text style={styles.gridLabel} numberOfLines={2}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      );
    }

    if (step === 'confirm') {
      return (
        <ScrollView contentContainerStyle={styles.confirmContent}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            {mode === 'activation' && selectedService && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service</Text>
                <Text style={styles.summaryVal}>{selectedService.name}</Text>
              </View>
            )}
            {selectedCountry && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Country</Text>
                <View style={styles.summaryCountryVal}>
                  <Icon name="placeholder" size={13} color="#111827" />
                  <Text style={styles.summaryVal}>{selectedCountry.name}</Text>
                </View>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Type</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>
                  {mode === 'activation' ? 'One-Time (20 min)' : 'Rental'}
                </Text>
              </View>
            </View>

            {mode === 'rental' && (
              <>
                <Text style={[styles.summaryLabel, { marginTop: 12, marginBottom: 8 }]}>Duration</Text>
                <View style={styles.durationGrid}>
                  {RENTAL_DURATIONS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.durationBtn, selectedRentalDuration === d && styles.durationBtnActive]}
                      onPress={() => setSelectedRentalDuration(d)}
                    >
                      <Text style={[styles.durationBtnText, selectedRentalDuration === d && styles.durationBtnTextActive]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {loadingPricing ? (
              <ActivityIndicator color="#7C5CFC" style={{ marginVertical: 8 }} />
            ) : (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Price</Text>
                <Text style={[styles.summaryVal, { color: '#7C5CFC', fontWeight: '700' }]}>
                  ${Number(price).toFixed(4)}
                </Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Your Balance</Text>
              <Text style={styles.summaryVal}>{format(balance ?? 0)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.buyBtn, mutation.isPending && styles.buyBtnDisabled]}
            onPress={handlePurchase}
            disabled={mutation.isPending || (mode === 'rental' && !selectedRentalDuration)}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buyBtnText}>
                {mode === 'activation' ? 'Buy' : 'Rent'} Number — ${Number(price).toFixed(4)}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      );
    }

    return null;
  };

  const getStepLabel = () => {
    if (mode === 'activation') {
      return `${step === 'service' ? '1' : step === 'country' ? '2' : '3'}. ${step.charAt(0).toUpperCase() + step.slice(1)}`;
    }
    return step === 'country' || (step === 'service') ? '1. Country' : '2. Confirm';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Icon name="phone" size={22} color="#111827" />
          <Text style={styles.headerTitle}>Virtual Numbers</Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          {(['activation', 'rental'] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => { setMode(m); resetFlow(); }}
            >
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                {m === 'activation' ? 'One-Time' : 'Monthly Rental'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          {step !== 'service' && (
            <TouchableOpacity onPress={() => setStep(step === 'confirm' ? 'country' : 'service')} style={styles.backBtn}>
              <Icon name="arrowLeft" size={13} color="#7C5CFC" />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.stepLabel}>{getStepLabel()}</Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {renderStep()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2FA' },
  header: { padding: 16, paddingBottom: 8 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#7C5CFC' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  modeBtnTextActive: { color: '#fff' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  backBtnText: { color: '#7C5CFC', fontSize: 13, fontWeight: '600' },
  stepLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  search: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  grid: { padding: 16, paddingTop: 4, paddingBottom: 100, gap: 10 },
  gridCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  gridLabel: { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7C5CFC', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  pageBtnDisabled: { backgroundColor: '#e5e7eb' },
  pageBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  pageText: { color: '#374151', fontSize: 13 },
  selectedBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 10,
    padding: 10,
  },
  selectedBannerInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  selectedBannerText: { fontSize: 13, color: '#7c3aed', fontWeight: '600' },
  summaryCountryVal: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  changeLink: { color: '#7C5CFC', fontSize: 13, fontWeight: '600' },
  confirmContent: { padding: 16, paddingBottom: 100 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 13, color: '#6b7280' },
  summaryVal: { fontSize: 13, fontWeight: '600', color: '#111827' },
  typeBadge: { backgroundColor: '#ede9fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { color: '#7c3aed', fontSize: 12, fontWeight: '600' },
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  durationBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F0F2FA',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  durationBtnActive: { backgroundColor: '#7C5CFC', borderColor: '#7C5CFC' },
  durationBtnText: { fontSize: 13, color: '#374151' },
  durationBtnTextActive: { color: '#fff', fontWeight: '600' },
  buyBtn: {
    backgroundColor: '#7C5CFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  buyBtnDisabled: { opacity: 0.7 },
  buyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
