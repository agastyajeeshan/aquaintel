import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { devicesApi } from '../../src/services/api/devices.api';
import { useFarmStore } from '../../src/store/farmStore';
import { useAuthStore } from '../../src/store/authStore';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { ConfirmationDialog } from '../../src/components/common/ConfirmationDialog';
import { LoadingState, ErrorState, EmptyState } from '../../src/components/common/FeedbackStates';
import { DeviceCommandItem, IoTDeviceItem } from '../../src/types';

export default function DeviceDetailScreen() {
  const router = useRouter();
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const { isOnline, operatingMode } = useFarmStore();
  const user = useAuthStore((s) => s.user);

  const [device, setDevice] = useState<IoTDeviceItem | null>(null);
  const [commands, setCommands] = useState<DeviceCommandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const loadData = async () => {
    if (!deviceId) return;
    setError(null);
    try {
      const [devRes, cmdRes] = await Promise.all([
        devicesApi.getDevice(deviceId),
        devicesApi.getCommands(deviceId, 20),
      ]);
      setDevice(devRes);
      setCommands(cmdRes);
    } catch (e: any) {
      setError(e.message || 'Failed to load device details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [deviceId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const canControl = isOnline && user?.role !== 'VIEWER';

  const handleCalibrate = async () => {
    if (!deviceId) return;
    setIssuing(true);
    try {
      const res = await devicesApi.issueCommand(deviceId, {
        action: 'CALIBRATE',
        reason: 'Operator diagnostic calibration check from mobile',
        mode: 'MANUAL',
      });
      setConfirmVisible(false);
      Alert.alert(
        'Command Queued',
        `Command ${res.command_id} state: ${res.status} (${res.delivery_state || 'PENDING_GATEWAY_DISPATCH'}). Device verification updates once edge acknowledges.`
      );
      loadData();
    } catch (e: any) {
      Alert.alert('Command Rejected', e.message || 'Failed to dispatch command.');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={device?.device_id || deviceId || 'IoT Device'}
        subtitle={device?.device_type || 'Edge Telemetry Node'}
        provenance={operatingMode}
        showBack
        onBack={() => router.back()}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {loading && !device ? (
        <LoadingState message="Loading device diagnostics..." />
      ) : error && !device ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        >
          {device && (
            <View style={styles.card}>
              <View style={styles.topRow}>
                <Text style={styles.cardTitle}>Hardware Diagnostics</Text>
                <StatusBadge status={device.status} size="sm" />
              </View>
              <View style={styles.propRow}>
                <Text style={styles.propLbl}>Pond Assignment</Text>
                <Text style={styles.propVal}>{device.pond_id ? `Pond ${String(device.pond_id).padStart(2, '0')}` : 'Central Farm'}</Text>
              </View>
              <View style={styles.propRow}>
                <Text style={styles.propLbl}>Firmware</Text>
                <Text style={styles.propVal}>{device.firmware_version}</Text>
              </View>
              <View style={styles.propRow}>
                <Text style={styles.propLbl}>Battery</Text>
                <Text style={styles.propVal}>{device.battery_pct?.toFixed(0)}%</Text>
              </View>
              <View style={styles.propRow}>
                <Text style={styles.propLbl}>Signal (RSSI)</Text>
                <Text style={styles.propVal}>{device.signal_rssi_dbm} dBm ({device.signal_quality})</Text>
              </View>
              <View style={styles.propRow}>
                <Text style={styles.propLbl}>IP Address</Text>
                <Text style={styles.propVal}>{device.ip_address || 'LoRaWAN Edge'}</Text>
              </View>
              <View style={styles.propRow}>
                <Text style={styles.propLbl}>Uptime</Text>
                <Text style={styles.propVal}>{device.uptime_hours?.toFixed(1)} hrs</Text>
              </View>

              <TouchableOpacity
                style={[styles.cmdBtn, !canControl && styles.cmdBtnDisabled]}
                disabled={!canControl}
                onPress={() => setConfirmVisible(true)}
              >
                <Text style={styles.cmdBtnText}>
                  {!isOnline
                    ? 'Offline — Commands Locked'
                    : user?.role === 'VIEWER'
                    ? 'Read-Only Access'
                    : 'Request Probe Calibration Check'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionTitle}>Command Execution Lifecycle</Text>
          {commands.length > 0 ? (
            commands.map((cmd) => (
              <View key={cmd.command_id} style={styles.cmdCard}>
                <View style={styles.topRow}>
                  <Text style={styles.cmdAction}>{cmd.action}</Text>
                  <StatusBadge status={cmd.status} size="sm" />
                </View>
                <Text style={styles.cmdMeta}>ID: {cmd.command_id}</Text>
                {cmd.reason && <Text style={styles.cmdReason}>{cmd.reason}</Text>}
                {cmd.issued_at && <Text style={styles.cmdMeta}>Issued: {cmd.issued_at}</Text>}
                {cmd.error_message && <Text style={styles.cmdError}>{cmd.error_message}</Text>}
              </View>
            ))
          ) : (
            <EmptyState
              title="No Command History"
              description="Device commands and edge acknowledgements will appear here."
            />
          )}
        </ScrollView>
      )}

      <ConfirmationDialog
        visible={confirmVisible}
        title="Confirm Calibration Command"
        message={`Send an authenticated CALIBRATE request to ${device?.device_id || deviceId}?`}
        confirmLabel="Queue Command"
        isLoading={issuing}
        safetyNotice="Commands transition PENDING → ACKNOWLEDGED → COMPLETED on the edge controller."
        onConfirm={handleCalibrate}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.subtle,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  propRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  propLbl: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  propVal: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  cmdBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    paddingVertical: 11,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  cmdBtnDisabled: {
    backgroundColor: theme.colors.textMuted,
  },
  cmdBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  cmdCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  cmdAction: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  cmdMeta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  cmdReason: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  cmdError: {
    fontSize: 12,
    color: theme.colors.critical,
    marginTop: 4,
  },
});
