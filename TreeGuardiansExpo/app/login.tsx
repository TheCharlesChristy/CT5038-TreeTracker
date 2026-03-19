import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { AppInput } from '@/components/base/AppInput';
import { Theme } from '@/styles/theme';
import { router } from 'expo-router';
import { getPasswordError } from '@/lib/authValidation';
import { saveItem } from '@/utilities/authStorage';
import { API_BASE, ENDPOINTS } from '@/config/api';
import { StatusMessageBox, StatusMessage } from '@/components/base/StatusMessageBox';

export default function Login() {
  const { width, height } = useWindowDimensions();
  const isMobileLayout = width < 680;
  const isWideLayout = width >= 920;

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [credentialTouched, setCredentialTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [credentialFocused, setCredentialFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [formCardHeight, setFormCardHeight] = useState<number | undefined>(undefined);

  const passwordRef = useRef<TextInput>(null);

  const trimmedCredential = useMemo(() => usernameOrEmail.trim(), [usernameOrEmail]);

  const credentialError = trimmedCredential ? '' : 'Username or email is required.';
  const passwordError = getPasswordError(password);
  const canSubmit = Boolean(trimmedCredential && password) && !credentialError && !passwordError;

  useEffect(() => {
    if (status?.variant === 'success') {
      redirectTimer.current = setTimeout(() => {
        setStatus(null);
        router.replace('/mainPage');
      }, 3000);
    }
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [status?.createdAt]);

  const handleLogin = async () => {
    setCredentialTouched(true);
    setPasswordTouched(true);

    if (credentialError) {
      setStatus({ title: 'Check your credentials', message: credentialError, variant: 'error', createdAt: Date.now() });
      return;
    }

    if (passwordError) {
      setStatus({ title: 'Check your password', message: passwordError, variant: 'error', createdAt: Date.now() });
      return;
    }

    try {
      setLoading(true);
      setStatus(null);

      const response = await fetch(API_BASE + ENDPOINTS.AUTH_LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usernameOrEmail: trimmedCredential,
          password,
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
        setStatus({ title: 'Login Failed', message: detail, variant: 'error', createdAt: Date.now() });
        return;
      }

      await saveItem('accessToken', data.accessToken);
      await saveItem('refreshToken', data.refreshToken);
      await saveItem('user', JSON.stringify(data.user));

      setStatus({
        title: 'Welcome back!',
        message: `Signed in as ${data.user.username}.`,
        variant: 'success',
        createdAt: Date.now(),
      });
    } catch (error) {
      const message = error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
      console.error('Login error:', error);
      setStatus({ title: 'Connection Error', message: `Network or client error \u2014 ${message}`, variant: 'error', createdAt: Date.now() });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setStatus({
      title: 'Password recovery',
      message: 'Forgot password is ready for backend integration. Connect it to your recovery endpoint or deep link next.',
      variant: 'error',
      createdAt: Date.now(),
    });
  };

  return (
    <AppContainer
      scrollable
      noPadding
      backgroundImage={require('@/assets/images/CharltonKings.jpg')}
    >
      <View
        style={[
          styles.page,
          isMobileLayout && styles.pageMobile,
          { minHeight: height - Theme.Spacing.large },
        ]}
      >
        <View style={styles.pageTint} />

        <StatusMessageBox
          status={status}
          redirectDuration={3}
          onClose={() => {
            if (redirectTimer.current) clearTimeout(redirectTimer.current);
            if (status?.variant === 'success') {
              router.replace('/mainPage');
            }
            setStatus(null);
          }}
        />

        <View
          style={[
            styles.shell,
            isMobileLayout && styles.shellMobile,
            isWideLayout ? styles.shellWide : styles.shellStacked,
          ]}
        >
          <View
            style={[
              styles.formColumn,
              isWideLayout ? styles.formColumnWide : styles.formColumnStacked,
            ]}
          >
            <View style={[styles.formCard, isMobileLayout && styles.formCardMobile]} onLayout={(e) => setFormCardHeight(e.nativeEvent.layout.height)}>
              <View style={styles.topRow}>
                <Pressable onPress={() => router.push('/')} style={styles.homeLink}>
                  <AppText variant="caption" style={styles.homeLinkText}>
                    Back to home
                  </AppText>
                </Pressable>
              </View>

              <AppText variant="title" style={[styles.title, isMobileLayout && styles.titleMobile]}>
                Welcome back
              </AppText>

              <AppText variant="body" style={[styles.subtitle, isMobileLayout && styles.subtitleMobile]}>
                Continue exploring your local trees and the people protecting them.
              </AppText>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <AppText variant="caption" style={styles.label}>
                    Username or email
                  </AppText>

                  <AppInput
                    placeholder="username or name@example.com"
                    value={usernameOrEmail}
                    onChangeText={(value) => {
                      setUsernameOrEmail(value);
                      if (!credentialTouched) {
                        setCredentialTouched(true);
                      }
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    onFocus={() => setCredentialFocused(true)}
                    onBlur={() => {
                      setCredentialFocused(false);
                      setCredentialTouched(true);
                    }}
                    invalid={credentialTouched && !!credentialError}
                    inputWrapperStyle={[
                      styles.inputWrapper,
                      credentialFocused && styles.inputFocused,
                      credentialTouched && !!credentialError && styles.inputError,
                    ]}
                    containerStyle={styles.inputContainer}
                  />

                  {credentialTouched && !!credentialError ? (
                    <AppText variant="caption" style={styles.errorText}>
                      {credentialError}
                    </AppText>
                  ) : null}
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.passwordHeaderRow}>
                    <AppText variant="caption" style={styles.label}>
                      Password
                    </AppText>

                    <Pressable onPress={handleForgotPassword}>
                      <AppText variant="caption" style={styles.forgotPasswordText}>
                        Forgot password?
                      </AppText>
                    </Pressable>
                  </View>

                  <AppInput
                    ref={passwordRef}
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
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
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

                  {passwordTouched && !!passwordError ? (
                    <AppText variant="caption" style={styles.errorText}>
                      {passwordError}
                    </AppText>
                  ) : null}
                </View>

                <View style={styles.optionsRow}>
                  <Pressable
                    onPress={() => setRememberMe((prev) => !prev)}
                    style={styles.checkboxRow}
                  >
                    <View style={[styles.checkboxBox, rememberMe && styles.checkboxBoxActive]}>
                      {rememberMe ? <View style={styles.checkboxFill} /> : null}
                    </View>
                    <AppText variant="caption" style={styles.checkboxLabel}>
                      Remember me
                    </AppText>
                  </Pressable>

                  <View style={styles.securePill}>
                    <AppText variant="caption" style={styles.securePillText}>
                      Secure sign in
                    </AppText>
                  </View>
                </View>

                <AppButton
                  title="Log In"
                  onPress={handleLogin}
                  disabled={!canSubmit}
                  style={styles.submitButton}
                  buttonStyle={styles.submitButtonInner}
                />

                <View style={styles.trustPanel}>
                  <AppText variant="caption" style={styles.trustTitle}>
                    Private by default
                  </AppText>
                  <AppText variant="caption" style={styles.trustText}>
                    Your email is used for sign in and important account updates only. Tree contributions stay connected to your profile, not exposed beyond the product rules you choose.
                  </AppText>
                </View>

                <View style={styles.footer}>
                  <AppText variant="body" style={styles.footerText}>
                    New to TreeGuardians?
                  </AppText>
                  <Pressable onPress={() => router.push('/registration')}>
                    <AppText variant="body" style={styles.footerLink}>
                      Sign up instead
                    </AppText>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.previewColumn,
              isWideLayout ? styles.previewColumnWide : styles.previewColumnStacked,
              isWideLayout && formCardHeight != null && { height: formCardHeight },
            ]}
          >
            <View style={[styles.previewCard, isMobileLayout && styles.previewCardMobile, isWideLayout && styles.previewCardWide]}>
              <View style={styles.previewEyebrow}>
                <AppText variant="caption" style={styles.previewEyebrowText}>
                  Calm, local, community-first
                </AppText>
              </View>

              <AppText variant="title" style={[styles.previewTitle, isMobileLayout && styles.previewTitleMobile]}>
                Return to the canopy map you are building.
              </AppText>

              <AppText variant="body" style={[styles.previewSubtitle, isMobileLayout && styles.previewSubtitleMobile]}>
                Log in to review recent sightings, document tree health, and keep your local stewardship work moving.
              </AppText>

              <View style={styles.previewFeatureList}>
                <View style={styles.previewFeatureItem}>
                  <View style={styles.previewFeatureBadge}>
                    <AppText variant="caption" style={styles.previewFeatureBadgeText}>
                      Map
                    </AppText>
                  </View>
                  <View style={styles.previewFeatureCopy}>
                    <AppText variant="body" style={styles.previewFeatureTitle}>
                      Track trees across familiar routes
                    </AppText>
                    <AppText variant="caption" style={styles.previewFeatureText}>
                      Pick up exactly where you left off with saved areas and recent activity.
                    </AppText>
                  </View>
                </View>

                <View style={styles.previewFeatureItem}>
                  <View style={styles.previewFeatureBadge}>
                    <AppText variant="caption" style={styles.previewFeatureBadgeText}>
                      Log
                    </AppText>
                  </View>
                  <View style={styles.previewFeatureCopy}>
                    <AppText variant="body" style={styles.previewFeatureTitle}>
                      Add photos and observations faster
                    </AppText>
                    <AppText variant="caption" style={styles.previewFeatureText}>
                      Keep field notes current while they are still fresh.
                    </AppText>
                  </View>
                </View>

                <View style={styles.previewFeatureItem}>
                  <View style={styles.previewFeatureBadge}>
                    <AppText variant="caption" style={styles.previewFeatureBadgeText}>
                      Care
                    </AppText>
                  </View>
                  <View style={styles.previewFeatureCopy}>
                    <AppText variant="body" style={styles.previewFeatureTitle}>
                      Contribute to your community
                    </AppText>
                    <AppText variant="caption" style={styles.previewFeatureText}>
                      Help neighbors understand and protect the trees around them.
                    </AppText>
                  </View>
                </View>
              </View>

              <View style={styles.activityCard}>
                <AppText variant="caption" style={styles.activityHeading}>
                  Recent community activity
                </AppText>

                <View style={styles.activityItem}>
                  <View style={[styles.activityDot, { backgroundColor: '#81C784' }]} />
                  <View style={styles.activityContent}>
                    <AppText variant="body" style={styles.activityTitle}>
                      Oak logged on King William Walk
                    </AppText>
                    <AppText variant="caption" style={styles.activityMeta}>
                      2 hours ago
                    </AppText>
                  </View>
                </View>

                <View style={styles.activityDivider} />

                <View style={styles.activityItem}>
                  <View style={[styles.activityDot, { backgroundColor: '#A5D6A7' }]} />
                  <View style={styles.activityContent}>
                    <AppText variant="body" style={styles.activityTitle}>
                      Health check added for Silver Birch
                    </AppText>
                    <AppText variant="caption" style={styles.activityMeta}>
                      5 hours ago
                    </AppText>
                  </View>
                </View>

                <View style={styles.activityDivider} />

                <View style={styles.activityItem}>
                  <View style={[styles.activityDot, { backgroundColor: '#66BB6A' }]} />
                  <View style={styles.activityContent}>
                    <AppText variant="body" style={styles.activityTitle}>
                      3 new trees mapped in Charlton Kings
                    </AppText>
                    <AppText variant="caption" style={styles.activityMeta}>
                      Yesterday
                    </AppText>
                  </View>
                </View>
              </View>

              <View style={styles.previewStatsRow}>
                <View style={styles.previewStatCard}>
                  <AppText variant="caption" style={styles.previewStatLabel}>
                    Ready for the field
                  </AppText>
                  <AppText variant="subtitle" style={styles.previewStatValue}>
                    Autofill enabled
                  </AppText>
                </View>

                <View style={styles.previewStatCard}>
                  <AppText variant="caption" style={styles.previewStatLabel}>
                    Community focus
                  </AppText>
                  <AppText variant="subtitle" style={styles.previewStatValue}>
                    Shared local stewardship
                  </AppText>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </AppContainer>
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
  pageTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 28, 18, 0.48)',
  },
  shell: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 1160,
    gap: Theme.Spacing.large,
    zIndex: 1,
  },
  shellMobile: {
    gap: Theme.Spacing.medium,
  },
  shellWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  shellStacked: {
    flexDirection: 'column',
  },
  formColumn: {
    width: '100%',
  },
  formColumnWide: {
    flex: 5,
    maxWidth: 520,
  },
  formColumnStacked: {
    maxWidth: 520,
    alignSelf: 'center',
  },
  formCard: {
    backgroundColor: 'rgba(248, 252, 248, 0.97)',
    borderRadius: 24,
    padding: Theme.Spacing.extraLarge,
    borderWidth: 1,
    borderColor: 'rgba(165, 214, 167, 0.70)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 10,
  },
  formCardMobile: {
    borderRadius: 18,
    padding: Theme.Spacing.large,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.Spacing.large,
  },
  homeLink: {
    alignSelf: 'flex-start',
    paddingVertical: Theme.Spacing.extraSmall + 2,
    paddingHorizontal: Theme.Spacing.small + 2,
    borderRadius: 999,
    backgroundColor: 'rgba(46, 125, 50, 0.12)',
  },
  homeLinkText: {
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
    marginBottom: Theme.Spacing.medium,
    color: '#314031',
  },
  subtitleMobile: {
    marginBottom: Theme.Spacing.small,
  },
  reinforcementRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Theme.Spacing.large,
  },
  reinforcementPill: {
    borderRadius: 999,
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.16)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: Theme.Spacing.small,
    marginBottom: Theme.Spacing.small,
  },
  reinforcementText: {
    color: '#1B5E20',
    fontWeight: '600',
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
    borderColor: '#A4B2A4',
    backgroundColor: '#FFFFFF',
  },
  inputFocused: {
    borderColor: '#2E7D32',
    borderWidth: 2,
    backgroundColor: '#F7FFF7',
  },
  inputError: {
    borderColor: '#B3261E',
    backgroundColor: '#FFF8F7',
  },
  passwordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#2E7D32',
    fontWeight: '700',
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
  successText: {
    color: '#1F7A35',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: Theme.Spacing.extraSmall,
    marginBottom: Theme.Spacing.medium,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Theme.Spacing.small,
    marginBottom: Theme.Spacing.small,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6E7D6E',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxActive: {
    borderColor: '#2E7D32',
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
  },
  checkboxFill: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: '#2E7D32',
  },
  checkboxLabel: {
    marginLeft: 8,
    color: '#2B392B',
    fontWeight: '600',
  },
  securePill: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(27, 94, 32, 0.08)',
    marginBottom: Theme.Spacing.small,
  },
  securePillText: {
    color: '#1B5E20',
    fontWeight: '700',
  },
  submitButton: {
    marginBottom: Theme.Spacing.medium,
  },
  submitButtonInner: {
    minHeight: 54,
    borderRadius: 14,
    justifyContent: 'center',
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  trustPanel: {
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.22)',
    padding: Theme.Spacing.medium,
  },
  trustTitle: {
    color: '#1B5E20',
    fontWeight: '700',
    marginBottom: Theme.Spacing.extraSmall,
  },
  trustText: {
    color: '#2F3A2F',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Theme.Spacing.large,
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
  previewColumn: {
    width: '100%',
  },
  previewColumnWide: {
    flex: 5,
    maxWidth: 560,
  },
  previewColumnStacked: {
    maxWidth: 560,
    alignSelf: 'center',
  },
  previewCard: {
    borderRadius: 28,
    padding: Theme.Spacing.extraLarge,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(9, 22, 12, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(230, 244, 231, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 8,
  },
  previewCardMobile: {
    minHeight: 520,
    borderRadius: 20,
    padding: Theme.Spacing.large,
  },
  previewCardWide: {
    flex: 1,
    overflow: 'hidden',
  },
  previewEyebrow: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(230, 244, 231, 0.10)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: Theme.Spacing.large,
  },
  previewEyebrowText: {
    color: '#E6F4E7',
    fontWeight: '700',
  },
  previewTitle: {
    color: '#F7FBF7',
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: 0.15,
    marginBottom: Theme.Spacing.medium,
  },
  previewTitleMobile: {
    fontSize: 30,
    lineHeight: 36,
  },
  previewSubtitle: {
    color: 'rgba(247, 251, 247, 0.84)',
    maxWidth: 520,
    marginBottom: Theme.Spacing.large,
  },
  previewSubtitleMobile: {
    marginBottom: Theme.Spacing.medium,
  },
  previewFeatureList: {
    marginBottom: Theme.Spacing.large,
  },
  previewFeatureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Theme.Spacing.medium,
  },
  previewFeatureBadge: {
    minWidth: 52,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E6F4E7',
    marginRight: Theme.Spacing.medium,
  },
  previewFeatureBadgeText: {
    color: '#16391A',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  previewFeatureCopy: {
    flex: 1,
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
  activityCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(230, 244, 231, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(230, 244, 231, 0.14)',
    padding: Theme.Spacing.medium,
    marginBottom: Theme.Spacing.large,
  },
  activityHeading: {
    color: 'rgba(230, 244, 231, 0.60)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: Theme.Spacing.medium,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Theme.Spacing.small,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    marginRight: Theme.Spacing.small + 2,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: '#F7FBF7',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
  },
  activityMeta: {
    color: 'rgba(230, 244, 231, 0.55)',
    fontSize: 12,
    marginTop: 2,
  },
  activityDivider: {
    height: 1,
    backgroundColor: 'rgba(230, 244, 231, 0.10)',
    marginLeft: 22,
  },
  previewStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  previewStatCard: {
    minWidth: 210,
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 12,
    borderRadius: 18,
    padding: Theme.Spacing.medium,
    backgroundColor: 'rgba(230, 244, 231, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(230, 244, 231, 0.12)',
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
});