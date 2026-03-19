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
  fetchRentalCountries,
  fetchRentalPricing,
  fetchRentalServices,
  fetchSmsPoolCountries,
  fetchSmsPoolPricing,
  fetchSmsPoolServices,
  purchaseOneTimeNumber,
  purchaseRental,
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

type Mode = 'activation' | 'rental';
type Step = 'service' | 'country' | 'confirm';

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
    oneday: 'oneDay',
    day1: 'oneDay',
    d1: 'oneDay',
    one: 'oneDay',
    threeday: 'threeDay',
    day3: 'threeDay',
    d3: 'threeDay',
    sevenday: 'sevenDay',
    day7: 'sevenDay',
    d7: 'sevenDay',
    fourteenday: 'fourteenDay',
    day14: 'fourteenDay',
    d14: 'fourteenDay',
    thirtyday: 'thirtyDay',
    day30: 'thirtyDay',
    d30: 'thirtyDay',
    ninetyday: 'ninetyDay',
    day90: 'ninetyDay',
    d90: 'ninetyDay',
    oneyear: 'oneYear',
    year1: 'oneYear',
    y1: 'oneYear',
  };

  return aliases[normalized] ?? null;
}

function normalizeService(raw: any): ServiceItem {
  const code = String(
    raw?.code ?? raw?.ID ?? raw?.id ?? raw?.service_id ?? raw?.serviceCode ?? raw?.service_code ?? ''
  );
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

  return {
    id,
    code: code || String(shortCode ?? areaCode ?? name),
    name,
    shortCode: shortCode ? String(shortCode) : undefined,
    areaCode: areaCode ? String(areaCode) : undefined,
    flag: typeof raw?.flag === 'string' ? raw.flag : undefined,
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

function getSuccessRateBadge(rate: number | null): { label: string; bg: string; text: string } {
  if (rate === null) {
    return {
      label: 'Not available',
      bg: '#e5e7eb',
      text: '#374151',
    };
  }

  if (rate >= 85) {
    return {
      label: `${rate.toFixed(1)}%`,
      bg: '#dcfce7',
      text: '#166534',
    };
  }

  if (rate >= 70) {
    return {
      label: `${rate.toFixed(1)}%`,
      bg: '#fef3c7',
      text: '#92400e',
    };
  }

  return {
    label: `${rate.toFixed(1)}%`,
    bg: '#fee2e2',
    text: '#991b1b',
  };
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
  const [step, setStep] = useState<Step>('service');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [reservationType, setReservationType] = useState<ReservationType>('renewable');

  const [selectedActivationService, setSelectedActivationService] = useState<ServiceItem | null>(null);
  const [selectedActivationCountry, setSelectedActivationCountry] = useState<CountryItem | null>(null);

  const [selectedRentalService, setSelectedRentalService] = useState<ServiceItem | null>(null);
  const [selectedRentalCountry, setSelectedRentalCountry] = useState<CountryItem | null>(null);
  const [selectedRentalOption, setSelectedRentalOption] = useState<RentalPricingOption | null>(null);

  const isRenewable = reservationType === 'renewable';

  const fxRateQuery = useQuery({
    queryKey: ['fx-rate', 'USD', 'NGN'],
    queryFn: () => fetchFxRate('USD', 'NGN'),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const fxRatePayload = fxRateQuery.data as any;
  const fxRate = pickNumber(
    fxRatePayload?.rate,
    fxRatePayload?.data?.rate,
    fxRatePayload?.result?.rate
  );

  const activationServicesQuery = useQuery({
    queryKey: ['smspool-services', page],
    queryFn: () => fetchSmsPoolServices(page, 24),
    enabled: mode === 'activation' && step === 'service',
  });

  const rentalServicesQuery = useQuery({
    queryKey: ['grizzly-services', reservationType, page],
    queryFn: () => fetchRentalServices(page, 24, reservationType),
    enabled: mode === 'rental' && step === 'service',
  });

  const activationCountriesQuery = useQuery({
    queryKey: ['smspool-countries'],
    queryFn: fetchSmsPoolCountries,
    enabled: mode === 'activation' && step === 'country',
  });

  const rentalCountriesQuery = useQuery({
    queryKey: ['grizzly-countries'],
    queryFn: fetchRentalCountries,
    enabled: mode === 'rental' && step === 'country',
  });

  const activationPricingQuery = useQuery({
    queryKey: ['activation-pricing', selectedActivationService?.code, selectedActivationCountry?.code],
    queryFn: () => fetchSmsPoolPricing(selectedActivationService!.code, selectedActivationCountry!.code),
    enabled: mode === 'activation' && step === 'confirm' && !!selectedActivationService && !!selectedActivationCountry,
  });

  const rentalPricingQuery = useQuery({
    queryKey: ['rental-pricing', selectedRentalService?.name, selectedRentalCountry?.code, isRenewable],
    queryFn: () => fetchRentalPricing(selectedRentalService!.name, selectedRentalCountry!.code, isRenewable),
    enabled: mode === 'rental' && step === 'confirm' && !!selectedRentalService && !!selectedRentalCountry,
  });

  const activationServices = useMemo(
    () => extractArray(activationServicesQuery.data, ['services', 'items']).map(normalizeService),
    [activationServicesQuery.data]
  );

  const rentalServices = useMemo(
    () => extractArray(rentalServicesQuery.data, ['services', 'items']).map(normalizeService),
    [rentalServicesQuery.data]
  );

  const activationCountries = useMemo(
    () => extractArray(activationCountriesQuery.data, ['countries', 'items']).map(normalizeCountry),
    [activationCountriesQuery.data]
  );

  const rentalCountries = useMemo(
    () => extractArray(rentalCountriesQuery.data, ['countries', 'items']).map(normalizeCountry),
    [rentalCountriesQuery.data]
  );

  const activationPricing = activationPricingQuery.data;
  const activationPriceNGN = pickNumber(
    activationPricing?.priceNGN,
    activationPricing?.price_ngn,
    activationPricing?.data?.priceNGN,
    activationPricing?.data?.price_ngn
  );
  const activationPriceUSD = pickNumber(
    activationPricing?.price,
    activationPricing?.usdPrice,
    activationPricing?.data?.price,
    activationPricing?.rawPrice,
    activationPricing?.data?.rawPrice
  );

  const activationDisplayPrice =
    activationPriceNGN ??
    (activationPriceUSD !== null && fxRate !== null ? activationPriceUSD * fxRate : null);

  const activationSuccessRate = pickNumber(
    activationPricing?.successRate,
    activationPricing?.success_rate,
    activationPricing?.data?.successRate,
    activationPricing?.data?.success_rate
  );
  const activationSuccessRateBadge = getSuccessRateBadge(activationSuccessRate);

  const rentalOptions = useMemo(
    () => normalizeRentalOptions(rentalPricingQuery.data, fxRate, selectedRentalCountry?.areaCode ?? selectedRentalCountry?.code),
    [rentalPricingQuery.data, fxRate, selectedRentalCountry?.areaCode, selectedRentalCountry?.code]
  );

  const services = mode === 'activation' ? activationServices : rentalServices;
  const countries = mode === 'activation' ? activationCountries : rentalCountries;

  const loadingServices = mode === 'activation'
    ? activationServicesQuery.isLoading
    : rentalServicesQuery.isLoading;
  const servicesError = mode === 'activation'
    ? activationServicesQuery.error
    : rentalServicesQuery.error;

  const loadingCountries = mode === 'activation'
    ? activationCountriesQuery.isLoading
    : rentalCountriesQuery.isLoading;
  const countriesError = mode === 'activation'
    ? activationCountriesQuery.error
    : rentalCountriesQuery.error;

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

  const resetFlow = () => {
    setStep('service');
    setPage(1);
    setSearch('');
    setSelectedActivationService(null);
    setSelectedActivationCountry(null);
    setSelectedRentalService(null);
    setSelectedRentalCountry(null);
    setSelectedRentalOption(null);
  };

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (mode === 'activation') {
        if (!selectedActivationService || !selectedActivationCountry) {
          throw new Error('Select service and country first.');
        }

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
      resetFlow();
      Alert.alert('Success', mode === 'activation' ? 'One-time number purchased.' : 'Rental purchased successfully.');
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const handlePurchase = () => {
    if (mode === 'activation' && (!selectedActivationService || !selectedActivationCountry)) {
      return Alert.alert('Missing selection', 'Please select service and country.');
    }

    if (mode === 'rental' && (!selectedRentalService || !selectedRentalCountry || !selectedRentalOption)) {
      return Alert.alert('Missing selection', 'Please select service, country and duration.');
    }

    purchaseMutation.mutate();
  };

  const stepTitle = () => {
    if (mode === 'activation') {
      if (step === 'service') return '1. Choose Service';
      if (step === 'country') return '2. Choose Country';
      return '3. Confirm Order';
    }

    if (step === 'service') return '1. Choose Rental Service';
    if (step === 'country') return '2. Choose Country/Area';
    return '3. Select Duration & Confirm';
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('country');
      if (mode === 'rental') setSelectedRentalOption(null);
      return;
    }

    if (step === 'country') {
      setStep('service');
      if (mode === 'activation') {
        setSelectedActivationCountry(null);
      } else {
        setSelectedRentalCountry(null);
      }
    }
  };

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
              if (mode === 'activation') activationServicesQuery.refetch();
              else rentalServicesQuery.refetch();
            }}
          >
            <Text style={styles.emptyStateBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          key={`services-${mode}`}
          data={filteredServices}
          keyExtractor={(item) => `svc-${item.id}`}
          numColumns={mode === 'activation' ? 2 : 1}
          columnWrapperStyle={mode === 'activation' ? { gap: 10 } : undefined}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) =>
            mode === 'activation' ? (
              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => {
                  setSelectedActivationService(item);
                  setSearch('');
                  setStep('country');
                }}
              >
                <ServiceLogo logo={item.logo} name={item.name} size="md" />
                <Text style={styles.gridLabel} numberOfLines={2}>{item.name}</Text>
              </TouchableOpacity>
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
          }
          ListEmptyComponent={
            <View style={styles.emptyStateBox}>
              <Icon name="search" size={20} color="#9ca3af" />
              <Text style={styles.emptyStateTitle}>
                {mode === 'activation' ? 'No services found' : 'No rental services found'}
              </Text>
              <Text style={styles.emptyStateText}>
                {mode === 'activation'
                  ? 'Try another page or search term.'
                  : 'Switch reservation type or try another page.'}
              </Text>
            </View>
          }
        />
      )}
    </>
  );

  const selectedService = mode === 'activation' ? selectedActivationService : selectedRentalService;

  const renderCountryStep = () => (
    <>
      {selectedService && (
        <View style={styles.selectedBanner}>
          <View style={styles.selectedBannerInner}>
            <ServiceLogo logo={selectedService.logo} name={selectedService.name} size="sm" />
            <Text style={styles.selectedBannerText}>{selectedService.name}</Text>
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
              if (mode === 'activation') activationCountriesQuery.refetch();
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
              <Text style={styles.flagEmoji}>{item.flag ?? countryFlag(item.shortCode ?? item.code, item.name)}</Text>
              <Text style={styles.gridLabel} numberOfLines={2}>{item.name}</Text>
              {mode === 'rental' && (item.areaCode || item.shortCode) ? (
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

  const renderConfirmStep = () => (
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
            {selectedActivationCountry && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Country</Text>
                <View style={styles.summaryCountryVal}>
                  <Text style={{ fontSize: 16 }}>
                    {selectedActivationCountry.flag ?? countryFlag(selectedActivationCountry.shortCode ?? selectedActivationCountry.code, selectedActivationCountry.name)}
                  </Text>
                  <Text style={styles.summaryVal}>{selectedActivationCountry.name}</Text>
                </View>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Type</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>One-Time Activation</Text>
              </View>
            </View>
            {activationPricingQuery.isLoading ? (
              <ActivityIndicator color="#7C5CFC" style={{ marginVertical: 8 }} />
            ) : (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Success Rate</Text>
                  <View style={[styles.successRateBadge, { backgroundColor: activationSuccessRateBadge.bg }]}>
                    <Text style={[styles.successRateText, { color: activationSuccessRateBadge.text }]}>
                      {activationSuccessRateBadge.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Price</Text>
                  <Text style={[styles.summaryVal, styles.priceHighlight]}>
                    {activationDisplayPrice !== null ? format(activationDisplayPrice) : 'Unavailable'}
                  </Text>
                </View>
              </>
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
                    {selectedRentalCountry.flag ?? countryFlag(selectedRentalCountry.shortCode ?? selectedRentalCountry.code, selectedRentalCountry.name)}
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
                      <Text style={[styles.pricingDuration, active && styles.pricingTextActive]}>{opt.label}</Text>
                      <Text style={[styles.pricingPrice, active && styles.pricingTextActive]}>{format(opt.priceNGN)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {selectedRentalOption && (
              <View style={[styles.summaryRow, { marginTop: 8 }]}>
                <Text style={styles.summaryLabel}>You pay</Text>
                <Text style={[styles.summaryVal, styles.priceHighlight]}>{format(selectedRentalOption.priceNGN)}</Text>
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
        <>
          <View style={styles.ctaMetaRow}>
            <Text style={styles.ctaMetaLabel}>Success Rate</Text>
            <View style={[styles.successRateBadge, { backgroundColor: activationSuccessRateBadge.bg }]}>
              <Text style={[styles.successRateText, { color: activationSuccessRateBadge.text }]}>
                {activationSuccessRateBadge.label}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.findAnotherBtn}
            onPress={() => {
              setSelectedActivationCountry(null);
              setStep('country');
            }}
            disabled={purchaseMutation.isPending}
          >
            <Icon name="refresh" size={14} color="#0ea5e9" />
            <Text style={styles.findAnotherBtnText}>Find another number</Text>
          </TouchableOpacity>
        </>
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
              : `Rent ${selectedRentalService?.name ?? ''} - ${selectedRentalOption?.label ?? 'Select duration'}`}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

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

        <View style={styles.modeToggle}>
          {(['activation', 'rental'] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => {
                setMode(m);
                resetFlow();
              }}
            >
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                {m === 'activation' ? 'One-Time OTP' : 'Long-Term Rental'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: c.text },
    modeToggle: { flexDirection: 'row', backgroundColor: c.toggleBg, borderRadius: 12, padding: 3, marginBottom: 10 },
    modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    modeBtnActive: { backgroundColor: '#7C5CFC' },
    modeBtnText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.textSub },
    modeBtnTextActive: { color: '#fff' },
    reservationToggle: { flexDirection: 'row', backgroundColor: c.toggleBg, borderRadius: 10, padding: 3, marginBottom: 12 },
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
    successRateBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    successRateText: { color: '#166534', fontSize: 12, fontFamily: 'Poppins_700Bold' },
    ctaMetaRow: {
      marginBottom: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 2,
    },
    ctaMetaLabel: { fontSize: 12, color: c.textSub, fontFamily: 'Poppins_500Medium' },
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
    findAnotherBtnText: {
      color: '#0369a1',
      fontSize: 13,
      fontFamily: 'Poppins_600SemiBold',
    },
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
    buyBtn: { backgroundColor: '#7C5CFC', borderRadius: 16, padding: 16, alignItems: 'center' },
    buyBtnDisabled: { opacity: 0.7 },
    buyBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold', maxWidth: '92%' },
  });
}
