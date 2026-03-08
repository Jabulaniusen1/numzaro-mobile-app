import { View, Text, StyleSheet } from 'react-native';
import { formatDistanceToNow, parseISO } from 'date-fns';
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
  const iconName: IconName = TX_ICONS[item.type] ?? 'creditCard';
  const isCredit = item.amount > 0;
  const timeAgo = formatDistanceToNow(parseISO(item.created_at), { addSuffix: true });

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon name={iconName} size={18} color="#7C5CFC" />
      </View>
      <View style={styles.content}>
        <Text style={styles.description} numberOfLines={1}>
          {item.description}
        </Text>
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: { flex: 1 },
  description: { fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { fontSize: 11, color: '#9ca3af' },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '700' },
  credit: { color: '#16a34a' },
  debit: { color: '#dc2626' },
  balanceAfter: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
});
