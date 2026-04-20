import { useState } from 'react';
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
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Link, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Icon } from '@/components/Icon';
import Toast from 'react-native-toast-message';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
    } else {
      Toast.show({ type: 'success', text1: 'Welcome back!', text2: 'You have signed in successfully.' });
      router.replace('/(tabs)');
    }
    setLoading(false);
  };

  return (
    <View style={styles.root}>
      {/* Background orbs */}
      <View style={[styles.orb, { width: 340, height: 340, top: -120, left: -100, backgroundColor: '#4c1d95', opacity: 0.5 }]} />
      <View style={[styles.orb, { width: 240, height: 240, top: 160, right: -80, backgroundColor: '#6d28d9', opacity: 0.25 }]} />
      <View style={[styles.orb, { width: 200, height: 200, bottom: 40, left: -40, backgroundColor: '#3b0764', opacity: 0.4 }]} />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo — stays at top */}
          <View style={styles.logoBlock}>
            <Image
              source={require('@/assets/images/logos/logo w&c.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.brandTagline}>Your all-in-one digital toolkit</Text>
          </View>

          {/* Form card — anchored to bottom */}
          <View style={styles.formBlock}>
            <BlurView intensity={30} tint="dark" style={styles.card}>
              <Text style={styles.heading}>Welcome back</Text>
              <Text style={styles.subheading}>Sign in to continue</Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Icon name="info" size={14} color="#fca5a5" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Email field */}
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={[styles.inputRow, emailFocused && styles.inputRowFocused]}>
                <Icon name="envelope" size={16} color={emailFocused ? '#c4b5fd' : 'rgba(255,255,255,0.35)'} />
                <TextInput
                  style={styles.inputText}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>

              {/* Password field */}
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={[styles.inputRow, passFocused && styles.inputRowFocused]}>
                <Icon name="locked" size={16} color={passFocused ? '#c4b5fd' : 'rgba(255,255,255,0.35)'} />
                <TextInput
                  style={styles.inputText}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(v => !v)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name={showPassword ? 'unlocked' : 'eye'} size={16} color="rgba(255,255,255,0.35)" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.82}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>Sign In</Text>
                }
              </TouchableOpacity>
            </BlurView>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/auth/signup" style={styles.footerLink}>Create one</Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0524' },
  kav: { flex: 1 },
  orb: { position: 'absolute', borderRadius: 999 },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 72,
    paddingBottom: 40,
  },

  // ── Logo block ──────────────────────────────────────────────────
  logoBlock: { alignItems: 'center', gap: 6 },
  logoImage: { width: 180, height: 60 },
  brandName: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
    letterSpacing: 0.4,
  },
  brandTagline: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.2,
  },

  // ── Form block ──────────────────────────────────────────────────
  formBlock: { gap: 16, marginTop: 32 },

  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 4,
  },

  heading: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
    marginBottom: 2,
  },
  subheading: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 18,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.28)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },

  // Fields
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: 'rgba(255,255,255,0.55)',
    marginTop: 14,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputRowFocused: {
    borderColor: '#8b5cf6',
    backgroundColor: 'rgba(139,92,246,0.12)',
  },
  inputText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#fff',
    padding: 0,
  },

  // Button
  submitBtn: {
    marginTop: 22,
    backgroundColor: '#7C5CFC',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#7C5CFC',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.4,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
  },
  footerLink: {
    color: '#c4b5fd',
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
});
