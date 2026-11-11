import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { AlertItem } from '../../types';
import { StatusBadge } from './StatusBadge';
import { CheckCircle2, ShieldAlert, Check } from 'lucide-react-native';

interface AlertCardProps {
  alert: AlertItem;
  onAcknowledge?: () => void;
  onResolve?: () => void;
  canManage?: boolean;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onAcknowledge,
  onResolve,
  canManage = true,
}) => {
  const isCritical = alert.severity === 'CRITICAL';
  const isResolved = alert.status === 'RESOLVED';
  const isAcknowledged = alert.status === 'ACKNOWLEDGED';

  return (
    <View
      style={[
        styles.card,
        isCritical && styles.criticalBorder,
        isResolved && styles.resolvedCard,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.severityWrapper}>
          <StatusBadge status={alert.severity} size="sm" />
          {alert.pond_id && (
            <Text style={styles.pondTag}>Pond {String(alert.pond_id).padStart(2, '0')}</Text>
          )}
        </View>
        <Text style={styles.timeText}>{alert.created_at || 'Recent'}</Text>
      </View>

      <Text style={styles.title}>{alert.title}</Text>
      <Text style={styles.description}>{alert.description}</Text>

      {alert.cause && (
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Cause:</Text>
          <Text style={styles.metaValue}>{alert.cause}</Text>
        </View>
      )}

      {alert.recommended_action && (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>Recommended Action:</Text>
          <Text style={styles.actionText}>{alert.recommended_action}</Text>
        </View>
      )}

      {/* Status info & Management buttons */}
      <View style={styles.footerRow}>
        <View style={styles.statusInfo}>
          {isAcknowledged && (
            <Text style={styles.ackInfo}>
              Ack by {alert.acknowledged_by || 'Operator'}
            </Text>
          )}
          {isResolved && (
            <View style={styles.resolvedInfo}>
              <CheckCircle2 size={13} color={theme.colors.success} />
              <Text style={styles.resolvedText}>
                Resolved {alert.resolved_by ? `by ${alert.resolved_by}` : ''}
              </Text>
            </View>
          )}
        </View>

        {canManage && !isResolved && (
          <View style={styles.buttonGroup}>
            {!isAcknowledged && onAcknowledge && (
              <TouchableOpacity style={styles.ackButton} onPress={onAcknowledge}>
                <Check size={14} color={theme.colors.primary} />
                <Text style={styles.ackButtonText}>Acknowledge</Text>
              </TouchableOpacity>
            )}
            {onResolve && (
              <TouchableOpacity style={styles.resolveButton} onPress={onResolve}>
                <CheckCircle2 size={14} color={theme.colors.textInverse} />
                <Text style={styles.resolveButtonText}>Resolve</Text>
              </TouchableOpacity>
            )}
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
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.subtle,
  },
  criticalBorder: {
    borderColor: theme.colors.criticalBorder,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.critical,
  },
  resolvedCard: {
    opacity: 0.75,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  severityWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pondTag: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  title: {
    ...theme.typography.headingSm,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    ...theme.typography.bodyMd,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  metaValue: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  actionBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginTop: 4,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    marginBottom: 2,
  },
  actionText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
  },
  statusInfo: {
    flex: 1,
  },
  ackInfo: {
    fontSize: 11,
    color: theme.colors.warning,
    fontWeight: '500',
  },
  resolvedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resolvedText: {
    fontSize: 11,
    color: theme.colors.success,
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  ackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  ackButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary,
  },
  resolveButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
});
