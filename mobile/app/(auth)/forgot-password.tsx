import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authApi } from '../../src/services/api/auth.api';
import { theme } from '../../src/theme';
import { PrimaryButton } from '../../src/components/common/Buttons';
import { ChevronLeft, AlertCircle, CheckCircle2 } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'REQUEST' | 'CONFIRM'>('REQUEST');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleRequestToken = async () => {
    if (!email.trim()) {
      setError('Please provide your registered farm email.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.requestPasswordReset(email.trim());
      setInfo(res.message);
      if (res.debug_token) {
        setToken(res.debug_token); // Automatically pre-fill debug token for convenience
      }
      setStep('CONFIRM');
    } catch (err: any) {
      setError(err.message || 'Failed to request reset token.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!token.trim() || !newPassword) {
      setError('Please provide the token and your new password.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.confirmPasswordReset(token.trim(), newPassword);
      setInfo(res.message);
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={theme.colors.textPrimary} />
          <Text style={styles.backText}>Back to Sign In</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Password Recovery</Text>
        <Text style={styles.subtitle}>
          {step === 'REQUEST'
            ? 'Enter your email to receive a password reset token'
            : 'Enter the verification token and choose a new password'}
        </Text>

        {error && (
          <View style={styles.errorBox}>
            <AlertCircle size={18} color={theme.colors.critical} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {info && (
          <View style={styles.infoBox}>
            <CheckCircle2 size={18} color={theme.colors.primary} />
            <Text style={styles.infoText}>{info}</Text>
          </View>
        )}

        <View style={styles.formCard}>
          {step === 'REQUEST' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Registered Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="e.g. operator@aquaintel.farm"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <PrimaryButton
                title="Send Recovery Token"
                onPress={handleRequestToken}
                loading={loading}
              />
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Reset Token</Text>
                <TextInput
                  style={styles.input}
                  value={token}
                  onChangeText={setToken}
                  placeholder="Paste reset token"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Choose new password"
                  placeholderTextColor={theme.colors.textMuted}
                  secureTextEntry
                />
              </View>

              <PrimaryButton
                title="Confirm New Password"
                onPress={handleConfirmReset}
                loading={loading}
              />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  backText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  title: {
    ...theme.typography.headingLg,
    color: theme.colors.primaryDark,
  },
  subtitle: {
    ...theme.typography.bodySm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.criticalLight,
    borderWidth: 1,
    borderColor: theme.colors.criticalBorder,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.critical,
    fontSize: 13,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  infoText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
});
