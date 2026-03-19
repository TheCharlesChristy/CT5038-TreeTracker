import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { AppInput } from '@/components/base/AppInput';
import { Theme } from '@/styles/theme';
import { router } from 'expo-router';
import { getEmailError, getPasswordError } from '@/lib/authValidation';
import { saveItem } from '@/utilities/authStorage';
import { API_BASE, ENDPOINTS } from '@/config/api';
import { showAlert } from '@/utilities/showAlert'
import { normalizePhone, isValidPhone } from '@/utilities/phone';

export default function CreateAccount() {
  const { width, height } = useWindowDimensions();
  const isMobileLayout = width < 680;
  const isWideLayout = width >= 920;

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const trimmedEmail = useMemo(() => email.trim(), [email]);

  const emailError = getEmailError(trimmedEmail);
  const passwordError = getPasswordError(password);
  const canSubmit = Boolean(trimmedEmail && password) && !emailError && !passwordError;
  const [loading, setLoading] = useState(false);

  const handleCreateAccount = async () => {
    setEmailTouched(true);
    setPasswordTouched(true);

    if (emailError) {
      Alert.alert('Check your email', emailError);
      return;
    }

    if (passwordError) {
      Alert.alert('Check your password', passwordError);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(API_BASE + ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          phone: normalizedPhone || null,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert('Error', data.error || 'Failed to create account');
        return;
      }

      await saveItem('accessToken', data.accessToken);
      await saveItem('refreshToken', data.refreshToken);
      await saveItem('user', JSON.stringify(data.user));

      showAlert(
        'Account Created',
        'Your account has been created successfully.',
        () => router.replace('/login')
      );
    } catch (error) {
      console.error('Registration error:', error);
      showAlert('Error', 'Could not connect to the server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppContainer
      scrollable
      noPadding
      backgroundImage={require('../assets/images/CharltonKings.jpg')}
    >
      <View
        style={[
          styles.page,
          isMobileLayout && styles.pageMobile,
          { minHeight: height - Theme.Spacing.large },
        ]}
      >
        <View style={styles.pageTint} />

        <View style={[styles.shell, isMobileLayout && styles.shellMobile, isWideLayout ? styles.shellWide : styles.shellStacked]}>
          <View style={[styles.formColumn, isWideLayout ? styles.formColumnWide : styles.formColumnStacked]}>
            <View style={[styles.formCard, isMobileLayout && styles.formCardMobile]}>
              <Pressable onPress={() => router.push('/')} style={styles.homeLink}>
                <AppText variant="caption" style={styles.homeLinkText}>
                  Back to Home
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
                    Email address
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

                  {emailTouched && !emailError && (
                    <AppText variant="caption" style={styles.successText}>
                      Email looks good.
                    </AppText>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.passwordHeaderRow}>
                    <AppText variant="caption" style={styles.label}>
                      Password
                    </AppText>
                    <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                      <AppText variant="caption" style={styles.toggleText}>
                        {showPassword ? 'Hide' : 'Show'}
                      </AppText>
                    </Pressable>
                  </View>

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
                    containerStyle={styles.inputContainer}
                  />

                  {passwordTouched && !!passwordError && (
                    <AppText variant="caption" style={styles.errorText}>
                      {passwordError}
                    </AppText>
                  )}

                  {passwordTouched && !passwordError && (
                    <AppText variant="caption" style={styles.successText}>
                      Strong enough to continue.
                    </AppText>
                  )}
                </View>

                <AppButton
                  title="Join the Community"
                  onPress={handleCreateAccount}
                  disabled={!canSubmit}
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

          <View style={[styles.previewColumn, isWideLayout ? styles.previewColumnWide : styles.previewColumnStacked]}>
            <View style={[styles.previewCard, isMobileLayout && styles.previewCardMobile]}>
              <AppText variant="subtitle" style={[styles.previewTitle, isMobileLayout && styles.previewTitleMobile]}>
                Build your local tree network
              </AppText>

              <AppText variant="body" style={[styles.previewSubtitle, isMobileLayout && styles.previewSubtitleMobile]}>
                Start in minutes and turn everyday walks into shared community impact.
              </AppText>

              <View style={styles.previewList}>
                <AppText variant="body" style={styles.previewItem}>
                  Add and monitor trees around your neighborhood
                </AppText>
                <AppText variant="body" style={styles.previewItem}>
                  Explore local tree photos, stories, and biodiversity
                </AppText>
                <AppText variant="body" style={styles.previewItem}>
                  Connect with guardians who care about green spaces
                </AppText>
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
    backgroundColor: 'rgba(15, 28, 18, 0.50)',
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
    borderRadius: 20,
    padding: Theme.Spacing.extraLarge,
    borderWidth: 1,
    borderColor: 'rgba(165, 214, 167, 0.65)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  formCardMobile: {
    borderRadius: 16,
    padding: Theme.Spacing.large,
  },
  homeLink: {
    alignSelf: 'flex-start',
    marginBottom: Theme.Spacing.medium,
    paddingVertical: Theme.Spacing.extraSmall,
    paddingHorizontal: Theme.Spacing.small,
    borderRadius: 999,
    backgroundColor: 'rgba(46, 125, 50, 0.12)',
  },
  homeLinkText: {
    color: '#1B5E20',
    fontWeight: '600',
  },
  title: {
    color: '#1B5E20',
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
    letterSpacing: 0.2,
  },
  inputContainer: {
    marginBottom: Theme.Spacing.extraSmall,
  },
  inputWrapper: {
    borderRadius: 12,
    borderColor: '#9AA79A',
    backgroundColor: '#FFFFFF',
  },
  inputFocused: {
    borderColor: '#2E7D32',
    borderWidth: 2,
    backgroundColor: '#F7FFF7',
  },
  inputError: {
    borderColor: '#B3261E',
  },
  passwordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  errorText: {
    color: '#B3261E',
  },
  successText: {
    color: '#1F7A35',
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 7,
  },
  trustPanel: {
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.25)',
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
    backgroundColor: 'rgba(46, 125, 50, 0.30)',
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
    borderColor: '#7B927B',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.Spacing.small,
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
    width: '100%',
  },
  previewColumnWide: {
    flex: 5,
    maxWidth: 560,
  },
  previewColumnStacked: {
    maxWidth: 520,
    alignSelf: 'center',
  },
  previewCard: {
    minHeight: 320,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(220, 235, 220, 0.45)',
    backgroundColor: 'rgba(12, 39, 16, 0.57)',
    padding: Theme.Spacing.extraLarge,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 7,
  },
  previewCardMobile: {
    minHeight: 0,
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
    gap: Theme.Spacing.small,
    marginBottom: Theme.Spacing.large,
  },
  previewItem: {
    color: '#E8F4E8',
    lineHeight: 24,
  },
  previewBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
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