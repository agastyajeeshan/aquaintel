import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { IoTDeviceItem } from '../../types';
import { StatusBadge } from './StatusBadge';
import { Battery, Wifi, Cpu, Clock } from 'lucide-react-native';

interface DeviceCardProps {
  device: IoTDeviceItem;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device }) => {
  const isOnline = device.status === 'ONLINE';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.idGroup}>
          <Cpu size={16} color={theme.colors.primary} />
          <Text style={styles.deviceId}>{device.device_id}</Text>
        </View>
        <StatusBadge status={device.status} size="sm" />
      </View>

      <Text style={styles.deviceType}>{device.device_type}</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCell}>
          <Battery size={13} color={device.battery_pct > 20 ? theme.colors.success : theme.colors.critical} />
          <Text style={styles.statText}>{device.battery_pct.toFixed(0)}% Battery</Text>
        </View>

        <View style={styles.statCell}>
          <Wifi size={13} color={theme.colors.secondary} />
          <Text style={styles.statText}>{device.signal_rssi_dbm} dBm ({device.signal_quality})</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.footerItem}>
          <Clock size={12} color={theme.colors.textSecondary} />
          <Text style={styles.footerText}>
            {device.last_seen_seconds_ago < 60
              ? `${device.last_seen_seconds_ago}s ago`
              : `${Math.round(device.last_seen_seconds_ago / 60)}m ago`}
          </Text>
        </View>
        <Text style={styles.firmwareText}>{device.firmware_version}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  idGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deviceId: {
    ...theme.typography.headingSm,
    color: theme.colors.textPrimary,
  },
  deviceType: {
    ...theme.typography.bodySm,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 8,
  },
  statCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  firmwareText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});
