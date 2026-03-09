import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { useBalance } from '@/hooks/useBalance';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { Icon, IconName } from '@/components/Icon';

interface MenuItem {
  icon: IconName;
  label: string;
  route: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'telephone',        label: 'My Numbers',     route: '/my-numbers' },
  { icon: 'bell',             label: 'Notifications',  route: '/notifications' },
  { icon: 'barChartDollar',   label: 'Transactions',   route: '/transactions' },
  { icon: 'box',              label: 'My Orders',      route: '/(tabs)/orders' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.userId);
  const setUserId = useAppStore((s) => s.setUserId);
  const darkMode = useAppStore((s) => s.darkMode);
  const setDarkMode = useAppStore((s) => s.setDarkMode);
  const { data: balance } = useBalance(userId ?? '');
  const { format } = useCurrency();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('full_name, email, created_at')
        .eq('id', userId!)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          setUserId(null);
          queryClient.clear();
        },
      },
    ]);
  };

  const initials = profile?.full_name
    ?.split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        {isLoading ? (
          <ActivityIndicator color="#7C5CFC" style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.fullName}>{profile?.full_name ?? 'User'}</Text>
            <Text style={styles.email}>{profile?.email ?? ''}</Text>
            <View style={styles.balancePill}>
              <Text style={styles.balancePillText}>Balance: {format(balance ?? 0)}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuRow}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuIconWrap}>
                <Icon name={item.icon} size={18} color="#7C5CFC" />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Icon name="arrowRight" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferences</Text>
          <View style={styles.menuRow}>
            <View style={styles.menuIconWrap}>
              <Icon name="eye" size={18} color="#7C5CFC" />
            </View>
            <Text style={styles.menuLabel}>Dark Mode</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.border, true: '#7C5CFC' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Icon name="power" size={18} color="#b91c1c" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Numzaro v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 20, paddingBottom: 100 },
    title: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: c.text, marginBottom: 20 },
    profileCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    avatar: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: '#7C5CFC',
      justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    },
    avatarText: { color: '#fff', fontSize: 28, fontFamily: 'Poppins_700Bold' },
    fullName: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: c.text, marginBottom: 4 },
    email: { fontSize: 13, color: c.textSub, marginBottom: 12 },
    balancePill: { backgroundColor: c.accentLight, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
    balancePillText: { color: c.accentText, fontFamily: 'Poppins_700Bold', fontSize: 14 },
    section: { marginBottom: 20 },
    sectionLabel: { fontSize: 12, color: c.textMuted, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', marginBottom: 8 },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
    },
    menuIconWrap: {
      width: 32, height: 32, borderRadius: 8,
      backgroundColor: c.accentLight,
      justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    menuLabel: { flex: 1, fontSize: 15, color: c.text, fontFamily: 'Poppins_500Medium' },
    signOutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fee2e2',
      borderRadius: 14,
      padding: 16,
      marginBottom: 24,
      gap: 8,
    },
    signOutText: { color: '#b91c1c', fontSize: 15, fontFamily: 'Poppins_700Bold' },
    version: { textAlign: 'center', fontSize: 12, color: c.textMuted },
  });
}
