import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { devicesApi } from '../../src/services/api/devices.api';
import { useFarmStore } from '../../src/store/farmStore';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { DeviceCard } from '../../src/components/common/DeviceCard';
import { MetricCard } from '../../src/components/common/MetricCard';
import { LoadingState, ErrorState, EmptyState } from '../../src/components/common/FeedbackStates';
import { IoTDeviceItem } from '../../src/types';
import { Radio, Wifi, BatteryCharging, Plus } from 'lucide-react-native';

export default function DevicesScreen() {
  const router = useRouter();
  const { operatingMode } = useFarmStore();

  const [deviceData, setDeviceData] = useState<{
    summary?: any;
    devices: IoTDeviceItem[];
  }>({ devices: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = async () => {
    setError(null);
    try {
      const data = await devicesApi.getDevices();
      setDeviceData(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load IoT device telemetry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDevices();
  };

  const summary = deviceData.summary;

  return (
    <View style={styles.container}>
      <AppHeader
        title="IoT Devices & Gateway"
        subtitle="LoRaWAN 865.2 MHz Network"
        provenance={operatingMode}
        showBack
        onBack={() => router.back()}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {loading && deviceData.devices.length === 0 ? (
        <LoadingState message="Scanning LoRa gateway & sensor nodes..." />
      ) : error && deviceData.devices.length === 0 ? (
        <ErrorState message={error} onRetry={loadDevices} />
      ) : (
        <FlatList
          data={deviceData.devices}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <DeviceCard
              device={item}
              onPress={() => router.push(`/devices/${item.device_id}` as any)}
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
          ListHeaderComponent={
            summary ? (
              <View style={styles.headerSection}>
                <View style={styles.kpiGrid}>
                  <MetricCard
                    title="Online Nodes"
                    value={`${summary.online_devices}/${summary.total_devices}`}
                    subtitle="Submerged probes"
                    status="NORMAL"
                    style={styles.kpiItem}
                  />
                  <MetricCard
                    title="Gateway Link"
                    value={summary.gateway_status}
                    subtitle="Industrial RTU"
                    status="NORMAL"
                    style={styles.kpiItem}
                  />
                  <MetricCard
                    title="Average RSSI"
                    value={`${summary.average_rssi_dbm} dBm`}
                    subtitle="Excellent link"
                    status="NORMAL"
                    style={styles.kpiItem}
                  />
                  <MetricCard
                    title="LoRa Channel"
                    value="865.2 MHz"
                    subtitle="Indian IN865 Band"
                    status="NORMAL"
                    style={styles.kpiItem}
                  />
                </View>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Connected Sensor & Actuator Nodes</Text>
                  <Text style={styles.sectionMeta}>{deviceData.devices.length} Total</Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title="No IoT Nodes Discovered"
              description="Verify physical LoRa gateway power and antenna connections."
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
  headerSection: {
    marginBottom: theme.spacing.md,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  kpiItem: {
    flex: 1,
    minWidth: '47%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sectionMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
