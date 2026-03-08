import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { format, parseISO } from 'date-fns';
import { StatusBadge } from './StatusBadge';
import { Icon } from './Icon';

interface Order {
  id: string;
  status: string;
  charge: number;
  quantity: number;
  link: string;
  created_at: string;
  services?: { name: string; category: string; type: string } | null;
}

interface Props {
  item: Order;
}

export function OrderCard({ item }: Props) {
  const service = item.services;
  const dateStr = format(parseISO(item.created_at), 'MMM d, yyyy');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.serviceName} numberOfLines={1}>
          {service?.name ?? 'Unknown Service'}
        </Text>
        <StatusBadge status={item.status} />
      </View>

      <Text style={styles.category}>{service?.category ?? ''}</Text>

      {item.link ? (
        <TouchableOpacity onPress={() => Linking.openURL(item.link)} style={styles.linkRow}>
          <Icon name="link" size={12} color="#7C5CFC" />
          <Text style={styles.link} numberOfLines={1}>{item.link}</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {item.quantity.toLocaleString()} · {dateStr}
        </Text>
        <Text style={styles.charge}>${Number(item.charge).toFixed(4)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
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
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  category: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  link: { fontSize: 12, color: '#7C5CFC', flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 12, color: '#9ca3af' },
  charge: { fontSize: 13, fontWeight: '700', color: '#111827' },
});
