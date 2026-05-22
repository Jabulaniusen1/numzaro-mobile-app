import { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Icon } from '@/components/Icon';
import Toast from 'react-native-toast-message';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();

  const [ready, setReady] = useState(false);
  const [exchangeError, setExchangeError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  useEffect(() => {
    const code = params.code;
    if (!code) {
      setExchangeError('Invalid or expired reset link. Please request a new one.');
      setReady(true);
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setExchangeError('Invalid or expired reset link. Please request a new one.');
      setReady(true);
    });
  }, []);

  const handleUpdate = async () => {
    if (!password || !confirm) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError(updateError.message); setLoading(false); return; }

    // Sign out so the recovery session doesn't auto-login to the app
    await supabase.auth.signOut();
    setLoading(false);
    setDone(true);
    Toast.show({ type: 'success', text1: 'Password updated!', text2: 'You can now sign in with your new password.' });
  };

  if (!ready) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color="#7C5CFC" />
      </View>
    );
  }

  if (exchangeError) {
    return (
      <View style={[styles.root, styles.centered]}>
        <View style={styles.iconCircle}>
          <Icon name="xmark" size={28} color="#dc2626" />
        </View>
        <Text style={styles.doneHeading}>Link invalid</Text>
        <Text style={styles.doneBody}>{exchangeError}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/auth/forgot-password')} activeOpacity={0.82}>
          <Text style={styles.btnText}>Request new link</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (done) {
    return (
      <View style={[styles.root, styles.centered]}>
        <View style={styles.iconCircle}>
          <Icon name="checkCircle" size={32} color="#7C5CFC" />
        </View>
        <Text style={styles.doneHeading}>Password updated</Text>
        <Text style={styles.doneBody}>You can now sign in with your new password.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/auth/login')} activeOpacity={0.82}>
          <Text style={styles.btnText}>Go to Sign In</Text>
        </TouchableOpacity>
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
        <View style={styles.card}>
          <Text style={styles.heading}>Set new password</Text>
          <Text style={styles.subheading}>Choose a strong password for your account.</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="info" size={14} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>New Password</Text>
          <View style={[styles.inputRow, passFocused && styles.inputFocused]}>
            <Icon name="locked" size={15} color={passFocused ? '#7C5CFC' : '#9ca3af'} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 6 characters"
              placeholderTextColor="#c4c4c4"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              onFocus={() => setPassFocused(true)}
              onBlur={() => setPassFocused(false)}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name={showPassword ? 'unlocked' : 'eye'} size={15} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm Password</Text>
          <View style={[styles.inputRow, confirmFocused && styles.inputFocused]}>
            <Icon name="locked" size={15} color={confirmFocused ? '#7C5CFC' : '#9ca3af'} />
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Re-enter your password"
              placeholderTextColor="#c4c4c4"
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
            />
            <TouchableOpacity onPress={() => setShowConfirm(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name={showConfirm ? 'unlocked' : 'eye'} size={15} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleUpdate}
            disabled={loading}
            activeOpacity={0.82}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Update password</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f4ff' },
  centered: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, gap: 12 },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 100,
    paddingBottom: 40,
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
    width: '100%',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.3,
  },

  // ── Done / error states ─────────────────────────────────────────────────────
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
  doneHeading: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
    textAlign: 'center',
  },
  doneBody: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
});
