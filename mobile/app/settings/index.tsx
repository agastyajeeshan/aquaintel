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
import { settingsApi } from '../../src/services/api/settings.api';
import { useAuthStore } from '../../src/store/authStore';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { LoadingState, ErrorState } from '../../src/components/common/FeedbackStates';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { Settings, Shield, User, History, RotateCcw } from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'audit'>('system');
  const [settings, setSettings] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const [settRes, usersRes, logsRes] = await Promise.all([
        settingsApi.getSettings(),
        user?.role === 'ADMIN' ? settingsApi.getUsers().catch(() => []) : Promise.resolve([]),
        user?.role === 'ADMIN' ? settingsApi.getAuditLogs().catch(() => []) : Promise.resolve([]),
      ]);
      setSettings(settRes);
      setUsers(usersRes);
      setAuditLogs(logsRes);
    } catch (e: any) {
      setError(e.message || 'Failed to load system settings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleResetDemo = async () => {
    Alert.alert(
      'Reset Demo Telemetry',
      'This will reset simulated pond telemetry and alert events back to nominal baseline.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Baseline',
          onPress: async () => {
            try {
              await settingsApi.resetDemo();
              Alert.alert('Reset Complete', 'Simulator has returned to nominal state.');
              loadData();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to reset demo state.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="System Settings"
        subtitle="Farm Architecture & Audit Logs"
        showBack
        onBack={() => router.back()}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'system' && styles.tabBtnActive]}
          onPress={() => setActiveTab('system')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'system' && styles.tabBtnTextActive]}>
            Configuration
          </Text>
        </TouchableOpacity>

        {user?.role === 'ADMIN' && (
          <>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'users' && styles.tabBtnActive]}
              onPress={() => setActiveTab('users')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'users' && styles.tabBtnTextActive]}>
                Users ({users.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'audit' && styles.tabBtnActive]}
              onPress={() => setActiveTab('audit')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'audit' && styles.tabBtnTextActive]}>
                Audit Trail ({auditLogs.length})
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {loading && !settings ? (
        <LoadingState message="Loading system settings..." />
      ) : error && !settings ? (
        <ErrorState message={error} onRetry={loadData} />
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
          {activeTab === 'system' && settings && (
            <View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Farm Facility Metadata</Text>
                <View style={styles.propRow}>
                  <Text style={styles.propLabel}>Farm Name:</Text>
                  <Text style={styles.propVal}>{settings.farm_name || 'AquaIntel Commercial Estate'}</Text>
                </View>
                <View style={styles.propRow}>
                  <Text style={styles.propLabel}>Location:</Text>
                  <Text style={styles.propVal}>{settings.location || 'Nellore, Andhra Pradesh'}</Text>
                </View>
                <View style={styles.propRow}>
                  <Text style={styles.propLabel}>Total Area:</Text>
                  <Text style={styles.propVal}>{settings.total_area_ha || 10.0} Hectares</Text>
                </View>
                <View style={styles.propRow}>
                  <Text style={styles.propLabel}>Total Ponds:</Text>
                  <Text style={styles.propVal}>{settings.total_ponds || 10}</Text>
                </View>
                <View style={styles.propRow}>
                  <Text style={styles.propLabel}>LoRa Frequency:</Text>
                  <Text style={styles.propVal}>865.2 MHz (IN865 Band)</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Autonomous Engine Configuration</Text>
                <View style={styles.propRow}>
                  <Text style={styles.propLabel}>Engine Mode:</Text>
                  <Text style={styles.propVal}>SUPERVISED_AUTONOMOUS</Text>
                </View>
                <View style={styles.propRow}>
                  <Text style={styles.propLabel}>Hypoxia Interlock:</Text>
                  <Text style={[styles.propVal, { color: theme.colors.critical }]}>{'<'} 3.80 mg/L DO</Text>
                </View>
                <View style={styles.propRow}>
                  <Text style={styles.propLabel}>Feeding Cutoff:</Text>
                  <Text style={[styles.propVal, { color: theme.colors.warning }]}>{'<'} 4.00 mg/L DO</Text>
                </View>
              </View>

              {user?.role === 'ADMIN' && (
                <TouchableOpacity style={styles.resetBtn} onPress={handleResetDemo}>
                  <RotateCcw size={16} color={theme.colors.warning} />
                  <Text style={styles.resetBtnText}>Reset Demo Simulator State</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {activeTab === 'users' && (
            <View>
              {users.map((u) => (
                <View key={u.id} style={styles.userItem}>
                  <View style={styles.userItemLeft}>
                    <User size={18} color={theme.colors.primary} />
                    <View>
                      <Text style={styles.userFullName}>{u.full_name || u.username}</Text>
                      <Text style={styles.userSub}>{u.username} • {u.email}</Text>
                    </View>
                  </View>
                  <StatusBadge status={u.role} size="sm" />
                </View>
              ))}
            </View>
          )}

          {activeTab === 'audit' && (
            <View>
              {auditLogs.slice(0, 30).map((log) => (
                <View key={log.id} style={styles.logItem}>
                  <View style={styles.logTop}>
                    <Text style={styles.logAction}>{log.action}</Text>
                    <Text style={styles.logTime}>{log.created_at}</Text>
                  </View>
                  <Text style={styles.logResource}>
                    Resource: {log.resource_type} ({log.resource_id}) • Operator: {log.username || 'System'}
                  </Text>
                </View>
              ))}
            </View>
          )}
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabBtnTextActive: {
    color: theme.colors.primary,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    marginBottom: 10,
  },
  propRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  propLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  propVal: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.warningBorder,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.warning,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  userItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userFullName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  userSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  logItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  logTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logAction: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  logTime: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  logResource: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});
