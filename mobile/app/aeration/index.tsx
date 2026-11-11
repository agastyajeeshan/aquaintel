import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { aerationApi, AerationStatusResponse } from '../../src/services/api/aeration.api';
import { useFarmStore } from '../../src/store/farmStore';
import { useAuthStore } from '../../src/store/authStore';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { MetricCard } from '../../src/components/common/MetricCard';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { ConfirmationDialog } from '../../src/components/common/ConfirmationDialog';
import { LoadingState, ErrorState } from '../../src/components/common/FeedbackStates';
import { Wind, Play, Square, AlertTriangle, ShieldCheck, Zap } from 'lucide-react-native';

export default function AerationScreen() {
  const router = useRouter();
  const { isOnline, operatingMode, ponds } = useFarmStore();
  const user = useAuthStore((s) => s.user);

  const [aerationData, setAerationData] = useState<AerationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Command Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    aeratorId: number;
    aeratorCode: string;
    pondId: number;
    action: 'START' | 'STOP' | 'AUTO' | 'EMERGENCY_OVERRIDE';
    isDangerous: boolean;
    safetyNotice?: string;
  }>({
    visible: false,
    aeratorId: 0,
    aeratorCode: '',
    pondId: 1,
    action: 'START',
    isDangerous: false,
  });
  const [commandLoading, setCommandLoading] = useState(false);

  const loadData = async () => {
    setError(null);
    try {
      const data = await aerationApi.getStatus();
      setAerationData(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load aeration grid.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleActionClick = (
    aerator: any,
    action: 'START' | 'STOP' | 'AUTO' | 'EMERGENCY_OVERRIDE'
  ) => {
    if (!isOnline) {
      Alert.alert(
        'Offline Action Blocked',
        'Aeration control commands are disabled while offline to prevent dangerous race conditions.'
      );
      return;
    }

    if (user?.role === 'VIEWER') {
      Alert.alert('Insufficient Permissions', 'Read-only roles cannot operate farm equipment.');
      return;
    }

    const pond = ponds.find((p) => p.id === aerator.pond_id);
    const currentPondDo = aerator.pond_do ?? pond?.water_quality?.do;
    const isStale = pond?.water_quality?.stale;

    // Safety Interlock: Block STOP when DO is unavailable/stale or < 3.8 mg/L
    if (action === 'STOP') {
      if (currentPondDo === undefined || currentPondDo === null || isStale) {
        Alert.alert(
          'Safety Lockout Active',
          'Aerator stop rejected: Pond DO telemetry is currently unavailable or stale.'
        );
        return;
      }
      if (currentPondDo < 3.8) {
        Alert.alert(
          'Safety Lockout Active',
          `Aerator stop rejected: Pond DO (${currentPondDo.toFixed(2)} mg/L) is below emergency limit (3.80 mg/L). Shrimps are at immediate risk of hypoxia mortality.`
        );
        return;
      }
    }

    setConfirmModal({
      visible: true,
      aeratorId: aerator.id,
      aeratorCode: aerator.aerator_code,
      pondId: aerator.pond_id,
      action,
      isDangerous: action === 'STOP' || action === 'EMERGENCY_OVERRIDE',
      safetyNotice:
        action === 'STOP'
          ? 'Notice: Backend & edge safety controller will reject shutdown if pond DO drops below 3.8 mg/L.'
          : action === 'EMERGENCY_OVERRIDE'
          ? 'Emergency Boost: Continuous 100% duty cycle, bypassing hysteresis.'
          : undefined,
    });
  };

  const executeCommand = async () => {
    setCommandLoading(true);
    try {
      const res = await aerationApi.controlAerator(confirmModal.aeratorId, confirmModal.action);
      const stage = res.command_status || 'EXECUTED';
      const verified = res.verified_state || res.new_status || 'UNKNOWN';
      Alert.alert(
        `Command ${stage}`,
        `Aerator ${confirmModal.aeratorCode}: ${confirmModal.action} • Verified State: ${verified}`
      );
      setConfirmModal((prev) => ({ ...prev, visible: false }));
      loadData();
    } catch (e: any) {
      Alert.alert('Command Rejected', e.message || 'Actuation command rejected by safety interlock.');
    } finally {
      setCommandLoading(false);
    }
  };

  const summary = aerationData?.summary;

  return (
    <View style={styles.container}>
      <AppHeader
        title="Aeration Grid"
        subtitle={`${summary?.total_aerators ?? '—'} Paddlewheels & Diffusers`}
        provenance={operatingMode}
        showBack
        onBack={() => router.back()}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {loading && !aerationData ? (
        <LoadingState message="Fetching aerator status & power telemetry..." />
      ) : error && !aerationData ? (
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
          {/* Summary KPIs */}
          {summary && (
            <View style={styles.kpiGrid}>
              <MetricCard
                title="Active Aerators"
                value={`${summary.active_aerators}/${summary.total_aerators}`}
                subtitle={`${summary.standby_aerators} on standby`}
                status="NORMAL"
                style={styles.kpiItem}
              />
              <MetricCard
                title="Power Consumed"
                value={summary.total_kwh_today}
                unit="kWh"
                subtitle="Today's total"
                status="NORMAL"
                style={styles.kpiItem}
              />
              <MetricCard
                title="Daily Cost"
                value={`₹${summary.total_cost_inr.toLocaleString()}`}
                subtitle="Tariff ₹7.50 / kWh"
                status="NORMAL"
                style={styles.kpiItem}
              />
              <MetricCard
                title="Hysteresis"
                value={`${summary.hysteresis_window_minutes} min`}
                subtitle="Anti-cycling window"
                status="NORMAL"
                style={styles.kpiItem}
              />
            </View>
          )}

          {/* Safety Architecture Notice */}
          <View style={styles.safetyCard}>
            <View style={styles.safetyHeader}>
              <ShieldCheck size={18} color={theme.colors.primary} />
              <Text style={styles.safetyTitle}>Edge Safety Interlocks Active</Text>
            </View>
            <Text style={styles.safetyText}>
              Emergency Aeration is enforced locally by edge RTU controllers. Remote stop commands are strictly locked out whenever Pond DO falls below 3.8 mg/L.
            </Text>
          </View>

          {/* Aerators Grid */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Individual Aerator Units</Text>
          </View>

          {aerationData?.aerators?.map((a) => {
            const isRunning = a.status === 'RUNNING';
            return (
              <View key={a.id} style={styles.aeratorCard}>
                <View style={styles.aeratorTop}>
                  <View>
                    <Text style={styles.aeratorCode}>{a.aerator_code}</Text>
                    <Text style={styles.aeratorPond}>
                      Pond {String(a.pond_id).padStart(2, '0')} • {a.name} ({a.power_rating_kw} kW)
                    </Text>
                  </View>
                  <StatusBadge
                    status={isRunning ? 'ONLINE' : 'OFFLINE'}
                    label={a.status}
                    size="sm"
                  />
                </View>

                <View style={styles.statsStrip}>
                  <View style={styles.statCell}>
                    <Text style={styles.statLbl}>Pond DO</Text>
                    <Text
                      style={[
                        styles.statVal,
                        { color: a.pond_do < 3.8 ? theme.colors.critical : theme.colors.textPrimary },
                      ]}
                    >
                      {a.pond_do?.toFixed(2)} mg/L
                    </Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={styles.statLbl}>Mode</Text>
                    <Text style={styles.statVal}>{a.mode}</Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={styles.statLbl}>Runtime Today</Text>
                    <Text style={styles.statVal}>{a.runtime_hours_today?.toFixed(1)} hrs</Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={styles.statLbl}>Energy</Text>
                    <Text style={styles.statVal}>{a.total_kwh_today?.toFixed(1)} kWh</Text>
                  </View>
                </View>

                {a.reason && (
                  <Text style={styles.reasonText}>Controller: {a.reason}</Text>
                )}

                <View style={styles.btnRow}>
                  {isRunning ? (
                    <TouchableOpacity
                      style={[styles.actBtn, styles.stopBtn]}
                      onPress={() => handleActionClick(a, 'STOP')}
                    >
                      <Square size={13} color="#FFFFFF" />
                      <Text style={styles.actBtnText}>STOP</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actBtn, styles.startBtn]}
                      onPress={() => handleActionClick(a, 'START')}
                    >
                      <Play size={13} color="#FFFFFF" />
                      <Text style={styles.actBtnText}>START</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actBtn, styles.autoBtn]}
                    onPress={() => handleActionClick(a, 'AUTO')}
                  >
                    <Text style={styles.autoBtnText}>AUTO</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actBtn, styles.boostBtn]}
                    onPress={() => handleActionClick(a, 'EMERGENCY_OVERRIDE')}
                  >
                    <Zap size={13} color="#FFFFFF" />
                    <Text style={styles.actBtnText}>BOOST</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        visible={confirmModal.visible}
        title={`Confirm ${confirmModal.action}`}
        message={`Are you sure you want to ${confirmModal.action.toLowerCase()} ${confirmModal.aeratorCode} (Pond ${confirmModal.pondId})?`}
        confirmLabel={`Confirm ${confirmModal.action}`}
        isDangerous={confirmModal.isDangerous}
        isLoading={commandLoading}
        safetyNotice={confirmModal.safetyNotice}
        onConfirm={executeCommand}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
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
  safetyCard: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  safetyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  safetyText: {
    fontSize: 11,
    color: theme.colors.textPrimary,
    lineHeight: 16,
  },
  sectionHeader: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  aeratorCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  aeratorTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  aeratorCode: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  aeratorPond: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  statsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: 8,
    marginBottom: 6,
  },
  statCell: {
    alignItems: 'center',
  },
  statLbl: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  statVal: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 1,
  },
  reasonText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
  },
  startBtn: {
    backgroundColor: theme.colors.success,
  },
  stopBtn: {
    backgroundColor: theme.colors.critical,
  },
  autoBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  autoBtnText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  boostBtn: {
    backgroundColor: '#D97706',
  },
  actBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
