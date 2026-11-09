import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { PondSummary } from '../../types';
import { StatusBadge } from './StatusBadge';
import { ChevronRight, Wind, Utensils, AlertTriangle } from 'lucide-react-native';

interface PondCardProps {
  pond: PondSummary;
  onPress: () => void;
}

export const PondCard: React.FC<PondCardProps> = ({ pond, onPress }) => {
  const isHypoxic = pond.water_quality.do < 3.8;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.topRow}>
        <View style={styles.titleInfo}>
          <Text style={styles.pondNumber}>POND {String(pond.pond_number).padStart(2, '0')}</Text>
          <Text style={styles.pondName}>{pond.name}</Text>
        </View>
        <StatusBadge status={pond.status} size="sm" />
      </View>

      {/* Primary Telemetry Strip */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>DO</Text>
          <Text
            style={[
              styles.metricValue,
              { color: isHypoxic ? theme.colors.critical : theme.colors.textPrimary },
            ]}
          >
            {pond.water_quality.do.toFixed(1)} <Text style={styles.metricUnit}>mg/L</Text>
          </Text>
        </View>

        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>TEMP</Text>
          <Text style={styles.metricValue}>
            {pond.water_quality.temperature.toFixed(1)} <Text style={styles.metricUnit}>°C</Text>
          </Text>
        </View>

        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>pH</Text>
          <Text style={styles.metricValue}>
            {pond.water_quality.ph.toFixed(2)}
          </Text>
        </View>

        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>SALINITY</Text>
          <Text style={styles.metricValue}>
            {pond.water_quality.salinity.toFixed(1)} <Text style={styles.metricUnit}>ppt</Text>
          </Text>
        </View>
      </View>

      {/* Equipment & Stocking Status */}
      <View style={styles.footerRow}>
        <View style={styles.equipmentSummary}>
          <View style={styles.equipItem}>
            <Wind size={13} color={theme.colors.secondary} />
            <Text style={styles.equipText}>
              {pond.aerator_summary.active_count}/{pond.aerator_summary.total_count} Aerators
            </Text>
          </View>
          <View style={styles.equipItem}>
            <Utensils size={13} color={theme.colors.primary} />
            <Text style={styles.equipText}>
              {pond.feeding_summary.dispensed_today_kg.toFixed(0)}/{pond.feeding_summary.daily_quota_kg.toFixed(0)} kg
            </Text>
          </View>
        </View>

        <View style={styles.navAction}>
          <Text style={styles.docText}>DOC {pond.current_age_days}</Text>
          <ChevronRight size={18} color={theme.colors.textSecondary} />
        </View>
      </View>

      {isHypoxic && (
        <View style={styles.emergencyBanner}>
          <AlertTriangle size={14} color={theme.colors.critical} />
          <Text style={styles.emergencyText}>EMERGENCY HYPOXIA: DO {'<'} 3.8 mg/L</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  titleInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  pondNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  pondName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    justifyContent: 'space-around',
    marginBottom: theme.spacing.sm,
  },
  metricCell: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  metricUnit: {
    fontSize: 10,
    fontWeight: '400',
    color: theme.colors.textSecondary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  equipmentSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  equipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  equipText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  navAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  docText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  emergencyBanner: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.criticalLight,
    borderWidth: 1,
    borderColor: theme.colors.criticalBorder,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emergencyText: {
    color: theme.colors.critical,
    fontSize: 11,
    fontWeight: '700',
  },
});
