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
import { diseaseApi } from '../../src/services/api/disease.api';
import { useFarmStore } from '../../src/store/farmStore';
import { useAuthStore } from '../../src/store/authStore';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { LoadingState, ErrorState } from '../../src/components/common/FeedbackStates';
import { AIModelStatus, HealthObservationItem } from '../../src/types';
import {
  CheckCircle2,
  Stethoscope,
  Info,
  ClipboardPlus,
} from 'lucide-react-native';

const SYMPTOM_OPTIONS = [
  'Lethargic swimming',
  'Reduced feed intake',
  'Soft shell',
  'White spots on carapace',
  'Red discoloration',
];

export default function DiseaseScreen() {
  const router = useRouter();
  const { operatingMode, isOnline, ponds } = useFarmStore();
  const user = useAuthStore((s) => s.user);

  const [diseaseData, setDiseaseData] = useState<any[]>([]);
  const [modelStatus, setModelStatus] = useState<AIModelStatus | null>(null);
  const [observations, setObservations] = useState<HealthObservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPondId, setSelectedPondId] = useState<number>(1);

  // Farmer symptom logging & escalation state
  const [showObsForm, setShowObsForm] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [mortalityCount, setMortalityCount] = useState('0');
  const [obsNotes, setObsNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRisks = async (pondId: number = selectedPondId) => {
    setError(null);
    try {
      const [risksRes, statusRes, obsRes] = await Promise.all([
        diseaseApi.getRisks(),
        diseaseApi.getModelStatus().catch(() => null),
        diseaseApi.getObservations(pondId).catch(() => []),
      ]);
      setDiseaseData(risksRes);
      setModelStatus(statusRes);
      setObservations(obsRes);
    } catch (e: any) {
      setError(e.message || 'Failed to load disease intelligence data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRisks(selectedPondId);
  }, [selectedPondId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRisks(selectedPondId);
  };

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const submitHealthRecord = async (observationType: 'FARMER_OBSERVED' | 'SPECIALIST_ESCALATION') => {
    if (!isOnline) {
      Alert.alert('Offline', 'Submitting health observations or escalations requires connectivity.');
      return;
    }
    if (user?.role === 'VIEWER') {
      Alert.alert('Read-Only Access', 'Viewer accounts cannot submit health observations.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await diseaseApi.submitObservation({
        pond_id: selectedPondId,
        symptoms: selectedSymptoms,
        mortality_observed: parseInt(mortalityCount, 10) || 0,
        feeding_response: selectedSymptoms.includes('Reduced feed intake') ? 'REDUCED' : 'NORMAL',
        observation_type: observationType,
        notes: obsNotes.trim() || undefined,
      });
      Alert.alert(
        observationType === 'SPECIALIST_ESCALATION' ? 'Specialist Escalation Recorded' : 'Observation Saved',
        `${res.message} (Ref #${res.observation_id})`
      );
      setSelectedSymptoms([]);
      setMortalityCount('0');
      setObsNotes('');
      setShowObsForm(false);
      loadRisks(selectedPondId);
    } catch (e: any) {
      Alert.alert('Submission Failed', e.message || 'Could not record observation.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentPondRisk = diseaseData.find((d) => d.pond_id === selectedPondId) || diseaseData[0];
  const isExperimental =
    Boolean(modelStatus?.is_synthetic_model) ||
    String(modelStatus?.version || '').includes('synthetic') ||
    String(modelStatus?.status || '').includes('NOT_VALIDATED');

  return (
    <View style={styles.container}>
      <AppHeader
        title="Disease Bio-Security"
        subtitle="Stress Markers & Risk Decision Support"
        provenance={operatingMode}
        showBack
        onBack={() => router.back()}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {loading && diseaseData.length === 0 ? (
        <LoadingState message="Evaluating environmental stress risk factors..." />
      ) : error && diseaseData.length === 0 ? (
        <ErrorState message={error} onRetry={() => loadRisks(selectedPondId)} />
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
          {/* Clinical & Experimental Model Disclaimer */}
          <View style={styles.disclaimerBox}>
            <View style={styles.disclaimerHeader}>
              <Info size={16} color={theme.colors.primaryDark} />
              <Text style={styles.disclaimerTitle}>
                {isExperimental
                  ? 'EXPERIMENTAL / UNVALIDATED MODEL NOTICE'
                  : 'CLINICAL DECISION-SUPPORT NOTICE'}
              </Text>
            </View>
            <Text style={styles.disclaimerText}>
              {modelStatus?.clinical_disclaimer ||
                'Environmental stress indicators and predicted risk scores are advisory decision-support only. They are NOT laboratory-confirmed diagnoses. Accredited PCR testing is required for definitive pathogen confirmation.'}
            </Text>
            {modelStatus?.model_id && (
              <Text style={styles.modelMetaText}>
                Registry: {modelStatus.model_id} (v{modelStatus.version}) • Status:{' '}
                {modelStatus.validation_status || modelStatus.status || 'EXPERIMENTAL'}
              </Text>
            )}
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

          {/* 1. Environmental Stress Biomarkers */}
          {currentPondRisk?.live_metrics && (
            <View style={styles.biomarkerCard}>
              <Text style={styles.biomarkerTitle}>1. Environmental Stress Indicators</Text>
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

          {/* 2. Predicted Disease Risk */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>2. Predicted Pathogen Stress Risk</Text>
          </View>

          {currentPondRisk?.predictions?.map((pred: any, idx: number) => {
            const isHigh = pred.risk_level === 'HIGH' || pred.risk_level === 'CRITICAL';
            return (
              <View key={idx} style={[styles.pathogenCard, isHigh && styles.pathogenHighCard]}>
                <View style={styles.pathogenTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pathogenName}>{pred.disease_name}</Text>
                    <Text style={styles.pathogenFamily}>Agent: {pred.pathogen || 'Environmental/Pathogen Index'}</Text>
                  </View>
                  <StatusBadge status={pred.risk_level} size="sm" />
                </View>

                <View style={styles.gaugeContainer}>
                  <View style={styles.gaugeHeader}>
                    <Text style={styles.gaugeLabel}>Advisory Stress Risk Score</Text>
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

                {pred.recommendations && pred.recommendations.length > 0 && (
                  <View style={styles.recContainer}>
                    <Text style={styles.recHeader}>Biosecurity Safeguards:</Text>
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

          {/* 3. Farmer-Observed Symptoms & Health Log */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>3. Farmer-Observed Symptoms</Text>
            <TouchableOpacity onPress={() => setShowObsForm(!showObsForm)}>
              <Text style={styles.toggleLink}>{showObsForm ? 'Close Form' : '+ Log Observation'}</Text>
            </TouchableOpacity>
          </View>

          {showObsForm && (
            <View style={styles.obsFormCard}>
              <Text style={styles.obsFormLabel}>Observed Symptoms (Pond {String(selectedPondId).padStart(2, '0')}):</Text>
              <View style={styles.symptomWrap}>
                {SYMPTOM_OPTIONS.map((sym) => {
                  const active = selectedSymptoms.includes(sym);
                  return (
                    <TouchableOpacity
                      key={sym}
                      style={[styles.symptomChip, active && styles.symptomChipActive]}
                      onPress={() => toggleSymptom(sym)}
                    >
                      <Text style={[styles.symptomText, active && styles.symptomTextActive]}>{sym}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.obsFormLabel}>Observed Mortality (24h count):</Text>
              <TextInput
                style={styles.input}
                value={mortalityCount}
                onChangeText={setMortalityCount}
                keyboardType="numeric"
              />

              <Text style={styles.obsFormLabel}>Field Notes:</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top', paddingTop: 8 }]}
                value={obsNotes}
                onChangeText={setObsNotes}
                placeholder="Describe gill/shell appearance or feeding behavior..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
              />

              <TouchableOpacity
                style={styles.submitObsBtn}
                disabled={submitting}
                onPress={() => submitHealthRecord('FARMER_OBSERVED')}
              >
                <ClipboardPlus size={16} color="#FFFFFF" />
                <Text style={styles.submitObsText}>
                  {submitting ? 'Saving...' : 'Save Farmer Observation'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {observations.length > 0 ? (
            observations.map((obs) => (
              <View key={obs.id} style={styles.historyCard}>
                <View style={styles.pathogenTop}>
                  <Text style={styles.obsTitle}>
                    {obs.observation_type === 'SPECIALIST_ESCALATION'
                      ? 'Specialist Escalation'
                      : obs.observation_type === 'LAB_CONFIRMED'
                      ? 'Lab-Confirmed Record'
                      : 'Farmer Observation'}
                  </Text>
                  <StatusBadge status={obs.observation_type === 'SPECIALIST_ESCALATION' ? 'WARNING' : 'INFO'} size="sm" />
                </View>
                {obs.symptoms?.length > 0 && (
                  <Text style={styles.obsMeta}>Symptoms: {obs.symptoms.join(', ')}</Text>
                )}
                <Text style={styles.obsMeta}>
                  Mortality: {obs.mortality_observed} • Feeding: {obs.feeding_response}
                </Text>
                {obs.notes && <Text style={styles.obsNotes}>{obs.notes}</Text>}
                <Text style={styles.obsFooter}>
                  Recorded by {obs.recorded_by || 'Operator'} • {obs.timestamp ? new Date(obs.timestamp).toLocaleString() : ''}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No field health observations recorded for this pond yet.</Text>
          )}

          {/* 4. Specialist & Laboratory Confirmation Escalation */}
          <View style={styles.specialistCard}>
            <View style={styles.specialistHeader}>
              <Stethoscope size={20} color={theme.colors.primary} />
              <Text style={styles.specialistTitle}>4. Laboratory Confirmation & Specialist Escalation</Text>
            </View>
            <Text style={styles.specialistDesc}>
              Definitive pathogen confirmation requires an accredited laboratory PCR assay. Submit a logged escalation request for specialist pathology review.
            </Text>
            <TouchableOpacity
              style={styles.escalateBtn}
              disabled={submitting}
              onPress={() => submitHealthRecord('SPECIALIST_ESCALATION')}
            >
              <Text style={styles.escalateBtnText}>
                {submitting ? 'Submitting Escalation...' : 'Log Specialist Lab PCR Escalation'}
              </Text>
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
    backgroundColor: theme.colors.warningLight,
    borderWidth: 1,
    borderColor: theme.colors.warningBorder,
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
    color: '#92400E',
    letterSpacing: 0.5,
  },
  disclaimerText: {
    fontSize: 11,
    color: theme.colors.textPrimary,
    lineHeight: 16,
  },
  modelMetaText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '600',
    marginTop: 6,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  toggleLink: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
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
  obsFormCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  obsFormLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  symptomWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  symptomChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  symptomChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  symptomText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  symptomTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 10,
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  submitObsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.sm,
  },
  submitObsText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  historyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  obsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  obsMeta: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  obsNotes: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  obsFooter: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  emptyText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: theme.spacing.md,
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
    flex: 1,
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
