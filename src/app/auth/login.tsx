import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
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

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      Toast.show({ type: 'success', text1: 'Welcome back!', text2: 'You have signed in successfully.' });
      router.replace('/(tabs)');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo / Branding */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>N</Text>
          </View>
          <Text style={styles.brandName}>Numzaro</Text>
        </View>

        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.subheading}>Sign in to your account</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eyeBtn}
            >
              <Icon name={showPassword ? 'unlocked' : 'eye'} size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/auth/signup" style={styles.footerLink}>
            Sign up
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2FA' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#7C5CFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  brandName: { fontSize: 22, fontWeight: '700', color: '#111827' },
  heading: { fontSize: 26, fontWeight: '700', color: '#111827', textAlign: 'center' },
  subheading: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: 24 },
  errorBox: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { color: '#b91c1c', fontSize: 13 },
  form: {},
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  passwordWrap: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  passwordInput: { flex: 1, padding: 14, fontSize: 15, color: '#111827' },
  eyeBtn: { padding: 14 },
  submitBtn: {
    backgroundColor: '#7C5CFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#6b7280', fontSize: 14 },
  footerLink: { color: '#7C5CFC', fontSize: 14, fontWeight: '600' },
});
