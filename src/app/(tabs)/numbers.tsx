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
  fetchRentalPricing,
  purchaseNumber,
} from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useBalance } from '@/hooks/useBalance';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { Icon } from '@/components/Icon';
import { ServiceLogo } from '@/components/ServiceLogo';
import { useRouter } from 'expo-router';

// ISO-2 code → flag emoji via Regional Indicator Symbols
function isoToFlag(iso: string): string {
  return Array.from(iso.toUpperCase().slice(0, 2))
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('');
}

// Common country name → ISO-2 fallback map
const COUNTRY_ISO: Record<string, string> = {
  'united states': 'US', 'usa': 'US', 'us': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'england': 'GB',
  'nigeria': 'NG', 'ghana': 'GH', 'kenya': 'KE',
  'south africa': 'ZA', 'egypt': 'EG', 'ethiopia': 'ET',
  'canada': 'CA', 'australia': 'AU', 'germany': 'DE',
  'france': 'FR', 'italy': 'IT', 'spain': 'ES',
  'netherlands': 'NL', 'sweden': 'SE', 'norway': 'NO',
  'russia': 'RU', 'china': 'CN', 'india': 'IN',
  'brazil': 'BR', 'mexico': 'MX', 'argentina': 'AR',
  'indonesia': 'ID', 'pakistan': 'PK', 'bangladesh': 'BD',
  'japan': 'JP', 'south korea': 'KR', 'vietnam': 'VN',
  'philippines': 'PH', 'thailand': 'TH', 'malaysia': 'MY',
  'singapore': 'SG', 'hong kong': 'HK', 'taiwan': 'TW',
  'turkey': 'TR', 'saudi arabia': 'SA', 'uae': 'AE',
  'united arab emirates': 'AE', 'israel': 'IL', 'poland': 'PL',
  'ukraine': 'UA', 'romania': 'RO', 'czech republic': 'CZ',
  'hungary': 'HU', 'portugal': 'PT', 'greece': 'GR',
  'belgium': 'BE', 'switzerland': 'CH', 'austria': 'AT',
  'denmark': 'DK', 'finland': 'FI', 'new zealand': 'NZ',
  'colombia': 'CO', 'chile': 'CL', 'peru': 'PE',
  'venezuela': 'VE', 'cambodia': 'KH', 'myanmar': 'MM',
  'morocco': 'MA', 'algeria': 'DZ', 'tunisia': 'TN',
  'senegal': 'SN', 'cameroon': 'CM', 'tanzania': 'TZ',
  'uganda': 'UG', 'zimbabwe': 'ZW', 'zambia': 'ZM',
  'ivory coast': 'CI', 'côte d\'ivoire': 'CI',
};

function countryFlag(code?: string, name?: string): string {
  // Try the short_name/code field first if it looks like an ISO-2 code
  if (code && /^[a-zA-Z]{2}$/.test(code.trim())) {
    return isoToFlag(code.trim());
  }
  // Fall back to country name lookup
  if (name) {
    const iso = COUNTRY_ISO[name.toLowerCase().trim()];
    if (iso) return isoToFlag(iso);
  }
  // Last resort: try using the code anyway if it's at least 2 chars
  if (code && code.trim().length >= 2) {
    return isoToFlag(code.trim());
  }
  return '🌍';
}

type Mode = 'activation' | 'rental';
// activation: service → country → confirm
// rental:     service (rental list) → confirm (pricing inline)
type Step = 'service' | 'country' | 'confirm';

interface SmsService { ID?: string; code?: string; name: string; logo?: string }
interface Country    { code: string; name: string; flag?: string }
interface PricingOption { label: string; totalDays: number; price: number; rawPrice?: number }

export default function NumbersScreen() {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const userId       = useAppStore((s) => s.userId);
  const { data: balance } = useBalance(userId ?? '');
  const { format }   = useCurrency();
  const { colors }   = useTheme();
  const styles       = makeStyles(colors);

  const [mode, setMode]                       = useState<Mode>('activation');
  const [step, setStep]                       = useState<Step>('service');
  const [page, setPage]                       = useState(1);
  const [search, setSearch]                   = useState('');
  const [selectedService, setSelectedService] = useState<SmsService | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  // rental-specific
  const [selectedRental, setSelectedRental]   = useState<SmsService | null>(null);
  const [selectedPricing, setSelectedPricing] = useState<PricingOption | null>(null);

  // Services — both modes (activation: app grid, rental: rental options list)
  const { data: servicesData, isLoading: loadingServices } = useQuery({
    queryKey: ['smspool-services', mode, page],
    queryFn:  () => fetchSmsPoolServices(mode, page),
    enabled:  step === 'service',
  });

  // Countries — activation only
  const { data: countriesData, isLoading: loadingCountries } = useQuery({
    queryKey: ['smspool-countries'],
    queryFn:  fetchSmsPoolCountries,
    enabled:  step === 'country' && mode === 'activation',
  });

  // Activation pricing
  const activationPricingParams = useMemo(() => {
    if (mode === 'activation' && selectedService && selectedCountry && step === 'confirm') {
      const code = selectedService.code ?? selectedService.ID ?? '';
      return `service=${code}&country=${selectedCountry.code}&mode=activation`;
    }
    return null;
  }, [mode, selectedService, selectedCountry, step]);

  const { data: activationPricing, isLoading: loadingActivationPricing } = useQuery({
    queryKey: ['pricing-activation', activationPricingParams],
    queryFn:  () => fetchPricing(activationPricingParams!),
    enabled:  !!activationPricingParams,
  });

  // Rental pricing options from API
  const rentalCode = selectedRental?.code ?? selectedRental?.ID;
  const { data: rentalPricingData, isLoading: loadingRentalPricing } = useQuery({
    queryKey: ['pricing-rental', rentalCode],
    queryFn:  () => fetchRentalPricing(rentalCode!),
    enabled:  mode === 'rental' && step === 'confirm' && !!rentalCode,
  });

  const services: SmsService[]     = servicesData?.services ?? servicesData ?? [];
  const countries: Country[]        = countriesData?.countries ?? countriesData ?? [];
  const rentalOptions: PricingOption[] = rentalPricingData?.options ?? [];

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
      Alert.alert('Success', 'Number purchased! Go to My Numbers to view it.');
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const resetFlow = () => {
    setStep('service'); setPage(1); setSearch('');
    setSelectedService(null); setSelectedCountry(null);
    setSelectedRental(null); setSelectedPricing(null);
  };

  const handlePurchase = () => {
    if (mode === 'activation') {
      mutation.mutate({
        mode,
        serviceCode: selectedService?.code ?? selectedService?.ID,
        serviceName: selectedService?.name,
        country:     selectedCountry?.code,
        countryName: selectedCountry?.name,
      });
    } else {
      if (!selectedPricing) return Alert.alert('Select a duration first');
      mutation.mutate({
        mode:       'rental',
        rentalId:   selectedRental?.code ?? selectedRental?.ID,
        rentalName: selectedRental?.name,
        days:       selectedPricing.totalDays,
      });
    }
  };

  const activationPrice = activationPricing?.priceNGN ?? activationPricing?.price ?? 0;

  // ── Render: step = service ────────────────────────────────────────────────
  const renderServiceStep = () => (
    <>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder={mode === 'activation' ? 'Search services…' : 'Search rentals…'}
        placeholderTextColor="#9ca3af"
      />
      {loadingServices ? (
        <ActivityIndicator color="#7C5CFC" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredServices}
          keyExtractor={(item) => `svc-${item.ID ?? item.code ?? item.name}`}
          numColumns={mode === 'activation' ? 2 : 1}
          columnWrapperStyle={mode === 'activation' ? { gap: 10 } : undefined}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) =>
            mode === 'activation' ? (
              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => { setSelectedService(item); setSearch(''); setStep('country'); }}
              >
                <ServiceLogo logo={item.logo} name={item.name} size="md" />
                <Text style={styles.gridLabel} numberOfLines={2}>{item.name}</Text>
              </TouchableOpacity>
            ) : (
              // Rental option row
              <TouchableOpacity
                style={styles.rentalRow}
                onPress={() => { setSelectedRental(item); setSearch(''); setStep('confirm'); }}
              >
                <View style={styles.rentalIconWrap}>
                  <Icon name="phone" size={18} color="#7C5CFC" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rentalName}>{item.name}</Text>
                  <Text style={styles.rentalSub}>Tap to see pricing & durations</Text>
                </View>
                <Icon name="arrowRight" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )
          }
          ListFooterComponent={
            mode === 'activation' ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                >
                  <Icon name="arrowLeft" size={13} color={page === 1 ? colors.textMuted : '#fff'} />
                  <Text style={[styles.pageBtnText, page === 1 && { color: colors.textMuted }]}>Prev</Text>
                </TouchableOpacity>
                <Text style={styles.pageText}>Page {page}</Text>
                <TouchableOpacity onPress={() => setPage((p) => p + 1)} style={styles.pageBtn}>
                  <Text style={styles.pageBtnText}>Next</Text>
                  <Icon name="arrowRight" size={13} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </>
  );

  // ── Render: step = country (activation only) ──────────────────────────────
  const renderCountryStep = () => (
    <>
      {selectedService && (
        <View style={styles.selectedBanner}>
          <View style={styles.selectedBannerInner}>
            <ServiceLogo logo={selectedService.logo} name={selectedService.name} size="sm" />
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
        placeholder="Search countries…"
        placeholderTextColor="#9ca3af"
      />
      {loadingCountries ? (
        <ActivityIndicator color="#7C5CFC" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredCountries}
          keyExtractor={(item) => `cty-${item.name}`}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => { setSelectedCountry(item); setSearch(''); setStep('confirm'); }}
            >
              <Text style={styles.flagEmoji}>{item.flag ?? countryFlag(item.code, item.name)}</Text>
              <Text style={styles.gridLabel} numberOfLines={2}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </>
  );

  // ── Render: step = confirm ────────────────────────────────────────────────
  const renderConfirmStep = () => (
    <ScrollView contentContainerStyle={styles.confirmContent}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Order Summary</Text>

        {/* Activation */}
        {mode === 'activation' && (
          <>
            {selectedService && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service</Text>
                <Text style={styles.summaryVal}>{selectedService.name}</Text>
              </View>
            )}
            {selectedCountry && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Country</Text>
                <View style={styles.summaryCountryVal}>
                  <Text style={{ fontSize: 16 }}>{selectedCountry.flag ?? countryFlag(selectedCountry.code, selectedCountry.name)}</Text>
                  <Text style={styles.summaryVal}>{selectedCountry.name}</Text>
                </View>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Type</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>One-Time · 20 min</Text>
              </View>
            </View>
            {loadingActivationPricing ? (
              <ActivityIndicator color="#7C5CFC" style={{ marginVertical: 8 }} />
            ) : (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Price</Text>
                <Text style={[styles.summaryVal, styles.priceHighlight]}>{format(activationPrice)}</Text>
              </View>
            )}
          </>
        )}

        {/* Rental */}
        {mode === 'rental' && (
          <>
            {selectedRental && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Rental</Text>
                <Text style={styles.summaryVal}>{selectedRental.name}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Type</Text>
              <View style={[styles.typeBadge, { backgroundColor: '#d1fae5' }]}>
                <Text style={[styles.typeBadgeText, { color: '#065f46' }]}>Monthly Rental</Text>
              </View>
            </View>
            <Text style={[styles.summaryLabel, { marginTop: 4, marginBottom: 10 }]}>Select Duration</Text>
            {loadingRentalPricing ? (
              <ActivityIndicator color="#7C5CFC" style={{ marginVertical: 12 }} />
            ) : rentalOptions.length === 0 ? (
              <Text style={styles.noOptions}>No pricing available for this rental.</Text>
            ) : (
              <View style={styles.pricingGrid}>
                {rentalOptions.map((opt) => {
                  const active = selectedPricing?.totalDays === opt.totalDays;
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      style={[styles.pricingCard, active && styles.pricingCardActive]}
                      onPress={() => setSelectedPricing(opt)}
                    >
                      <Text style={[styles.pricingDuration, active && styles.pricingTextActive]}>{opt.label}</Text>
                      <Text style={[styles.pricingPrice, active && styles.pricingTextActive]}>${opt.price.toFixed(2)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {selectedPricing && (
              <View style={[styles.summaryRow, { marginTop: 8 }]}>
                <Text style={styles.summaryLabel}>You pay</Text>
                <Text style={[styles.summaryVal, styles.priceHighlight]}>${selectedPricing.price.toFixed(2)}</Text>
              </View>
            )}
          </>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Your Balance</Text>
          <Text style={styles.summaryVal}>{format(balance ?? 0)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.buyBtn, (mutation.isPending || (mode === 'rental' && !selectedPricing)) && styles.buyBtnDisabled]}
        onPress={handlePurchase}
        disabled={mutation.isPending || (mode === 'rental' && !selectedPricing)}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buyBtnText}>
            {mode === 'activation' ? 'Buy Number' : `Rent — ${selectedPricing?.label ?? 'Select duration'}`}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const stepTitle = () => {
    if (mode === 'activation') {
      if (step === 'service') return '1. Choose Service';
      if (step === 'country') return '2. Choose Country';
      return '3. Confirm Order';
    }
    return step === 'service' ? '1. Choose Rental' : '2. Select Duration & Confirm';
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep(mode === 'activation' ? 'country' : 'service');
      setSelectedPricing(null);
    } else if (step === 'country') {
      setStep('service');
      setSelectedCountry(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* Title + My Numbers button */}
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <Icon name="phone" size={20} color={colors.text} />
            <Text style={styles.headerTitle}>Virtual Numbers</Text>
          </View>
          <TouchableOpacity style={styles.myNumbersBtn} onPress={() => router.push('/my-numbers' as any)}>
            <Icon name="clipboard" size={13} color="#7C5CFC" />
            <Text style={styles.myNumbersBtnText}>My Numbers</Text>
          </TouchableOpacity>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          {(['activation', 'rental'] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => { setMode(m); resetFlow(); }}
            >
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                {m === 'activation' ? 'One-Time OTP' : 'Monthly Rental'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Step breadcrumb */}
        <View style={styles.stepRow}>
          {step !== 'service' && (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Icon name="arrowLeft" size={13} color="#7C5CFC" />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.stepLabel}>{stepTitle()}</Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {step === 'service' && renderServiceStep()}
        {step === 'country' && renderCountryStep()}
        {step === 'confirm' && renderConfirmStep()}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { padding: 16, paddingBottom: 8 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: c.text },
    modeToggle: { flexDirection: 'row', backgroundColor: c.toggleBg, borderRadius: 12, padding: 3, marginBottom: 12 },
    modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    modeBtnActive: { backgroundColor: '#7C5CFC' },
    modeBtnText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.textSub },
    modeBtnTextActive: { color: '#fff' },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
    backBtnText: { color: '#7C5CFC', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
    stepLabel: { fontSize: 13, color: c.textSub, fontFamily: 'Poppins_500Medium' },
    search: {
      backgroundColor: c.input, borderRadius: 12, padding: 12, fontSize: 14,
      color: c.text, marginHorizontal: 16, marginBottom: 12,
      borderWidth: 1, borderColor: c.inputBorder,
    },
    grid: { padding: 16, paddingTop: 4, paddingBottom: 100, gap: 10 },
    gridCard: { flex: 1, backgroundColor: c.card, borderRadius: 12, padding: 14, alignItems: 'center', gap: 8 },
    flagEmoji: { fontSize: 32 },
    gridLabel: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: c.text, textAlign: 'center' },
    pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
    pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7C5CFC', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    pageBtnDisabled: { backgroundColor: c.border },
    pageBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
    pageText: { color: c.text, fontSize: 13 },
    selectedBanner: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: c.accentLight, marginHorizontal: 16, marginBottom: 10, borderRadius: 10, padding: 10,
    },
    selectedBannerInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    selectedBannerText: { fontSize: 13, color: c.accentText, fontFamily: 'Poppins_600SemiBold' },
    summaryCountryVal: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    changeLink: { color: '#7C5CFC', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
    confirmContent: { padding: 16, paddingBottom: 100 },
    summaryCard: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 16 },
    summaryTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: c.text, marginBottom: 12 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    summaryLabel: { fontSize: 13, color: c.textSub },
    summaryVal: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.text },
    typeBadge: { backgroundColor: c.accentLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    typeBadgeText: { color: c.accentText, fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
    // Header top row
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    myNumbersBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.accentLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    myNumbersBtnText: { color: '#7C5CFC', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
    // Rental list rows
    rentalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, borderRadius: 12, padding: 14, marginBottom: 8 },
    rentalIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.accentLight, alignItems: 'center', justifyContent: 'center' },
    rentalName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: c.text },
    rentalSub: { fontSize: 12, color: c.textSub, marginTop: 2 },
    // Pricing cards grid
    pricingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    pricingCard: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: c.cardAlt, borderWidth: 1.5, borderColor: c.border, alignItems: 'center', minWidth: 90 },
    pricingCardActive: { backgroundColor: '#7C5CFC', borderColor: '#7C5CFC' },
    pricingDuration: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.text },
    pricingPrice: { fontSize: 12, color: c.textSub, marginTop: 2 },
    pricingTextActive: { color: '#fff' },
    priceHighlight: { color: '#7C5CFC', fontSize: 15, fontFamily: 'Poppins_700Bold' },
    noOptions: { color: c.textSub, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
    // Duration (legacy kept for compat)
    durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    durationBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.border },
    durationBtnActive: { backgroundColor: '#7C5CFC', borderColor: '#7C5CFC' },
    durationBtnText: { fontSize: 13, color: c.text },
    durationBtnTextActive: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
    buyBtn: { backgroundColor: '#7C5CFC', borderRadius: 16, padding: 16, alignItems: 'center' },
    buyBtnDisabled: { opacity: 0.7 },
    buyBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },
  });
}
