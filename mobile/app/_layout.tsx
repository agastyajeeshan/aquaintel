import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../src/store/authStore';
import { useFarmStore } from '../src/store/farmStore';
import { telemetrySocket } from '../src/services/websocket/telemetrySocket';
import { notificationService } from '../src/services/notifications/notificationService';
import { theme } from '../src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
    },
  },
});

export default function RootLayout() {
  const router = useRouter();
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setOnlineStatus = useFarmStore((s) => s.setOnlineStatus);
  const updatePondLiveMetrics = useFarmStore((s) => s.updatePondLiveMetrics);
  const updateFleetFromSnapshot = useFarmStore((s) => s.updateFleetFromSnapshot);

  useEffect(() => {
    // 1. Restore authenticated session from SecureStore
    restoreSession();

    // 2. Monitor network reachability
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const isOnline = !!(state.isConnected && state.isInternetReachable !== false);
      setOnlineStatus(isOnline);
      if (isOnline) {
        telemetrySocket.connect();
      } else {
        telemetrySocket.disconnect();
      }
    });

    // 3. Handle notification response taps (Foreground & Background deep linking)
    const handleNotificationRoute = (data: any) => {
      if (!data) return;
      const pondId = data.pond_id ?? data.pondId;
      if (pondId) {
        router.push(`/ponds/${pondId}` as any);
      } else {
        router.push('/(tabs)/alerts' as any);
      }
    };

    const responseSubscription = notificationService.addNotificationResponseReceivedListener(
      (response) => {
        const data = response?.notification?.request?.content?.data;
        handleNotificationRoute(data);
      }
    );

    // 4. Handle cold-launch from notification tap
    notificationService.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response?.notification?.request?.content?.data;
        handleNotificationRoute(data);
      }
    });

    return () => {
      unsubscribeNet();
      responseSubscription.remove();
      telemetrySocket.disconnect();
    };
  }, []);

  // Connect telemetry WebSocket & register push tokens when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      notificationService.registerForPushNotificationsAsync();
      telemetrySocket.connect();
      const unsubscribeTelemetry = telemetrySocket.subscribe('TELEMETRY_UPDATE', (packet: any) => {
        if (Array.isArray(packet?.ponds)) {
          updateFleetFromSnapshot(packet.ponds, Boolean(packet.is_offline));
        } else if (packet?.pond_id && packet?.metrics) {
          updatePondLiveMetrics(packet.pond_id, packet.metrics, packet.timestamp);
        }
      });
      return () => {
        unsubscribeTelemetry();
      };
    }
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={theme.colors.surface} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="ponds/[pondId]"
            options={{
              presentation: 'card',
              headerShown: false,
            }}
          />
          <Stack.Screen name="water-quality/[pondId]" options={{ headerShown: false }} />
          <Stack.Screen name="feeding/index" options={{ headerShown: false }} />
          <Stack.Screen name="feeding/history" options={{ headerShown: false }} />
          <Stack.Screen name="aeration/index" options={{ headerShown: false }} />
          <Stack.Screen name="disease/index" options={{ headerShown: false }} />
          <Stack.Screen name="climate/index" options={{ headerShown: false }} />
          <Stack.Screen name="devices/index" options={{ headerShown: false }} />
          <Stack.Screen name="devices/[deviceId]" options={{ headerShown: false }} />
          <Stack.Screen name="reports/index" options={{ headerShown: false }} />
          <Stack.Screen name="settings/index" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
