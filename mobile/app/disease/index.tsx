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
import { diseaseApi } from '../../src/services/api/disease.api';
import { useFarmStore } from '../../src/store/farmStore';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { LoadingState, ErrorState } from '../../src/components/common/FeedbackStates';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Stethoscope,
  Info,
} from 'lucide-react-native';

export default function DiseaseScreen() {
  const router = useRouter();
  const { operatingMode, ponds } = useFarmStore();

  const [diseaseData, setDiseaseData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPondId, setSelectedPondId] = useState<number>(1);

  const loadRisks = async () => {
    setError(null);
    try {
      const data = await diseaseApi.getRisks();
      setDiseaseData(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load disease intelligence data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRisks();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadRisks();
  };

  const currentPondRisk = diseaseData.find((d) => d.pond_id === selectedPondId) || diseaseData[0];

  return (
    <View style={styles.container}>
      <AppHeader
        title="Disease Bio-Security"
        subtitle="Pathogen Risk & Stress Intelligence"
        provenance={operatingMode}
        showBack
        onBack={() => router.back()}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {loading && diseaseData.length === 0 ? (
        <LoadingState message="Evaluating multi-pathogen environmental risk factors..." />
      ) : error && diseaseData.length === 0 ? (
        <ErrorState message={error} onRetry={loadRisks} />
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
          {/* Scientific Disclaimer Card */}
          <View style={styles.disclaimerBox}>
            <View style={styles.disclaimerHeader}>
              <Info size={16} color={theme.colors.primaryDark} />
              <Text style={styles.disclaimerTitle}>DECISION-SUPPORT NOTICE</Text>
            </View>
            <Text style={styles.disclaimerText}>
              These risk ratings are heuristic statistical models derived from water quality stress markers (DO, TAN, Temperature). They do NOT represent definitive pathogen diagnosis or PCR clinical confirmation.
            </Text>
          </View>

          {/* Pond Selector */}
          <View style={styles.selectorSection}>
            <Text style={styles.selectorTitle}>Select Pond:</Text>
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

          {/* Pond Stress Biomarkers Strip */}
          {currentPondRisk?.live_metrics && (
            <View style={styles.biomarkerCard}>
              <Text style={styles.biomarkerTitle}>Active Stress Biomarkers</Text>
              <View style={styles.biomarkerGrid}>
                <View style={styles.biomarkerCell}>
                  <Text style={styles.bioLbl}>DO</Text>
                  <Text style={styles.bioVal}>{currentPondRisk.live_metrics.do?.toFixed(1)} mg/L</Text>
                </View>
                <View style={styles.biomarkerCell}>
                  <Text style={styles.bioLbl}>Temp</Text>
                  <Text style={styles.bioVal}>{currentPondRisk.live_metrics.temperature?.toFixed(1)}°C</Text>
                </View>
                <View style={styles.biomarkerCell}>
                  <Text style={styles.bioLbl}>pH</Text>
                  <Text style={styles.bioVal}>{currentPondRisk.live_metrics.ph?.toFixed(2)}</Text>
                </View>
                <View style={styles.biomarkerCell}>
                  <Text style={styles.bioLbl}>Ammonia</Text>
                  <Text style={styles.bioVal}>{currentPondRisk.live_metrics.ammonia?.toFixed(3)} mg/L</Text>
                </View>
              </View>
            </View>
          )}

          {/* Pathogen Risk List */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Prawn Pathogen Risk Assessment</Text>
          </View>

          {currentPondRisk?.predictions?.map((pred: any, idx: number) => {
            const isHigh = pred.risk_level === 'HIGH' || pred.risk_level === 'CRITICAL';
            return (
              <View key={idx} style={[styles.pathogenCard, isHigh && styles.pathogenHighCard]}>
                <View style={styles.pathogenTop}>
                  <View>
                    <Text style={styles.pathogenName}>{pred.disease_name}</Text>
                    <Text style={styles.pathogenFamily}>Agent: {pred.pathogen || 'Viral/Bacterial'}</Text>
                  </View>
                  <StatusBadge status={pred.risk_level} size="sm" />
                </View>

                {/* Risk Gauge Bar */}
                <View style={styles.gaugeContainer}>
                  <View style={styles.gaugeHeader}>
                    <Text style={styles.gaugeLabel}>Risk Index Score</Text>
                    <Text style={[styles.gaugeScore, isHigh && { color: theme.colors.critical }]}>
                      {pred.risk_score} / 100
                    </Text>
                  </View>
                  <View style={styles.gaugeTrack}>
                    <View
                      style={[
                        styles.gaugeFill,
                        {
                          width: `${Math.min(100, pred.risk_score)}%`,
                          backgroundColor:
                            pred.risk_level === 'CRITICAL'
                              ? theme.colors.critical
                              : pred.risk_level === 'HIGH'
                              ? '#EA580C'
                              : pred.risk_level === 'MEDIUM'
                              ? theme.colors.warning
                              : theme.colors.success,
                        },
                      ]}
                    />
                  </View>
                </View>

                <Text style={styles.pathogenExpl}>{pred.explanation}</Text>

                {/* Recommendations */}
                {pred.recommendations && pred.recommendations.length > 0 && (
                  <View style={styles.recContainer}>
                    <Text style={styles.recHeader}>Actionable Safeguards:</Text>
                    {pred.recommendations.map((rec: string, rIdx: number) => (
                      <View key={rIdx} style={styles.recBulletRow}>
                        <CheckCircle2 size={12} color={theme.colors.primary} />
                        <Text style={styles.recBulletText}>{rec}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {/* Specialist Escalation Card */}
          <View style={styles.specialistCard}>
            <View style={styles.specialistHeader}>
              <Stethoscope size={20} color={theme.colors.primary} />
              <Text style={styles.specialistTitle}>Specialist Escalation</Text>
            </View>
            <Text style={styles.specialistDesc}>
              If abnormal mortality, hepatopancreas discoloration, or sluggish feeding is observed, dispatch check-tray samples to the CIBA / MPEDA authorized pathology lab.
            </Text>
            <TouchableOpacity
              style={styles.escalateBtn}
              onPress={() => Alert.alert('Lab Request Dispatched', 'Pathology lab escalation alert sent to Dr. K. Srinivas (Director).')}
            >
              <Text style={styles.escalateBtnText}>Request Diagnostic Lab PCR</Text>
            </TouchableOpacity>
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
  disclaimerBox: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  disclaimerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    letterSpacing: 0.5,
  },
  disclaimerText: {
    fontSize: 11,
    color: theme.colors.textPrimary,
    lineHeight: 16,
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
  biomarkerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  biomarkerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  biomarkerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: 8,
  },
  biomarkerCell: {
    alignItems: 'center',
  },
  bioLbl: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  bioVal: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
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
  pathogenCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  pathogenHighCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.critical,
  },
  pathogenTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pathogenName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  pathogenFamily: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  gaugeContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: 8,
    marginBottom: 10,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  gaugeLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  gaugeScore: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  gaugeTrack: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 3,
  },
  pathogenExpl: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  recContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: 10,
  },
  recHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    marginBottom: 6,
  },
  recBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  recBulletText: {
    fontSize: 11,
    color: theme.colors.textPrimary,
    flex: 1,
    lineHeight: 16,
  },
  specialistCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  specialistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  specialistTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  specialistDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  escalateBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  escalateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
