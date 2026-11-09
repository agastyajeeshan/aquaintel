import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { climateApi } from '../../src/services/api/climate.api';
import { useFarmStore } from '../../src/store/farmStore';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { MetricCard } from '../../src/components/common/MetricCard';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { LoadingState, ErrorState } from '../../src/components/common/FeedbackStates';
import {
  CloudSun,
  CloudRain,
  Thermometer,
  Wind,
  Droplets,
  Compass,
  AlertTriangle,
} from 'lucide-react-native';

export default function ClimateScreen() {
  const router = useRouter();
  const { operatingMode } = useFarmStore();

  const [weatherData, setWeatherData] = useState<any>(null);
  const [forecastTimeline, setForecastTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const [curRes, foreRes] = await Promise.all([
        climateApi.getCurrentWeather(),
        climateApi.getWeatherForecast(72),
      ]);
      setWeatherData(curRes);
      setForecastTimeline(foreRes.forecast?.timeline || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load meteorological data.');
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

  return (
    <View style={styles.container}>
      <AppHeader
        title="Weather & Climate"
        subtitle="Coastal Aquaculture Adaptation"
        provenance={operatingMode}
        showBack
        onBack={() => router.back()}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {loading && !weather ? (
        <LoadingState message="Connecting to coastal meteorological station..." />
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
          {/* Main Weather Card */}
          {weather && (
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.stationLabel}>COASTAL METEOROLOGICAL STATION</Text>
                  <Text style={styles.stationName}>{weather.location_name}</Text>
                </View>
                <View style={styles.providerBadge}>
                  <Text style={styles.providerText}>
                    {weatherData.provider || 'Nellore Delta Grid'}
                  </Text>
                </View>
              </View>

              <View style={styles.tempHeroRow}>
                <View style={styles.tempGroup}>
                  <Text style={styles.tempValue}>{weather.temperature_c.toFixed(1)}°C</Text>
                  <Text style={styles.conditionText}>{weather.weather_condition}</Text>
                </View>
                <CloudSun size={52} color={theme.colors.secondary} />
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricCell}>
                  <Droplets size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.metricVal}>{weather.relative_humidity_pct.toFixed(0)}%</Text>
                  <Text style={styles.metricLbl}>Humidity</Text>
                </View>
                <View style={styles.metricCell}>
                  <CloudRain size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.metricVal}>{weather.rainfall_mm.toFixed(1)} mm</Text>
                  <Text style={styles.metricLbl}>Precipitation</Text>
                </View>
                <View style={styles.metricCell}>
                  <Wind size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.metricVal}>{weather.wind_speed_kmh.toFixed(0)} km/h</Text>
                  <Text style={styles.metricLbl}>Wind Speed</Text>
                </View>
                <View style={styles.metricCell}>
                  <Compass size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.metricVal}>{weather.surface_pressure_hpa.toFixed(0)} hPa</Text>
                  <Text style={styles.metricLbl}>Pressure</Text>
                </View>
              </View>
            </View>
          )}

          {/* Environmental Seasonal Impact */}
          <View style={styles.impactCard}>
            <Text style={styles.impactTitle}>Coastal Monsoon Adaptation Rules</Text>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleDot}>•</Text>
              <Text style={styles.ruleText}>
                Heavy Rainfall (over 15 mm): Triggers stratification breakdown and immediate bottom salinity drop. Emergency paddlewheel aeration recommended.
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleDot}>•</Text>
              <Text style={styles.ruleText}>
                High Solar Radiation (over 33°C): Reduces DO saturation capacity. Feeder daily rations reduced by 25% during peak thermal stress.
              </Text>
            </View>
          </View>

          {/* Hourly Weather Forecast Timeline */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>72-Hour Atmospheric Timeline</Text>
          </View>

          {forecastTimeline.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineScroll}>
              {forecastTimeline.slice(0, 24).map((f: any, idx: number) => (
                <View key={idx} style={styles.timelineItem}>
                  <Text style={styles.timeLabel}>
                    {f.timestamp ? f.timestamp.split('T')[1]?.substring(0, 5) : `${idx}h`}
                  </Text>
                  <CloudSun size={20} color={theme.colors.primary} style={{ marginVertical: 4 }} />
                  <Text style={styles.timeTemp}>{f.temperature_c?.toFixed(0)}°C</Text>
                  <Text style={styles.timeRain}>{f.rainfall_mm > 0 ? `${f.rainfall_mm}mm` : 'Dry'}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noTimeline}>Timeline currently updating.</Text>
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
  tempGroup: {},
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
    marginBottom: theme.spacing.md,
  },
  impactTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    marginBottom: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  ruleDot: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  ruleText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    lineHeight: 18,
    flex: 1,
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
