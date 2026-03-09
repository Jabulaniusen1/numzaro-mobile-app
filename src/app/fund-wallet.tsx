import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { initWalletFund, verifyPayment } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { Icon } from '@/components/Icon';

const PRESET_AMOUNTS_NGN = [1000, 2500, 5000, 10000, 25000, 50000];

type Step = 'input' | 'webview' | 'verifying' | 'success' | 'failed';

export default function FundWalletScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.userId);

  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [step, setStep] = useState<Step>('input');
  const [amount, setAmount] = useState('');
  const [currency] = useState<'NGN'>('NGN');
  const [loading, setLoading] = useState(false);
  const [paystackUrl, setPaystackUrl] = useState('');
  const [verifiedAmount, setVerifiedAmount] = useState<number | null>(null);

  const parsedAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10) || 0;

  const handlePreset = (val: number) => setAmount(String(val));

  const handleInitiate = async () => {
    if (!parsedAmount || parsedAmount < 100) {
      return Alert.alert('Invalid amount', 'Minimum deposit is ₦100.');
    }
    setLoading(true);
    try {
      const res = await initWalletFund(parsedAmount, currency);
      const url = res.authorization_url ?? res.data?.authorization_url;
      if (!url) throw new Error('No payment URL received from server.');
      setPaystackUrl(url);
      setStep('webview');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewNav = async (navState: any) => {
    const url: string = navState.url ?? '';
    // Paystack redirects to callback URL after payment
    if (
      url.includes('numzaro.com') ||
      url.includes('payment-callback') ||
      url.includes('paystack.com/close') ||
      url.includes('trxref=') ||
      url.includes('reference=')
    ) {
      // Extract reference
      const match = url.match(/(?:reference|trxref)=([^&]+)/);
      const reference = match?.[1];
      if (!reference) return;

      setStep('verifying');
      try {
        const result = await verifyPayment(reference);
        const amt = result.amount ?? result.data?.amount;
        setVerifiedAmount(amt ?? parsedAmount);
        queryClient.invalidateQueries({ queryKey: ['balance', userId] });
        setStep('success');
      } catch (e: any) {
        setStep('failed');
      }
    }
  };

  const parsed = parseInt(amount.replace(/,/g, ''), 10) || 0;

  // ── Verifying ─────────────────────────────────────────────────────────────
  if (step === 'verifying') {
    return (
      <View style={styles.fullCenter}>
        <ActivityIndicator size="large" color="#7C5CFC" />
        <Text style={styles.verifyingText}>Verifying payment…</Text>
      </View>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <SafeAreaView style={styles.resultContainer}>
        <View style={styles.resultContent}>
          <View style={styles.successIconWrap}>
            <Icon name="checkCircle" size={64} color="#22c55e" />
          </View>
          <Text style={styles.resultTitle}>Payment Successful!</Text>
          <Text style={styles.resultSub}>
            {verifiedAmount
              ? `₦${verifiedAmount.toLocaleString()} has been added to your wallet.`
              : 'Your wallet has been funded successfully.'}
          </Text>
          <TouchableOpacity
            style={styles.resultBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.resultBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Failed ─────────────────────────────────────────────────────────────────
  if (step === 'failed') {
    return (
      <SafeAreaView style={styles.resultContainer}>
        <View style={styles.resultContent}>
          <View style={styles.failedIconWrap}>
            <Icon name="xmark" size={64} color="#ef4444" />
          </View>
          <Text style={styles.resultTitle}>Payment Failed</Text>
          <Text style={styles.resultSub}>
            We couldn't verify your payment. If money was deducted, please contact support.
          </Text>
          <TouchableOpacity
            style={[styles.resultBtn, { backgroundColor: '#ef4444' }]}
            onPress={() => setStep('input')}
          >
            <Text style={styles.resultBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resultSecondaryBtn} onPress={() => router.back()}>
            <Text style={styles.resultSecondaryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── WebView ────────────────────────────────────────────────────────────────
  if (step === 'webview') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.webviewHeader}>
          <TouchableOpacity
            style={styles.webviewClose}
            onPress={() => {
              Alert.alert(
                'Cancel Payment',
                'Are you sure you want to cancel this payment?',
                [
                  { text: 'No', style: 'cancel' },
                  { text: 'Yes, Cancel', style: 'destructive', onPress: () => setStep('input') },
                ]
              );
            }}
          >
            <Icon name="xmark" size={18} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.webviewTitle}>Secure Payment</Text>
          <View style={styles.webviewLock}>
            <Icon name="locked" size={14} color="#22c55e" />
          </View>
        </View>
        <WebView
          source={{ uri: paystackUrl }}
          onNavigationStateChange={handleWebViewNav}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color="#7C5CFC" />
            </View>
          )}
        />
      </SafeAreaView>
    );
  }

  // ── Input Screen ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="chevronLeft" size={22} color="#7C5CFC" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Fund Wallet</Text>
              <Text style={styles.headerSub}>Add money via Paystack</Text>
            </View>
            <View style={{ width: 38 }} />
          </View>

          {/* Currency badge */}
          <View style={styles.currencyBadgeRow}>
            <View style={styles.currencyBadge}>
              <Icon name="creditCard" size={14} color="#7C5CFC" />
              <Text style={styles.currencyBadgeText}>NGN — Nigerian Naira</Text>
            </View>
          </View>

          {/* Amount input */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Enter Amount</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.currencySymbol}>₦</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ''))}
                placeholder="0"
                placeholderTextColor="#d1d5db"
                keyboardType="number-pad"
                maxLength={7}
              />
            </View>
            {parsedAmount > 0 && (
              <Text style={styles.amountHint}>
                You will be charged ₦{parsedAmount.toLocaleString()}
              </Text>
            )}
          </View>

          {/* Preset amounts */}
          <Text style={styles.presetLabel}>Quick amounts</Text>
          <View style={styles.presetGrid}>
            {PRESET_AMOUNTS_NGN.map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.presetBtn, amount === String(val) && styles.presetBtnActive]}
                onPress={() => handlePreset(val)}
              >
                <Text style={[styles.presetBtnText, amount === String(val) && styles.presetBtnTextActive]}>
                  ₦{val.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Icon name="locked" size={14} color="#22c55e" />
            <Text style={styles.infoText}>
              Payments are processed securely via Paystack. Your wallet is credited instantly after confirmation.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, (!parsedAmount || loading) && styles.submitBtnDisabled]}
            onPress={handleInitiate}
            disabled={!parsedAmount || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="creditCard" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>
                  Pay ₦{parsedAmount > 0 ? parsedAmount.toLocaleString() : '0'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    scroll: { padding: 16, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: c.text, textAlign: 'center' },
    headerSub: { fontSize: 13, color: c.textSub, textAlign: 'center', marginTop: 2 },
    currencyBadgeRow: { alignItems: 'center', marginBottom: 20 },
    currencyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.accentLight, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
    currencyBadgeText: { fontSize: 13, color: '#7C5CFC', fontFamily: 'Poppins_600SemiBold' },
    amountCard: {
      backgroundColor: c.card, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    amountLabel: { fontSize: 13, color: c.textSub, marginBottom: 12, fontFamily: 'Poppins_500Medium' },
    amountInputRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    currencySymbol: { fontSize: 32, fontFamily: 'Poppins_700Bold', color: c.text },
    amountInput: { fontSize: 48, fontFamily: 'Poppins_800ExtraBold', color: c.text, minWidth: 80, textAlign: 'center' },
    amountHint: { fontSize: 12, color: c.textMuted, marginTop: 8 },
    presetLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.text, marginBottom: 10 },
    presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    presetBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: c.card, borderWidth: 1.5, borderColor: c.border },
    presetBtnActive: { backgroundColor: '#7C5CFC', borderColor: '#7C5CFC' },
    presetBtnText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: c.text },
    presetBtnTextActive: { color: '#fff' },
    infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: '#bbf7d0' },
    infoText: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 18 },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#7C5CFC', borderRadius: 16, padding: 18 },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: '#fff', fontSize: 17, fontFamily: 'Poppins_700Bold' },
    webviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card },
    webviewClose: { padding: 6, borderRadius: 8, backgroundColor: c.cardAlt },
    webviewTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: c.text },
    webviewLock: { padding: 6 },
    webviewLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: c.card },
    fullCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, backgroundColor: c.bg },
    verifyingText: { fontSize: 15, color: c.textSub, fontFamily: 'Poppins_500Medium' },
    resultContainer: { flex: 1, backgroundColor: c.bg },
    resultContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    successIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    failedIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    resultTitle: { fontSize: 24, fontFamily: 'Poppins_800ExtraBold', color: c.text, marginBottom: 10 },
    resultSub: { fontSize: 15, color: c.textSub, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
    resultBtn: { backgroundColor: '#7C5CFC', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center', width: '100%' },
    resultBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },
    resultSecondaryBtn: { marginTop: 12, padding: 10 },
    resultSecondaryBtnText: { color: c.textSub, fontSize: 14 },
  });
}
