import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Modal,
  FlatList,
  SafeAreaView,
  Linking,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Icon } from '@/components/Icon';

const TERMS_URL = 'https://numzaro.com/terms';
const PRIVACY_URL = 'https://numzaro.com/privacy';

const COUNTRIES = [
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'CA', name: 'Canada', dial: '+1' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'NG', name: 'Nigeria', dial: '+234' },
  { code: 'GH', name: 'Ghana', dial: '+233' },
  { code: 'KE', name: 'Kenya', dial: '+254' },
  { code: 'ZA', name: 'South Africa', dial: '+27' },
  { code: 'AE', name: 'UAE', dial: '+971' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { code: 'IN', name: 'India', dial: '+91' },
  { code: 'PK', name: 'Pakistan', dial: '+92' },
  { code: 'BD', name: 'Bangladesh', dial: '+880' },
  { code: 'TR', name: 'Turkey', dial: '+90' },
  { code: 'DE', name: 'Germany', dial: '+49' },
  { code: 'FR', name: 'France', dial: '+33' },
  { code: 'IT', name: 'Italy', dial: '+39' },
  { code: 'ES', name: 'Spain', dial: '+34' },
  { code: 'NL', name: 'Netherlands', dial: '+31' },
  { code: 'PT', name: 'Portugal', dial: '+351' },
  { code: 'BE', name: 'Belgium', dial: '+32' },
  { code: 'SE', name: 'Sweden', dial: '+46' },
  { code: 'NO', name: 'Norway', dial: '+47' },
  { code: 'DK', name: 'Denmark', dial: '+45' },
  { code: 'IE', name: 'Ireland', dial: '+353' },
  { code: 'CH', name: 'Switzerland', dial: '+41' },
  { code: 'AT', name: 'Austria', dial: '+43' },
  { code: 'PL', name: 'Poland', dial: '+48' },
  { code: 'RU', name: 'Russia', dial: '+7' },
  { code: 'UA', name: 'Ukraine', dial: '+380' },
  { code: 'BR', name: 'Brazil', dial: '+55' },
  { code: 'MX', name: 'Mexico', dial: '+52' },
  { code: 'AR', name: 'Argentina', dial: '+54' },
  { code: 'CO', name: 'Colombia', dial: '+57' },
  { code: 'CL', name: 'Chile', dial: '+56' },
  { code: 'PE', name: 'Peru', dial: '+51' },
  { code: 'AU', name: 'Australia', dial: '+61' },
  { code: 'NZ', name: 'New Zealand', dial: '+64' },
  { code: 'SG', name: 'Singapore', dial: '+65' },
  { code: 'MY', name: 'Malaysia', dial: '+60' },
  { code: 'TH', name: 'Thailand', dial: '+66' },
  { code: 'VN', name: 'Vietnam', dial: '+84' },
  { code: 'ID', name: 'Indonesia', dial: '+62' },
  { code: 'PH', name: 'Philippines', dial: '+63' },
  { code: 'JP', name: 'Japan', dial: '+81' },
  { code: 'KR', name: 'South Korea', dial: '+82' },
  { code: 'CN', name: 'China', dial: '+86' },
];

export default function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('NG');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const selectedCountry = COUNTRIES.find(c => c.code === countryCode)!;

  const filteredCountries = useMemo(() => {
    const q = countrySearch.toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) || c.dial.includes(q)
    );
  }, [countrySearch]);

  const handleSignup = async () => {
    if (!fullName || !email || !phoneNumber || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    const sanitizedPhone = phoneNumber.replace(/[^\d]/g, '');
    if (sanitizedPhone.length < 6) {
      setError('Please enter a valid phone number.');
      return;
    }
    const phoneE164 = `${selectedCountry.dial}${sanitizedPhone}`;

    setLoading(true);
    setError('');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          country_code: selectedCountry.code,
          country_name: selectedCountry.name,
          phone_country_code: selectedCountry.dial,
          phone_number: sanitizedPhone,
          phone_e164: phoneE164,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
        country_code: selectedCountry.code,
        country_name: selectedCountry.name,
        phone_country_code: selectedCountry.dial,
        phone_number: sanitizedPhone,
        phone_e164: phoneE164,
      });
    }

    setLoading(false);
    router.replace('/auth/login');
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoBlock}>
            <Image
              source={require('@/assets/images/logos/logo c&b.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Your all-in-one digital toolkit</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>Create account</Text>
            <Text style={styles.subheading}>Get started for free</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Icon name="info" size={14} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Full Name */}
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputRow, nameFocused && styles.inputFocused]}>
              <Icon name="user" size={15} color={nameFocused ? '#7C5CFC' : '#9ca3af'} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="John Doe"
                placeholderTextColor="#c4c4c4"
                autoCorrect={false}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </View>

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputRow, emailFocused && styles.inputFocused]}>
              <Icon name="envelope" size={15} color={emailFocused ? '#7C5CFC' : '#9ca3af'} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#c4c4c4"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            {/* Country */}
            <Text style={styles.label}>Country</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => { setCountrySearch(''); setCountryModalOpen(true); }}
              activeOpacity={0.7}
            >
              <Icon name="globe" size={15} color="#9ca3af" />
              <Text style={styles.countryText}>
                {selectedCountry.name} ({selectedCountry.dial})
              </Text>
              <Icon name="chevronDown" size={13} color="#9ca3af" />
            </TouchableOpacity>

            {/* Phone Number */}
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.phoneRow}>
              <View style={styles.dialBox}>
                <Text style={styles.dialText}>{selectedCountry.dial}</Text>
              </View>
              <View style={[styles.inputRow, styles.phoneInput, phoneFocused && styles.inputFocused]}>
                <TextInput
                  style={styles.input}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="8012345678"
                  placeholderTextColor="#c4c4c4"
                  keyboardType="phone-pad"
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                />
              </View>
            </View>

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputRow, passFocused && styles.inputFocused]}>
              <Icon name="locked" size={15} color={passFocused ? '#7C5CFC' : '#9ca3af'} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Create a strong password"
                placeholderTextColor="#c4c4c4"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name={showPassword ? 'unlocked' : 'eye'} size={15} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.82}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Create Account</Text>
              }
            </TouchableOpacity>

            <Text style={styles.terms}>
              By signing up you agree to our{' '}
              <Text style={styles.termsLink} onPress={() => Linking.openURL(TERMS_URL)}>Terms</Text>
              {' '}and{' '}
              <Text style={styles.termsLink} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/auth/login" style={styles.footerLink}>Sign in</Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country picker modal */}
      <Modal
        visible={countryModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCountryModalOpen(false)}
      >
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TouchableOpacity onPress={() => setCountryModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="xmark" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Icon name="search" size={15} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              value={countrySearch}
              onChangeText={setCountrySearch}
              placeholder="Search country or code..."
              placeholderTextColor="#c4c4c4"
              autoCorrect={false}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredCountries}
            keyExtractor={item => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.countryItem, item.code === countryCode && styles.countryItemActive]}
                onPress={() => { setCountryCode(item.code); setCountryModalOpen(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.countryItemName, item.code === countryCode && styles.countryItemNameActive]}>
                  {item.name}
                </Text>
                <Text style={styles.countryItemDial}>{item.dial}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f4ff' },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 72,
    paddingBottom: 40,
  },

  logoBlock: { alignItems: 'center', gap: 6, marginBottom: 32 },
  logoImage: { width: 160, height: 52 },
  tagline: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#9ca3af',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 28,
    shadowColor: '#7C5CFC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },

  heading: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
    marginBottom: 2,
  },
  subheading: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#9ca3af',
    marginBottom: 20,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },

  label: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#374151',
    marginTop: 14,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputFocused: {
    borderColor: '#7C5CFC',
    backgroundColor: '#f5f4ff',
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#111827',
    padding: 0,
  },

  countryText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#111827',
  },

  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dialBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 13,
    justifyContent: 'center',
    minWidth: 62,
    alignItems: 'center',
  },
  dialText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#111827',
  },
  phoneInput: {
    flex: 1,
  },

  btn: {
    marginTop: 24,
    backgroundColor: '#7C5CFC',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#7C5CFC',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.3,
  },

  terms: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#9ca3af',
  },
  termsLink: {
    color: '#7C5CFC',
    fontFamily: 'Poppins_600SemiBold',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
  },
  footerLink: {
    color: '#7C5CFC',
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },

  // ── Country modal ───────────────────────────────────────────────────────────
  modalRoot: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#111827',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#111827',
    padding: 0,
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  countryItemActive: {
    backgroundColor: '#f5f4ff',
  },
  countryItemName: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#111827',
  },
  countryItemNameActive: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#7C5CFC',
  },
  countryItemDial: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#9ca3af',
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 20,
  },
});
