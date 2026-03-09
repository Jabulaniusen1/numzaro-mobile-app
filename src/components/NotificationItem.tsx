import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
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
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
        <Icon name={iconName} size={18} color={item.read ? colors.textSub : '#7C5CFC'} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.time}>{timeAgo}</Text>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row', alignItems: 'flex-start',
      backgroundColor: c.card, padding: 14, borderRadius: 12, marginBottom: 8,
      borderLeftWidth: 3, borderLeftColor: 'transparent',
    },
    unread: { borderLeftColor: '#7C5CFC', backgroundColor: c.notifUnread },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7C5CFC', marginTop: 6, marginRight: 4 },
    iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.cardAlt, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    content: { flex: 1 },
    title: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: c.text, marginBottom: 2 },
    message: { fontSize: 13, color: c.textSub, lineHeight: 18 },
    time: { fontSize: 11, color: c.textMuted, marginTop: 4 },
  });
}
