import React from 'react';
import { Tabs } from 'expo-router';
import { theme } from '../../src/theme';
import { LayoutDashboard, Waves, Sparkles, Bell, User } from 'lucide-react-native';
import { useFarmStore } from '../../src/store/farmStore';

export default function TabLayout() {
  const overview = useFarmStore((s) => s.overview);
  const activeAlerts = overview?.active_alerts_count || 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Command',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ponds"
        options={{
          title: 'Ponds',
          tabBarIcon: ({ color, size }) => <Waves size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="intelligence"
        options={{
          title: 'Intelligence',
          tabBarIcon: ({ color, size }) => <Sparkles size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarBadge: activeAlerts > 0 ? activeAlerts : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.critical,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '700',
          },
          tabBarIcon: ({ color, size }) => <Bell size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <User size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
