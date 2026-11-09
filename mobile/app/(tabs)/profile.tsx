import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { offlineDatabase } from '../../src/services/storage/database';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { ConfirmationDialog } from '../../src/components/common/ConfirmationDialog';
import {
  User,
  Shield,
  Bell,
  Database,
  LogOut,
  ChevronRight,
  HardDrive,
  Cpu,
  FileSpreadsheet,
  Settings,
  HelpCircle,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const {
    temperatureUnit,
    setTemperatureUnit,
    doUnit,
    setDoUnit,
    pushNotificationsEnabled,
    setPushNotifications,
    offlineSyncEnabled,
    setOfflineSync,
  } = useSettingsStore();

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Local Cache',
      'This will remove cached pond readings and offline data from your device storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            setClearingCache(true);
            await offlineDatabase.clearAllCache();
            setClearingCache(false);
            Alert.alert('Cache Cleared', 'Local SQLite cache has been purged.');
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Account & Preferences" subtitle="Operator Profile & Farm Config" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <User size={32} color={theme.colors.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.full_name || 'Farm Operator'}</Text>
            <Text style={styles.userRole}>
              Role: {user?.role || 'OPERATOR'} • {user?.username}
            </Text>
            <Text style={styles.userEmail}>{user?.email || 'operator@aquaintel.farm'}</Text>
          </View>
        </View>

        {/* Facility Info Strip */}
        <View style={styles.facilityBox}>
          <View style={styles.facilityLeft}>
            <Shield size={18} color={theme.colors.primary} />
            <View>
              <Text style={styles.facilityTitle}>Commercial Estate</Text>
              <Text style={styles.facilitySubtitle}>Nellore, Andhra Pradesh • 10.0 Hectares</Text>
            </View>
          </View>
          <Text style={styles.facilityBadge}>IN865</Text>
        </View>

        {/* Section: Operational Shortcuts */}
        <Text style={styles.sectionHeader}>Operational Management</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/devices')}>
            <View style={styles.menuItemLeft}>
              <Cpu size={20} color={theme.colors.primary} />
              <Text style={styles.menuItemText}>IoT Devices & LoRa Gateways</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/reports')}>
            <View style={styles.menuItemLeft}>
              <FileSpreadsheet size={20} color={theme.colors.primary} />
              <Text style={styles.menuItemText}>Daily Farm Reports & CSV Export</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings')}>
            <View style={styles.menuItemLeft}>
              <Settings size={20} color={theme.colors.primary} />
              <Text style={styles.menuItemText}>Audit Logs & System Settings</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Section: Preferences */}
        <Text style={styles.sectionHeader}>Display & Unit Preferences</Text>
        <View style={styles.menuGroup}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Temperature Unit (°C / °F)</Text>
            <TouchableOpacity
              style={styles.unitToggle}
              onPress={() => setTemperatureUnit(temperatureUnit === 'C' ? 'F' : 'C')}
            >
              <Text style={styles.unitToggleText}>°{temperatureUnit}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Dissolved Oxygen Unit</Text>
            <TouchableOpacity
              style={styles.unitToggle}
              onPress={() => setDoUnit(doUnit === 'mg/L' ? 'ppm' : 'mg/L')}
            >
              <Text style={styles.unitToggleText}>{doUnit}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Emergency Push Notifications</Text>
            <Switch
              value={pushNotificationsEnabled}
              onValueChange={setPushNotifications}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Offline SQLite Cache Sync</Text>
            <Switch
              value={offlineSyncEnabled}
              onValueChange={setOfflineSync}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>
        </View>

        {/* Section: Data Storage & Maintenance */}
        <Text style={styles.sectionHeader}>Storage & Cache</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleClearCache}
            disabled={clearingCache}
          >
            <View style={styles.menuItemLeft}>
              <Database size={20} color={theme.colors.warning} />
              <Text style={styles.menuItemText}>Clear Offline Cache (SQLite)</Text>
            </View>
            <Text style={styles.actionMetaText}>Purge</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setLogoutModalVisible(true)}
        >
          <LogOut size={20} color={theme.colors.critical} />
          <Text style={styles.logoutText}>Sign Out from Console</Text>
        </TouchableOpacity>

        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>AquaIntel Mobile Android • Version 1.0.0 (Build 52)</Text>
          <Text style={styles.appInfoSubtext}>Edge-Cloud Hybrid Architecture • Zero-Safety Bypass</Text>
        </View>
      </ScrollView>

      <ConfirmationDialog
        visible={logoutModalVisible}
        title="Sign Out"
        message="Are you sure you want to end your current session? You will need to sign in again to access farm controls."
        confirmLabel="Sign Out"
        isDangerous
        onConfirm={handleLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  facilityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  facilityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  facilityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  facilitySubtitle: {
    fontSize: 11,
    color: theme.colors.textPrimary,
    marginTop: 1,
  },
  facilityBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    backgroundColor: '#FFFFFF',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  actionMetaText: {
    fontSize: 12,
    color: theme.colors.warning,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  switchLabel: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  unitToggle: {
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  unitToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.criticalBorder,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.critical,
  },
  appInfo: {
    alignItems: 'center',
    paddingBottom: theme.spacing.lg,
  },
  appInfoText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  appInfoSubtext: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
