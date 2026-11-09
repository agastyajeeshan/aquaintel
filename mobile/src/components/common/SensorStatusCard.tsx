import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { WATER_QUALITY_LIMITS } from '../../constants';
import { AlertTriangle, Clock } from 'lucide-react-native';

interface SensorStatusCardProps {
  parameter: 'do' | 'ph' | 'temperature' | 'salinity' | 'ammonia' | 'turbidity';
  value: number;
  isStale?: boolean;
  secondsAgo?: number;
}

export const SensorStatusCard: React.FC<SensorStatusCardProps> = ({
  parameter,
  value,
  isStale = false,
  secondsAgo,
}) => {
  const config = WATER_QUALITY_LIMITS[parameter];
  if (!config) return null;

  const isCritical =
    (config.criticalMin !== undefined && value < config.criticalMin) ||
    (config.criticalMax !== undefined && value > config.criticalMax);

  const isOptimal = value >= config.optimalMin && value <= config.optimalMax;
  const isWarning = !isCritical && !isOptimal;

  const getStatusColor = () => {
    if (isCritical) return theme.colors.critical;
    if (isWarning) return theme.colors.warning;
    return theme.colors.success;
  };

  const getStatusBg = () => {
    if (isCritical) return theme.colors.criticalLight;
    if (isWarning) return theme.colors.warningLight;
    return theme.colors.successLight;
  };

  const statusColor = getStatusColor();

  return (
    <View style={[styles.card, { borderColor: isCritical ? theme.colors.criticalBorder : theme.colors.border }]}>
      <View style={styles.header}>
        <Text style={styles.paramName}>{config.name}</Text>
        <View style={[styles.statusPill, { backgroundColor: getStatusBg() }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : 'OPTIMAL'}
          </Text>
        </View>
      </View>

      <View style={styles.valueContainer}>
        <Text style={[styles.valueText, { color: statusColor }]}>
          {value.toFixed(config.decimals)}
        </Text>
        <Text style={styles.unitText}>{config.unit}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.targetRange}>
          Target: {config.optimalMin} – {config.optimalMax} {config.unit}
        </Text>
        {isStale && (
          <View style={styles.staleNotice}>
            <Clock size={12} color={theme.colors.warning} />
            <Text style={styles.staleText}>
              {secondsAgo ? `${secondsAgo}s ago (stale)` : 'Stale probe reading'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.subtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paramName: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  valueText: {
    fontSize: 26,
    fontWeight: '700',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 6,
  },
  targetRange: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  staleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  staleText: {
    fontSize: 11,
    color: theme.colors.warning,
    fontWeight: '500',
  },
});
