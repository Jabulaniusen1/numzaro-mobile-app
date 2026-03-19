import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/hooks/useTheme';
import { useCurrency } from '@/hooks/useCurrency';
import { ThemeColors } from '@/lib/theme';
import { StatusBadge } from './StatusBadge';
import { CountdownTimer } from './CountdownTimer';
import { Icon } from './Icon';

interface VirtualNumber {
  id: string;
  phone_number: string;
  product: string;
  product_code?: string;
  country_name: string;
  country_code: string;
  monthly_cost: number;
  number_type?: string; // 'activation' | 'rental'
  status: string;
  expires_at: string | null;
  otp_code?: string | null;
  pending_otp_count?: number;
  message_count?: number;
}

interface Props {
  number: VirtualNumber;
  onAction: (id: string, action: string) => void;
  actionLoading?: string | null;
  isProminent?: boolean;
  onViewMessages?: () => void;
  onViewOtps?: () => void;
  onGetAnother?: () => void;
  getAnotherLoading?: boolean;
}

export function NumberCard({
  number,
  onAction,
  actionLoading,
  isProminent = false,
  onViewMessages,
  onViewOtps,
  onGetAnother,
  getAnotherLoading = false,
}: Props) {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const styles = makeStyles(colors);

  const copyPhone = async () => {
    await Clipboard.setStringAsync(number.phone_number);
  };

  const copyOtp = async () => {
    if (number.otp_code) await Clipboard.setStringAsync(number.otp_code);
  };

  if (!isProminent) {
    return (
      <View style={styles.rowCard}>
        <View style={styles.rowLeft}>
          <Text style={styles.rowDate}>
            {new Date(number.expires_at ?? '').toLocaleDateString()}
          </Text>
          <Text style={styles.rowProduct}>{number.product}</Text>
          <View style={styles.rowCountryRow}>
            <Icon name="placeholder" size={12} color={colors.textSub} />
            <Text style={styles.rowCountry}>{number.country_name}</Text>
          </View>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.rowPhone} numberOfLines={1}>{number.phone_number}</Text>
          {number.otp_code ? <Text style={styles.rowOtp}>{number.otp_code}</Text> : null}
          <StatusBadge status={number.status} />
        </View>
      </View>
    );
  }

  const isRental = number.number_type === 'rental';
  const activationActions = ['finish', 'ban', 'cancel', 'sync'] as const;
  const rentalActions = ['cancel', 'sync'] as const;
  const actions = isRental ? rentalActions : activationActions;

  const expiresDate = number.expires_at ? new Date(number.expires_at) : null;
  const daysUntilExpiry = expiresDate
    ? Math.ceil((expiresDate.getTime() - Date.now()) / 86400000)
    : null;
  const expiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  const expired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

  return (
    <View style={styles.prominentCard}>
      {/* Renewal warning for rental */}
      {isRental && expiringSoon && (
        <View style={styles.renewalBanner}>
          <Icon name="bell" size={13} color="#92400e" />
          <Text style={styles.renewalBannerText}>
            Expires in {daysUntilExpiry} day{daysUntilExpiry === 1 ? '' : 's'} — renew soon
          </Text>
        </View>
      )}
      {isRental && expired && (
        <View style={[styles.renewalBanner, styles.renewalBannerExpired]}>
          <Icon name="bell" size={13} color="#991b1b" />
          <Text style={[styles.renewalBannerText, { color: '#991b1b' }]}>Subscription expired</Text>
        </View>
      )}

      <View style={styles.prominentHeader}>
        <View>
          <Text style={styles.shortId}>#{number.id.slice(-6).toUpperCase()}</Text>
          {isRental ? (
            <Text style={styles.expiryDate}>
              {expiresDate
                ? `Expires ${expiresDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : 'No expiry set'}
            </Text>
          ) : (
            <CountdownTimer expiresAt={number.expires_at} style={styles.countdown} />
          )}
        </View>
        <View style={styles.statusDot}>
          <View style={[styles.dot, styles.dotPulse]} />
          <StatusBadge status={number.status} />
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoLabelRow}>
          <Icon name="box" size={13} color={colors.textSub} />
          <Text style={styles.infoLabel}>{number.product}</Text>
          {isRental && (
            <View style={styles.rentalBadge}>
              <Text style={styles.rentalBadgeText}>Monthly</Text>
            </View>
          )}
        </View>
        <View style={styles.infoLabelRow}>
          <Icon name="placeholder" size={13} color={colors.textSub} />
          <Text style={styles.infoLabel}>
            {number.country_name}
            {isRental && number.monthly_cost ? ` · ${format(number.monthly_cost)}/mo` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.codeRow}>
        <Text style={styles.codeLabel}>Phone Number</Text>
        <View style={styles.codeValueRow}>
          <Text style={styles.codeValue}>{number.phone_number}</Text>
          <TouchableOpacity onPress={copyPhone} style={styles.copyBtn}>
            <Text style={styles.copyBtnText}>Copy</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!isRental && (
        <View style={styles.codeRow}>
          <Text style={styles.codeLabel}>OTP Code</Text>
          <View style={styles.codeValueRow}>
            <Text style={[styles.codeValue, !number.otp_code && styles.codePlaceholder]}>
              {number.otp_code ?? '—'}
            </Text>
            {number.otp_code && (
              <TouchableOpacity onPress={copyOtp} style={styles.copyBtn}>
                <Text style={styles.copyBtnText}>Copy</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.actions}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action}
            style={[
              styles.actionBtn,
              action === 'ban' && styles.actionBtnDanger,
              action === 'cancel' && styles.actionBtnDanger,
              action === 'sync' && styles.actionBtnSecondary,
            ]}
            onPress={() => onAction(number.id, action)}
            disabled={!!actionLoading}
          >
            {actionLoading === action ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>
                {action.charAt(0).toUpperCase() + action.slice(1)}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {!isRental && onGetAnother && (
        <TouchableOpacity
          style={[styles.getAnotherBtn, getAnotherLoading && styles.getAnotherBtnDisabled]}
          onPress={onGetAnother}
          disabled={getAnotherLoading || !!actionLoading}
        >
          {getAnotherLoading ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.getAnotherBtnText}>Generating...</Text>
            </>
          ) : (
            <>
              <Icon name="refresh" size={14} color="#fff" />
              <Text style={styles.getAnotherBtnText}>Get another number</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.viewLinks}>
        <TouchableOpacity onPress={onViewMessages} style={styles.viewLink}>
          <Icon name="message" size={14} color="#7C5CFC" />
          <Text style={styles.viewLinkText}>Messages ({number.message_count ?? 0})</Text>
        </TouchableOpacity>
        {!isRental && (
          <TouchableOpacity onPress={onViewOtps} style={styles.viewLink}>
            <Icon name="key" size={14} color="#7C5CFC" />
            <Text style={styles.viewLinkText}>
              OTPs{number.pending_otp_count ? ` (${number.pending_otp_count} pending)` : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    prominentCard: {
      backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 12,
      borderWidth: 2, borderColor: '#7C5CFC',
      shadowColor: '#7C5CFC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
    },
    prominentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    shortId: { fontSize: 12, color: c.textSub, fontFamily: 'Poppins_600SemiBold', marginBottom: 2 },
    countdown: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: c.text },
    statusDot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
    dotPulse: {},
    infoRow: { marginBottom: 12, gap: 4 },
    infoLabel: { fontSize: 13, color: c.textSub },
    infoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    codeRow: { marginBottom: 10 },
    codeLabel: { fontSize: 11, color: c.textMuted, marginBottom: 3, textTransform: 'uppercase' },
    codeValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    codeValue: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: c.text, flex: 1 },
    codePlaceholder: { color: c.textMuted },
    copyBtn: { backgroundColor: c.accentLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    copyBtnText: { color: '#7C5CFC', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
    actions: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 10 },
    actionBtn: { flex: 1, backgroundColor: '#7C5CFC', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    actionBtnDanger: { backgroundColor: '#ef4444' },
    actionBtnSecondary: { backgroundColor: '#6b7280' },
    actionBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
    getAnotherBtn: {
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#0ea5e9',
      paddingVertical: 9,
      borderRadius: 8,
    },
    getAnotherBtnDisabled: { opacity: 0.7 },
    getAnotherBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Poppins_700Bold' },
    viewLinks: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 },
    viewLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
    viewLinkText: { color: '#7C5CFC', fontSize: 13, fontFamily: 'Poppins_500Medium' },
    rowCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: c.card, borderRadius: 10, padding: 12, marginBottom: 8 },
    rowLeft: { flex: 1, gap: 2 },
    rowDate: { fontSize: 11, color: c.textMuted },
    rowProduct: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.text },
    rowCountryRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    rowCountry: { fontSize: 12, color: c.textSub },
    rowRight: { alignItems: 'flex-end', gap: 3 },
    rowPhone: { fontSize: 12, color: c.text, maxWidth: 140 },
    rowOtp: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: '#7C5CFC' },
    expiryDate: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: c.text },
    rentalBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    rentalBadgeText: { color: '#065f46', fontSize: 10, fontFamily: 'Poppins_600SemiBold' },
    renewalBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: '#fef3c7', borderRadius: 8, padding: 8, marginBottom: 10,
    },
    renewalBannerExpired: { backgroundColor: '#fee2e2' },
    renewalBannerText: { color: '#92400e', fontSize: 12, fontFamily: 'Poppins_500Medium', flex: 1 },
  });
}
