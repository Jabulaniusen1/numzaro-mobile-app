import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Icon, IconName } from '@/components/Icon';
import { useTheme } from '@/hooks/useTheme';

function TabIcon({ icon, label, focused }: { icon: IconName; label: string; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      <Icon name={icon} size={22} color={focused ? '#7C5CFC' : '#9ca3af'} />
      <Text style={[styles.tabLabel, focused ? styles.tabLabelActive : styles.tabLabelInactive]}>
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
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.tabBorder,
          height: 68,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarShowLabel: false,
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
          tabBarIcon: ({ focused }) => <TabIcon icon="phone" label="No" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="box" label="Order" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="user" label="Me" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#7C5CFC',
    fontWeight: '600',
  },
  tabLabelInactive: {
    color: '#9ca3af',
  },
});
