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
import { useFarmStore } from '../../src/store/farmStore';
import { climateApi } from '../../src/services/api/climate.api';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { ForecastBandChart } from '../../src/components/charts/ForecastBandChart';
import { LoadingState, ErrorState } from '../../src/components/common/FeedbackStates';
import { WeatherObservation, MultiHorizonForecast } from '../../src/types';
import {
  CloudRain,
  Thermometer,
  Wind,
  Droplets,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react-native';

export default function IntelligenceScreen() {
  const { ponds, operatingMode } = useFarmStore();
  const [selectedPondId, setSelectedPondId] = useState<number>(1);
  const [weather, setWeather] = useState<WeatherObservation | null>(null);
  const [forecast, setForecast] = useState<MultiHorizonForecast | null>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  const loadData = async (pondId: number) => {
    setError(null);
    try {
      const [weatherRes, forecastRes, recRes] = await Promise.all([
        climateApi.getCurrentWeather(),
        climateApi.getPondForecast(pondId),
        climateApi.getPondRecommendations(pondId),
      ]);
      setWeather(weatherRes.weather);
      setForecast(forecastRes);
      setRecommendations(recRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load predictive models.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(selectedPondId);
  }, [selectedPondId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(selectedPondId);
  };

  const handleApprove = async (actionType: 'AERATION' | 'FEEDING') => {
    setApproving(true);
    try {
      await climateApi.approveRecommendation(selectedPondId, actionType, 'Approved via mobile operator console');
      Alert.alert(
        'Recommendation Approved',
        `Operator approval for ${actionType} successfully logged in farm audit trail.`
      );
      loadData(selectedPondId);
    } catch (e: any) {
      Alert.alert('Approval Error', e.message || 'Failed to submit approval.');
    } finally {
      setApproving(false);
    }
  };

  // Format multi-horizon points for chart
  const getDoForecastPoints = () => {
    if (!forecast?.horizons) return [];
    return Object.entries(forecast.horizons).map(([horizonKey, data]) => ({
      horizon: horizonKey,
      predicted: data.dissolved_oxygen.predicted_value,
      lower: data.dissolved_oxygen.lower_bound,
      upper: data.dissolved_oxygen.upper_bound,
    }));
  };

  const getTempForecastPoints = () => {
    if (!forecast?.horizons) return [];
    return Object.entries(forecast.horizons).map(([horizonKey, data]) => ({
      horizon: horizonKey,
      predicted: data.water_temperature.predicted_value,
      lower: data.water_temperature.lower_bound,
      upper: data.water_temperature.upper_bound,
    }));
  };

  const selectedPond = ponds.find((p) => p.id === selectedPondId);

  return (
    <View style={styles.container}>
      <AppHeader
        title="AI Intelligence & Climate"
        subtitle="Predictive Inference & Adaptation"
        provenance={operatingMode}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {loading && !weather ? (
        <LoadingState message="Generating multi-horizon predictive forecasts..." />
      ) : error && !weather ? (
        <ErrorState message={error} onRetry={() => loadData(selectedPondId)} />
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
          {/* Weather Station Observation Strip */}
          {weather && (
            <View style={styles.weatherCard}>
              <View style={styles.weatherTopRow}>
                <View>
                  <Text style={styles.weatherStation}>COASTAL METEOROLOGICAL STATION</Text>
                  <Text style={styles.weatherLocation}>{weather.location_name}</Text>
                </View>
                <View style={styles.conditionPill}>
                  <CloudRain size={14} color={theme.colors.secondary} />
                  <Text style={styles.conditionText}>{weather.weather_condition}</Text>
                </View>
              </View>

              <View style={styles.weatherMetricsGrid}>
                <View style={styles.weatherCell}>
                  <Thermometer size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.weatherVal}>{weather.temperature_c.toFixed(1)}°C</Text>
                  <Text style={styles.weatherLbl}>Air Temp</Text>
                </View>
                <View style={styles.weatherCell}>
                  <Droplets size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.weatherVal}>{weather.relative_humidity_pct.toFixed(0)}%</Text>
                  <Text style={styles.weatherLbl}>Humidity</Text>
                </View>
                <View style={styles.weatherCell}>
                  <CloudRain size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.weatherVal}>{weather.rainfall_mm.toFixed(1)} mm</Text>
                  <Text style={styles.weatherLbl}>Rainfall</Text>
                </View>
                <View style={styles.weatherCell}>
                  <Wind size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.weatherVal}>{weather.wind_speed_kmh.toFixed(0)} km/h</Text>
                  <Text style={styles.weatherLbl}>Wind</Text>
                </View>
              </View>
            </View>
          )}

          {/* Pond Selector */}
          <View style={styles.selectorSection}>
            <Text style={styles.selectorTitle}>Select Pond for Forecasting:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pondChips}>
              {ponds.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pondChip, selectedPondId === p.id && styles.pondChipActive]}
                  onPress={() => setSelectedPondId(p.id)}
                >
                  <Text
                    style={[
                      styles.pondChipText,
                      selectedPondId === p.id && styles.pondChipTextActive,
                    ]}
                  >
                    Pond {String(p.pond_number).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Adaptive AI Recommendations */}
          {recommendations?.adaptive_recommendations && (
            <View style={styles.recCard}>
              <View style={styles.recHeader}>
                <Sparkles size={18} color={theme.colors.primary} />
                <Text style={styles.recTitle}>Adaptive AI Recommendations</Text>
              </View>

              <View style={styles.conditionBox}>
                <Text style={styles.conditionLabel}>Active Environmental Condition:</Text>
                <Text style={styles.conditionValue}>
                  {recommendations.condition?.replace(/_/g, ' ') || 'NOMINAL MONSOON'}
                </Text>
              </View>

              <View style={styles.recDetails}>
                <View style={styles.recItem}>
                  <Text style={styles.recItemLabel}>Aerator Power Target:</Text>
                  <Text style={styles.recItemValue}>
                    {recommendations.adaptive_recommendations.recommended_aeration_kw} kW (
                    {recommendations.adaptive_recommendations.recommended_aerator_count} aerators)
                  </Text>
                </View>
                <View style={styles.recItem}>
                  <Text style={styles.recItemLabel}>Feed Adjustment:</Text>
                  <Text
                    style={[
                      styles.recItemValue,
                      {
                        color:
                          recommendations.adaptive_recommendations.recommended_feed_adjustment_pct < 0
                            ? theme.colors.critical
                            : theme.colors.textPrimary,
                      },
                    ]}
                  >
                    {recommendations.adaptive_recommendations.recommended_feed_adjustment_pct}%
                  </Text>
                </View>
              </View>

              <Text style={styles.recExplanation}>
                {recommendations.adaptive_recommendations.explanation}
              </Text>

              {/* Operator Approval Buttons */}
              <View style={styles.approvalRow}>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApprove('AERATION')}
                  disabled={approving}
                >
                  <CheckCircle2 size={14} color="#FFFFFF" />
                  <Text style={styles.approveBtnText}>Approve Aeration</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.approveBtn, { backgroundColor: theme.colors.secondary }]}
                  onPress={() => handleApprove('FEEDING')}
                  disabled={approving}
                >
                  <CheckCircle2 size={14} color="#FFFFFF" />
                  <Text style={styles.approveBtnText}>Approve Feed Plan</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Dissolved Oxygen Multi-Horizon Forecast Chart */}
          <ForecastBandChart
            title={`Dissolved Oxygen Forecast (Pond ${selectedPond?.pond_number || 1})`}
            unit="mg/L"
            currentValue={selectedPond?.water_quality.do || 6.2}
            forecastPoints={getDoForecastPoints()}
            modelInfo={forecast?.model_id || 'DO Physics Hybrid Engine v2.1'}
            disclaimer={forecast?.disclaimer}
          />

          {/* Temperature Forecast Chart */}
          <ForecastBandChart
            title={`Water Temperature Forecast (Pond ${selectedPond?.pond_number || 1})`}
            unit="°C"
            currentValue={selectedPond?.water_quality.temperature || 29.1}
            forecastPoints={getTempForecastPoints()}
            modelInfo="Thermal Mass Exchange Model v2.1"
            disclaimer="Advisory 90% confidence bounds calibrated against Nellore meteorological station."
          />
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
  weatherCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  weatherTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  weatherStation: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  weatherLocation: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  conditionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.secondaryLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.full,
  },
  conditionText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  weatherMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  weatherCell: {
    alignItems: 'center',
    flex: 1,
  },
  weatherVal: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  weatherLbl: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  selectorSection: {
    marginBottom: theme.spacing.md,
  },
  selectorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  pondChips: {
    flexDirection: 'row',
  },
  pondChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
  },
  pondChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pondChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  pondChipTextActive: {
    color: '#FFFFFF',
  },
  recCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  recTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  conditionBox: {
    backgroundColor: theme.colors.primaryLight,
    padding: 8,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 10,
  },
  conditionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  conditionValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 1,
  },
  recDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recItem: {
    flex: 1,
  },
  recItemLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  recItemValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  recExplanation: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  approvalRow: {
    flexDirection: 'row',
    gap: 10,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
