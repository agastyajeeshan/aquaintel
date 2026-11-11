import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { pondsApi, PondDetailResponse } from '../../src/services/api/ponds.api';
import { useFarmStore } from '../../src/store/farmStore';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { ChartCard } from '../../src/components/common/ChartCard';
import { SensorStatusCard } from '../../src/components/common/SensorStatusCard';
import { TelemetryLineChart } from '../../src/components/charts/TelemetryLineChart';
import { LoadingState, ErrorState, LastUpdatedLabel } from '../../src/components/common/FeedbackStates';

type TimeRange = '6h' | '24h' | '7d' | '30d';

export default function WaterQualityPondScreen() {
  const router = useRouter();
  const { pondId } = useLocalSearchParams<{ pondId: string }>();
  const id = parseInt(pondId || '1', 10);
  const { operatingMode } = useFarmStore();

  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [pondData, setPondData] = useState<PondDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const data = await pondsApi.getPondDetail(id, timeRange);
      setPondData(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load water quality telemetry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, timeRange]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const series = pondData?.chart_series || [];
  const live = pondData?.live_metrics;
  const overview = pondData?.overview;
  const provenance = overview?.provenance || operatingMode;

  const computeStats = (key: 'do' | 'temperature' | 'ph' | 'salinity' | 'ammonia' | 'turbidity') => {
    const vals = series.map((s) => s[key]).filter((v): v is number => typeof v === 'number');
    if (vals.length === 0) return null;
    return {
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  };

  const doStats = computeStats('do');
  const tempStats = computeStats('temperature');
  const phStats = computeStats('ph');

  return (
    <View style={styles.container}>
      <AppHeader
        title={`Water Quality • Pond ${String(overview?.pond_number ?? id).padStart(2, '0')}`}
        subtitle={overview?.name || 'Multi-Parameter Telemetry'}
        provenance={provenance}
        showBack
        onBack={() => router.back()}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {loading && !pondData ? (
        <LoadingState message="Loading pond water quality telemetry..." />
      ) : error && !pondData ? (
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
          <LastUpdatedLabel timestamp={overview?.last_updated} provenance={provenance} />

          {/* Time Range Selector */}
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

          {/* Current Parameter Cards */}
          {live && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sensor Readings & Thresholds</Text>
              <SensorStatusCard
                parameter="do"
                value={live.do?.value}
                pondLabel={`Pond ${String(overview?.pond_number ?? id).padStart(2, '0')}`}
                timestamp={overview?.last_updated}
                provenance={provenance}
                isStale={overview?.is_stale}
              />
              <SensorStatusCard
                parameter="temperature"
                value={live.temperature?.value}
                pondLabel={`Pond ${String(overview?.pond_number ?? id).padStart(2, '0')}`}
                timestamp={overview?.last_updated}
                provenance={provenance}
                isStale={overview?.is_stale}
              />
              <SensorStatusCard
                parameter="ph"
                value={live.ph?.value}
                pondLabel={`Pond ${String(overview?.pond_number ?? id).padStart(2, '0')}`}
                timestamp={overview?.last_updated}
                provenance={provenance}
                isStale={overview?.is_stale}
              />
              <SensorStatusCard
                parameter="salinity"
                value={live.salinity?.value}
                pondLabel={`Pond ${String(overview?.pond_number ?? id).padStart(2, '0')}`}
                timestamp={overview?.last_updated}
                provenance={provenance}
                isStale={overview?.is_stale}
              />
              <SensorStatusCard
                parameter="ammonia"
                value={live.ammonia?.value}
                pondLabel={`Pond ${String(overview?.pond_number ?? id).padStart(2, '0')}`}
                timestamp={overview?.last_updated}
                provenance={provenance}
                isStale={overview?.is_stale}
              />
              {live.estimated_nh3?.calculated && (
                <View style={styles.nh3Card}>
                  <Text style={styles.nh3Label}>ESTIMATED UNIONIZED AMMONIA (NH3)</Text>
                  <Text style={styles.nh3Value}>{live.estimated_nh3.value.toFixed(4)} mg/L</Text>
                  <Text style={styles.nh3Note}>
                    Backend-calculated via Emerson-Trussell formulation from TAN, pH, Temp & Salinity
                  </Text>
                </View>
              )}
              <SensorStatusCard
                parameter="turbidity"
                value={live.turbidity?.value}
                pondLabel={`Pond ${String(overview?.pond_number ?? id).padStart(2, '0')}`}
                timestamp={overview?.last_updated}
                provenance={provenance}
                isStale={overview?.is_stale}
              />
              {live.water_level && (
                <SensorStatusCard
                  parameter="water_level"
                  value={live.water_level.value}
                  pondLabel={`Pond ${String(overview?.pond_number ?? id).padStart(2, '0')}`}
                  timestamp={overview?.last_updated}
                  provenance={provenance}
                  isStale={overview?.is_stale}
                />
              )}
            </View>
          )}

          {/* Trend Charts */}
          <ChartCard
            title={`Dissolved Oxygen Trend (${timeRange.toUpperCase()})`}
            subtitle={doStats ? `Min: ${doStats.min.toFixed(2)} • Max: ${doStats.max.toFixed(2)} mg/L` : undefined}
            provenance={provenance}
            footerNote="Thresholds shown are advisory aquaculture domain defaults unless overridden by farm settings."
          >
            <TelemetryLineChart
              data={series
                .filter((s) => typeof s.do === 'number')
                .map((s) => ({
                  timestamp: s.timestamp.split(' ')[1] || s.timestamp,
                  value: s.do as number,
                }))}
              unit="mg/L"
              optimalMin={5.0}
              optimalMax={7.5}
              criticalMin={3.8}
              color={theme.colors.primary}
            />
          </ChartCard>

          <ChartCard
            title={`Water Temperature Trend (${timeRange.toUpperCase()})`}
            subtitle={tempStats ? `Min: ${tempStats.min.toFixed(1)} • Max: ${tempStats.max.toFixed(1)} °C` : undefined}
            provenance={provenance}
          >
            <TelemetryLineChart
              data={series
                .filter((s) => typeof s.temperature === 'number')
                .map((s) => ({
                  timestamp: s.timestamp.split(' ')[1] || s.timestamp,
                  value: s.temperature as number,
                }))}
              unit="°C"
              optimalMin={26.0}
              optimalMax={32.0}
              criticalMin={24.0}
              criticalMax={34.0}
              color="#D97706"
            />
          </ChartCard>

          <ChartCard
            title={`Water pH Trend (${timeRange.toUpperCase()})`}
            subtitle={phStats ? `Min: ${phStats.min.toFixed(2)} • Max: ${phStats.max.toFixed(2)} pH` : undefined}
            provenance={provenance}
          >
            <TelemetryLineChart
              data={series
                .filter((s) => typeof s.ph === 'number')
                .map((s) => ({
                  timestamp: s.timestamp.split(' ')[1] || s.timestamp,
                  value: s.ph as number,
                }))}
              unit="pH"
              optimalMin={7.5}
              optimalMax={8.3}
              criticalMin={7.0}
              criticalMax={8.8}
              color={theme.colors.secondary}
            />
          </ChartCard>
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
  rangeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: theme.spacing.md,
  },
  rangeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
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
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  rangeBtnTextActive: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.headingSm,
    marginBottom: theme.spacing.sm,
  },
  nh3Card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  nh3Label: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  nh3Value: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    marginVertical: 4,
  },
  nh3Note: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});
