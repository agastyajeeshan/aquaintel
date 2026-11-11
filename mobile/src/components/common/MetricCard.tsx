import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../theme';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  status?: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'NEUTRAL';
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  status = 'NEUTRAL',
  icon,
  style,
}) => {
  const getStatusBorder = () => {
    switch (status) {
      case 'WARNING':
        return theme.colors.warning;
      case 'CRITICAL':
        return theme.colors.critical;
      case 'NORMAL':
        return theme.colors.success;
      default:
        return theme.colors.border;
    }
  };

  return (
    <View
      style={[
        styles.card,
        { borderLeftColor: getStatusBorder(), borderLeftWidth: status !== 'NEUTRAL' ? 4 : 1 },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {icon && <View style={styles.iconWrapper}>{icon}</View>}
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  title: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  iconWrapper: {
    marginLeft: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    ...theme.typography.metricMedium,
    color: theme.colors.textPrimary,
  },
  unit: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  subtitle: {
    ...theme.typography.bodySm,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
