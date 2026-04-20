import { useMemo, useState } from 'react';
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
  fetchFxRate,
  fetchTvServices,
  fetchTvPrice,
  fetchRentalCountries,
  fetchRentalPricing,
  fetchRentalServices,
  fetchSmsPoolServices,
  fetchSuggestedCountries,
  purchaseOneTimeNumber,
  purchaseRental,
  ApiError,
  type ReservationType,
} from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useBalance } from '@/hooks/useBalance';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { Icon } from '@/components/Icon';
import { ServiceLogo } from '@/components/ServiceLogo';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

const TV_PLATFORM_META: Record<string, { color: string; icon: string }> = {
  whatsapp:   { color: '#25D366', icon: 'whatsapp' },
  instagram:  { color: '#E1306C', icon: 'instagram' },
  facebook:   { color: '#1877F2', icon: 'facebook' },
  tiktok:     { color: '#010101', icon: 'tiktok' },
  telegram:   { color: '#0088CC', icon: 'telegram' },
  twitter:    { color: '#1DA1F2', icon: 'twitter' },
  x:          { color: '#222222', icon: 'twitter' },
  google:     { color: '#EA4335', icon: 'google' },
  gmail:      { color: '#EA4335', icon: 'google' },
  youtube:    { color: '#FF0000', icon: 'youtube' },
  snapchat:   { color: '#F7C900', icon: 'snapchat' },
  discord:    { color: '#5865F2', icon: 'discord' },
  linkedin:   { color: '#0A66C2', icon: 'linkedin' },
  spotify:    { color: '#1DB954', icon: 'spotify' },
  twitch:     { color: '#9146FF', icon: 'twitch' },
  reddit:     { color: '#FF4500', icon: 'reddit' },
  pinterest:  { color: '#E60023', icon: 'pinterest' },
  microsoft:  { color: '#00A4EF', icon: 'microsoft' },
  apple:      { color: '#555555', icon: 'apple' },
  amazon:     { color: '#FF9900', icon: 'amazon' },
  soundcloud: { color: '#FF5500', icon: 'soundcloud' },
  threads:    { color: '#101010', icon: 'at' },
  tumblr:     { color: '#35465C', icon: 'tumblr' },
  vimeo:      { color: '#1AB7EA', icon: 'vimeo' },
};

function getTvPlatformKey(name: string): string | null {
  const n = name.toLowerCase();
  for (const key of Object.keys(TV_PLATFORM_META)) {
    if (n.includes(key)) return key;
  }
  return null;
}

function getTvPlatformMeta(name: string): { color: string; icon: string } | null {
  const key = getTvPlatformKey(name);
  return key ? TV_PLATFORM_META[key] : null;
}

function isoToFlag(iso: string): string {
  return Array.from(iso.toUpperCase().slice(0, 2))
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('');
}

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
  'ivory coast': 'CI', "cote d'ivoire": 'CI',
};

function countryFlag(code?: string, name?: string): string {
  if (code && /^[a-zA-Z]{2}$/.test(code.trim())) {
    return isoToFlag(code.trim());
  }
  if (name) {
    const iso = COUNTRY_ISO[name.toLowerCase().trim()];
    if (iso) return isoToFlag(iso);
  }
  if (code && code.trim().length >= 2) {
    return isoToFlag(code.trim());
  }
  return '🌍';
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pickNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const num = toNumber(value);
    if (num !== null) return num;
  }
  return null;
}

function extractArray(payload: any, keys: string[]): any[] {
  const containers = [payload, payload?.data, payload?.result, payload?.payload];
  for (const container of containers) {
    if (Array.isArray(container)) return container;
    for (const key of keys) {
      if (Array.isArray(container?.[key])) return container[key];
    }
  }
  return [];
}

function providerLabel(provider?: string): string {
  if (!provider) return '';
  if (provider === 'smspool') return 'SMSPool';
  if (provider === 'textverified') return 'TextVerified';
  if (provider === 'platfone') return 'Platfone';
  return provider;
}

function formatPurchaseError(e: unknown): string {
  if (e instanceof ApiError) {
    const payload = e.payload as any;
    const p = payload?.provider || payload?.errorSource;
    const label = providerLabel(p);
    const prefix = label ? `${label}: ` : '';
    return `${prefix}${e.message}`;
  }
  return (e as Error)?.message ?? 'Something went wrong.';
}

type Mode = 'activation' | 'rental';
type Source = 'us' | 'other';
type Step = 'source' | 'service' | 'country' | 'confirm';

type DurationKey =
  | 'oneDay'
  | 'threeDay'
  | 'sevenDay'
  | 'fourteenDay'
  | 'thirtyDay'
  | 'ninetyDay'
  | 'oneYear';

interface ServiceItem {
  id: string;
  code: string;
  name: string;
  logo?: string;
}

interface CountryItem {
  id: string;
  code: string;
  name: string;
  shortCode?: string;
  areaCode?: string;
  flag?: string;
  sellPrice?: number;
}

interface RentalPricingOption {
  duration: DurationKey;
  label: string;
  areaCode?: string;
  priceNGN: number;
}

const DURATION_LABELS: Record<DurationKey, string> = {
  oneDay: '1 Day',
  threeDay: '3 Days',
  sevenDay: '7 Days',
  fourteenDay: '14 Days',
  thirtyDay: '30 Days',
  ninetyDay: '90 Days',
  oneYear: '1 Year',
};

const DURATION_ORDER: Record<DurationKey, number> = {
  oneDay: 1,
  threeDay: 2,
  sevenDay: 3,
  fourteenDay: 4,
  thirtyDay: 5,
  ninetyDay: 6,
  oneYear: 7,
};

function normalizeDuration(value: unknown): DurationKey | null {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliases: Record<string, DurationKey> = {
    oneday: 'oneDay', day1: 'oneDay', d1: 'oneDay', one: 'oneDay',
    threeday: 'threeDay', day3: 'threeDay', d3: 'threeDay',
    sevenday: 'sevenDay', day7: 'sevenDay', d7: 'sevenDay',
    fourteenday: 'fourteenDay', day14: 'fourteenDay', d14: 'fourteenDay',
    thirtyday: 'thirtyDay', day30: 'thirtyDay', d30: 'thirtyDay',
    ninetyday: 'ninetyDay', day90: 'ninetyDay', d90: 'ninetyDay',
    oneyear: 'oneYear', year1: 'oneYear', y1: 'oneYear',
  };
  return aliases[normalized] ?? null;
}

function normalizeService(raw: any): ServiceItem {
  const code = String(raw?.code ?? raw?.ID ?? raw?.id ?? raw?.service_id ?? raw?.serviceCode ?? raw?.service_code ?? '');
  const name = String(raw?.name ?? raw?.serviceName ?? raw?.service ?? raw?.product ?? code);
  const id = String(raw?.id ?? raw?.ID ?? raw?.code ?? raw?.service_id ?? name);
  return {
    id,
    code: code || id,
    name,
    logo: typeof raw?.logo === 'string' ? raw.logo : undefined,
  };
}

function normalizeCountry(raw: any): CountryItem {
  const code = String(raw?.code ?? raw?.countryCode ?? raw?.country_code ?? raw?.id ?? raw?.countryId ?? '');
  const shortCode = raw?.shortCode ?? raw?.short_code ?? raw?.iso2 ?? raw?.alpha2;
  const areaCode = raw?.areaCode ?? raw?.area_code ?? raw?.dialCode ?? raw?.dial_code ?? undefined;
  const name = String(raw?.name ?? raw?.countryName ?? raw?.country_name ?? raw?.country ?? code);
  const id = `${code || shortCode || name}-${name}`;
  const sellPrice = toNumber(raw?.sellPrice ?? raw?.sell_price ?? raw?.price ?? null);
  return {
    id,
    code: code || String(shortCode ?? areaCode ?? name),
    name,
    shortCode: shortCode ? String(shortCode) : undefined,
    areaCode: areaCode ? String(areaCode) : undefined,
    flag: typeof raw?.flag === 'string' ? raw.flag : undefined,
    sellPrice: sellPrice ?? undefined,
  };
}

function normalizeRentalOptions(payload: any, fxRate: number | null, defaultAreaCode?: string): RentalPricingOption[] {
  let source = extractArray(payload, ['options', 'pricing', 'durations', 'items', 'plans']);
  if (!source.length && payload?.options && typeof payload.options === 'object') {
    source = Object.entries(payload.options).map(([duration, value]) => ({
      duration,
      ...(typeof value === 'object' && value !== null ? value : { price: value }),
    }));
  }
  const mapped: RentalPricingOption[] = [];
  source.forEach((raw: any) => {
    const duration = normalizeDuration(raw?.duration ?? raw?.key ?? raw?.code ?? raw?.slug ?? raw?.label ?? raw?.name);
    if (!duration) return;
    const priceNGN = pickNumber(raw?.priceNGN, raw?.price_ngn, raw?.ngnPrice, raw?.ngn);
    const usdPrice = pickNumber(raw?.price, raw?.priceUSD, raw?.usdPrice, raw?.rawPrice, raw?.amount);
    const resolvedNGN = priceNGN ?? (usdPrice !== null && fxRate !== null ? usdPrice * fxRate : null);
    if (resolvedNGN === null) return;
    const areaCode = raw?.areaCode ?? raw?.area_code ?? defaultAreaCode;
    mapped.push({
      duration,
      label: String(raw?.label ?? DURATION_LABELS[duration]),
      areaCode: areaCode ? String(areaCode) : undefined,
      priceNGN: resolvedNGN,
    });
  });
  return mapped.sort((a, b) => DURATION_ORDER[a.duration] - DURATION_ORDER[b.duration]);
}

export default function NumbersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.userId);
  const { data: balance } = useBalance(userId ?? '');
  const { format } = useCurrency();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [mode, setMode] = useState<Mode>('activation');
  const [step, setStep] = useState<Step>('source');
  const [source, setSource] = useState<Source | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [reservationType, setReservationType] = useState<ReservationType>('renewable');

  const [selectedActivationService, setSelectedActivationService] = useState<ServiceItem | null>(null);
  const [selectedActivationCountry, setSelectedActivationCountry] = useState<CountryItem | null>(null);

  const [selectedRentalService, setSelectedRentalService] = useState<ServiceItem | null>(null);
  const [selectedRentalCountry, setSelectedRentalCountry] = useState<CountryItem | null>(null);
  const [selectedRentalOption, setSelectedRentalOption] = useState<RentalPricingOption | null>(null);

  const isRenewable = reservationType === 'renewable';

  // ── FX rate ─────────────────────────────────────────────────────────────────
  const fxRateQuery = useQuery({
    queryKey: ['fx-rate', 'USD', 'NGN'],
    queryFn: () => fetchFxRate('USD', 'NGN'),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  const fxRatePayload = fxRateQuery.data as any;
  const fxRate = pickNumber(fxRatePayload?.rate, fxRatePayload?.data?.rate, fxRatePayload?.result?.rate);

  // ── Activation: US services (TextVerified) ────────────────────────────────
  const usServicesQuery = useQuery({
    queryKey: ['tv-services'],
    queryFn: fetchTvServices,
    enabled: mode === 'activation' && step === 'service' && source === 'us',
  });

  // ── Activation: Other services (SMSPool) ─────────────────────────────────
  const otherServicesQuery = useQuery({
    queryKey: ['smspool-activation-services', page],
    queryFn: () => fetchSmsPoolServices(page, 100),
    enabled: mode === 'activation' && step === 'service' && source === 'other',
  });

  // ── Activation: Suggested countries for selected SMSPool service ──────────
  const suggestedCountriesQuery = useQuery({
    queryKey: ['suggested-countries', selectedActivationService?.code],
    queryFn: () => fetchSuggestedCountries(selectedActivationService!.code),
    enabled: mode === 'activation' && step === 'country' && source === 'other' && !!selectedActivationService,
  });

  // ── Activation: US pricing (TextVerified) ────────────────────────────────
  const usPricingQuery = useQuery({
    queryKey: ['tv-price', selectedActivationService?.name],
    queryFn: () => fetchTvPrice(selectedActivationService!.name),
    enabled: mode === 'activation' && step === 'confirm' && source === 'us' && !!selectedActivationService,
  });

  // ── Rental queries ────────────────────────────────────────────────────────
  const rentalServicesQuery = useQuery({
    queryKey: ['grizzly-services', reservationType, page],
    queryFn: () => fetchRentalServices(page, 24, reservationType),
    enabled: mode === 'rental' && step === 'service',
  });

  const rentalCountriesQuery = useQuery({
    queryKey: ['grizzly-countries'],
    queryFn: fetchRentalCountries,
    enabled: mode === 'rental' && step === 'country',
  });

  const rentalPricingQuery = useQuery({
    queryKey: ['rental-pricing', selectedRentalService?.name, selectedRentalCountry?.code, isRenewable],
    queryFn: () => fetchRentalPricing(selectedRentalService!.name, selectedRentalCountry!.code, isRenewable),
    enabled: mode === 'rental' && step === 'confirm' && !!selectedRentalService && !!selectedRentalCountry,
  });

  // ── Derived data ──────────────────────────────────────────────────────────
  const TV_POPULAR = [
    'whatsapp', 'instagram', 'facebook', 'tiktok', 'telegram', 'twitter',
    'google', 'gmail', 'youtube', 'snapchat', 'discord', 'linkedin', 'spotify',
    'twitch', 'reddit', 'pinterest', 'microsoft', 'apple', 'amazon',
  ];

  const usServices = useMemo(() => {
    const raw = extractArray(usServicesQuery.data, ['services', 'items']);
    const items = raw.map((s: any) => {
      const name = String(s?.serviceName ?? s?.name ?? s?.code ?? s?.id ?? '');
      return { id: name, code: name, name, logo: undefined } satisfies ServiceItem;
    });
    const sorted = items.sort((a: ServiceItem, b: ServiceItem) => {
      const ai = TV_POPULAR.findIndex((k) => a.name.toLowerCase().includes(k));
      const bi = TV_POPULAR.findIndex((k) => b.name.toLowerCase().includes(k));
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
    // One card per platform: deduplicate by platform key, fallback to exact name
    const seen = new Set<string>();
    return sorted.filter((item: ServiceItem) => {
      const key = getTvPlatformKey(item.name) ?? item.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [usServicesQuery.data]);

  const otherServices = useMemo(
    () => extractArray(otherServicesQuery.data, ['services', 'items']).map(normalizeService),
    [otherServicesQuery.data]
  );

  const suggestedCountries = useMemo(
    () => extractArray(suggestedCountriesQuery.data, ['countries', 'items']).map(normalizeCountry),
    [suggestedCountriesQuery.data]
  );

  const rentalServices = useMemo(
    () => extractArray(rentalServicesQuery.data, ['services', 'items']).map(normalizeService),
    [rentalServicesQuery.data]
  );

  const rentalCountries = useMemo(
    () => extractArray(rentalCountriesQuery.data, ['countries', 'items']).map(normalizeCountry),
    [rentalCountriesQuery.data]
  );

  // US pricing — TV returns { price: userPriceUsd, rawPrice: providerUsd }
  const usPriceUSD = pickNumber(usPricingQuery.data?.price, (usPricingQuery.data as any)?.data?.price);
  const usDisplayPrice = usPriceUSD !== null && fxRate !== null ? usPriceUSD * fxRate : null;

  // Other pricing — from sellPrice stored in selected country
  const otherDisplayPrice = selectedActivationCountry?.sellPrice ?? null;

  const rentalOptions = useMemo(
    () => normalizeRentalOptions(
      rentalPricingQuery.data,
      fxRate,
      selectedRentalCountry?.areaCode ?? selectedRentalCountry?.code,
    ),
    [rentalPricingQuery.data, fxRate, selectedRentalCountry?.areaCode, selectedRentalCountry?.code]
  );

  // Active service list and countries for the current step
  const activationServices = source === 'us' ? usServices : otherServices;
  const loadingActivationServices = source === 'us' ? usServicesQuery.isLoading : otherServicesQuery.isLoading;
  const activationServicesError = source === 'us' ? usServicesQuery.error : otherServicesQuery.error;
  const loadingCountries = source === 'other' ? suggestedCountriesQuery.isLoading : rentalCountriesQuery.isLoading;
  const countriesError = source === 'other' ? suggestedCountriesQuery.error : rentalCountriesQuery.error;

  const services = mode === 'activation' ? activationServices : rentalServices;
  const countries = mode === 'activation' ? suggestedCountries : rentalCountries;
  const loadingServices = mode === 'activation' ? loadingActivationServices : rentalServicesQuery.isLoading;
  const servicesError = mode === 'activation' ? activationServicesError : rentalServicesQuery.error;

  const filteredServices = useMemo(() => {
    if (!search.trim()) return services;
    const q = search.toLowerCase();
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, search]);

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return countries;
    const q = search.toLowerCase();
    return countries.filter((c) => c.name.toLowerCase().includes(q));
  }, [countries, search]);

  // ── Reset helpers ─────────────────────────────────────────────────────────
  const resetActivationFlow = () => {
    setStep('source');
    setSource(null);
    setPage(1);
    setSearch('');
    setSelectedActivationService(null);
    setSelectedActivationCountry(null);
  };

  const resetRentalFlow = () => {
    setStep('service');
    setPage(1);
    setSearch('');
    setSelectedRentalService(null);
    setSelectedRentalCountry(null);
    setSelectedRentalOption(null);
  };

  // ── Purchase mutation ─────────────────────────────────────────────────────
  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (mode === 'activation') {
        if (!selectedActivationService) throw new Error('Select a service first.');

        if (source === 'us') {
          return purchaseOneTimeNumber({
            serviceCode: selectedActivationService.name,
            serviceName: selectedActivationService.name,
            country: '1',
            countryName: 'United States',
            countryShortCode: 'US',
          });
        }

        if (!selectedActivationCountry) throw new Error('Select a country first.');
        return purchaseOneTimeNumber({
          serviceCode: selectedActivationService.code,
          serviceName: selectedActivationService.name,
          country: selectedActivationCountry.code,
          countryName: selectedActivationCountry.name,
          countryShortCode: selectedActivationCountry.shortCode ?? selectedActivationCountry.code,
        });
      }

      if (!selectedRentalService || !selectedRentalCountry || !selectedRentalOption) {
        throw new Error('Select service, country, and duration first.');
      }
      const areaCode =
        selectedRentalOption.areaCode ||
        selectedRentalCountry.areaCode ||
        selectedRentalCountry.code;
      return purchaseRental({
        serviceName: selectedRentalService.name,
        areaCode,
        isRenewable,
        duration: selectedRentalOption.duration,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance', userId] });
      queryClient.invalidateQueries({ queryKey: ['numbers', userId] });
      if (mode === 'activation') resetActivationFlow();
      else resetRentalFlow();
      Alert.alert(
        'Success',
        mode === 'activation' ? 'Number purchased! Check My Numbers.' : 'Rental purchased successfully.',
        [{ text: 'My Numbers', onPress: () => router.push('/my-numbers' as any) }, { text: 'OK' }]
      );
    },
    onError: (e: unknown) => Alert.alert('Purchase Failed', formatPurchaseError(e)),
  });

  const handlePurchase = () => {
    if (mode === 'activation') {
      if (!selectedActivationService) return Alert.alert('Missing selection', 'Please select a service.');
      if (source === 'other' && !selectedActivationCountry)
        return Alert.alert('Missing selection', 'Please select a country.');
    } else {
      if (!selectedRentalService || !selectedRentalCountry || !selectedRentalOption)
        return Alert.alert('Missing selection', 'Please select service, country, and duration.');
    }
    purchaseMutation.mutate();
  };

  const handleBack = () => {
    if (mode === 'activation') {
      if (step === 'confirm') {
        setStep(source === 'us' ? 'service' : 'country');
        setSelectedActivationCountry(null);
      } else if (step === 'country') {
        setStep('service');
        setSelectedActivationCountry(null);
        setSearch('');
      } else if (step === 'service') {
        setStep('source');
        setSource(null);
        setSelectedActivationService(null);
        setSearch('');
      }
    } else {
      if (step === 'confirm') { setStep('country'); setSelectedRentalOption(null); }
      else if (step === 'country') { setStep('service'); setSelectedRentalCountry(null); }
    }
  };

  const stepTitle = () => {
    if (mode === 'activation') {
      if (step === 'source') return 'Choose source';
      if (step === 'service') return source === 'us' ? '2. Choose service' : '2. Choose service';
      if (step === 'country') return '3. Choose country';
      return source === 'us' ? '3. Confirm order' : '4. Confirm order';
    }
    if (step === 'service') return '1. Choose rental service';
    if (step === 'country') return '2. Choose country/area';
    return '3. Select duration & confirm';
  };

  // ── Render steps ──────────────────────────────────────────────────────────

  const renderSourceStep = () => (
    <ScrollView contentContainerStyle={styles.sourceContent}>
      <Text style={styles.sourceHeading}>Where do you need a number?</Text>
      <View style={styles.sourceGrid}>
        <TouchableOpacity
          style={styles.sourceCard}
          onPress={() => { setSource('us'); setStep('service'); setSearch(''); setPage(1); }}
        >
          <Text style={styles.sourceFlag}>🇺🇸</Text>
          <Text style={styles.sourceCardTitle}>US Numbers</Text>
          <Text style={styles.sourceCardSub}>United States only</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sourceCard}
          onPress={() => { setSource('other'); setStep('service'); setSearch(''); setPage(1); }}
        >
          <Text style={styles.sourceFlag}>🌍</Text>
          <Text style={styles.sourceCardTitle}>Other Countries</Text>
          <Text style={styles.sourceCardSub}>International numbers</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sourceInfoCard}>
        <Icon name="time" size={14} color="#d97706" />
        <Text style={styles.sourceInfoText}>
          One-time activation · expires in ~20 minutes after purchase
        </Text>
      </View>
    </ScrollView>
  );

  const renderServiceStep = () => (
    <>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder={mode === 'activation' ? 'Search services...' : 'Search rental services...'}
        placeholderTextColor="#9ca3af"
      />

      {loadingServices ? (
        <ActivityIndicator color="#7C5CFC" style={{ marginTop: 40 }} />
      ) : servicesError ? (
        <View style={styles.emptyStateBox}>
          <Icon name="xmark" size={20} color="#ef4444" />
          <Text style={styles.emptyStateTitle}>Unable to load services</Text>
          <Text style={styles.emptyStateText}>
            {(servicesError as Error)?.message ?? 'Please try again.'}
          </Text>
          <TouchableOpacity
            style={styles.emptyStateBtn}
            onPress={() => {
              if (mode === 'activation') {
                if (source === 'us') usServicesQuery.refetch();
                else otherServicesQuery.refetch();
              } else {
                rentalServicesQuery.refetch();
              }
            }}
          >
            <Text style={styles.emptyStateBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          key={`services-${mode}-${source}`}
          data={filteredServices}
          keyExtractor={(item, index) => `svc-${index}-${item.id}`}
          numColumns={mode === 'activation' ? 2 : 1}
          columnWrapperStyle={mode === 'activation' ? { gap: 10 } : undefined}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) =>
            mode === 'activation' ? (
              (() => {
                const meta = source === 'us' ? getTvPlatformMeta(item.name) : null;
                const isLight = meta?.color === '#F7C900';
                return (
                  <TouchableOpacity
                    style={[styles.gridCard, meta && { backgroundColor: meta.color }]}
                    onPress={() => {
                      setSelectedActivationService(item);
                      setSearch('');
                      setStep(source === 'us' ? 'confirm' : 'country');
                    }}
                    activeOpacity={0.8}
                  >
                    {meta ? (
                      <>
                        <View style={[styles.tvIconWrap, { backgroundColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)' }]}>
                          <FontAwesome5 name={meta.icon} size={24} color={isLight ? '#1a1a1a' : '#fff'} brand />
                        </View>
                        <Text style={[styles.gridLabel, { color: isLight ? '#1a1a1a' : '#fff' }]} numberOfLines={2}>{item.name}</Text>
                      </>
                    ) : (
                      <>
                        <ServiceLogo logo={item.logo} name={item.name} size="md" />
                        <Text style={styles.gridLabel} numberOfLines={2}>{item.name}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })()
            ) : (
              <TouchableOpacity
                style={styles.rentalRow}
                onPress={() => {
                  setSelectedRentalService(item);
                  setSearch('');
                  setStep('country');
                }}
              >
                <View style={styles.rentalIconWrap}>
                  <Icon name="phone" size={18} color="#7C5CFC" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rentalName}>{item.name}</Text>
                  <Text style={styles.rentalSub}>Select country and duration</Text>
                </View>
                <Icon name="arrowRight" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )
          }
          ListFooterComponent={
            mode === 'activation' && source === 'other' ? (
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
            ) : mode === 'rental' ? (
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
          ListEmptyComponent={
            <View style={styles.emptyStateBox}>
              <Icon name="search" size={20} color="#9ca3af" />
              <Text style={styles.emptyStateTitle}>No services found</Text>
              <Text style={styles.emptyStateText}>Try another search term or page.</Text>
            </View>
          }
        />
      )}
    </>
  );

  const renderCountryStep = () => {
    const selectedSvc = mode === 'activation' ? selectedActivationService : selectedRentalService;
    return (
      <>
        {selectedSvc && (
          <View style={styles.selectedBanner}>
            <View style={styles.selectedBannerInner}>
              <ServiceLogo logo={selectedSvc.logo} name={selectedSvc.name} size="sm" />
              <Text style={styles.selectedBannerText}>{selectedSvc.name}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setStep('service');
                if (mode === 'activation') setSelectedActivationService(null);
                else setSelectedRentalService(null);
              }}
            >
              <Text style={styles.changeLink}>Change</Text>
            </TouchableOpacity>
          </View>
        )}

        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder={mode === 'activation' ? 'Search countries...' : 'Search countries/areas...'}
          placeholderTextColor="#9ca3af"
        />

        {loadingCountries ? (
          <ActivityIndicator color="#7C5CFC" style={{ marginTop: 40 }} />
        ) : countriesError ? (
          <View style={styles.emptyStateBox}>
            <Icon name="xmark" size={20} color="#ef4444" />
            <Text style={styles.emptyStateTitle}>Unable to load countries</Text>
            <Text style={styles.emptyStateText}>
              {(countriesError as Error)?.message ?? 'Please try again.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyStateBtn}
              onPress={() => {
                if (mode === 'activation') suggestedCountriesQuery.refetch();
                else rentalCountriesQuery.refetch();
              }}
            >
              <Text style={styles.emptyStateBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => `cty-${item.id}`}
            numColumns={2}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => {
                  if (mode === 'activation') {
                    setSelectedActivationCountry(item);
                  } else {
                    setSelectedRentalCountry(item);
                  }
                  setSearch('');
                  setStep('confirm');
                }}
              >
                <Text style={styles.flagEmoji}>
                  {item.flag ?? countryFlag(item.shortCode ?? item.code, item.name)}
                </Text>
                <Text style={styles.gridLabel} numberOfLines={2}>{item.name}</Text>
                {mode === 'activation' && item.sellPrice ? (
                  <Text style={styles.gridSubLabel}>{format(item.sellPrice)}</Text>
                ) : mode === 'rental' && (item.areaCode || item.shortCode) ? (
                  <Text style={styles.gridSubLabel}>
                    {item.areaCode ? `Area ${item.areaCode}` : item.shortCode}
                  </Text>
                ) : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyStateBox}>
                <Icon name="search" size={20} color="#9ca3af" />
                <Text style={styles.emptyStateTitle}>No countries found</Text>
                <Text style={styles.emptyStateText}>Try a different search term.</Text>
              </View>
            }
          />
        )}
      </>
    );
  };

  const renderConfirmStep = () => {
    const displayPrice =
      mode === 'activation'
        ? source === 'us'
          ? usDisplayPrice
          : otherDisplayPrice
        : null;

    return (
      <ScrollView contentContainerStyle={styles.confirmContent}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>

          {mode === 'activation' && (
            <>
              {selectedActivationService && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Service</Text>
                  <Text style={styles.summaryVal}>{selectedActivationService.name}</Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Country</Text>
                <View style={styles.summaryCountryVal}>
                  <Text style={{ fontSize: 16 }}>
                    {source === 'us'
                      ? '🇺🇸'
                      : selectedActivationCountry?.flag ??
                        countryFlag(
                          selectedActivationCountry?.shortCode ?? selectedActivationCountry?.code,
                          selectedActivationCountry?.name,
                        )}
                  </Text>
                  <Text style={styles.summaryVal}>
                    {source === 'us' ? 'United States' : selectedActivationCountry?.name}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Type</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>One-Time Activation</Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Provider</Text>
                <Text style={styles.summaryVal}>
                  {source === 'us' ? 'TextVerified' : 'SMSPool'}
                </Text>
              </View>

              {source === 'us' && usPricingQuery.isLoading ? (
                <ActivityIndicator color="#7C5CFC" style={{ marginVertical: 8 }} />
              ) : (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Price</Text>
                  <Text style={[styles.summaryVal, styles.priceHighlight]}>
                    {displayPrice !== null ? format(displayPrice) : 'Unavailable'}
                  </Text>
                </View>
              )}
            </>
          )}

          {mode === 'rental' && (
            <>
              {selectedRentalService && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Service</Text>
                  <Text style={styles.summaryVal}>{selectedRentalService.name}</Text>
                </View>
              )}
              {selectedRentalCountry && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Country/Area</Text>
                  <View style={styles.summaryCountryVal}>
                    <Text style={{ fontSize: 16 }}>
                      {selectedRentalCountry.flag ??
                        countryFlag(
                          selectedRentalCountry.shortCode ?? selectedRentalCountry.code,
                          selectedRentalCountry.name,
                        )}
                    </Text>
                    <Text style={styles.summaryVal}>{selectedRentalCountry.name}</Text>
                  </View>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Type</Text>
                <View style={[styles.typeBadge, { backgroundColor: '#d1fae5' }]}>
                  <Text style={[styles.typeBadgeText, { color: '#065f46' }]}>
                    {isRenewable ? 'Renewable Rental' : 'Non-Renewable Rental'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.summaryLabel, { marginTop: 4, marginBottom: 10 }]}>Select Duration</Text>
              {rentalPricingQuery.isLoading ? (
                <ActivityIndicator color="#7C5CFC" style={{ marginVertical: 12 }} />
              ) : rentalOptions.length === 0 ? (
                <Text style={styles.noOptions}>No rental pricing available for this selection.</Text>
              ) : (
                <View style={styles.pricingGrid}>
                  {rentalOptions.map((opt) => {
                    const active = selectedRentalOption?.duration === opt.duration;
                    return (
                      <TouchableOpacity
                        key={opt.duration}
                        style={[styles.pricingCard, active && styles.pricingCardActive]}
                        onPress={() => setSelectedRentalOption(opt)}
                      >
                        <Text style={[styles.pricingDuration, active && styles.pricingTextActive]}>
                          {opt.label}
                        </Text>
                        <Text style={[styles.pricingPrice, active && styles.pricingTextActive]}>
                          {format(opt.priceNGN)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {selectedRentalOption && (
                <View style={[styles.summaryRow, { marginTop: 8 }]}>
                  <Text style={styles.summaryLabel}>You pay</Text>
                  <Text style={[styles.summaryVal, styles.priceHighlight]}>
                    {format(selectedRentalOption.priceNGN)}
                  </Text>
                </View>
              )}
            </>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Your Balance</Text>
            <Text style={styles.summaryVal}>{format(balance ?? 0)}</Text>
          </View>
        </View>

        {mode === 'activation' && (
          <View style={styles.vpnTip}>
            <Icon name="wifi" size={14} color="#7C5CFC" />
            <Text style={styles.vpnTipText}>
              Tip: Using a VPN set to the target country can increase your OTP success rate.
            </Text>
          </View>
        )}

        {mode === 'activation' && source === 'other' && (
          <TouchableOpacity
            style={styles.findAnotherBtn}
            onPress={() => { setSelectedActivationCountry(null); setStep('country'); }}
            disabled={purchaseMutation.isPending}
          >
            <Icon name="refresh" size={14} color="#0ea5e9" />
            <Text style={styles.findAnotherBtnText}>Choose a different country</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.buyBtn,
            (purchaseMutation.isPending || (mode === 'rental' && !selectedRentalOption)) && styles.buyBtnDisabled,
          ]}
          onPress={handlePurchase}
          disabled={purchaseMutation.isPending || (mode === 'rental' && !selectedRentalOption)}
        >
          {purchaseMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buyBtnText} numberOfLines={1} ellipsizeMode="tail">
              {mode === 'activation'
                ? `Buy ${selectedActivationService?.name ?? 'Number'}`
                : `Rent ${selectedRentalService?.name ?? ''} — ${selectedRentalOption?.label ?? 'Select duration'}`}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ── Screen layout ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
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
              onPress={() => {
                setMode(m);
                if (m === 'activation') resetActivationFlow();
                else { resetRentalFlow(); }
              }}
            >
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                {m === 'activation' ? 'One-Time OTP' : 'Long-Term Rental'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Rental renewable toggle */}
        {mode === 'rental' && (
          <View style={styles.reservationToggle}>
            {(['renewable', 'nonrenewable'] as ReservationType[]).map((type) => {
              const active = reservationType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.reservationBtn, active && styles.reservationBtnActive]}
                  onPress={() => {
                    setReservationType(type);
                    setPage(1);
                    setSearch('');
                    setStep('service');
                    setSelectedRentalService(null);
                    setSelectedRentalCountry(null);
                    setSelectedRentalOption(null);
                  }}
                >
                  <Text style={[styles.reservationBtnText, active && styles.reservationBtnTextActive]}>
                    {type === 'renewable' ? 'Renewable' : 'Non-Renewable'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Back + step label */}
        <View style={styles.stepRow}>
          {(step !== 'source' && mode === 'activation') || (step !== 'service' && mode === 'rental') ? (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Icon name="arrowLeft" size={13} color="#7C5CFC" />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.stepLabel}>{stepTitle()}</Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {mode === 'activation' && step === 'source' && renderSourceStep()}
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
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: c.text },
    modeToggle: {
      flexDirection: 'row',
      backgroundColor: c.toggleBg,
      borderRadius: 12,
      padding: 3,
      marginBottom: 10,
    },
    modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    modeBtnActive: { backgroundColor: '#7C5CFC' },
    modeBtnText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.textSub },
    modeBtnTextActive: { color: '#fff' },
    reservationToggle: {
      flexDirection: 'row',
      backgroundColor: c.toggleBg,
      borderRadius: 10,
      padding: 3,
      marginBottom: 12,
    },
    reservationBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
    reservationBtnActive: { backgroundColor: '#0ea5e9' },
    reservationBtnText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: c.textSub },
    reservationBtnTextActive: { color: '#fff' },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
    backBtnText: { color: '#7C5CFC', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
    stepLabel: { fontSize: 13, color: c.textSub, fontFamily: 'Poppins_500Medium' },
    myNumbersBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.accentLight,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    myNumbersBtnText: { color: '#7C5CFC', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },

    // Source step
    sourceContent: { padding: 20, paddingBottom: 60, gap: 16 },
    sourceHeading: {
      fontSize: 15,
      fontFamily: 'Poppins_600SemiBold',
      color: c.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    sourceGrid: { flexDirection: 'row', gap: 12 },
    sourceCard: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: c.border,
    },
    sourceFlag: { fontSize: 44, marginBottom: 4 },
    sourceCardTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: c.text, textAlign: 'center' },
    sourceCardSub: { fontSize: 12, color: c.textSub, textAlign: 'center', fontFamily: 'Poppins_400Regular' },
    sourceInfoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#fffbeb',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: '#fde68a',
    },
    sourceInfoText: { fontSize: 12, color: '#92400e', fontFamily: 'Poppins_400Regular', flex: 1 },

    // Service/country grid
    search: {
      backgroundColor: c.input,
      borderRadius: 12,
      padding: 12,
      fontSize: 14,
      color: c.text,
      marginHorizontal: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.inputBorder,
    },
    grid: { padding: 16, paddingTop: 4, paddingBottom: 100, gap: 10 },
    gridCard: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      gap: 6,
    },
    tvIconWrap: { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    flagEmoji: { fontSize: 32 },
    gridLabel: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: c.text, textAlign: 'center' },
    gridSubLabel: { fontSize: 11, color: c.textMuted, textAlign: 'center' },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 16,
    },
    pageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#7C5CFC',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    pageBtnDisabled: { backgroundColor: c.border },
    pageBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
    pageText: { color: c.text, fontSize: 13 },

    // Selected banner
    selectedBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.accentLight,
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 10,
      padding: 10,
    },
    selectedBannerInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    selectedBannerText: { fontSize: 13, color: c.accentText, fontFamily: 'Poppins_600SemiBold' },
    changeLink: { color: '#7C5CFC', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

    // Confirm
    confirmContent: { padding: 16, paddingBottom: 100 },
    summaryCard: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 16 },
    summaryTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: c.text, marginBottom: 12 },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    summaryLabel: { fontSize: 13, color: c.textSub },
    summaryVal: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.text },
    summaryCountryVal: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    typeBadge: { backgroundColor: c.accentLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    typeBadgeText: { color: c.accentText, fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
    vpnTip: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: '#f5f3ff',
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#ddd6fe',
    },
    vpnTipText: {
      flex: 1,
      fontSize: 12,
      color: '#5b21b6',
      fontFamily: 'Poppins_400Regular',
      lineHeight: 18,
    },
    findAnotherBtn: {
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#bae6fd',
      backgroundColor: '#f0f9ff',
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    findAnotherBtnText: { color: '#0369a1', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

    // Rental
    rentalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
    },
    rentalIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rentalName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: c.text },
    rentalSub: { fontSize: 12, color: c.textSub, marginTop: 2 },
    pricingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    pricingCard: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: c.cardAlt,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
      minWidth: 120,
    },
    pricingCardActive: { backgroundColor: '#7C5CFC', borderColor: '#7C5CFC' },
    pricingDuration: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.text },
    pricingPrice: { fontSize: 12, color: c.textSub, marginTop: 2 },
    pricingTextActive: { color: '#fff' },
    priceHighlight: { color: '#7C5CFC', fontSize: 15, fontFamily: 'Poppins_700Bold' },
    noOptions: { color: c.textSub, fontSize: 13, textAlign: 'center', paddingVertical: 12 },

    // Error/empty
    emptyStateBox: {
      marginHorizontal: 16,
      marginTop: 10,
      backgroundColor: c.card,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: c.border,
    },
    emptyStateTitle: { fontSize: 13, color: c.text, fontFamily: 'Poppins_600SemiBold' },
    emptyStateText: { fontSize: 12, color: c.textSub, textAlign: 'center' },
    emptyStateBtn: {
      marginTop: 4,
      backgroundColor: '#7C5CFC',
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    emptyStateBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Poppins_700Bold' },

    // Buy CTA
    buyBtn: { backgroundColor: '#7C5CFC', borderRadius: 16, padding: 16, alignItems: 'center' },
    buyBtnDisabled: { opacity: 0.7 },
    buyBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold', maxWidth: '92%' },
  });
}
