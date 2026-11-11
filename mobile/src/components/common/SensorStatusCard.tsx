import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { WATER_QUALITY_LIMITS } from '../../constants';
import { DataProvenance } from '../../types';
import { StatusBadge } from './StatusBadge';
import { Clock } from 'lucide-react-native';

interface SensorStatusCardProps {
  parameter: 'do' | 'ph' | 'temperature' | 'salinity' | 'ammonia' | 'turbidity' | 'water_level';
  value: number | null | undefined;
  sensorId?: string;
  pondLabel?: string;
  timestamp?: string | null;
  provenance?: DataProvenance;
  isStale?: boolean;
  secondsAgo?: number;
}

export const SensorStatusCard: React.FC<SensorStatusCardProps> = ({
  parameter,
  value,
  sensorId,
  pondLabel,
  timestamp,
  provenance,
  isStale = false,
  secondsAgo,
}) => {
  const config = WATER_QUALITY_LIMITS[parameter];
  if (!config) return null;

  const isUnavailable = value === null || value === undefined || Number.isNaN(value);

  const isCritical =
    !isUnavailable &&
    ((config.criticalMin !== undefined && value < config.criticalMin) ||
      (config.criticalMax !== undefined && value > config.criticalMax));

  const isOptimal = !isUnavailable && value >= config.optimalMin && value <= config.optimalMax;
  const isWarning = !isUnavailable && !isCritical && !isOptimal;

  const getStatusColor = () => {
    if (isUnavailable) return theme.colors.textSecondary;
    if (isCritical) return theme.colors.critical;
    if (isWarning) return theme.colors.warning;
    return theme.colors.success;
  };

  const getStatusBg = () => {
    if (isUnavailable) return '#F3F4F6';
    if (isCritical) return theme.colors.criticalLight;
    if (isWarning) return theme.colors.warningLight;
    return theme.colors.successLight;
  };

  const statusColor = getStatusColor();
  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <View style={[styles.card, { borderColor: isCritical ? theme.colors.criticalBorder : theme.colors.border }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.paramName}>{config.name}</Text>
          {(sensorId || pondLabel) && (
            <Text style={styles.identityText}>
              {[pondLabel, sensorId].filter(Boolean).join(' • ')}
            </Text>
          )}
        </View>
        <View style={styles.badgesRow}>
          {provenance && <StatusBadge status={provenance} size="sm" />}
          <View style={[styles.statusPill, { backgroundColor: getStatusBg() }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {isUnavailable ? 'UNAVAILABLE' : isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : 'OPTIMAL'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.valueContainer}>
        <Text style={[styles.valueText, { color: statusColor }]}>
          {isUnavailable ? '—' : value.toFixed(config.decimals)}
        </Text>
        <Text style={styles.unitText}>{config.unit}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.targetRange}>
          {config.isAdvisoryDefault ? 'Advisory Target' : 'Target'}: {config.optimalMin} – {config.optimalMax} {config.unit}
        </Text>
        {isStale ? (
          <View style={styles.staleNotice}>
            <Clock size={12} color={theme.colors.warning} />
            <Text style={styles.staleText}>
              {secondsAgo ? `${secondsAgo}s ago (stale)` : 'Stale reading'}
            </Text>
          </View>
        ) : formattedTime ? (
          <Text style={styles.timeText}>{formattedTime}</Text>
        ) : null}
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
  identityText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
});
