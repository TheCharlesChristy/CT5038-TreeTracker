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

export default function CreateAccount() {
  const { width, height } = useWindowDimensions();
  const isWideLayout = width >= 860;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const trimmedEmail = useMemo(() => email.trim(), [email]);

  const getEmailError = (value: string) => {
    if (!value) {
      return 'Email is required.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Enter a valid email address.';
    }

    return '';
  };

  const getPasswordError = (value: string) => {
    if (!value) {
      return 'Password is required.';
    }

    if (value.length < 8) {
      return 'Use at least 8 characters.';
    }

    return '';
  };

  const emailError = getEmailError(trimmedEmail);
  const passwordError = getPasswordError(password);
  const canSubmit = !emailError && !passwordError;

  const handleCreateAccount = () => {
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

    Alert.alert(
      'Welcome to TreeGuardians',
      'Your account has been created successfully.',
      [
        {
          text: 'Continue to sign in',
          onPress: () => router.push('/login'),
        },
      ],
    );
  };

  return (
    <AppContainer
      scrollable
      noPadding
      backgroundImage={require('../assets/images/CharltonKings.jpg')}
    >
      <View style={[styles.page, { minHeight: height - Theme.Spacing.large }]}>
        <View style={styles.pageTint} />

        <View style={[styles.shell, isWideLayout ? styles.shellWide : styles.shellStacked]}>
          <View style={[styles.formColumn, isWideLayout ? styles.formColumnWide : styles.formColumnStacked]}>
            <View style={styles.formCard}>
              <Pressable onPress={() => router.push('/')} style={styles.homeLink}>
                <AppText variant="caption" style={styles.homeLinkText}>
                  Back to Home
                </AppText>
              </Pressable>

              <AppText variant="title" style={styles.title}>
                Join the Community
              </AppText>

              <AppText variant="body" style={styles.subtitle}>
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
                    style={[
                      styles.input,
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
                    style={[
                      styles.input,
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
                  style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
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
            <View style={styles.previewCard}>
              <AppText variant="subtitle" style={styles.previewTitle}>
                Build your local tree network
              </AppText>

              <AppText variant="body" style={styles.previewSubtitle}>
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
  subtitle: {
    marginTop: Theme.Spacing.small,
    marginBottom: Theme.Spacing.large,
    color: '#2D3A2D',
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
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9AA79A',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 14,
    color: '#111111',
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
    borderRadius: 12,
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 7,
  },
  submitButtonDisabled: {
    opacity: 0.78,
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
  previewTitle: {
    color: '#EFF7EE',
    marginBottom: Theme.Spacing.small,
    fontSize: 30,
    lineHeight: 36,
  },
  previewSubtitle: {
    color: '#D7E8D7',
    marginBottom: Theme.Spacing.large,
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
