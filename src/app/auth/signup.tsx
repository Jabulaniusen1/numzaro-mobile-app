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
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Icon } from '@/components/Icon';
import Toast from 'react-native-toast-message';

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const handleSignup = async () => {
    if (!fullName || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError('');

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('users').insert({ id: user.id, email: user.email, full_name: fullName });
    }

    setLoading(false);
    setSuccess(true);
    Toast.show({ type: 'success', text1: 'Account created!', text2: 'Check your email to confirm your account.' });
  };

  // ── Success screen ───────────────────────────────────────────────────────────
  if (success) {
    return (
      <View style={styles.root}>
        <View style={[styles.orb, { width: 340, height: 340, top: -120, left: -100, backgroundColor: '#4c1d95', opacity: 0.5 }]} />
        <View style={[styles.orb, { width: 200, height: 200, bottom: 60, right: -40, backgroundColor: '#6d28d9', opacity: 0.25 }]} />
        <View style={styles.successWrap}>
          <BlurView intensity={30} tint="dark" style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Icon name="envelope" size={34} color="#c4b5fd" />
            </View>
            <Text style={styles.successHeading}>Check your email</Text>
            <Text style={styles.successBody}>
              We sent a confirmation link to{'\n'}
              <Text style={styles.successEmail}>{email}</Text>
            </Text>
            <Text style={styles.successHint}>Click it to activate your account.</Text>
            <Link href="/auth/login" style={styles.backLink}>Back to Sign In</Link>
          </BlurView>
        </View>
      </View>
    );
  }

  // ── Sign-up form ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Background orbs */}
      <View style={[styles.orb, { width: 340, height: 340, top: -120, left: -100, backgroundColor: '#4c1d95', opacity: 0.5 }]} />
      <View style={[styles.orb, { width: 240, height: 240, top: 200, right: -80, backgroundColor: '#6d28d9', opacity: 0.22 }]} />
      <View style={[styles.orb, { width: 180, height: 180, bottom: 40, left: -30, backgroundColor: '#3b0764', opacity: 0.35 }]} />

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
              source={require('@/assets/images/logos/icon white.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.brandName}>Numzaro</Text>
            <Text style={styles.brandTagline}>Your all-in-one digital toolkit</Text>
          </View>

          {/* Form card — anchored to bottom */}
          <View style={styles.formBlock}>
            <BlurView intensity={30} tint="dark" style={styles.card}>
              <Text style={styles.heading}>Create account</Text>
              <Text style={styles.subheading}>Get started for free</Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Icon name="info" size={14} color="#fca5a5" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Full Name */}
              <Text style={styles.fieldLabel}>Full Name</Text>
              <View style={[styles.inputRow, nameFocused && styles.inputRowFocused]}>
                <Icon name="user" size={16} color={nameFocused ? '#c4b5fd' : 'rgba(255,255,255,0.35)'} />
                <TextInput
                  style={styles.inputText}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="John Doe"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  autoCorrect={false}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                />
              </View>

              {/* Email */}
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

              {/* Password */}
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={[styles.inputRow, passFocused && styles.inputRowFocused]}>
                <Icon name="locked" size={16} color={passFocused ? '#c4b5fd' : 'rgba(255,255,255,0.35)'} />
                <TextInput
                  style={styles.inputText}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 6 characters"
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
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.82}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>Create Account</Text>
                }
              </TouchableOpacity>
            </BlurView>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/auth/login" style={styles.footerLink}>Sign in</Link>
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
    paddingTop: 64,
    paddingBottom: 40,
  },

  // ── Logo block ──────────────────────────────────────────────────
  logoBlock: { alignItems: 'center', gap: 6 },
  logoImage: { width: 64, height: 64 },
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
  formBlock: { gap: 16, marginTop: 28 },

  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
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

  // ── Success state ───────────────────────────────────────────────
  successWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  successCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 28,
    paddingVertical: 36,
    alignItems: 'center',
    gap: 10,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(196,181,253,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  successHeading: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
  },
  successBody: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
  },
  successEmail: {
    color: '#c4b5fd',
    fontFamily: 'Poppins_600SemiBold',
  },
  successHint: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginBottom: 8,
  },
  backLink: {
    color: '#c4b5fd',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 8,
  },
});
