import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useBalance } from '@/hooks/useBalance';
import { useCurrency } from '@/hooks/useCurrency';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { Icon } from '@/components/Icon';

export function BalanceCard() {
  const router = useRouter();
  const userId = useAppStore((s) => s.userId);
  const { data: balance, isLoading } = useBalance(userId ?? '');
  const { format } = useCurrency();
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(true);
  const styles = makeStyles(colors);

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.label}>Wallet Balance</Text>
        <View style={styles.amountRow}>
          <Text style={styles.amount}>
            {isLoading ? '—' : hidden ? '••••••' : format(balance ?? 0)}
          </Text>
          <TouchableOpacity onPress={() => setHidden(!hidden)} hitSlop={8}>
            <Icon
              name={hidden ? 'locked' : 'eye'}
              size={15}
              color={colors.textSub}
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.fundBtn}
        onPress={() => router.push('/fund-wallet' as any)}
      >
        <Icon name="plus" size={13} color="#fff" />
        <Text style={styles.fundBtnText}>Fund Wallet</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.card,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginHorizontal: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: c.border ?? 'rgba(124,92,252,0.15)',
    },
    left: { flex: 1 },
    label: { fontSize: 11, color: c.textSub, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
    amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    amount: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: c.text },
    fundBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#7C5CFC',
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    fundBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  });
}
