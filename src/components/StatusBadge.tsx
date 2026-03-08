import { View, Text, StyleSheet } from 'react-native';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  completed:    { bg: '#dcfce7', text: '#15803d' },
  'in progress': { bg: '#dbeafe', text: '#1d4ed8' },
  partial:      { bg: '#fef3c7', text: '#b45309' },
  pending:      { bg: '#ede9fe', text: '#7c3aed' },
  cancelled:    { bg: '#fee2e2', text: '#b91c1c' },
  active:       { bg: '#dcfce7', text: '#15803d' },
  finished:     { bg: '#f3f4f6', text: '#374151' },
  banned:       { bg: '#fee2e2', text: '#b91c1c' },
  timeout:      { bg: '#fef3c7', text: '#b45309' },
  suspended:    { bg: '#fef3c7', text: '#b45309' },
  received:     { bg: '#dbeafe', text: '#1d4ed8' },
};

interface Props {
  status: string;
}

export function StatusBadge({ status }: Props) {
  const key = status.toLowerCase().replace('_', ' ');
  const colors = STATUS_COLORS[key] ?? { bg: '#f3f4f6', text: '#374151' };

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>
        {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
