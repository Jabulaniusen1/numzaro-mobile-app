import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { StatusBadge } from './StatusBadge';
import { CountdownTimer } from './CountdownTimer';
import { Icon } from './Icon';

interface VirtualNumber {
  id: string;
  phone_number: string;
  product: string;
  country_name: string;
  country_code: string;
  monthly_cost: number;
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
}

export function NumberCard({
  number,
  onAction,
  actionLoading,
  isProminent = false,
  onViewMessages,
  onViewOtps,
}: Props) {
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
            <Icon name="placeholder" size={12} color="#6b7280" />
            <Text style={styles.rowCountry}>{number.country_name}</Text>
          </View>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.rowPhone} numberOfLines={1}>
            {number.phone_number}
          </Text>
          {number.otp_code ? (
            <Text style={styles.rowOtp}>{number.otp_code}</Text>
          ) : null}
          <StatusBadge status={number.status} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.prominentCard}>
      {/* Header */}
      <View style={styles.prominentHeader}>
        <View>
          <Text style={styles.shortId}>#{number.id.slice(-6).toUpperCase()}</Text>
          <CountdownTimer expiresAt={number.expires_at} style={styles.countdown} />
        </View>
        <View style={styles.statusDot}>
          <View style={[styles.dot, styles.dotPulse]} />
          <StatusBadge status={number.status} />
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoRow}>
        <View style={styles.infoLabelRow}>
          <Icon name="box" size={13} color="#374151" />
          <Text style={styles.infoLabel}>{number.product}</Text>
        </View>
        <View style={styles.infoLabelRow}>
          <Icon name="placeholder" size={13} color="#374151" />
          <Text style={styles.infoLabel}>{number.country_name} · ${number.monthly_cost}</Text>
        </View>
      </View>

      {/* Phone Number */}
      <View style={styles.codeRow}>
        <Text style={styles.codeLabel}>Phone Number</Text>
        <View style={styles.codeValueRow}>
          <Text style={styles.codeValue}>{number.phone_number}</Text>
          <TouchableOpacity onPress={copyPhone} style={styles.copyBtn}>
            <Text style={styles.copyBtnText}>Copy</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* OTP */}
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

      {/* Action Buttons */}
      <View style={styles.actions}>
        {(['finish', 'ban', 'cancel', 'sync'] as const).map((action) => (
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

      {/* View links */}
      <View style={styles.viewLinks}>
        <TouchableOpacity onPress={onViewMessages} style={styles.viewLink}>
          <Icon name="message" size={14} color="#7C5CFC" />
          <Text style={styles.viewLinkText}>Messages ({number.message_count ?? 0})</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onViewOtps} style={styles.viewLink}>
          <Icon name="key" size={14} color="#7C5CFC" />
          <Text style={styles.viewLinkText}>
            OTPs{number.pending_otp_count ? ` (${number.pending_otp_count} pending)` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  prominentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#7C5CFC',
    shadowColor: '#7C5CFC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  prominentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shortId: { fontSize: 12, color: '#6b7280', fontWeight: '600', marginBottom: 2 },
  countdown: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statusDot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  dotPulse: {},
  infoRow: { marginBottom: 12, gap: 4 },
  infoLabel: { fontSize: 13, color: '#374151' },
  codeRow: { marginBottom: 10 },
  codeLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 3, textTransform: 'uppercase' },
  codeValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeValue: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1 },
  codePlaceholder: { color: '#9ca3af' },
  copyBtn: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  copyBtnText: { color: '#7C5CFC', fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 10 },
  actionBtn: {
    flex: 1,
    backgroundColor: '#7C5CFC',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnDanger: { backgroundColor: '#ef4444' },
  actionBtnSecondary: { backgroundColor: '#6b7280' },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  viewLinks: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  viewLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  viewLinkText: { color: '#7C5CFC', fontSize: 13, fontWeight: '500' },
  // Row card
  rowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  rowLeft: { flex: 1, gap: 2 },
  rowDate: { fontSize: 11, color: '#9ca3af' },
  rowProduct: { fontSize: 13, fontWeight: '600', color: '#111827' },
  rowCountryRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rowCountry: { fontSize: 12, color: '#6b7280' },
  infoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowRight: { alignItems: 'flex-end', gap: 3 },
  rowPhone: { fontSize: 12, color: '#374151', maxWidth: 140 },
  rowOtp: { fontSize: 14, fontWeight: '700', color: '#7C5CFC' },
});
