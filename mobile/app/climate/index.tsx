import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { climateApi } from '../../src/services/api/climate.api';
import { useFarmStore } from '../../src/store/farmStore';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { LoadingState, ErrorState, LastUpdatedLabel } from '../../src/components/common/FeedbackStates';
import {
  CloudSun,
  CloudRain,
  Wind,
  Droplets,
  Compass,
} from 'lucide-react-native';

export default function ClimateScreen() {
  const router = useRouter();
  const { operatingMode, overview } = useFarmStore();

  const [weatherData, setWeatherData] = useState<any>(null);
  const [forecastTimeline, setForecastTimeline] = useState<any[]>([]);
  const [fleetAnalysis, setFleetAnalysis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const [curRes, foreRes, analysisRes] = await Promise.all([
        climateApi.getCurrentWeather(),
        climateApi.getWeatherForecast(72),
        climateApi.getFleetAnalysis().catch(() => ({ fleet_analysis: [] })),
      ]);
      setWeatherData(curRes);
      setForecastTimeline(foreRes.forecast?.timeline || []);
      setFleetAnalysis(analysisRes.fleet_analysis || []);
    } catch (e: any) {
      setError(e.message || 'Weather service is currently unavailable.');
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

  const weather = weatherData?.weather;
  const locationLabel = weatherData?.location_name || weather?.location_name || overview?.location || 'Configured Farm Location';
  const weatherProvenance = weatherData?.is_simulated ? 'DEMO' : operatingMode;

  return (
    <View style={styles.container}>
      <AppHeader
        title="Weather & Climate"
        subtitle={locationLabel}
        provenance={weatherProvenance}
        showBack
        onBack={() => router.back()}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {loading && !weather ? (
        <LoadingState message="Fetching atmospheric weather data..." />
      ) : error && !weather ? (
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
          <LastUpdatedLabel timestamp={weather?.timestamp_utc} provenance={weatherData?.is_simulated ? 'SIMULATED' : 'LIVE'} />

          {/* Main Weather Card (Atmospheric Data — Never Mixed with Pond Sensors) */}
          {weather && (
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stationLabel}>METEOROLOGICAL OBSERVATION (ATMOSPHERE)</Text>
                  <Text style={styles.stationName}>{locationLabel}</Text>
                </View>
                <View style={styles.providerBadge}>
                  <Text style={styles.providerText}>
                    {weatherData.provider || weather.provider_name || 'Weather Provider'}
                  </Text>
                </View>
              </View>

              <View style={styles.tempHeroRow}>
                <View>
                  <Text style={styles.tempValue}>
                    {weather.air_temperature_c != null ? `${weather.air_temperature_c.toFixed(1)}°C` : '—'}
                  </Text>
                  <Text style={styles.conditionText}>{weather.weather_description || 'Conditions Nominal'}</Text>
                </View>
                <CloudSun size={52} color={theme.colors.secondary} />
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricCell}>
                  <Droplets size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.metricVal}>
                    {weather.relative_humidity_pct != null ? `${weather.relative_humidity_pct.toFixed(0)}%` : '—'}
                  </Text>
                  <Text style={styles.metricLbl}>Humidity</Text>
                </View>
                <View style={styles.metricCell}>
                  <CloudRain size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.metricVal}>
                    {weather.rainfall_mm != null ? `${weather.rainfall_mm.toFixed(1)} mm` : '—'}
                  </Text>
                  <Text style={styles.metricLbl}>Precipitation</Text>
                </View>
                <View style={styles.metricCell}>
                  <Wind size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.metricVal}>
                    {weather.wind_speed_kmh != null ? `${weather.wind_speed_kmh.toFixed(0)} km/h` : '—'}
                  </Text>
                  <Text style={styles.metricLbl}>Wind Speed</Text>
                </View>
                <View style={styles.metricCell}>
                  <Compass size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.metricVal}>
                    {weather.atmospheric_pressure_hpa != null ? `${weather.atmospheric_pressure_hpa.toFixed(0)} hPa` : '—'}
                  </Text>
                  <Text style={styles.metricLbl}>Pressure</Text>
                </View>
              </View>
            </View>
          )}

          {/* Dynamic Backend Climate Impact Analysis */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pond Climate Impact & Adaptation</Text>
          </View>

          {fleetAnalysis.length > 0 ? (
            fleetAnalysis.slice(0, 5).map((item: any, idx: number) => (
              <View key={item.pond_id ?? idx} style={styles.impactCard}>
                <View style={styles.impactTop}>
                  <Text style={styles.impactTitle}>{item.pond_name || `Pond ${item.pond_id}`}</Text>
                  <StatusBadge status={item.severity || 'NORMAL'} size="sm" />
                </View>
                <Text style={styles.conditionSub}>
                  Pattern: {(item.active_condition || 'NORMAL_EQUILIBRIUM').replace(/_/g, ' ')}
                </Text>
                {Array.isArray(item.detected_stressors) && item.detected_stressors.length > 0 ? (
                  item.detected_stressors.map((s: string, sIdx: number) => (
                    <Text key={sIdx} style={styles.ruleText}>• {s}</Text>
                  ))
                ) : (
                  <Text style={styles.ruleText}>• Environmental impact nominal for current weather pattern.</Text>
                )}
              </View>
            ))
          ) : (
            <View style={styles.impactCard}>
              <Text style={styles.ruleText}>No active climate anomaly impacts reported by backend.</Text>
            </View>
          )}

          {/* Hourly Weather Forecast Timeline */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>72-Hour Atmospheric Forecast</Text>
          </View>

          {forecastTimeline.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineScroll}>
              {forecastTimeline.slice(0, 24).map((f: any, idx: number) => (
                <View key={idx} style={styles.timelineItem}>
                  <Text style={styles.timeLabel}>
                    {f.timestamp_utc ? f.timestamp_utc.split('T')[1]?.substring(0, 5) : `+${f.hour_offset ?? idx + 1}h`}
                  </Text>
                  <CloudSun size={20} color={theme.colors.primary} style={{ marginVertical: 4 }} />
                  <Text style={styles.timeTemp}>
                    {f.air_temperature_c != null ? `${f.air_temperature_c.toFixed(0)}°C` : '—'}
                  </Text>
                  <Text style={styles.timeRain}>{f.rainfall_mm > 0 ? `${f.rainfall_mm}mm` : 'Dry'}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noTimeline}>Forecast timeline unavailable.</Text>
          )}
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
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  stationLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  providerBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.full,
  },
  providerText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  tempHeroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  tempValue: {
    fontSize: 38,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  conditionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  metricCell: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  metricLbl: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  impactCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  impactTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  impactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  conditionSub: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.secondary,
    marginBottom: 6,
  },
  ruleText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    lineHeight: 18,
    marginBottom: 3,
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
  timelineScroll: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  timelineItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginRight: 10,
    minWidth: 80,
  },
  timeLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  timeTemp: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  timeRain: {
    fontSize: 10,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  noTimeline: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
});
