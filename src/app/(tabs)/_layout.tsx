import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Icon, IconName } from '@/components/Icon';

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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
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
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    height: 70,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabIcon: { alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10, marginTop: 2 },
  tabLabelActive: { color: '#7C5CFC', fontWeight: '600' },
  tabLabelInactive: { color: '#9ca3af' },
});
