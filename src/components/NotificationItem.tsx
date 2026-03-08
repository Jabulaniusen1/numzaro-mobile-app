import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Icon, IconName } from './Icon';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: any;
}

interface Props {
  item: Notification;
  onPress: (item: Notification) => void;
}

const TYPE_ICONS: Record<string, IconName> = {
  transaction:            'dollarCircle',
  billing:                'creditCard',
  subscription_reminder:  'calendar',
  expiration_reminder:    'minusCircle',
  payment_failed:         'xmark',
};

export function NotificationItem({ item, onPress }: Props) {
  const iconName: IconName = TYPE_ICONS[item.type] ?? 'bell';
  const timeAgo = formatDistanceToNow(parseISO(item.created_at), { addSuffix: true });

  return (
    <TouchableOpacity
      style={[styles.container, !item.read && styles.unread]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      {!item.read && <View style={styles.dot} />}
      <View style={styles.iconWrap}>
        <Icon name={iconName} size={18} color={item.read ? '#6b7280' : '#7C5CFC'} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.time}>{timeAgo}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  unread: { borderLeftColor: '#7C5CFC', backgroundColor: '#faf5ff' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C5CFC',
    marginTop: 6,
    marginRight: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  message: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  time: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
});
