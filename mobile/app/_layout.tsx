import React, { useEffect, useState } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, useRouter, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../src/store/authStore';
import { useFarmStore } from '../src/store/farmStore';
import { telemetrySocket } from '../src/services/websocket/telemetrySocket';
import { notificationService } from '../src/services/notifications/notificationService';
import { theme } from '../src/theme';

if (Platform.OS !== 'web') {
  try {
    SplashScreen.preventAutoHideAsync().catch(() => {});
  } catch {
    // Ignore splash prevent failures in unsupported hosts
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
    },
  },
});

interface ErrorBoundaryState {
  error: Error | null;
}

class StartupErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AquaIntel Startup Error]', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>AquaIntel Initialization Error</Text>
          <Text style={errorStyles.message}>
            {this.state.error.message || 'An unexpected startup error occurred.'}
          </Text>
          <TouchableOpacity
            style={errorStyles.retryButton}
            onPress={() => this.setState({ error: null })}
          >
            <Text style={errorStyles.retryText}>Retry Startup</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setOnlineStatus = useFarmStore((s) => s.setOnlineStatus);
  const updatePondLiveMetrics = useFarmStore((s) => s.updatePondLiveMetrics);
  const updateFleetFromSnapshot = useFarmStore((s) => s.updateFleetFromSnapshot);
  const [pendingNotification, setPendingNotification] = useState<any>(null);

  useEffect(() => {
    // 1. Restore authenticated session from SecureStore safely
    Promise.resolve(restoreSession()).catch((err) => {
      console.warn('[AquaIntel Auth] Session restoration error:', err);
    });

    // 2. Monitor network reachability
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const isOnline = !!(state.isConnected && state.isInternetReachable !== false);
      setOnlineStatus(isOnline);
      if (isOnline && useAuthStore.getState().isAuthenticated) {
        telemetrySocket.connect();
      } else if (!isOnline) {
        telemetrySocket.disconnect();
      }
    });

    // 3. Capture foreground/background/cold-start notification taps for post-mount routing
    const responseSubscription = notificationService.addNotificationResponseReceivedListener(
      (response) => {
        const data = response?.notification?.request?.content?.data;
        if (data) setPendingNotification(data);
      }
    );

    notificationService
      .getLastNotificationResponseAsync()
      .then((response) => {
        const data = response?.notification?.request?.content?.data;
        if (data) setPendingNotification(data);
      })
      .catch(() => {});

    // Fail-safe splash dismissal so splash screen can never lock permanently
    const splashTimer = setTimeout(() => {
      if (Platform.OS !== 'web') {
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 2500);

    return () => {
      clearTimeout(splashTimer);
      unsubscribeNet();
      responseSubscription.remove();
      telemetrySocket.disconnect();
    };
  }, []);

  // Dismiss native splash screen once navigation tree and session gate are ready
  useEffect(() => {
    if (rootNavigationState?.key && !isLoading && Platform.OS !== 'web') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [rootNavigationState?.key, isLoading]);

  // Process notification deep link only after Root Layout is mounted and user is authenticated
  useEffect(() => {
    if (!pendingNotification || !rootNavigationState?.key || isLoading) return;
    if (!isAuthenticated) {
      setPendingNotification(null);
      return;
    }
    const pondId = pendingNotification.pond_id ?? pendingNotification.pondId;
    setPendingNotification(null);
    if (pondId) {
      router.push(`/ponds/${pondId}` as any);
    } else {
      router.push('/(tabs)/alerts' as any);
    }
  }, [pendingNotification, rootNavigationState?.key, isLoading, isAuthenticated, router]);

  // Connect telemetry WebSocket & register push tokens when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      notificationService.registerForPushNotificationsAsync().catch((err) => {
        console.warn('[AquaIntel Notifications] Registration error:', err);
      });
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
    <StartupErrorBoundary>
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
    </StartupErrorBoundary>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.critical,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
