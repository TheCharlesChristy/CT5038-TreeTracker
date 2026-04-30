import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { FaviconHead } from '@/components/base/FaviconHead';

import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { AppInput } from '@/components/base/AppInput';
import { Theme } from '@/styles/theme';
import { API_BASE, ENDPOINTS } from '@/config/api';

export default function ResetPasswordScreen() {
  const { width } = useWindowDimensions();
  const isMobileLayout = width < 680;

  const { token } = useLocalSearchParams();

  const [password, setPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordError =
    passwordTouched && password.length < 8
      ? 'Password must be at least 8 characters.'
      : '';

  const canSubmit = Boolean(password.length >= 8 && token) && !loading && !success;

  const handleSubmit = async () => {
    setPasswordTouched(true);

    if (!token) {
      setMessage('Reset token is missing or invalid.');
      setError(true);
      return;
    }

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      setError(true);
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      setError(false);

      const res = await fetch(API_BASE + ENDPOINTS.AUTH_RESET_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const text = await res.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        setMessage(`${res.status} ${res.statusText}: ${text}`);
        setError(true);
        return;
      }

      if (!res.ok) {
        setMessage(data.error || 'Something went wrong.');
        setError(true);
        return;
      }

      setMessage('Your password has been reset successfully.');
      setError(false);
      setSuccess(true);

    } catch (err) {
      const msg =
        err instanceof Error ? `${err.name}: ${err.message}` : String(err);

      setMessage(`Network error — ${msg}`);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Reset Password | TreeGuardians' }} />
      <FaviconHead />
      <AppContainer
        scrollable
        noPadding
        backgroundImage={require('@/assets/images/CharltonKings.jpg')}
      >
      <View style={[styles.page, isMobileLayout && styles.pageMobile]}>
        <View style={[styles.formColumn, !isMobileLayout && styles.formColumnCentered]}>
          <View style={[styles.formCard, isMobileLayout && styles.formCardMobile]}>

            {/* Back link */}
            <View style={styles.topRow}>
              <Pressable onPress={() => router.push('/login')} style={styles.backLink}>
                <AppText variant="caption" style={styles.backLinkText}>
                  Back to login
                </AppText>
              </Pressable>
            </View>

            {/* Title */}
            <AppText variant="title" style={[styles.title, isMobileLayout && styles.titleMobile]}>
              Set a new password
            </AppText>

            {/* Subtitle */}
            <AppText variant="body" style={styles.subtitle}>
              Enter your new password below.
            </AppText>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <AppText variant="caption" style={styles.label}>
                  New password
                </AppText>

                <AppInput
                  placeholder="Enter new password"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (!passwordTouched) setPasswordTouched(true);
                  }}
                  secureTextEntry
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => {
                    setPasswordFocused(false);
                    setPasswordTouched(true);
                  }}
                  editable={!success}
                  invalid={!!passwordError}
                  inputWrapperStyle={[
                    styles.inputWrapper,
                    passwordFocused && styles.inputFocused,
                    !!passwordError && styles.inputError,
                  ]}
                  containerStyle={styles.inputContainer}
                />

                {!!passwordError && (
                  <AppText variant="caption" style={styles.errorText}>
                    {passwordError}
                  </AppText>
                )}
              </View>

              <AppButton
                title={loading ? 'Resetting…' : 'Reset Password'}
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={styles.submitButton}
                buttonStyle={styles.submitButtonInner}
              />

              {/* Inline message */}
              {!!message && (
                <View style={styles.messageBox}>
                  <AppText
                    variant="body"
                    style={[
                      styles.messageText,
                      error ? styles.errorTextInline : styles.successTextInline,
                    ]}
                  >
                    {message}
                  </AppText>
                </View>
              )}

              {/* Back to login button */}
              {success && (
                <AppButton
                  title="Back to Login"
                  onPress={() => router.push('/login')}
                  style={styles.submitButton}
                  buttonStyle={styles.submitButtonInner}
                />
              )}
            </View>

          </View>
        </View>
      </View>
    </AppContainer>
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: Theme.Spacing.large,
    paddingVertical: Theme.Spacing.extraLarge,
    justifyContent: 'center',
  },
  pageMobile: {
    paddingHorizontal: Theme.Spacing.medium,
    paddingVertical: Theme.Spacing.large,
  },
  formColumn: {
    width: '100%',
  },
  formColumnCentered: {
    maxWidth: 520,
    alignSelf: 'center',
  },
  formCard: {
    backgroundColor: 'rgba(248, 252, 248, 0.76)',
    borderRadius: 24,
    padding: Theme.Spacing.extraLarge,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.44)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 6,
  },
  formCardMobile: {
    borderRadius: 18,
    padding: Theme.Spacing.large,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.Spacing.large,
  },
  backLink: {
    alignSelf: 'flex-start',
    paddingVertical: Theme.Spacing.extraSmall + 2,
    paddingHorizontal: Theme.Spacing.small + 2,
    borderRadius: 999,
    backgroundColor: 'rgba(46, 125, 50, 0.10)',
  },
  backLinkText: {
    color: '#1B5E20',
    fontWeight: '700',
  },
  title: {
    color: '#16391A',
    fontSize: 34,
    lineHeight: 40,
  },
  titleMobile: {
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    marginTop: Theme.Spacing.small,
    marginBottom: Theme.Spacing.large,
    color: '#314031',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: Theme.Spacing.medium,
  },
  label: {
    marginBottom: Theme.Spacing.small,
    color: '#16391A',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: Theme.Spacing.extraSmall,
  },
  inputWrapper: {
    borderRadius: 14,
    borderColor: 'rgba(255, 255, 255, 0.52)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  inputFocused: {
    borderColor: '#2E7D32',
    borderWidth: 2,
  },
  inputError: {
    borderColor: '#B3261E',
  },
  errorText: {
    color: '#B3261E',
  },
  submitButton: {
    marginTop: Theme.Spacing.medium,
  },
  submitButtonInner: {
    minHeight: 54,
    borderRadius: 14,
    justifyContent: 'center',
  },
  messageBox: {
    marginTop: Theme.Spacing.medium,
  },
  messageText: {
    textAlign: 'center',
  },
  successTextInline: {
    color: '#1B5E20',
    fontWeight: '600',
  },
  errorTextInline: {
    color: '#B3261E',
    fontWeight: '600',
  },
});