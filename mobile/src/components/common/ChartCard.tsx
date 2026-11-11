import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { DataProvenance } from '../../types';
import { StatusBadge } from './StatusBadge';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  provenance?: DataProvenance;
  selectedRange?: string;
  ranges?: string[];
  onRangeChange?: (range: string) => void;
  footerNote?: string;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  provenance,
  selectedRange,
  ranges,
  onRangeChange,
  footerNote,
  children,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {provenance && <StatusBadge status={provenance} size="sm" />}
      </View>

      {ranges && ranges.length > 0 && onRangeChange && (
        <View style={styles.rangeRow}>
          {ranges.map((r) => {
            const active = selectedRange === r;
            return (
              <TouchableOpacity
                key={r}
                style={[styles.rangeChip, active && styles.rangeChipActive]}
                onPress={() => onRangeChange(r)}
              >
                <Text style={[styles.rangeText, active && styles.rangeTextActive]}>
                  {r.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.body}>{children}</View>

      {footerNote && <Text style={styles.footerNote}>{footerNote}</Text>}
    </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  titleBlock: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    ...theme.typography.headingSm,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    ...theme.typography.bodySm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  rangeChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  rangeChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  rangeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  rangeTextActive: {
    color: '#FFFFFF',
  },
  body: {
    marginTop: 4,
  },
  footerNote: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
