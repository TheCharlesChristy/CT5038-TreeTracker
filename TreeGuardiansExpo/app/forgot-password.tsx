import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { AppInput } from '@/components/base/AppInput';
import { StatusMessageBox, StatusMessage } from '@/components/base/StatusMessageBox';
import { Theme } from '@/styles/theme';
import { Stack, router } from 'expo-router';
import Head from 'expo-router/head';
import { API_BASE, ENDPOINTS } from '@/config/api';

export default function ForgotPasswordScreen() {
  const { width } = useWindowDimensions();
  const isMobileLayout = width < 680;

  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const emailError = emailTouched && !email.trim() ? 'Email address is required.' : '';
  const canSubmit = Boolean(email.trim()) && !loading;

  const handleSubmit = async () => {
    setEmailTouched(true);
    if (!email.trim()) {
      setStatus({ title: 'Check your email', message: 'Please enter your email address.', variant: 'error', createdAt: Date.now() });
      return;
    }

    try {
      setLoading(true);
      setStatus(null);

      const res = await fetch(API_BASE + ENDPOINTS.AUTH_FORGOT_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setStatus({ title: 'Server Error', message: `${res.status} ${res.statusText}: ${text}`, variant: 'error', createdAt: Date.now() });
        return;
      }

      if (!res.ok) {
        setStatus({ title: 'Request Failed', message: data.error || 'Something went wrong.', variant: 'error', createdAt: Date.now() });
        return;
      }

      setStatus({
        title: 'Check your inbox',
        message: 'If an account exists for that email, a reset link has been sent.',
        variant: 'success',
        createdAt: Date.now(),
      });

    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      setStatus({ title: 'Connection Error', message: `Network or client error — ${message}`, variant: 'error', createdAt: Date.now() });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Forgot Password | TreeGuardians' }} />
      <Head>
        <link rel="icon" type="image/png" href={require('@/assets/images/logo.png')} />
      </Head>
      <AppContainer
        scrollable
        noPadding
        backgroundImage={require('@/assets/images/CharltonKings.jpg')}
      >
      <View
        style={[
          styles.page,
          isMobileLayout && styles.pageMobile,
        ]}
      >
        <StatusMessageBox
          status={status}
          onClose={() => setStatus(null)}
        />

        <View style={[styles.formColumn, !isMobileLayout && styles.formColumnCentered]}>
          <View style={[styles.formCard, isMobileLayout && styles.formCardMobile]}>

            <View style={styles.topRow}>
              <Pressable onPress={() => router.push('/login')} style={styles.backLink}>
                <AppText variant="caption" style={styles.backLinkText}>
                  Back to login
                </AppText>
              </Pressable>
            </View>

            <AppText variant="title" style={[styles.title, isMobileLayout && styles.titleMobile]}>
              Reset your password
            </AppText>

            <AppText variant="body" style={styles.subtitle}>
              Enter the email address linked to your account and we will send you a reset link.
            </AppText>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <AppText variant="caption" style={styles.label}>
                  Email address
                </AppText>

                <AppInput
                  placeholder="name@example.com"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (!emailTouched) setEmailTouched(true);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  keyboardType="email-address"
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => {
                    setEmailFocused(false);
                    setEmailTouched(true);
                  }}
                  invalid={!!emailError}
                  inputWrapperStyle={[
                    styles.inputWrapper,
                    emailFocused && styles.inputFocused,
                    !!emailError && styles.inputError,
                  ]}
                  containerStyle={styles.inputContainer}
                />

                {!!emailError && (
                  <AppText variant="caption" style={styles.errorText}>
                    {emailError}
                  </AppText>
                )}
              </View>

              <AppButton
                title={loading ? 'Sending…' : 'Send Reset Link'}
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={styles.submitButton}
                buttonStyle={styles.submitButtonInner}
              />

              <View style={styles.footer}>
                <AppText variant="body" style={styles.footerText}>
                  Remembered it?
                </AppText>
                <Pressable onPress={() => router.push('/login')}>
                  <AppText variant="body" style={styles.footerLink}>
                    Sign in instead
                  </AppText>
                </Pressable>
              </View>
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
    letterSpacing: 0.2,
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
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
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
    backgroundColor: 'rgba(247, 255, 247, 0.96)',
  },
  inputError: {
    borderColor: '#B3261E',
    backgroundColor: 'rgba(255, 248, 247, 0.94)',
  },
  errorText: {
    color: '#B3261E',
  },
  submitButton: {
    marginBottom: Theme.Spacing.medium,
  },
  submitButtonInner: {
    minHeight: 54,
    borderRadius: 14,
    justifyContent: 'center',
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Theme.Spacing.medium,
    flexWrap: 'wrap',
  },
  footerText: {
    color: '#314031',
    marginRight: Theme.Spacing.extraSmall,
  },
  footerLink: {
    color: '#1B5E20',
    fontWeight: '700',
  },
});