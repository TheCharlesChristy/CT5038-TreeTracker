import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { AppInput } from '@/components/base/AppInput';
import { AuthenticatedRedirect } from '@/components/auth/AuthenticatedRedirect';
import { Theme } from '@/styles/theme';
import { Stack, router } from 'expo-router';
import { getUsernameError, getEmailError, getPasswordError } from '@/lib/authValidation';
import { saveItem } from '@/utilities/authStorage';
import { API_BASE, ENDPOINTS } from '@/config/api';
import { PasswordStrengthIndicator } from '@/components/base/PasswordStrengthIndicator';
import { StatusMessageBox, StatusMessage } from '@/components/base/StatusMessageBox';
import { useStableViewportDimensions } from '@/hooks/useStableViewportDimensions';
import { FaviconHead } from '@/components/base/FaviconHead';

export default function CreateAccount() {
  const successRedirectDuration = 3;
  const { width, height } = useStableViewportDimensions();
  const isMobileLayout = width < 680;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailConsent, setEmailConsent] = useState(false);

  const [usernameTouched, setUsernameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [usernameFocused, setUsernameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const trimmedUsername = useMemo(() => username.trim(), [username]);
  const trimmedEmail = useMemo(() => email.trim(), [email]);

  const usernameError = getUsernameError(trimmedUsername);
  const emailError = trimmedEmail ? getEmailError(trimmedEmail) : null;
  const passwordError = getPasswordError(password);
  const canSubmit = Boolean(trimmedUsername && password) && !usernameError && !emailError && !passwordError && emailConsent;
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status?.variant === 'success') {
      redirectTimer.current = setTimeout(() => {
        setStatus(null);
        router.replace('/mainPage');
      }, successRedirectDuration * 1000);
    }
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [status, successRedirectDuration]);

  const handleCreateAccount = async () => {
    setUsernameTouched(true);
    setEmailTouched(true);
    setPasswordTouched(true);

    if (usernameError) {
      setStatus({ title: 'Check your username', message: usernameError, variant: 'error', createdAt: Date.now() });
      return;
    }

    if (emailError) {
      setStatus({ title: 'Check your email', message: emailError, variant: 'error', createdAt: Date.now() });
      return;
    }

    if (passwordError) {
      setStatus({ title: 'Check your password', message: passwordError, variant: 'error', createdAt: Date.now() });
      return;
    }

    try {
      setLoading(true);
      setStatus(null);

      const response = await fetch(API_BASE + ENDPOINTS.AUTH_REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: trimmedUsername,
          email: trimmedEmail || null,
          password,
          emailConsent,
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setStatus({ title: 'Server Error', message: `${response.status} ${response.statusText}: ${text}`, variant: 'error', createdAt: Date.now() });
        return;
      }

      if (!response.ok) {
        const detail = `${response.status} ${response.statusText}: ${data.error || JSON.stringify(data)}`;
        setStatus({ title: 'Registration Failed', message: detail, variant: 'error', createdAt: Date.now() });
        return;
      }

      await saveItem('accessToken', data.accessToken);
      await saveItem('refreshToken', data.refreshToken);
      await saveItem('user', JSON.stringify(data.user));

      setStatus({
        title: 'Account Created',
        message: 'Your account has been created successfully!',
        variant: 'success',
        createdAt: Date.now(),
      });
    } catch (error) {
      const message = error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
      console.error('Registration error:', error);
      setStatus({ title: 'Connection Error', message: `Network or client error — ${message}`, variant: 'error', createdAt: Date.now() });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Create Account | TreeGuardians' }} />
      <FaviconHead title="Create Account | TreeGuardians" />
      <AppContainer
        scrollable
        noPadding
        backgroundImage={require('../assets/images/CharltonKings.jpg')}
      >
      <AuthenticatedRedirect />
      <View
        style={[
          styles.page,
          isMobileLayout && styles.pageMobile,
          { minHeight: height - Theme.Spacing.large },
        ]}
      >
        <StatusMessageBox
          status={status}
          redirectDuration={successRedirectDuration}
          onClose={() => {
            if (redirectTimer.current) clearTimeout(redirectTimer.current);
            if (status?.variant === 'success') {
              router.replace('/mainPage');
            }
            setStatus(null);
          }}
        />

        <View style={[styles.shell, isMobileLayout && styles.shellMobile]}>
          <View style={styles.formColumn}>
            <View style={[styles.formCard, isMobileLayout && styles.formCardMobile]}>
              <Pressable onPress={() => router.push('/')} style={styles.homeLink}>
                <AppText variant="caption" style={styles.homeLinkText}>
                  Back
                </AppText>
              </Pressable>

              <AppText variant="title" style={[styles.title, isMobileLayout && styles.titleMobile]}>
                Join the Community
              </AppText>

              <AppText variant="body" style={[styles.subtitle, isMobileLayout && styles.subtitleMobile]}>
                Discover local trees, share sightings, and help protect the canopy in your area.
              </AppText>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <AppText variant="caption" style={styles.label}>
                    Username *
                  </AppText>

                  <AppInput
                    placeholder="e.g. tree_guardian"
                    value={username}
                    onChangeText={(value) => {
                      setUsername(value);
                      if (!usernameTouched) {
                        setUsernameTouched(true);
                      }
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="username"
                    autoComplete="username"
                    onFocus={() => setUsernameFocused(true)}
                    onBlur={() => {
                      setUsernameFocused(false);
                      setUsernameTouched(true);
                    }}
                    invalid={usernameTouched && !!usernameError}
                    inputWrapperStyle={[
                      styles.inputWrapper,
                      usernameFocused && styles.inputFocused,
                      usernameTouched && !!usernameError && styles.inputError,
                    ]}
                    containerStyle={styles.inputContainer}
                  />

                  {usernameTouched && !!usernameError && (
                    <AppText variant="caption" style={styles.errorText}>
                      {usernameError}
                    </AppText>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <AppText variant="caption" style={styles.label}>
                    Email address (optional)
                  </AppText>

                  <AppInput
                    placeholder="name@example.com"
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      if (!emailTouched) {
                        setEmailTouched(true);
                      }
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="emailAddress"
                    autoComplete="email"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => {
                      setEmailFocused(false);
                      setEmailTouched(true);
                    }}
                    invalid={emailTouched && !!emailError}
                    inputWrapperStyle={[
                      styles.inputWrapper,
                      emailFocused && styles.inputFocused,
                      emailTouched && !!emailError && styles.inputError,
                    ]}
                    containerStyle={styles.inputContainer}
                  />

                  {emailTouched && !!emailError && (
                    <AppText variant="caption" style={styles.errorText}>
                      {emailError}
                    </AppText>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <AppText variant="caption" style={styles.label}>
                    Password
                  </AppText>

                  <AppInput
                    placeholder="At least 8 characters"
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      if (!passwordTouched) {
                        setPasswordTouched(true);
                      }
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                    autoComplete="password-new"
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => {
                      setPasswordFocused(false);
                      setPasswordTouched(true);
                    }}
                    invalid={passwordTouched && !!passwordError}
                    inputWrapperStyle={[
                      styles.inputWrapper,
                      passwordFocused && styles.inputFocused,
                      passwordTouched && !!passwordError && styles.inputError,
                    ]}
                    rightAdornment={(
                      <Pressable
                        onPress={() => setShowPassword((prev) => !prev)}
                        hitSlop={8}
                        style={styles.visibilityToggle}
                      >
                        <AppText variant="caption" style={styles.visibilityToggleText}>
                          {showPassword ? 'Hide' : 'Show'}
                        </AppText>
                      </Pressable>
                    )}
                    containerStyle={styles.inputContainer}
                  />

                  {passwordTouched && !!passwordError && (
                    <AppText variant="caption" style={styles.errorText}>
                      {passwordError}
                    </AppText>
                  )}

                  <PasswordStrengthIndicator password={password} />
                </View>

                <Pressable
                  onPress={() => setEmailConsent((prev) => !prev)}
                  style={styles.consentRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: emailConsent }}
                >
                  <View style={[styles.checkbox, emailConsent && styles.checkboxChecked]}>
                    {emailConsent ? (
                      <AppText variant="caption" style={styles.checkboxTick}>✓</AppText>
                    ) : null}
                  </View>
                  <AppText variant="caption" style={styles.consentText}>
                    I agree to receive occasional emails about account activity and important updates.
                    You can unsubscribe at any time.
                  </AppText>
                </Pressable>

                <AppButton
                  title={loading ? 'Creating account…' : 'Join the Community'}
                  onPress={handleCreateAccount}
                  disabled={!canSubmit || loading}
                  style={styles.submitButton}
                  buttonStyle={styles.submitButtonInner}
                />

                <View style={styles.trustPanel}>
                  <AppText variant="caption" style={styles.trustTitle}>
                    Why your data is safe
                  </AppText>
                  <AppText variant="caption" style={styles.trustText}>
                    We only use your email for account access and key updates. Your details are not shared publicly.
                  </AppText>
                </View>

                <View style={styles.footer}>
                  <AppText variant="body" style={styles.footerText}>
                    Already have an account?
                  </AppText>
                  <Pressable onPress={() => router.push('/login')}>
                    <AppText variant="body" style={styles.footerLink}>
                      Sign in
                    </AppText>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.previewColumn}>
            <View style={[styles.previewCard, isMobileLayout && styles.previewCardMobile]}>
              <View style={styles.previewEyebrow}>
                <AppText variant="caption" style={styles.previewEyebrowText}>
                  Open, local, community-led
                </AppText>
              </View>

              <AppText variant="subtitle" style={[styles.previewTitle, isMobileLayout && styles.previewTitleMobile]}>
                Build your local tree network
              </AppText>

              <AppText variant="body" style={[styles.previewSubtitle, isMobileLayout && styles.previewSubtitleMobile]}>
                Start in minutes and turn everyday walks into shared community impact.
              </AppText>

              <View style={styles.previewList}>
                <View style={styles.previewFeatureItem}>
                  <View style={styles.previewFeatureBadge}>
                    <AppText variant="caption" style={styles.previewFeatureBadgeText}>
                      Map
                    </AppText>
                  </View>
                  <View style={styles.previewFeatureCopy}>
                    <AppText variant="body" style={styles.previewFeatureTitle}>
                      Add and monitor trees around your neighborhood
                    </AppText>
                    <AppText variant="caption" style={styles.previewFeatureText}>
                      Pin locations, upload photos, and track growth over time.
                    </AppText>
                  </View>
                </View>

                <View style={styles.previewFeatureItem}>
                  <View style={styles.previewFeatureBadge}>
                    <AppText variant="caption" style={styles.previewFeatureBadgeText}>
                      Explore
                    </AppText>
                  </View>
                  <View style={styles.previewFeatureCopy}>
                    <AppText variant="body" style={styles.previewFeatureTitle}>
                      Discover local tree photos and biodiversity
                    </AppText>
                    <AppText variant="caption" style={styles.previewFeatureText}>
                      Browse species data and community stories from your area.
                    </AppText>
                  </View>
                </View>

                <View style={styles.previewFeatureItem}>
                  <View style={styles.previewFeatureBadge}>
                    <AppText variant="caption" style={styles.previewFeatureBadgeText}>
                      Connect
                    </AppText>
                  </View>
                  <View style={styles.previewFeatureCopy}>
                    <AppText variant="body" style={styles.previewFeatureTitle}>
                      Join guardians who care about green spaces
                    </AppText>
                    <AppText variant="caption" style={styles.previewFeatureText}>
                      Collaborate with neighbors to protect and restore local nature.
                    </AppText>
                  </View>
                </View>
              </View>

              <View style={styles.previewStatsRow}>
                <View style={styles.previewStatCard}>
                  <AppText variant="caption" style={styles.previewStatLabel}>
                    Setup time
                  </AppText>
                  <AppText variant="subtitle" style={styles.previewStatValue}>
                    Under 2 minutes
                  </AppText>
                </View>

                <View style={styles.previewStatCard}>
                  <AppText variant="caption" style={styles.previewStatLabel}>
                    Your data
                  </AppText>
                  <AppText variant="subtitle" style={styles.previewStatValue}>
                    Private by default
                  </AppText>
                </View>
              </View>

              <View style={styles.previewBadge}>
                <AppText variant="caption" style={styles.previewBadgeText}>
                  TreeGuardians members are helping communities map, protect, and restore urban nature.
                </AppText>
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
    position: 'relative',
    paddingHorizontal: Theme.Spacing.large,
    paddingVertical: Theme.Spacing.extraLarge,
  },
  pageMobile: {
    paddingHorizontal: Theme.Spacing.medium,
    paddingVertical: Theme.Spacing.large,
  },
  shell: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 1160,
    gap: Theme.Spacing.large,
    zIndex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  shellMobile: {
    gap: Theme.Spacing.medium,
  },
  formColumn: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 500,
    maxWidth: 520,
    minWidth: 0,
  },
  formCard: {
    flex: 1,
    minHeight: 720,
    backgroundColor: 'rgba(248, 252, 248, 0.76)',
    borderRadius: 20,
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
    borderRadius: 16,
    padding: Theme.Spacing.large,
    minHeight: 0,
  },
  homeLink: {
    alignSelf: 'flex-start',
    marginBottom: Theme.Spacing.medium,
    paddingVertical: Theme.Spacing.extraSmall,
    paddingHorizontal: Theme.Spacing.small,
    borderRadius: 999,
    backgroundColor: 'rgba(46, 125, 50, 0.10)',
  },
  homeLinkText: {
    color: '#1B5E20',
    fontWeight: '600',
  },
  title: {
    color: '#1B5E20',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0,
  },
  titleMobile: {
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    marginTop: Theme.Spacing.small,
    marginBottom: Theme.Spacing.large,
    color: '#2D3A2D',
  },
  subtitleMobile: {
    marginBottom: Theme.Spacing.medium,
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
    letterSpacing: 0,
  },
  inputContainer: {
    marginBottom: Theme.Spacing.extraSmall,
  },
  inputWrapper: {
    borderRadius: 12,
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
  visibilityToggle: {
    paddingLeft: Theme.Spacing.small,
    paddingVertical: 4,
  },
  visibilityToggleText: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  errorText: {
    color: '#B3261E',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Theme.Spacing.small,
    marginBottom: Theme.Spacing.medium,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(46, 125, 50, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  consentText: {
    flex: 1,
    minWidth: 0,
    color: '#2D3A2D',
    lineHeight: 19,
  },
  submitButton: {
    marginTop: Theme.Spacing.small,
    marginBottom: Theme.Spacing.medium,
  },
  submitButtonInner: {
    borderRadius: 12,
    minHeight: 54,
    justifyContent: 'center',
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },
  trustPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.26)',
    padding: Theme.Spacing.medium,
    marginBottom: Theme.Spacing.medium,
  },
  trustTitle: {
    color: '#1B5E20',
    fontWeight: '600',
    marginBottom: Theme.Spacing.extraSmall,
  },
  trustText: {
    color: '#2F3A2F',
    lineHeight: 20,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.Spacing.medium,
    gap: Theme.Spacing.small,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(46, 125, 50, 0.24)',
  },
  dividerText: {
    color: '#466046',
    textTransform: 'lowercase',
  },
  socialRow: {
    flexDirection: 'row',
    gap: Theme.Spacing.small,
  },
  socialRowStacked: {
    flexDirection: 'column',
  },
  socialButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(123, 146, 123, 0.7)',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.Spacing.small,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  socialButtonStacked: {
    width: '100%',
  },
  socialButtonText: {
    color: '#1F2C1F',
    fontSize: 15,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Theme.Spacing.large,
    flexWrap: 'wrap',
    gap: Theme.Spacing.extraSmall,
  },
  footerText: {
    color: '#2F3A2F',
  },
  footerLink: {
    color: '#1B5E20',
    fontWeight: '700',
  },
  previewColumn: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 500,
    maxWidth: 520,
    minWidth: 0,
  },
  previewCard: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(12, 39, 16, 0.34)',
    padding: Theme.Spacing.extraLarge,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 5,
  },
  previewCardMobile: {
    padding: Theme.Spacing.large,
    borderRadius: 16,
  },
  previewTitle: {
    color: '#EFF7EE',
    marginBottom: Theme.Spacing.small,
    fontSize: 30,
    lineHeight: 36,
  },
  previewTitleMobile: {
    fontSize: 24,
    lineHeight: 30,
  },
  previewSubtitle: {
    color: '#D7E8D7',
    marginBottom: Theme.Spacing.large,
  },
  previewSubtitleMobile: {
    marginBottom: Theme.Spacing.medium,
  },
  previewList: {
    gap: Theme.Spacing.medium,
    marginBottom: Theme.Spacing.large,
  },
  previewItem: {
    color: '#E8F4E8',
    lineHeight: 24,
  },
  previewEyebrow: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: Theme.Spacing.large,
  },
  previewEyebrowText: {
    color: '#E6F4E7',
    fontWeight: '700',
  },
  previewFeatureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  previewFeatureBadge: {
    minWidth: 52,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 248, 240, 0.84)',
    marginRight: Theme.Spacing.medium,
  },
  previewFeatureBadgeText: {
    color: '#16391A',
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 11,
  },
  previewFeatureCopy: {
    flex: 1,
    minWidth: 0,
  },
  previewFeatureTitle: {
    color: '#F7FBF7',
    fontWeight: '600',
    marginBottom: 4,
  },
  previewFeatureText: {
    color: 'rgba(230, 244, 231, 0.82)',
    lineHeight: 19,
  },
  previewStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: Theme.Spacing.large,
  },
  previewStatCard: {
    minWidth: 0,
    flexBasis: 160,
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 12,
    borderRadius: 18,
    padding: Theme.Spacing.medium,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  previewStatLabel: {
    color: 'rgba(230, 244, 231, 0.72)',
    marginBottom: Theme.Spacing.extraSmall,
  },
  previewStatValue: {
    color: '#F7FBF7',
    fontSize: 18,
    lineHeight: 24,
  },
  previewBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    borderRadius: 12,
    padding: Theme.Spacing.medium,
  },
  previewBadgeText: {
    color: '#EAF7EA',
    lineHeight: 20,
  },
});
