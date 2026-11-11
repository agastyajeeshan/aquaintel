import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { alertsApi } from '../../src/services/api/alerts.api';
import { offlineDatabase } from '../../src/services/storage/database';
import { useFarmStore } from '../../src/store/farmStore';
import { useAuthStore } from '../../src/store/authStore';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { AlertCard } from '../../src/components/common/AlertCard';
import { EmptyState, LoadingState } from '../../src/components/common/FeedbackStates';
import { AlertItem } from '../../src/types';

export default function AlertsScreen() {
  const { operatingMode } = useFarmStore();
  const user = useAuthStore((s) => s.user);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');

  const loadAlerts = async () => {
    try {
      const data = await alertsApi.getAlerts({ limit: 50 });
      setAlerts(data);
      offlineDatabase.saveAlerts(data);
    } catch (e) {
      // Fallback to SQLite cached alerts
      const cached = await offlineDatabase.getCachedAlerts();
      setAlerts(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAlerts();
  };

  const handleAcknowledge = async (alertId: number) => {
    try {
      await alertsApi.acknowledgeAlert(alertId, user?.full_name || 'Operator');
      Alert.alert('Acknowledged', `Alert #${alertId} acknowledged.`);
      loadAlerts();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to acknowledge alert.');
    }
  };

  const handleResolve = async (alertId: number) => {
    try {
      await alertsApi.resolveAlert(alertId, user?.full_name || 'Operator');
      Alert.alert('Resolved', `Alert #${alertId} marked resolved.`);
      loadAlerts();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to resolve alert.');
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchesSeverity = severityFilter === 'ALL' || a.severity === severityFilter;
    return matchesStatus && matchesSeverity;
  });

  return (
    <View style={styles.container}>
      <AppHeader
        title="Alerts & Incidents"
        subtitle={`${alerts.filter((a) => a.status === 'ACTIVE').length} Active Issues`}
        provenance={operatingMode}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        <View style={styles.chipRow}>
          {(['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, statusFilter === s && styles.chipActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.chipRow, { marginTop: 6 }]}>
          {(['ALL', 'CRITICAL', 'WARNING'] as const).map((sev) => (
            <TouchableOpacity
              key={sev}
              style={[styles.smallChip, severityFilter === sev && styles.smallChipActive]}
              onPress={() => setSeverityFilter(sev)}
            >
              <Text
                style={[
                  styles.smallChipText,
                  severityFilter === sev && styles.smallChipTextActive,
                ]}
              >
                {sev}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && alerts.length === 0 ? (
        <LoadingState message="Fetching active alert logs..." />
      ) : (
        <FlatList
          data={filteredAlerts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <AlertCard
              alert={item}
              onAcknowledge={() => handleAcknowledge(item.id)}
              onResolve={() => handleResolve(item.id)}
              canManage={user?.role !== 'VIEWER'}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No Alerts Found"
              description="All ponds are operating within safe biological thresholds."
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
  filterSection: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  smallChip: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  smallChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  smallChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  smallChipTextActive: {
    color: theme.colors.primaryDark,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
});
