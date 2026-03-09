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
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { Icon } from '@/components/Icon';
import { ServiceLogo } from '@/components/ServiceLogo';

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
  const { colors } = useTheme();
  const styles = makeStyles(colors);

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
              keyExtractor={(item) => `svc-${item.ID}`}
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
                  <ServiceLogo logo={item.logo} name={item.name} size="md" />
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
            placeholder="Search countries..."
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
                  onPress={() => {
                    setSelectedCountry(item);
                    setSearch('');
                    setStep('confirm');
                  }}
                >
                  <Text style={styles.flagEmoji}>{countryFlag(item.short_name, item.name)}</Text>
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
                  <Text style={{ fontSize: 16 }}>{countryFlag(selectedCountry.short_name, selectedCountry.name)}</Text>
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
          <Icon name="phone" size={22} color={colors.text} />
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

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { padding: 16, paddingBottom: 8 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
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
