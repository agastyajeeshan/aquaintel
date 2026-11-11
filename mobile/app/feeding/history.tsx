import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { feedingApi, FeedingStatusResponse } from '../../src/services/api/feeding.api';
import { useFarmStore } from '../../src/store/farmStore';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../../src/components/common/FeedbackStates';

export default function FeedingHistoryScreen() {
  const router = useRouter();
  const operatingMode = useFarmStore((s) => s.operatingMode);
  const [logs, setLogs] = useState<FeedingStatusResponse['recent_logs']>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    setError(null);
    try {
      const data = await feedingApi.getStatus();
      setLogs(data.recent_logs || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load feeding history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Feeding History"
        subtitle="Dispensation Audit & Environmental Context"
        provenance={operatingMode}
        showBack
        onBack={() => router.back()}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {loading && logs.length === 0 ? (
        <LoadingState message="Fetching feeding logs..." />
      ) : error && logs.length === 0 ? (
        <ErrorState message={error} onRetry={loadHistory} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.topRow}>
                <Text style={styles.pondTitle}>
                  Pond {String(item.pond_id).padStart(2, '0')} • Feeder #{item.feeder_id}
                </Text>
                <StatusBadge status={item.status} size="sm" />
              </View>
              <View style={styles.metricsRow}>
                <Text style={styles.metricText}>Dispensed: {item.amount_kg} kg</Text>
                <Text style={styles.metricText}>Planned: {item.planned_amount_kg} kg</Text>
                <Text style={styles.metricText}>DO: {item.do_at_feeding?.toFixed(2)} mg/L</Text>
              </View>
              {item.reduction_reason && (
                <Text style={styles.reasonText}>{item.reduction_reason}</Text>
              )}
              <Text style={styles.timeText}>{item.timestamp}</Text>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              title="No Feeding Logs Found"
              description="Feeding dispensation records will appear once feeders run."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.subtle,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pondTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: 8,
    marginBottom: 6,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  reasonText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
});
