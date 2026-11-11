import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { StatusBadge } from './StatusBadge';
import { DataProvenance } from '../../types';
import { Bell, RefreshCw, ChevronLeft } from 'lucide-react-native';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  provenance?: DataProvenance;
  showBack?: boolean;
  onBack?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  provenance,
  showBack = false,
  onBack,
  onRefresh,
  isRefreshing = false,
  rightAction,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.headerRow}>
        <View style={styles.leftContainer}>
          {showBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ChevronLeft size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          )}
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {provenance && (
                <View style={styles.badgeWrapper}>
                  <StatusBadge status={provenance} size="sm" />
                </View>
              )}
            </View>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>

        <View style={styles.rightContainer}>
          {onRefresh && (
            <TouchableOpacity
              onPress={onRefresh}
              style={[styles.iconButton, isRefreshing && styles.rotating]}
              disabled={isRefreshing}
            >
              <RefreshCw size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          {rightAction}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: theme.spacing.sm,
    padding: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.headingMd,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    ...theme.typography.bodySm,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  badgeWrapper: {
    marginLeft: theme.spacing.sm,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.sm,
    marginLeft: theme.spacing.xs,
  },
  rotating: {
    opacity: 0.6,
  },
});
