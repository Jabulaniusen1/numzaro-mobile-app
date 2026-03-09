import { View, Text, StyleSheet } from 'react-native';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { StatusBadge } from './StatusBadge';
import { Icon, IconName } from './Icon';

interface Transaction {
  id: string;
  type: string;
  transaction_type: string;
  amount: number;
  balance_after?: number;
  description: string;
  created_at: string;
  metadata?: any;
}

interface Props {
  item: Transaction;
  currencyFormat: (n: number) => string;
}

const TX_ICONS: Record<string, IconName> = {
  wallet: 'creditCard',
  twilio_charge: 'message',
  number_purchase: 'phone',
  payment: 'handDollar',
};

export function TransactionItem({ item, currencyFormat }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const iconName: IconName = TX_ICONS[item.type] ?? 'creditCard';
  const isCredit = item.amount > 0;
  const timeAgo = formatDistanceToNow(parseISO(item.created_at), { addSuffix: true });

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon name={iconName} size={18} color="#7C5CFC" />
      </View>
      <View style={styles.content}>
        <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
        <View style={styles.meta}>
          <StatusBadge status={item.transaction_type} />
          <Text style={styles.time}>{timeAgo}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, isCredit ? styles.credit : styles.debit]}>
          {isCredit ? '+' : ''}{currencyFormat(Math.abs(item.amount))}
        </Text>
        {item.balance_after !== undefined && (
          <Text style={styles.balanceAfter}>{currencyFormat(item.balance_after)}</Text>
        )}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, padding: 14, borderRadius: 12, marginBottom: 8 },
    iconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: c.accentLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    content: { flex: 1 },
    description: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: c.text, marginBottom: 4 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    time: { fontSize: 11, color: c.textMuted },
    right: { alignItems: 'flex-end' },
    amount: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
    credit: { color: '#16a34a' },
    debit: { color: '#dc2626' },
    balanceAfter: { fontSize: 11, color: c.textMuted, marginTop: 2 },
  });
}
