import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { format, parseISO } from 'date-fns';
import { useTheme } from '@/hooks/useTheme';
import { useCurrency } from '@/hooks/useCurrency';
import { ThemeColors } from '@/lib/theme';
import { StatusBadge } from './StatusBadge';
import { Icon } from './Icon';

interface Order {
  id: string;
  status: string;
  charge: number;
  quantity: number;
  start_count?: number | null;
  remains?: number | null;
  link: string;
  created_at: string;
  services?: { name: string; category: string; type: string } | null;
}

interface Props {
  item: Order;
  onPress?: () => void;
}

export function OrderCard({ item, onPress }: Props) {
  const { colors } = useTheme();
  const { format: formatCurrency } = useCurrency();
  const styles = makeStyles(colors);
  const service = item.services;
  const dateStr = format(parseISO(item.created_at), 'MMM d, yyyy');

  const hasProgress = item.remains !== null && item.remains !== undefined;
  const delivered = hasProgress ? item.quantity - (item.remains ?? item.quantity) : 0;
  const progressPct = hasProgress && item.quantity > 0
    ? Math.min(100, Math.max(0, (delivered / item.quantity) * 100))
    : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={onPress ? 0.75 : 1}>
      <View style={styles.header}>
        <Text style={styles.serviceName} numberOfLines={1}>
          {service?.name ?? 'Unknown Service'}
        </Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.category}>{service?.category ?? ''}</Text>

      {item.link ? (
        <TouchableOpacity
          onPress={() => Linking.openURL(item.link)}
          style={styles.linkRow}
          hitSlop={{ top: 4, bottom: 4 }}
        >
          <Icon name="link" size={12} color="#7C5CFC" />
          <Text style={styles.link} numberOfLines={1}>{item.link}</Text>
        </TouchableOpacity>
      ) : null}

      {/* Progress bar — shown when remains is available */}
      {hasProgress && (
        <View style={styles.progressWrap}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPct}%` as any,
                  backgroundColor: progressPct >= 100 ? '#16a34a' : '#7C5CFC',
                },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>
              {delivered.toLocaleString()} / {item.quantity.toLocaleString()} delivered
            </Text>
            <Text style={styles.progressText}>{Math.round(progressPct)}%</Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {item.quantity.toLocaleString()} · {dateStr}
        </Text>
        <View style={styles.footerRight}>
          <Text style={styles.charge}>{formatCurrency(Number(item.charge))}</Text>
          {onPress && <Icon name="arrowRight" size={13} color={colors.textMuted} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    serviceName: {
      flex: 1,
      fontSize: 14,
      fontFamily: 'Poppins_600SemiBold',
      color: c.text,
      marginRight: 8,
    },
    category: { fontSize: 12, color: c.textSub, marginBottom: 6 },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    link: { fontSize: 12, color: '#7C5CFC', flex: 1 },

    // Progress
    progressWrap: { marginBottom: 8, gap: 4 },
    progressBar: {
      height: 6,
      borderRadius: 3,
      backgroundColor: c.cardAlt,
      overflow: 'hidden',
    },
    progressFill: { height: 6, borderRadius: 3 },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    progressText: { fontSize: 11, color: c.textMuted, fontFamily: 'Poppins_500Medium' },

    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    footerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    footerText: { fontSize: 12, color: c.textMuted },
    charge: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: c.text },
  });
}
