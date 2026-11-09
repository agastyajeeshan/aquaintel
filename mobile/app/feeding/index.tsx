import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { feedingApi, FeedingStatusResponse } from '../../src/services/api/feeding.api';
import { useFarmStore } from '../../src/store/farmStore';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { MetricCard } from '../../src/components/common/MetricCard';
import { ConfirmationDialog } from '../../src/components/common/ConfirmationDialog';
import { LoadingState, ErrorState } from '../../src/components/common/FeedbackStates';
import { Utensils, Play, Calculator, AlertTriangle, Clock } from 'lucide-react-native';

export default function FeedingScreen() {
  const router = useRouter();
  const { isOnline, operatingMode, ponds } = useFarmStore();

  const [feedingData, setFeedingData] = useState<FeedingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual feed burst state
  const [burstModal, setBurstModal] = useState<{
    visible: boolean;
    feederId: number;
    feederCode: string;
    pondId: number;
    amountKg: number;
  }>({
    visible: false,
    feederId: 0,
    feederCode: '',
    pondId: 1,
    amountKg: 5,
  });
  const [dispensing, setDispensing] = useState(false);

  // Interactive AI Calculator state
  const [calcVisible, setCalcVisible] = useState(false);
  const [calcBiomass, setCalcBiomass] = useState('1250');
  const [calcDoc, setCalcDoc] = useState('45');
  const [calcTemp, setCalcTemp] = useState('29.0');
  const [calcDo, setCalcDo] = useState('6.2');
  const [calcResult, setCalcResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);

  const loadData = async () => {
    setError(null);
    try {
      const data = await feedingApi.getStatus();
      setFeedingData(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load feeding status.');
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

  const handleOpenBurst = (feeder: any) => {
    if (!isOnline) {
      Alert.alert('Offline Action Blocked', 'Feeding actuation is disabled while offline.');
      return;
    }

    const pond = ponds.find((p) => p.id === feeder.pond_id);
    const pondDo = pond?.water_quality.do ?? 6.0;

    // Safety Interlock Check: Lockout if DO < 4.0 mg/L
    if (pondDo < 4.0) {
      Alert.alert(
        'Feeding Lockout Interlock',
        `Cannot dispense feed: Pond DO is ${pondDo.toFixed(2)} mg/L (Minimum safe DO for feeding is 4.00 mg/L). Shrimps stop metabolizing in hypoxic conditions.`
      );
      return;
    }

    setBurstModal({
      visible: true,
      feederId: feeder.id,
      feederCode: feeder.feeder_code,
      pondId: feeder.pond_id,
      amountKg: 5,
    });
  };

  const executeFeedBurst = async () => {
    setDispensing(true);
    try {
      await feedingApi.controlFeeder(burstModal.feederId, {
        action: 'DISPENSE',
        amount_kg: burstModal.amountKg,
      });
      Alert.alert('Feed Dispatched', `Dispensed ${burstModal.amountKg} kg from ${burstModal.feederCode}.`);
      setBurstModal((prev) => ({ ...prev, visible: false }));
      loadData();
    } catch (e: any) {
      Alert.alert('Feeding Error', e.message || 'Dispension failed.');
    } finally {
      setDispensing(false);
    }
  };

  const runCalculation = async () => {
    setCalculating(true);
    try {
      const res = await feedingApi.calculateRecommendation({
        biomass_kg: parseFloat(calcBiomass) || 1250,
        doc: parseInt(calcDoc, 10) || 45,
        temp_c: parseFloat(calcTemp) || 29.0,
        do_mg_l: parseFloat(calcDo) || 6.0,
      });
      setCalcResult(res);
    } catch (e: any) {
      Alert.alert('Calculation Error', e.message || 'Calculation failed.');
    } finally {
      setCalculating(false);
    }
  };

  const summary = feedingData?.summary;

  return (
    <View style={styles.container}>
      <AppHeader
        title="Smart Feeding Fleet"
        subtitle="10 Auto-Feeders • Biomass Demand"
        provenance={operatingMode}
        showBack
        onBack={() => router.back()}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {loading && !feedingData ? (
        <LoadingState message="Fetching smart feeder telemetry..." />
      ) : error && !feedingData ? (
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
          {/* Executive Summary */}
          {summary && (
            <View style={styles.kpiGrid}>
              <MetricCard
                title="Dispensed Today"
                value={summary.today_feed_kg}
                unit="kg"
                subtitle="Across 10 ponds"
                status="NORMAL"
                style={styles.kpiItem}
              />
              <MetricCard
                title="Recommended"
                value={summary.recommended_feed_kg}
                unit="kg"
                subtitle="AI optimized"
                status="NORMAL"
                style={styles.kpiItem}
              />
              <MetricCard
                title="Target FCR"
                value={summary.fcr}
                subtitle="Feed Conversion"
                status="NORMAL"
                style={styles.kpiItem}
              />
              <MetricCard
                title="Efficiency"
                value={`${summary.feeding_efficiency_pct}%`}
                subtitle="Consumption rate"
                status="NORMAL"
                style={styles.kpiItem}
              />
            </View>
          )}

          {/* AI Feeding Calculator Button */}
          <TouchableOpacity
            style={styles.calcToggle}
            onPress={() => setCalcVisible(!calcVisible)}
          >
            <View style={styles.calcToggleLeft}>
              <Calculator size={20} color={theme.colors.primary} />
              <Text style={styles.calcToggleTitle}>Interactive AI Feeding Model</Text>
            </View>
            <Text style={styles.calcToggleAction}>{calcVisible ? 'Hide' : 'Calculate'}</Text>
          </TouchableOpacity>

          {/* Calculator Card */}
          {calcVisible && (
            <View style={styles.calcCard}>
              <Text style={styles.calcDesc}>
                Simulate nutritional demand using biomass, water temperature, and dissolved oxygen.
              </Text>

              <View style={styles.calcInputs}>
                <View style={styles.calcField}>
                  <Text style={styles.calcLabel}>Biomass (kg)</Text>
                  <TextInput
                    style={styles.calcInput}
                    value={calcBiomass}
                    onChangeText={setCalcBiomass}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.calcField}>
                  <Text style={styles.calcLabel}>DOC (Days)</Text>
                  <TextInput
                    style={styles.calcInput}
                    value={calcDoc}
                    onChangeText={setCalcDoc}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.calcField}>
                  <Text style={styles.calcLabel}>Water Temp (°C)</Text>
                  <TextInput
                    style={styles.calcInput}
                    value={calcTemp}
                    onChangeText={setCalcTemp}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.calcField}>
                  <Text style={styles.calcLabel}>DO (mg/L)</Text>
                  <TextInput
                    style={styles.calcInput}
                    value={calcDo}
                    onChangeText={setCalcDo}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.calcRunBtn}
                onPress={runCalculation}
                disabled={calculating}
              >
                <Text style={styles.calcRunBtnText}>
                  {calculating ? 'Running Model...' : 'Calculate Optimal Ration'}
                </Text>
              </TouchableOpacity>

              {calcResult && (
                <View style={styles.calcResultBox}>
                  <Text style={styles.calcResultTitle}>
                    Recommended Daily Ration: {calcResult.recommended_feed_kg} kg
                  </Text>
                  <Text style={styles.calcResultStatus}>Status: {calcResult.status}</Text>
                  {calcResult.reduction_percentage > 0 && (
                    <Text style={styles.calcReduction}>
                      Reduced by {calcResult.reduction_percentage}% ({calcResult.reasons?.join(', ')})
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Feeder Fleet List */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pond Feeder Fleet</Text>
          </View>

          {feedingData?.feeders?.map((f) => (
            <View key={f.id} style={styles.feederCard}>
              <View style={styles.feederTop}>
                <View>
                  <Text style={styles.feederCode}>{f.feeder_code}</Text>
                  <Text style={styles.feederName}>
                    {f.name} • Pond {f.pond_id}
                  </Text>
                </View>
                <View
                  style={[
                    styles.feederStatusPill,
                    f.status === 'FEEDING'
                      ? { backgroundColor: theme.colors.successLight }
                      : f.status === 'STOPPED'
                      ? { backgroundColor: theme.colors.criticalLight }
                      : { backgroundColor: '#F1F5F9' },
                  ]}
                >
                  <Text
                    style={[
                      styles.feederStatusText,
                      f.status === 'FEEDING'
                        ? { color: theme.colors.success }
                        : f.status === 'STOPPED'
                        ? { color: theme.colors.critical }
                        : { color: theme.colors.textSecondary },
                    ]}
                  >
                    {f.status}
                  </Text>
                </View>
              </View>

              <View style={styles.feederStats}>
                <View style={styles.feederStat}>
                  <Text style={styles.feederStatLbl}>Dispensed</Text>
                  <Text style={styles.feederStatVal}>{f.dispensed_today_kg} kg</Text>
                </View>
                <View style={styles.feederStat}>
                  <Text style={styles.feederStatLbl}>Daily Quota</Text>
                  <Text style={styles.feederStatVal}>{f.daily_quota_kg} kg</Text>
                </View>
                <View style={styles.feederStat}>
                  <Text style={styles.feederStatLbl}>Hopper Level</Text>
                  <Text style={styles.feederStatVal}>{f.current_feed_level_kg} kg</Text>
                </View>
              </View>

              {f.reduction_percentage > 0 && (
                <View style={styles.reductionWarning}>
                  <AlertTriangle size={13} color={theme.colors.warning} />
                  <Text style={styles.reductionText}>
                    Ration reduced by {f.reduction_percentage}% ({f.reduction_reason || 'Environmental stress'})
                  </Text>
                </View>
              )}

              <View style={styles.feederFooter}>
                <View style={styles.nextSchedule}>
                  <Clock size={13} color={theme.colors.textSecondary} />
                  <Text style={styles.nextScheduleText}>Next: {f.next_feeding_time}</Text>
                </View>

                <TouchableOpacity
                  style={styles.dispenseBtn}
                  onPress={() => handleOpenBurst(f)}
                >
                  <Play size={12} color="#FFFFFF" />
                  <Text style={styles.dispenseBtnText}>Manual Burst</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Confirmation Dialog for Feed Burst */}
      <ConfirmationDialog
        visible={burstModal.visible}
        title={`Dispense Feed Burst (${burstModal.feederCode})`}
        message={`Are you sure you want to dispense 5.0 kg of pellets to Pond ${burstModal.pondId}?`}
        confirmLabel="Confirm Dispense"
        isLoading={dispensing}
        safetyNotice="Interlock Active: Dispension is blocked if DO drops below 4.0 mg/L or daily quota is exceeded."
        onConfirm={executeFeedBurst}
        onCancel={() => setBurstModal((prev) => ({ ...prev, visible: false }))}
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
  calcToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  calcToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calcToggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  calcToggleAction: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  calcCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  calcDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  calcInputs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  calcField: {
    flex: 1,
    minWidth: '45%',
  },
  calcLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  calcInput: {
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  calcRunBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  calcRunBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  calcResultBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.sm,
  },
  calcResultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  calcResultStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 2,
  },
  calcReduction: {
    fontSize: 11,
    color: theme.colors.warning,
    marginTop: 2,
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
  feederCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  feederTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  feederCode: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  feederName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  feederStatusPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.full,
  },
  feederStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  feederStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: 10,
    marginBottom: 8,
  },
  feederStat: {
    alignItems: 'center',
  },
  feederStatLbl: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  feederStatVal: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  reductionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.warningLight,
    padding: 6,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 8,
  },
  reductionText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },
  feederFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  nextSchedule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextScheduleText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  dispenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
  },
  dispenseBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
