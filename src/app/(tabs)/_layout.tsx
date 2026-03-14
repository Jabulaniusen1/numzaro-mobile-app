import { Icon, IconName } from '@/components/Icon';
import { useTheme } from '@/hooks/useTheme';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

function TabIcon({ icon, label, focused }: { icon: IconName; label: string; focused: boolean }) {
  return (
    <View style={styles.tab}>
      <View style={[styles.iconPill, focused && styles.iconPillActive]}>
        <Icon name={icon} size={19} color={focused ? '#7C5CFC' : '#9ca3af'} />
      </View>
      <Text
        style={[styles.label, focused && styles.labelActive]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          height: 66,
          borderRadius: 22,
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.10,
          shadowRadius: 18,
          elevation: 12,
          paddingBottom: 0,
          paddingTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="home" label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="rocket" label="Boost" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="numbers"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="phone" label="Numbers" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="box" label="Orders" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="user" label="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    gap: 2,
  },
  iconPill: {
    width: 42,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: '#EDE9FF',
  },
  label: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    color: '#9ca3af',
    textAlign: 'center',
  },
  labelActive: {
    color: '#7C5CFC',
    fontFamily: 'Poppins_600SemiBold',
  },
});
