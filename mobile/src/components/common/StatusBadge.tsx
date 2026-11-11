import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { DataProvenance } from '../../types';

interface StatusBadgeProps {
  status: DataProvenance | 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'CRITICAL' | 'WARNING' | 'HIGH' | 'INFO' | 'ONLINE' | 'OFFLINE' | string;
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'sm' }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'LIVE':
      case 'EXECUTED':
      case 'COMPLETED':
      case 'VERIFIED':
        return {
          bg: theme.colors.successLight,
          text: theme.colors.success,
          border: theme.colors.successBorder,
          defaultLabel: status,
          dot: '#059669',
        };
      case 'DEMO':
      case 'SIMULATED':
        return {
          bg: '#EDE9FE',
          text: '#7C3AED',
          border: '#DDD6FE',
          defaultLabel: status,
          dot: '#7C3AED',
        };
      case 'CACHED':
      case 'PENDING':
      case 'ACKNOWLEDGED':
        return {
          bg: theme.colors.warningLight,
          text: theme.colors.warning,
          border: theme.colors.warningBorder,
          defaultLabel: status,
          dot: '#D97706',
        };
      case 'FAILED':
      case 'TIMED_OUT':
      case 'EXPIRED':
        return {
          bg: theme.colors.criticalLight,
          text: theme.colors.critical,
          border: theme.colors.criticalBorder,
          defaultLabel: status,
          dot: '#DC2626',
        };
      case 'OFFLINE':
        return {
          bg: '#F1F5F9',
          text: '#64748B',
          border: '#E2E8F0',
          defaultLabel: 'OFFLINE',
          dot: '#64748B',
        };
      case 'STALE':
        return {
          bg: '#FFEDD5',
          text: '#EA580C',
          border: '#FDBA74',
          defaultLabel: 'STALE',
          dot: '#EA580C',
        };
      case 'UNAVAILABLE':
        return {
          bg: '#F3F4F6',
          text: '#9CA3AF',
          border: '#E5E7EB',
          defaultLabel: 'UNAVAILABLE',
          dot: '#9CA3AF',
        };
      case 'GREEN':
        return {
          bg: theme.colors.successLight,
          text: theme.colors.success,
          border: theme.colors.successBorder,
          defaultLabel: 'OPTIMAL',
          dot: '#059669',
        };
      case 'YELLOW':
      case 'WARNING':
        return {
          bg: theme.colors.warningLight,
          text: theme.colors.warning,
          border: theme.colors.warningBorder,
          defaultLabel: 'WARNING',
          dot: '#D97706',
        };
      case 'ORANGE':
      case 'HIGH':
        return {
          bg: '#FFEDD5',
          text: '#EA580C',
          border: '#FDBA74',
          defaultLabel: 'ATTENTION',
          dot: '#EA580C',
        };
      case 'RED':
      case 'CRITICAL':
        return {
          bg: theme.colors.criticalLight,
          text: theme.colors.critical,
          border: theme.colors.criticalBorder,
          defaultLabel: 'CRITICAL',
          dot: '#DC2626',
        };
      case 'INFO':
        return {
          bg: theme.colors.infoLight,
          text: theme.colors.info,
          border: theme.colors.infoBorder,
          defaultLabel: 'INFO',
          dot: '#2563EB',
        };
      case 'ONLINE':
        return {
          bg: theme.colors.successLight,
          text: theme.colors.success,
          border: theme.colors.successBorder,
          defaultLabel: 'ONLINE',
          dot: '#059669',
        };
      default:
        return {
          bg: '#F3F4F6',
          text: theme.colors.textSecondary,
          border: '#E5E7EB',
          defaultLabel: String(status),
          dot: '#9CA3AF',
        };
    }
  };

  const config = getBadgeConfig();
  const textLabel = label || config.defaultLabel;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingVertical: isSmall ? 2 : 4,
          paddingHorizontal: isSmall ? 6 : 10,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text
        style={[
          styles.text,
          {
            color: config.text,
            fontSize: isSmall ? 10 : 12,
          },
        ]}
      >
        {textLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
