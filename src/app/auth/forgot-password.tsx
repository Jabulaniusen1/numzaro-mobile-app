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
import { Link, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { Icon } from '@/components/Icon';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  const handleSubmit = async () => {
    if (!email) { setError('Please enter your email.'); return; }
    setLoading(true);
    setError('');

    const redirectTo = Linking.createURL('auth/reset-password');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <View style={styles.root}>
        <View style={styles.centeredWrap}>
          <View style={styles.iconCircle}>
            <Icon name="envelope" size={32} color="#7C5CFC" />
          </View>
          <Text style={styles.sentHeading}>Check your email</Text>
          <Text style={styles.sentBody}>
            We sent a password reset link to{'\n'}
            <Text style={styles.sentEmail}>{email}</Text>
          </Text>
          <Text style={styles.sentHint}>
            Didn't receive it?{' '}
            <Text style={styles.retryLink} onPress={() => setSent(false)}>Try again</Text>
          </Text>
          <Link href="/auth/login" style={styles.backLink}>Back to Sign In</Link>
        </View>
      </View>
    );
  }

  return (
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
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrowLeft" size={16} color="#7C5CFC" />
            <Text style={styles.backRowText}>Back to Sign In</Text>
          </TouchableOpacity>

          <Text style={styles.heading}>Forgot password?</Text>
          <Text style={styles.subheading}>Enter your email and we'll send you a reset link.</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="info" size={14} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

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

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.82}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Send reset link</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f4ff' },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 80,
    paddingBottom: 40,
  },

  logoBlock: { alignItems: 'center', gap: 6, marginBottom: 36 },
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

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  backRowText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#7C5CFC',
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

  // ── Sent state ──────────────────────────────────────────────────────────────
  centeredWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0eeff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sentHeading: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
  },
  sentBody: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  sentEmail: {
    color: '#7C5CFC',
    fontFamily: 'Poppins_600SemiBold',
  },
  sentHint: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#9ca3af',
    textAlign: 'center',
  },
  retryLink: {
    color: '#7C5CFC',
    fontFamily: 'Poppins_600SemiBold',
  },
  backLink: {
    color: '#7C5CFC',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 8,
  },
});
