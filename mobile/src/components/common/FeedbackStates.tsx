import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { AlertCircle, RefreshCw, Inbox, WifiOff } from 'lucide-react-native';

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Loading telemetry & farm data...',
}) => (
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color={theme.colors.primary} />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

export const ErrorState: React.FC<{
  message?: string;
  onRetry?: () => void;
}> = ({ message = 'Failed to load telemetry from gateway.', onRetry }) => (
  <View style={styles.centerContainer}>
    <AlertCircle size={40} color={theme.colors.critical} />
    <Text style={styles.errorTitle}>Connection Problem</Text>
    <Text style={styles.errorDescription}>{message}</Text>
    {onRetry && (
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <RefreshCw size={16} color={theme.colors.textInverse} />
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    )}
  </View>
);

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
}> = ({ title, description, icon }) => (
  <View style={styles.centerContainer}>
    {icon || <Inbox size={40} color={theme.colors.textMuted} />}
    <Text style={styles.emptyTitle}>{title}</Text>
    {description && <Text style={styles.emptyDescription}>{description}</Text>}
  </View>
);

export const OfflineBanner: React.FC<{
  lastSynced?: string;
  onRefresh?: () => void;
}> = ({ lastSynced, onRefresh }) => (
  <View style={styles.offlineBanner}>
    <View style={styles.offlineLeft}>
      <WifiOff size={16} color={theme.colors.warning} />
      <View>
        <Text style={styles.offlineTitle}>Operating in Offline Mode</Text>
        <Text style={styles.offlineSubtitle}>
          {lastSynced ? `Showing cached data from ${lastSynced}` : 'Local cache active. Controls locked.'}
        </Text>
      </View>
    </View>
    {onRefresh && (
      <TouchableOpacity onPress={onRefresh} style={styles.reconnectButton}>
        <Text style={styles.reconnectText}>Reconnect</Text>
      </TouchableOpacity>
    )}
  </View>
);

export const LastUpdatedLabel: React.FC<{
  timestamp?: string | null;
  provenance?: string;
}> = ({ timestamp, provenance = 'LIVE' }) => {
  if (!timestamp) return null;
  const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <View style={styles.lastUpdatedContainer}>
      <Text style={styles.lastUpdatedText}>
        Data Source: {provenance} • Last updated at {timeStr}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  loadingText: {
    ...theme.typography.bodyMd,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  errorTitle: {
    ...theme.typography.headingSm,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  errorDescription: {
    ...theme.typography.bodyMd,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginVertical: theme.spacing.sm,
    maxWidth: 280,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  retryText: {
    color: theme.colors.textInverse,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyTitle: {
    ...theme.typography.headingSm,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptyDescription: {
    ...theme.typography.bodyMd,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  offlineBanner: {
    backgroundColor: theme.colors.warningLight,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.warningBorder,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  offlineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.warning,
  },
  offlineSubtitle: {
    fontSize: 11,
    color: '#92400E',
  },
  reconnectButton: {
    backgroundColor: theme.colors.warning,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
  },
  reconnectText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  lastUpdatedContainer: {
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
  },
  lastUpdatedText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});
