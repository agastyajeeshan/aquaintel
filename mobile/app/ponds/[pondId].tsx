import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { pondsApi, PondDetailResponse } from '../../src/services/api/ponds.api';
import { aerationApi } from '../../src/services/api/aeration.api';
import { useFarmStore } from '../../src/store/farmStore';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { SensorStatusCard } from '../../src/components/common/SensorStatusCard';
import { TelemetryLineChart } from '../../src/components/charts/TelemetryLineChart';
import { ConfirmationDialog } from '../../src/components/common/ConfirmationDialog';
import { LoadingState, ErrorState } from '../../src/components/common/FeedbackStates';
import {
  Wind,
  Utensils,
  Activity,
  Cpu,
  History,
  ShieldAlert,
  Droplets,
  Play,
  Square,
  AlertTriangle,
} from 'lucide-react-native';

type PondTab = 'overview' | 'water_quality' | 'sensors' | 'feeding' | 'aeration' | 'health' | 'history';

export default function PondDetailScreen() {
  const router = useRouter();
  const { pondId } = useLocalSearchParams<{ pondId: string }>();
  const id = parseInt(pondId || '1', 10);
  const { isOnline, operatingMode } = useFarmStore();

  const [activeTab, setActiveTab] = useState<PondTab>('overview');
  const [timeRange, setTimeRange] = useState<'6h' | '24h' | '7d' | '30d'>('24h');
  const [pondData, setPondData] = useState<PondDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aerator command confirmation state
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    aeratorId: number;
    aeratorCode: string;
    action: 'START' | 'STOP' | 'AUTO' | 'EMERGENCY_OVERRIDE';
    isDangerous: boolean;
    safetyNotice?: string;
  }>({
    visible: false,
    aeratorId: 0,
    aeratorCode: '',
    action: 'START',
    isDangerous: false,
  });
  const [commandLoading, setCommandLoading] = useState(false);

  const loadPond = async () => {
    setError(null);
    try {
      const data = await pondsApi.getPondDetail(id, timeRange);
      setPondData(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load pond telemetry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPond();
  }, [id, timeRange]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPond();
  };

  const handleAeratorAction = (
    aeratorId: number,
    aeratorCode: string,
    action: 'START' | 'STOP' | 'AUTO' | 'EMERGENCY_OVERRIDE'
  ) => {
    if (!isOnline) {
      Alert.alert(
        'Offline Action Blocked',
        'Equipment actuation commands are strictly disabled while offline to prevent out-of-order execution.'
      );
      return;
    }

    const currentDo = pondData?.live_metrics?.do?.value;
    if (currentDo === undefined || currentDo === null || pondData?.overview?.is_stale) {
      Alert.alert(
        'Safety Lockout Active',
        'Aerator control blocked: Pond dissolved oxygen reading is unavailable or stale.'
      );
      return;
    }

    // Safety Interlock Check: Stop command when DO < 3.8 mg/L
    if (action === 'STOP' && currentDo < 3.8) {
      Alert.alert(
        'Safety Interlock Lockout',
        `Cannot STOP aerator: Pond DO (${currentDo.toFixed(2)} mg/L) is below emergency threshold (3.80 mg/L). Critical Hypoxia Protection active.`
      );
      return;
    }

    setConfirmModal({
      visible: true,
      aeratorId,
      aeratorCode,
      action,
      isDangerous: action === 'STOP' || action === 'EMERGENCY_OVERRIDE',
      safetyNotice:
        action === 'STOP'
          ? 'Notice: Aerator shutdown will be rejected by edge controller if DO drops below 3.8 mg/L.'
          : action === 'EMERGENCY_OVERRIDE'
          ? 'Emergency Boost: Forces continuous 100% duty cycle, overriding autonomous hysteresis.'
          : undefined,
    });
  };

  const executeAeratorCommand = async () => {
    setCommandLoading(true);
    try {
      const res = await aerationApi.controlAerator(confirmModal.aeratorId, confirmModal.action);
      Alert.alert(
        'Command Dispatched',
        `Aerator ${confirmModal.aeratorCode}: ${confirmModal.action} command accepted by controller.`
      );
      setConfirmModal((prev) => ({ ...prev, visible: false }));
      loadPond();
    } catch (e: any) {
      Alert.alert('Command Error', e.message || 'Actuation failed.');
    } finally {
      setCommandLoading(false);
    }
  };

  const overview = pondData?.overview;
  const live = pondData?.live_metrics;

  const tabs: Array<{ id: PondTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'water_quality', label: 'Water Quality' },
    { id: 'sensors', label: 'Sensors' },
    { id: 'feeding', label: 'Feeding' },
    { id: 'aeration', label: 'Aeration' },
    { id: 'health', label: 'Health' },
    { id: 'history', label: 'History' },
  ];

  return (
    <View style={styles.container}>
      <AppHeader
        title={overview ? `Pond ${String(overview.pond_number).padStart(2, '0')}` : `Pond ${id}`}
        subtitle={overview?.name || 'Commercial Prawn Pond'}
        provenance={operatingMode}
        showBack
        onBack={() => router.back()}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {loading && !pondData ? (
        <LoadingState message="Fetching pond telemetry & equipment status..." />
      ) : error && !pondData ? (
        <ErrorState message={error} onRetry={loadPond} />
      ) : (
        <>
          {/* Tab Navigation Strip */}
          <View style={styles.tabBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
              {tabs.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tabButton, activeTab === t.id && styles.tabButtonActive]}
                  onPress={() => setActiveTab(t.id)}
                >
                  <Text style={[styles.tabButtonText, activeTab === t.id && styles.tabButtonTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

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
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && overview && (
              <View>
                <View style={styles.overviewHero}>
                  <View style={styles.heroLeft}>
                    <Text style={styles.heroTitle}>{overview.name}</Text>
                    <Text style={styles.heroSpecies}>{overview.shrimp_species}</Text>
                  </View>
                  <StatusBadge status={overview.status as any} size="md" />
                </View>

                {overview.active_event && (
                  <View style={styles.eventBanner}>
                    <AlertTriangle size={16} color={theme.colors.warning} />
                    <Text style={styles.eventText}>{overview.active_event}</Text>
                  </View>
                )}

                <View style={styles.grid2}>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>AGE (DOC)</Text>
                    <Text style={styles.infoVal}>{overview.current_age_days} Days</Text>
                  </View>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>EST. BIOMASS</Text>
                    <Text style={styles.infoVal}>{overview.estimated_biomass_kg?.toLocaleString()} kg</Text>
                  </View>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>SURVIVAL RATE</Text>
                    <Text style={styles.infoVal}>{overview.survival_rate_pct}%</Text>
                  </View>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>TARGET FCR</Text>
                    <Text style={styles.infoVal}>{overview.target_fcr}</Text>
                  </View>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>POND AREA</Text>
                    <Text style={styles.infoVal}>{overview.area_ha} Hectare</Text>
                  </View>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>WATER VOLUME</Text>
                    <Text style={styles.infoVal}>{overview.water_volume_m3?.toLocaleString()} m³</Text>
                  </View>
                </View>

                {/* Quick Telemetry Glance */}
                {live && (
                  <View style={styles.glanceCard}>
                    <Text style={styles.glanceTitle}>Live Telemetry Snapshot</Text>
                    <View style={styles.glanceRow}>
                      <View style={styles.glanceCell}>
                        <Text style={styles.glanceLbl}>DO</Text>
                        <Text style={styles.glanceVal}>{live.do?.value?.toFixed(1)} mg/L</Text>
                      </View>
                      <View style={styles.glanceCell}>
                        <Text style={styles.glanceLbl}>Temp</Text>
                        <Text style={styles.glanceVal}>{live.temperature?.value?.toFixed(1)}°C</Text>
                      </View>
                      <View style={styles.glanceCell}>
                        <Text style={styles.glanceLbl}>pH</Text>
                        <Text style={styles.glanceVal}>{live.ph?.value?.toFixed(2)}</Text>
                      </View>
                      <View style={styles.glanceCell}>
                        <Text style={styles.glanceLbl}>Salinity</Text>
                        <Text style={styles.glanceVal}>{live.salinity?.value?.toFixed(1)} ppt</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 2. WATER QUALITY TAB */}
            {activeTab === 'water_quality' && (
              <View>
                <View style={styles.rangeSelector}>
                  {(['6h', '24h', '7d', '30d'] as const).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.rangeBtn, timeRange === r && styles.rangeBtnActive]}
                      onPress={() => setTimeRange(r)}
                    >
                      <Text style={[styles.rangeBtnText, timeRange === r && styles.rangeBtnTextActive]}>
                        {r.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.deepDiveBtn}
                  onPress={() => router.push(`/water-quality/${id}` as any)}
                >
                  <Droplets size={16} color={theme.colors.primary} />
                  <Text style={styles.deepDiveBtnText}>Open Full Water-Quality Analytics →</Text>
                </TouchableOpacity>

                {/* DO Chart */}
                <TelemetryLineChart
                  data={
                    pondData?.chart_series
                      ?.filter((s) => typeof s.do === 'number')
                      .map((s) => ({
                        timestamp: s.timestamp.split(' ')[1] || s.timestamp,
                        value: s.do as number,
                      })) || []
                  }
                  title="Dissolved Oxygen (DO)"
                  unit="mg/L"
                  optimalMin={5.0}
                  optimalMax={7.5}
                  criticalMin={3.8}
                  color={theme.colors.primary}
                />

                {/* Temperature Chart */}
                <TelemetryLineChart
                  data={
                    pondData?.chart_series
                      ?.filter((s) => typeof s.temperature === 'number')
                      .map((s) => ({
                        timestamp: s.timestamp.split(' ')[1] || s.timestamp,
                        value: s.temperature as number,
                      })) || []
                  }
                  title="Water Temperature"
                  unit="°C"
                  optimalMin={26.0}
                  optimalMax={32.0}
                  criticalMin={24.0}
                  criticalMax={34.0}
                  color="#D97706"
                />

                {/* pH Chart */}
                <TelemetryLineChart
                  data={
                    pondData?.chart_series
                      ?.filter((s) => typeof s.ph === 'number')
                      .map((s) => ({
                        timestamp: s.timestamp.split(' ')[1] || s.timestamp,
                        value: s.ph as number,
                      })) || []
                  }
                  title="Water pH"
                  unit="pH"
                  optimalMin={7.5}
                  optimalMax={8.3}
                  criticalMin={7.0}
                  criticalMax={8.8}
                  color={theme.colors.secondary}
                />

                {/* Parameter Gauge Cards */}
                {live && (
                  <View style={styles.sensorGrid}>
                    <SensorStatusCard parameter="do" value={live.do?.value} timestamp={overview?.last_updated} provenance={overview?.provenance} isStale={overview?.is_stale} />
                    <SensorStatusCard parameter="temperature" value={live.temperature?.value} timestamp={overview?.last_updated} provenance={overview?.provenance} isStale={overview?.is_stale} />
                    <SensorStatusCard parameter="ph" value={live.ph?.value} timestamp={overview?.last_updated} provenance={overview?.provenance} isStale={overview?.is_stale} />
                    <SensorStatusCard parameter="salinity" value={live.salinity?.value} timestamp={overview?.last_updated} provenance={overview?.provenance} isStale={overview?.is_stale} />
                    <SensorStatusCard parameter="ammonia" value={live.ammonia?.value} timestamp={overview?.last_updated} provenance={overview?.provenance} isStale={overview?.is_stale} />
                    <SensorStatusCard parameter="turbidity" value={live.turbidity?.value} timestamp={overview?.last_updated} provenance={overview?.provenance} isStale={overview?.is_stale} />
                  </View>
                )}
              </View>
            )}

            {/* 3. SENSORS TAB */}
            {activeTab === 'sensors' && (
              <View>
                <Text style={styles.sectionHeader}>Connected Pond Probes & Diagnostics</Text>
                {pondData?.sensors && pondData.sensors.length > 0 ? (
                  pondData.sensors.map((s) => {
                    const paramKey = s.sensor_type as any;
                    return (
                      <SensorStatusCard
                        key={s.id}
                        parameter={paramKey}
                        value={s.status === 'OFFLINE' ? null : s.current_value}
                        sensorId={s.device_id}
                        pondLabel={`Pond ${String(overview?.pond_number ?? id).padStart(2, '0')}`}
                        timestamp={s.last_reading_at}
                        provenance={s.provenance}
                        isStale={s.is_stale}
                      />
                    );
                  })
                ) : (
                  <Text style={styles.emptyText}>No sensor probes registered for this pond.</Text>
                )}
              </View>
            )}

            {/* 3. AERATION TAB */}
            {activeTab === 'aeration' && (
              <View>
                <Text style={styles.sectionHeader}>Connected Aerator Grid</Text>
                {pondData?.aerators && pondData.aerators.length > 0 ? (
                  pondData.aerators.map((a: any) => {
                    const isRunning = a.status === 'RUNNING';
                    return (
                      <View key={a.id} style={styles.aeratorCard}>
                        <View style={styles.aeratorTop}>
                          <View>
                            <Text style={styles.aeratorCode}>{a.code}</Text>
                            <Text style={styles.aeratorName}>{a.name} • {a.power_rating_kw} kW</Text>
                          </View>
                          <StatusBadge status={isRunning ? 'ONLINE' : 'OFFLINE'} label={a.status} size="sm" />
                        </View>

                        <View style={styles.aeratorMeta}>
                          <Text style={styles.aeratorMetaText}>Mode: {a.mode}</Text>
                          <Text style={styles.aeratorMetaText}>Runtime: {a.runtime_hours_today?.toFixed(1)} hrs</Text>
                          <Text style={styles.aeratorMetaText}>Energy: {a.total_kwh_today?.toFixed(1)} kWh</Text>
                        </View>

                        <View style={styles.aeratorActions}>
                          {isRunning ? (
                            <TouchableOpacity
                              style={[styles.ctrlBtn, styles.stopBtn]}
                              onPress={() => handleAeratorAction(a.id, a.code, 'STOP')}
                            >
                              <Square size={14} color="#FFFFFF" />
                              <Text style={styles.ctrlBtnText}>STOP AERATOR</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[styles.ctrlBtn, styles.startBtn]}
                              onPress={() => handleAeratorAction(a.id, a.code, 'START')}
                            >
                              <Play size={14} color="#FFFFFF" />
                              <Text style={styles.ctrlBtnText}>START AERATOR</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.ctrlBtn, styles.autoBtn]}
                            onPress={() => handleAeratorAction(a.id, a.code, 'AUTO')}
                          >
                            <Text style={styles.autoBtnText}>AUTO</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.emptyText}>No aerators configured for this pond.</Text>
                )}
              </View>
            )}

            {/* 4. FEEDING TAB */}
            {activeTab === 'feeding' && (
              <View>
                <Text style={styles.sectionHeader}>Smart Feeder Status</Text>
                {pondData?.feeder ? (
                  <View style={styles.feederCard}>
                    <Text style={styles.feederCode}>{pondData.feeder.code}</Text>
                    <Text style={styles.feederName}>{pondData.feeder.name} ({pondData.feeder.feed_type})</Text>

                    <View style={styles.feederGrid}>
                      <View style={styles.feederCell}>
                        <Text style={styles.feederLbl}>Dispensed Today</Text>
                        <Text style={styles.feederVal}>{pondData.feeder.dispensed_today_kg} kg</Text>
                      </View>
                      <View style={styles.feederCell}>
                        <Text style={styles.feederLbl}>Daily Quota</Text>
                        <Text style={styles.feederVal}>{pondData.feeder.daily_quota_kg} kg</Text>
                      </View>
                      <View style={styles.feederCell}>
                        <Text style={styles.feederLbl}>Hopper Level</Text>
                        <Text style={styles.feederVal}>{pondData.feeder.current_feed_level_kg} kg</Text>
                      </View>
                    </View>

                    <Text style={styles.nextFeed}>Next Scheduled Dispense: {pondData.feeder.next_feeding_time}</Text>
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No feeder configured for this pond.</Text>
                )}
                <TouchableOpacity
                  style={styles.deepDiveBtn}
                  onPress={() => router.push('/feeding/history' as any)}
                >
                  <Utensils size={16} color={theme.colors.primary} />
                  <Text style={styles.deepDiveBtnText}>View Full Feeding History →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 5. HEALTH & DISEASE TAB */}
            {activeTab === 'health' && (
              <View>
                <Text style={styles.sectionHeader}>Pathogen Bio-Security Predictions</Text>
                {pondData?.disease_predictions && pondData.disease_predictions.length > 0 ? (
                  pondData.disease_predictions.map((dp: any, idx: number) => (
                    <View key={idx} style={styles.diseaseCard}>
                      <View style={styles.diseaseTop}>
                        <Text style={styles.diseaseName}>{dp.disease_name}</Text>
                        <StatusBadge status={dp.risk_level} size="sm" />
                      </View>
                      <Text style={styles.riskScore}>Risk Score: {dp.risk_score}/100</Text>
                      <Text style={styles.diseaseExpl}>{dp.explanation}</Text>
                      {dp.recommendations && dp.recommendations.length > 0 && (
                        <View style={styles.diseaseRecBox}>
                          <Text style={styles.diseaseRecTitle}>Recommendation:</Text>
                          <Text style={styles.diseaseRecText}>{dp.recommendations[0]}</Text>
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No disease risk predictions recorded.</Text>
                )}
                <Text style={styles.disclaimerText}>
                  Disclaimer: Decision-support risk models only. Does not replace accredited laboratory PCR assays.
                </Text>
              </View>
            )}

            {/* 6. HISTORY TAB */}
            {activeTab === 'history' && (
              <View>
                <Text style={styles.sectionHeader}>Recent Pond Incidents & Alerts</Text>
                {pondData?.alerts && pondData.alerts.length > 0 ? (
                  pondData.alerts.map((al: any) => (
                    <View key={al.id} style={styles.historyCard}>
                      <View style={styles.historyTop}>
                        <StatusBadge status={al.severity} size="sm" />
                        <Text style={styles.historyDate}>{al.created_at}</Text>
                      </View>
                      <Text style={styles.historyTitle}>{al.title}</Text>
                      <Text style={styles.historyDesc}>{al.description}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No recent alerts recorded for this pond.</Text>
                )}
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* Aerator Command Confirmation Dialog */}
      <ConfirmationDialog
        visible={confirmModal.visible}
        title={`Confirm ${confirmModal.action}`}
        message={`Are you sure you want to ${confirmModal.action.toLowerCase()} ${confirmModal.aeratorCode}?`}
        confirmLabel={`Confirm ${confirmModal.action}`}
        isDangerous={confirmModal.isDangerous}
        isLoading={commandLoading}
        safetyNotice={confirmModal.safetyNotice}
        onConfirm={executeAeratorCommand}
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
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabScroll: {
    paddingHorizontal: theme.spacing.md,
    gap: 8,
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabButtonTextActive: {
    color: theme.colors.primary,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  overviewHero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  heroLeft: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  heroSpecies: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  eventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.warningLight,
    borderWidth: 1,
    borderColor: theme.colors.warningBorder,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  eventText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    flex: 1,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    flex: 1,
    minWidth: '47%',
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoVal: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  glanceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  glanceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  glanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  glanceCell: {
    alignItems: 'center',
  },
  glanceLbl: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  glanceVal: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  rangeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  rangeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  rangeBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  rangeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  rangeBtnTextActive: {
    color: '#FFFFFF',
  },
  sensorGrid: {
    marginTop: theme.spacing.sm,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  aeratorCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
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
  aeratorName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  aeratorMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: 8,
    marginBottom: 10,
  },
  aeratorMetaText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  aeratorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  ctrlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
  },
  startBtn: {
    backgroundColor: theme.colors.success,
  },
  stopBtn: {
    backgroundColor: theme.colors.critical,
  },
  ctrlBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  autoBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    maxWidth: 70,
  },
  autoBtnText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  feederCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  feederCode: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  feederName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  feederGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: 10,
    marginBottom: 10,
  },
  feederCell: {
    alignItems: 'center',
  },
  feederLbl: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  feederVal: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  nextFeed: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  diseaseCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  diseaseTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  diseaseName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  riskScore: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  diseaseExpl: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  diseaseRecBox: {
    backgroundColor: theme.colors.primaryLight,
    padding: 8,
    borderRadius: theme.borderRadius.sm,
  },
  diseaseRecTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  diseaseRecText: {
    fontSize: 11,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  historyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  historyDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  deepDiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 10,
    marginBottom: theme.spacing.md,
  },
  deepDiveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  disclaimerText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
});
