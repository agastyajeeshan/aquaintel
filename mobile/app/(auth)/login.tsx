import React from 'react';
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
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '../../src/utils/zodResolver';
import { useAuthStore } from '../../src/store/authStore';
import { theme } from '../../src/theme';
import { PrimaryButton } from '../../src/components/common/Buttons';
import { Waves, Lock, User, AlertCircle, ShieldCheck } from 'lucide-react-native';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    clearError();
    const success = await login(values.username.trim(), values.password);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Waves size={36} color={theme.colors.textInverse} />
          </View>
          <Text style={styles.title}>AquaIntel</Text>
          <Text style={styles.subtitle}>
            Aquaculture Operations & Safety Console
          </Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <AlertCircle size={18} color={theme.colors.critical} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputWrapper}>
                  <User size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={(text) => {
                      clearError();
                      onChange(text);
                    }}
                    onBlur={onBlur}
                    placeholder="Enter your farm username"
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Username"
                  />
                </View>
              )}
            />
            {errors.username && (
              <Text style={styles.fieldError}>{errors.username.message}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Password</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputWrapper}>
                  <Lock size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={(text) => {
                      clearError();
                      onChange(text);
                    }}
                    onBlur={onBlur}
                    placeholder="Enter your password"
                    placeholderTextColor={theme.colors.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    accessibilityLabel="Password"
                  />
                </View>
              )}
            />
            {errors.password && (
              <Text style={styles.fieldError}>{errors.password.message}</Text>
            )}
          </View>

          <PrimaryButton
            title="Sign In to Farm Console"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            style={styles.submitBtn}
          />
        </View>

        <View style={styles.securityNotice}>
          <ShieldCheck size={16} color={theme.colors.primary} />
          <Text style={styles.securityNoticeText}>
            Authenticated sessions use hardware-backed encrypted token storage. Contact your farm administrator for account access.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Need an operator account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}>Register</Text>
          </TouchableOpacity>
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
    paddingTop: theme.spacing.xxxl,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  title: {
    ...theme.typography.headingLg,
    color: theme.colors.primaryDark,
    letterSpacing: 1,
  },
  subtitle: {
    ...theme.typography.bodySm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
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
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    color: theme.colors.critical,
    fontSize: 13,
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  fieldError: {
    fontSize: 11,
    color: theme.colors.critical,
    marginTop: 4,
  },
  submitBtn: {
    marginTop: theme.spacing.sm,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  securityNoticeText: {
    fontSize: 11,
    color: theme.colors.primaryDark,
    lineHeight: 16,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  footerText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
