import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { theme } from '../src/theme';
import { Waves } from 'lucide-react-native';

export default function IndexScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isLoading, isAuthenticated]);

  return (
    <View style={styles.container}>
      <View style={styles.logoBadge}>
        <Waves size={48} color={theme.colors.textInverse} />
      </View>
      <Text style={styles.brandTitle}>AQUAINTEL</Text>
      <Text style={styles.brandSubtitle}>Commercial Aquaculture Intelligence Platform</Text>
      <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  logoBadge: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.elevated,
  },
  brandTitle: {
    ...theme.typography.headingLg,
    letterSpacing: 2,
    color: theme.colors.primaryDark,
    marginBottom: 4,
  },
  brandSubtitle: {
    ...theme.typography.bodySm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
  },
  loader: {
    marginTop: theme.spacing.xxl,
  },
});
