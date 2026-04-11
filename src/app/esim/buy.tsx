import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { fetchEsimCountries } from '@/lib/api';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { Icon } from '@/components/Icon';

export default function BuyEsimScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [countrySearch, setCountrySearch] = useState('');

  const countriesQuery = useQuery({
    queryKey: ['esim-countries'],
    queryFn: fetchEsimCountries,
  });

  const countries = useMemo(() => countriesQuery.data?.countries ?? [], [countriesQuery.data?.countries]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return countries;
    const q = countrySearch.toLowerCase();
    return countries.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [countries, countrySearch]);

  const onSelectCountry = (code: string, name: string, flag?: string) => {
    router.push({
      pathname: '/esim/plans',
      params: { countryCode: code, countryName: name, countryFlag: flag ?? '' },
    } as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={22} color="#7C5CFC" />
        </TouchableOpacity>
        <Text style={styles.title}>Select Country</Text>
        <TouchableOpacity onPress={() => router.push('/esim/my' as any)} style={styles.topBtn}>
          <Text style={styles.topBtnText}>My eSIMs</Text>
        </TouchableOpacity>
      </View>

      {/* Sticky search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <Icon name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search country..."
            placeholderTextColor={colors.textMuted}
            value={countrySearch}
            onChangeText={setCountrySearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {countrySearch.length > 0 && (
            <TouchableOpacity onPress={() => setCountrySearch('')}>
              <Icon name="xmark" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {countriesQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C5CFC" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={countriesQuery.isRefetching}
              onRefresh={() => countriesQuery.refetch()}
              tintColor="#7C5CFC"
            />
          }
        >
          {filteredCountries.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Icon name="globe" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>No countries found for "{countrySearch}"</Text>
            </View>
          ) : (
            <View style={styles.countryGrid}>
              {filteredCountries.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={styles.countryChip}
                  onPress={() => onSelectCountry(country.code, country.name, country.flag)}
                  activeOpacity={0.7}
                >
                  {country.flag ? (
                    <Text style={styles.countryFlag}>{country.flag}</Text>
                  ) : (
                    <View style={styles.flagPlaceholder}>
                      <Icon name="globe" size={16} color={colors.textMuted} />
                    </View>
                  )}
                  <Text style={styles.countryName} numberOfLines={1}>{country.name}</Text>
                  <Text style={styles.countryPrice}>
                    from ${country.startingChargedUsd ?? country.startingPriceUsd ?? '-'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
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
    title: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: c.text },
    topBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    topBtnText: { color: '#7C5CFC', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Search bar (outside ScrollView so it stays put)
    searchWrap: {
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: c.text,
      fontFamily: 'Poppins_400Regular',
      padding: 0,
    },

    content: { padding: 16, paddingTop: 4, paddingBottom: 32 },

    // Country grid — 3 columns
    countryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    countryChip: {
      width: '31%',
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
      gap: 4,
    },
    countryFlag: { fontSize: 26 },
    flagPlaceholder: {
      width: 32,
      height: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countryName: {
      color: c.text,
      fontSize: 11,
      fontFamily: 'Poppins_600SemiBold',
      textAlign: 'center',
    },
    countryPrice: {
      color: '#7C5CFC',
      fontSize: 10,
      fontFamily: 'Poppins_500Medium',
      textAlign: 'center',
    },

    // Empty
    emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyText: { color: c.textSub, fontSize: 14, fontFamily: 'Poppins_500Medium' },
  });
}
