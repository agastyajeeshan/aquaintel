import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFarmStore } from '../../src/store/farmStore';
import { useAuthStore } from '../../src/store/authStore';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { MetricCard } from '../../src/components/common/MetricCard';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { OfflineBanner, LoadingState, ErrorState } from '../../src/components/common/FeedbackStates';
import {
  Waves,
  Wind,
  Utensils,
  Sparkles,
  ShieldAlert,
  Cpu,
  FileText,
  Thermometer,
  Activity,
  ArrowRight,
  Droplets,
} from 'lucide-react-native';

export default function DashboardScreen() {
  const router = useRouter();
  const {
    overview,
    ponds,
    isLoading,
    isOnline,
    lastUpdated,
    operatingMode,
    error,
    fetchFarmData,
  } = useFarmStore();
  const user = useAuthStore((s) => s.user);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchFarmData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFarmData();
    setRefreshing(false);
  };

  // Calculate fleet-wide average telemetry
  const calculateAverages = () => {
    if (!ponds || ponds.length === 0) return null;
    const count = ponds.length;
    const avgDo = ponds.reduce((sum, p) => sum + (p.water_quality?.do || 0), 0) / count;
    const avgTemp = ponds.reduce((sum, p) => sum + (p.water_quality?.temperature || 0), 0) / count;
    const avgPh = ponds.reduce((sum, p) => sum + (p.water_quality?.ph || 0), 0) / count;
    const avgSalinity = ponds.reduce((sum, p) => sum + (p.water_quality?.salinity || 0), 0) / count;
    const avgAmmonia = ponds.reduce((sum, p) => sum + (p.water_quality?.ammonia || 0), 0) / count;
    const avgTurbidity = ponds.reduce((sum, p) => sum + (p.water_quality?.turbidity || 0), 0) / count;

    return { avgDo, avgTemp, avgPh, avgSalinity, avgAmmonia, avgTurbidity };
  };

  const averages = calculateAverages();
  const criticalPonds = ponds.filter((p) => p.status === 'RED');
  const warningPonds = ponds.filter((p) => p.status === 'YELLOW');

  return (
    <View style={styles.container}>
      <AppHeader
        title={overview?.farm_name || 'AquaIntel Farm'}
        subtitle={overview?.location || 'Nellore, Andhra Pradesh'}
        provenance={operatingMode}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {!isOnline && (
        <OfflineBanner
          lastSynced={lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : undefined}
          onRefresh={onRefresh}
        />
      )}

      {isLoading && !overview ? (
        <LoadingState message="Fetching farm fleet telemetry..." />
      ) : error && !overview ? (
        <ErrorState message={error} onRetry={fetchFarmData} />
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
          {/* Welcome Strip */}
          <View style={styles.welcomeStrip}>
            <View>
              <Text style={styles.greetingText}>
                Hello, {user?.full_name || 'Farm Operator'}
              </Text>
              <Text style={styles.roleSubtext}>
                Role: {user?.role || 'OPERATOR'} • 10 Hectare Delta Facility
              </Text>
            </View>
            <StatusBadge status={operatingMode} size="sm" />
          </View>

          {/* Critical Alerts Banner (if any) */}
          {(overview?.active_alerts_count ?? 0) > 0 && (
            <TouchableOpacity
              style={styles.alertBanner}
              onPress={() => router.push('/(tabs)/alerts')}
              activeOpacity={0.8}
            >
              <ShieldAlert size={20} color={theme.colors.critical} />
              <View style={styles.alertBannerText}>
                <Text style={styles.alertBannerTitle}>
                  {overview?.active_alerts_count} Active Farm Alerts
                </Text>
                <Text style={styles.alertBannerSubtitle}>
                  Tap to triage hypoxia and environmental warnings
                </Text>
              </View>
              <ArrowRight size={18} color={theme.colors.critical} />
            </TouchableOpacity>
          )}

          {/* Primary Farm KPIs */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fleet Overview KPIs</Text>
            <Text style={styles.sectionMeta}>{overview?.total_ponds || 10} Ponds Total</Text>
          </View>

          <View style={styles.kpiGrid}>
            <MetricCard
              title="Total Biomass"
              value={overview?.total_biomass_kg?.toLocaleString() || '12,500'}
              unit="kg"
              subtitle="Penaeus vannamei"
              status="NORMAL"
              style={styles.kpiItem}
            />
            <MetricCard
              title="Today's Feed"
              value={overview?.today_feed_kg?.toFixed(0) || '384'}
              unit="kg"
              subtitle="94% Consumption rate"
              status="NORMAL"
              style={styles.kpiItem}
            />
            <MetricCard
              title="Aerator Power"
              value={overview?.energy_consumption_kwh?.toFixed(0) || '412'}
              unit="kWh"
              subtitle={`₹${overview?.energy_cost_inr || 3090} today`}
              status="NORMAL"
              style={styles.kpiItem}
            />
            <MetricCard
              title="IoT Devices"
              value={overview?.devices_online_ratio || '11/11'}
              unit="Online"
              subtitle="LoRaWAN IN865"
              status="NORMAL"
              style={styles.kpiItem}
            />
          </View>

          {/* Water Quality Fleet Matrix */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fleet Water Quality Matrix</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/ponds')}>
              <Text style={styles.viewAllText}>View All Ponds →</Text>
            </TouchableOpacity>
          </View>

          {averages && (
            <View style={styles.wqMatrixCard}>
              <View style={styles.wqRow}>
                <View style={styles.wqCell}>
                  <Text style={styles.wqLabel}>AVERAGE DO</Text>
                  <Text
                    style={[
                      styles.wqValue,
                      { color: averages.avgDo < 3.8 ? theme.colors.critical : theme.colors.primary },
                    ]}
                  >
                    {averages.avgDo.toFixed(2)} <Text style={styles.wqUnit}>mg/L</Text>
                  </Text>
                  <Text style={styles.wqTarget}>Target: 5.0–7.5</Text>
                </View>

                <View style={styles.wqDivider} />

                <View style={styles.wqCell}>
                  <Text style={styles.wqLabel}>TEMPERATURE</Text>
                  <Text style={styles.wqValue}>
                    {averages.avgTemp.toFixed(1)} <Text style={styles.wqUnit}>°C</Text>
                  </Text>
                  <Text style={styles.wqTarget}>Target: 26.0–32.0</Text>
                </View>

                <View style={styles.wqDivider} />

                <View style={styles.wqCell}>
                  <Text style={styles.wqLabel}>pH</Text>
                  <Text style={styles.wqValue}>
                    {averages.avgPh.toFixed(2)}
                  </Text>
                  <Text style={styles.wqTarget}>Target: 7.5–8.3</Text>
                </View>
              </View>

              <View style={[styles.wqRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
                <View style={styles.wqCell}>
                  <Text style={styles.wqLabel}>SALINITY</Text>
                  <Text style={styles.wqValue}>
                    {averages.avgSalinity.toFixed(1)} <Text style={styles.wqUnit}>ppt</Text>
                  </Text>
                  <Text style={styles.wqTarget}>Target: 12.0–25.0</Text>
                </View>

                <View style={styles.wqDivider} />

                <View style={styles.wqCell}>
                  <Text style={styles.wqLabel}>AMMONIA (TAN)</Text>
                  <Text style={styles.wqValue}>
                    {averages.avgAmmonia.toFixed(3)} <Text style={styles.wqUnit}>mg/L</Text>
                  </Text>
                  <Text style={styles.wqTarget}>Max: 0.100</Text>
                </View>

                <View style={styles.wqDivider} />

                <View style={styles.wqCell}>
                  <Text style={styles.wqLabel}>TURBIDITY</Text>
                  <Text style={styles.wqValue}>
                    {averages.avgTurbidity.toFixed(1)} <Text style={styles.wqUnit}>cm</Text>
                  </Text>
                  <Text style={styles.wqTarget}>Secchi: 30–45</Text>
                </View>
              </View>
            </View>
          )}

          {/* Quick Action Navigation Grid */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Farm Operations & Control</Text>
          </View>

          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/aeration')}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#E0F2FE' }]}>
                <Wind size={22} color="#0284C7" />
              </View>
              <Text style={styles.actionCardTitle}>Aeration Grid</Text>
              <Text style={styles.actionCardSubtitle}>40 Aerators • Interlocks</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/feeding')}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconBox, { backgroundColor: theme.colors.primaryLight }]}>
                <Utensils size={22} color={theme.colors.primary} />
              </View>
              <Text style={styles.actionCardTitle}>Smart Feeding</Text>
              <Text style={styles.actionCardSubtitle}>10 Feeders • Daily Quota</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/intelligence')}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#EDE9FE' }]}>
                <Sparkles size={22} color="#7C3AED" />
              </View>
              <Text style={styles.actionCardTitle}>AI Predictive</Text>
              <Text style={styles.actionCardSubtitle}>Multi-Horizon Forecasts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/disease')}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FEE2E2' }]}>
                <Activity size={22} color={theme.colors.critical} />
              </View>
              <Text style={styles.actionCardTitle}>Disease Risks</Text>
              <Text style={styles.actionCardSubtitle}>WSSV, EHP, EMS Assessment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/climate')}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Thermometer size={22} color="#D97706" />
              </View>
              <Text style={styles.actionCardTitle}>Weather & Climate</Text>
              <Text style={styles.actionCardSubtitle}>Coastal Station • Rainfall</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/reports')}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#F1F5F9' }]}>
                <FileText size={22} color="#475569" />
              </View>
              <Text style={styles.actionCardTitle}>Reports & CSV</Text>
              <Text style={styles.actionCardSubtitle}>Daily Logs & Downloads</Text>
            </TouchableOpacity>
          </View>

          {/* Attention / Warning Ponds List */}
          {(criticalPonds.length > 0 || warningPonds.length > 0) && (
            <View style={styles.attentionSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Ponds Requiring Attention</Text>
              </View>

              {[...criticalPonds, ...warningPonds].map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.attentionItem}
                  onPress={() => router.push(`/ponds/${p.id}`)}
                >
                  <View style={styles.attentionLeft}>
                    <Text style={styles.attentionPondName}>
                      Pond {String(p.pond_number).padStart(2, '0')} ({p.name})
                    </Text>
                    <Text style={styles.attentionDetails}>
                      DO: {p.water_quality.do.toFixed(1)} mg/L • Temp: {p.water_quality.temperature.toFixed(1)}°C
                    </Text>
                  </View>
                  <StatusBadge status={p.status} size="sm" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.provenanceNotice}>
            <Text style={styles.provenanceText}>
              AquaIntel Telemetry Engine • Provenance: {operatingMode} • Data Freshness: 60s window
            </Text>
          </View>
        </ScrollView>
      )}
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
  welcomeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  roleSubtext: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.criticalLight,
    borderWidth: 1,
    borderColor: theme.colors.criticalBorder,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: 12,
  },
  alertBannerText: {
    flex: 1,
  },
  alertBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.critical,
  },
  alertBannerSubtitle: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.headingSm,
    color: theme.colors.textPrimary,
  },
  sectionMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: theme.spacing.sm,
  },
  kpiItem: {
    flex: 1,
    minWidth: '47%',
  },
  wqMatrixCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  wqRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  wqCell: {
    flex: 1,
    alignItems: 'center',
  },
  wqDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  wqLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  wqValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  wqUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: theme.colors.textSecondary,
  },
  wqTarget: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  actionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    flex: 1,
    minWidth: '47%',
    ...theme.shadows.subtle,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  actionCardSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  attentionSection: {
    marginTop: theme.spacing.sm,
  },
  attentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  attentionPondName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  attentionDetails: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  attentionLeft: {
    flex: 1,
  },
  provenanceNotice: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  provenanceText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
