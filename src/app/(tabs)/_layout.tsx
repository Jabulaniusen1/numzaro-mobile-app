import { Icon, IconName } from '@/components/Icon';
import { useTheme } from '@/hooks/useTheme';
import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({ icon, focused }: { icon: IconName; focused: boolean }) {
  return (
    <View style={styles.tabIconWrap}>
      <Icon name={icon} size={20} color={focused ? '#7C5CFC' : '#9ca3af'} />
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.tabBorder,
          height: 58 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
          paddingHorizontal: 8,
        },
        tabBarItemStyle: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Poppins_600SemiBold',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon icon="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="numbers"
        options={{
          title: 'Numbers',
          tabBarIcon: ({ focused }) => <TabIcon icon="phone" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'eSIM',
          tabBarIcon: ({ focused }) => <TabIcon icon="sim" focused={focused} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/esim');
          },
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon icon="user" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
