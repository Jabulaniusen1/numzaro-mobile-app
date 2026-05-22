import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { Icon } from '@/components/Icon';

const SUPPORT_EMAIL = 'support@numzaro.com';
const isWeb = Platform.OS === 'web';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const userId = useAppStore((s) => s.userId);
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [guestEmail, setGuestEmail] = useState('');
  const [guestEmailFocused, setGuestEmailFocused] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', userId!)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  const accountEmail = profile?.email ?? guestEmail;
  const accountName = profile?.full_name ?? '';

  const handleSendEmail = () => {
    if (isWeb && !accountEmail) {
      Alert.alert('Email required', 'Please enter your account email address.');
      return;
    }

    const subject = encodeURIComponent('Account Deletion Request');
    const body = encodeURIComponent(
      `Hello Numzaro Support,\n\nI would like to permanently delete my account.\n\nAccount details:\n- Full Name: ${accountName}\n- Email: ${accountEmail}\n\nI understand that this action is irreversible and all my data will be permanently deleted.\n\nThank you.`
    );
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    Linking.canOpenURL(mailto).then((supported) => {
      if (supported) {
        Linking.openURL(mailto);
      } else {
        Alert.alert(
          'No email app found',
          `Please send an email manually to ${SUPPORT_EMAIL} with the subject "Account Deletion Request".`
        );
      }
    });
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        {!isWeb && (
          <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="arrowLeft" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
        {isWeb && (
          <TouchableOpacity onPress={handleBack} style={styles.webBackBtn}>
            <Icon name="arrowLeft" size={16} color="#7C5CFC" />
            <Text style={styles.webBackText}>Back</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, isWeb && styles.headerTitleWeb]}>Delete Account</Text>
        <View style={{ width: isWeb ? 60 : 20 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          {/* Warning icon */}
          <View style={styles.iconWrap}>
            <Icon name="trash" size={36} color="#dc2626" />
          </View>

          <Text style={styles.title}>Delete your account</Text>
          <Text style={styles.subtitle}>
            This action is permanent and cannot be undone.
          </Text>

          {/* Guest email input (web only, unauthenticated) */}
          {isWeb && !profile && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your account email</Text>
              <Text style={styles.stepText}>Enter the email address associated with your Numzaro account.</Text>
              <View style={[styles.inputRow, guestEmailFocused && styles.inputFocused]}>
                <Icon name="envelope" size={15} color={guestEmailFocused ? '#7C5CFC' : '#9ca3af'} />
                <TextInput
                  style={styles.input}
                  value={guestEmail}
                  onChangeText={setGuestEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#c4c4c4"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setGuestEmailFocused(true)}
                  onBlur={() => setGuestEmailFocused(false)}
                />
              </View>
            </View>
          )}

          {/* What gets deleted */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What will be deleted</Text>
            {[
              'Your profile and personal information',
              'Your wallet balance and transaction history',
              'All purchased numbers and eSIMs',
              'Your order history and preferences',
            ].map((item) => (
              <View key={item} style={styles.bulletRow}>
                <Icon name="xmark" size={12} color="#dc2626" />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* How it works */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>How to delete your account</Text>
            <Text style={styles.stepText}>
              Send an email to our support team using the button below. We will process your request within{' '}
              <Text style={styles.bold}>7 business days</Text> and confirm once your account has been permanently deleted.
            </Text>
            <View style={styles.emailRow}>
              <Icon name="envelope" size={14} color="#7C5CFC" />
              <Text style={styles.emailText}>{SUPPORT_EMAIL}</Text>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity style={styles.deleteBtn} onPress={handleSendEmail} activeOpacity={0.82}>
            <Icon name="envelope" size={18} color="#fff" />
            <Text style={styles.deleteBtnText}>Send Deletion Request</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleBack} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel, keep my account</Text>
          </TouchableOpacity>

          {isWeb && (
            <Text style={styles.webFooter}>
              © {new Date().getFullYear()} Numzaro. All rights reserved.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: isWeb ? '#f5f4ff' : c.bg },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: isWeb ? '#e5e7eb' : c.border,
      backgroundColor: isWeb ? '#ffffff' : c.bg,
      ...(isWeb && {
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      } as any),
    },
    headerTitle: {
      fontSize: 16,
      fontFamily: 'Poppins_600SemiBold',
      color: isWeb ? '#111827' : c.text,
    },
    headerTitleWeb: {
      fontSize: 18,
    },
    webBackBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      width: 60,
    },
    webBackText: {
      fontSize: 14,
      fontFamily: 'Poppins_500Medium',
      color: '#7C5CFC',
    },

    scroll: {
      flexGrow: 1,
      alignItems: 'center',
      paddingVertical: isWeb ? 48 : 0,
      paddingHorizontal: isWeb ? 16 : 0,
      backgroundColor: isWeb ? '#f5f4ff' : c.bg,
    },

    inner: {
      width: '100%',
      maxWidth: isWeb ? 560 : undefined,
      paddingHorizontal: 20,
      paddingTop: 32,
      paddingBottom: 48,
      alignItems: 'center',
    },

    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#fee2e2',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },

    title: {
      fontSize: isWeb ? 28 : 22,
      fontFamily: 'Poppins_700Bold',
      color: isWeb ? '#111827' : c.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      fontFamily: 'Poppins_400Regular',
      color: isWeb ? '#6b7280' : c.textSub,
      textAlign: 'center',
      marginBottom: 28,
    },

    card: {
      width: '100%',
      backgroundColor: '#ffffff',
      borderRadius: 16,
      padding: 18,
      marginBottom: 16,
      ...(isWeb
        ? ({ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' } as any)
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }),
    },
    cardTitle: {
      fontSize: 13,
      fontFamily: 'Poppins_600SemiBold',
      color: '#111827',
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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
      marginTop: 4,
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

    bulletRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
    },
    bulletText: {
      fontSize: 13,
      fontFamily: 'Poppins_400Regular',
      color: '#6b7280',
      flex: 1,
    },

    stepText: {
      fontSize: 13,
      fontFamily: 'Poppins_400Regular',
      color: '#6b7280',
      lineHeight: 20,
      marginBottom: 12,
    },
    bold: {
      fontFamily: 'Poppins_600SemiBold',
      color: '#111827',
    },
    emailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#f5f4ff',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    emailText: {
      fontSize: 13,
      fontFamily: 'Poppins_600SemiBold',
      color: '#7C5CFC',
    },

    deleteBtn: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: '#dc2626',
      borderRadius: 14,
      paddingVertical: 15,
      marginTop: 8,
      marginBottom: 16,
      ...(isWeb
        ? ({ boxShadow: '0 4px 14px rgba(220,38,38,0.3)', cursor: 'pointer' } as any)
        : {
            shadowColor: '#dc2626',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }),
    },
    deleteBtnText: {
      color: '#fff',
      fontSize: 15,
      fontFamily: 'Poppins_700Bold',
    },

    cancelText: {
      fontSize: 14,
      fontFamily: 'Poppins_500Medium',
      color: '#9ca3af',
      textDecorationLine: 'underline',
    },

    webFooter: {
      marginTop: 40,
      fontSize: 12,
      fontFamily: 'Poppins_400Regular',
      color: '#9ca3af',
      textAlign: 'center',
    },
  });
}
