import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { AppInput } from '@/components/base/AppInput';
import { Theme } from '@/styles/theme';
import { router } from 'expo-router';

export default function Login() {
  const { width, height } = useWindowDimensions();
  const isMobileLayout = width < 680;
  const isWideLayout = width >= 980;
  const stackSocialActions = width < 420;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const passwordRef = useRef<TextInput>(null);

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
  const canSubmit = Boolean(trimmedEmail && password) && !emailError && !passwordError;

  const handleLogin = () => {
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
      'Welcome back',
      rememberMe
        ? 'Signed in successfully. Your device preference will be remembered when auth is connected.'
        : 'Signed in successfully. Auth is still stubbed, but the flow is ready for backend wiring.',
      [
        {
          text: 'Continue',
          onPress: () => router.push('/mainPage'),
        },
      ],
    );
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Password recovery',
      'Forgot password is ready for backend integration. Connect it to your recovery endpoint or deep link next.',
    );
  };

  const handleGoogleLogin = () => {
    Alert.alert(
      'Google sign in',
      'Google sign in is currently a product stub. Wire this button to Expo Auth Session or your backend OAuth flow next.',
    );
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

        <View
          style={[
            styles.shell,
            isMobileLayout && styles.shellMobile,
            isWideLayout ? styles.shellWide : styles.shellStacked,
          ]}
        >
          <View style={[styles.formColumn, isWideLayout ? styles.formColumnWide : styles.formColumnStacked]}>
            <View style={[styles.formCard, isMobileLayout && styles.formCardMobile]}>
              <View style={styles.topRow}>
                <Pressable onPress={() => router.push('/')} style={styles.homeLink}>
                  <Feather name="arrow-left" size={14} color="#1B5E20" />
                  <AppText variant="caption" style={styles.homeLinkText}>
                    Back to home
                  </AppText>
                </Pressable>

                <View style={styles.brandPill}>
                  <Image
                    source={require('@/assets/images/tree_icon.png')}
                    style={styles.brandIcon}
                    resizeMode="contain"
                  />
                  <AppText variant="caption" style={styles.brandPillText}>
                    TreeGuardians
                  </AppText>
                </View>
              </View>

              <AppText variant="title" style={[styles.title, isMobileLayout && styles.titleMobile]}>
                Welcome back
              </AppText>

              <AppText variant="body" style={[styles.subtitle, isMobileLayout && styles.subtitleMobile]}>
                Continue exploring your local trees and the people protecting them.
              </AppText>

              <View style={styles.reinforcementRow}>
                <View style={styles.reinforcementPill}>
                  <Feather name="map-pin" size={14} color="#1B5E20" />
                  <AppText variant="caption" style={styles.reinforcementText}>
                    Track trees
                  </AppText>
                </View>

                <View style={styles.reinforcementPill}>
                  <Feather name="users" size={14} color="#1B5E20" />
                  <AppText variant="caption" style={styles.reinforcementText}>
                    Contribute to your community
                  </AppText>
                </View>
              </View>

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
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
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
                    leftAdornment={<Feather name="mail" size={18} color="#466046" />}
                    containerStyle={styles.inputContainer}
                  />

                  {emailTouched && !!emailError ? (
                    <AppText variant="caption" style={styles.errorText}>
                      {emailError}
                    </AppText>
                  ) : null}

                  {emailTouched && !emailError ? (
                    <AppText variant="caption" style={styles.successText}>
                      Email looks good.
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
                    leftAdornment={<Feather name="lock" size={18} color="#466046" />}
                    rightAdornment={(
                      <Pressable
                        onPress={() => setShowPassword((prev) => !prev)}
                        hitSlop={8}
                        style={styles.visibilityToggle}
                      >
                        <Feather
                          name={showPassword ? 'eye-off' : 'eye'}
                          size={18}
                          color="#2E7D32"
                        />
                      </Pressable>
                    )}
                    containerStyle={styles.inputContainer}
                  />

                  {passwordTouched && !!passwordError ? (
                    <AppText variant="caption" style={styles.errorText}>
                      {passwordError}
                    </AppText>
                  ) : null}

                  {passwordTouched && !passwordError ? (
                    <AppText variant="caption" style={styles.successText}>
                      Password is ready to submit.
                    </AppText>
                  ) : null}
                </View>

                <View style={styles.optionsRow}>
                  <Pressable
                    onPress={() => setRememberMe((prev) => !prev)}
                    style={styles.checkboxRow}
                  >
                    <MaterialCommunityIcons
                      name={rememberMe ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={22}
                      color={rememberMe ? '#2E7D32' : '#6E7D6E'}
                    />
                    <AppText variant="caption" style={styles.checkboxLabel}>
                      Remember me
                    </AppText>
                  </Pressable>

                  <View style={styles.securePill}>
                    <Feather name="shield" size={14} color="#1B5E20" />
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

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <AppText variant="caption" style={styles.dividerText}>
                    or continue with
                  </AppText>
                  <View style={styles.dividerLine} />
                </View>

                <View style={[styles.socialRow, stackSocialActions && styles.socialRowStacked]}>
                  <Pressable
                    onPress={handleGoogleLogin}
                    style={[styles.socialButton, stackSocialActions && styles.socialButtonStacked]}
                  >
                    <MaterialCommunityIcons name="google" size={18} color="#1B1B1B" />
                    <AppText variant="body" style={styles.socialButtonText}>
                      Continue with Google
                    </AppText>
                  </Pressable>
                </View>

                <View style={styles.trustPanel}>
                  <View style={styles.trustHeader}>
                    <Feather name="lock" size={15} color="#1B5E20" />
                    <AppText variant="caption" style={styles.trustTitle}>
                      Private by default
                    </AppText>
                  </View>
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

          <View style={[styles.previewColumn, isWideLayout ? styles.previewColumnWide : styles.previewColumnStacked]}>
            <View style={[styles.previewCard, isMobileLayout && styles.previewCardMobile]}>
              <View style={styles.previewEyebrow}>
                <Feather name="wind" size={16} color="#E6F4E7" />
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
                  <View style={styles.previewFeatureIconWrap}>
                    <Feather name="map" size={18} color="#16391A" />
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
                  <View style={styles.previewFeatureIconWrap}>
                    <Feather name="camera" size={18} color="#16391A" />
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
                  <View style={styles.previewFeatureIconWrap}>
                    <Feather name="heart" size={18} color="#16391A" />
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

              <View style={styles.mapPreviewCard}>
                <View style={styles.mapPreviewGrid}>
                  <View style={[styles.mapPath, styles.mapPathPrimary]} />
                  <View style={[styles.mapPath, styles.mapPathSecondary]} />
                  <View style={[styles.mapDot, styles.mapDotOne]} />
                  <View style={[styles.mapDot, styles.mapDotTwo]} />
                  <View style={[styles.mapDot, styles.mapDotThree]} />
                  <View style={styles.mapOverlayCard}>
                    <AppText variant="caption" style={styles.mapOverlayLabel}>
                      This week
                    </AppText>
                    <AppText variant="subtitle" style={styles.mapOverlayValue}>
                      12 trees revisited
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
    maxWidth: 1180,
    zIndex: 1,
  },
  shellMobile: {
    gap: Theme.Spacing.medium,
  },
  shellWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  shellStacked: {
    flexDirection: 'column',
  },
  formColumn: {
    width: '100%',
  },
  formColumnWide: {
    flex: 5,
    maxWidth: 500,
    marginRight: Theme.Spacing.large,
  },
  formColumnStacked: {
    maxWidth: 520,
    alignSelf: 'center',
    marginBottom: Theme.Spacing.large,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.Spacing.extraSmall + 2,
    paddingHorizontal: Theme.Spacing.small + 2,
    borderRadius: 999,
    backgroundColor: 'rgba(46, 125, 50, 0.12)',
  },
  homeLinkText: {
    color: '#1B5E20',
    fontWeight: '700',
    marginLeft: 6,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.15)',
  },
  brandIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
  },
  brandPillText: {
    color: '#16391A',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 8,
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
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 0,
    elevation: 0,
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
  checkboxLabel: {
    marginLeft: 8,
    color: '#2B392B',
    fontWeight: '600',
  },
  securePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(27, 94, 32, 0.08)',
    marginBottom: Theme.Spacing.small,
  },
  securePillText: {
    color: '#1B5E20',
    fontWeight: '700',
    marginLeft: 6,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.Spacing.medium,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(46, 125, 50, 0.25)',
  },
  dividerText: {
    color: '#506450',
    marginHorizontal: Theme.Spacing.small,
    textTransform: 'lowercase',
  },
  socialRow: {
    flexDirection: 'row',
    marginBottom: Theme.Spacing.medium,
  },
  socialRowStacked: {
    flexDirection: 'column',
  },
  socialButton: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#91A391',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: Theme.Spacing.medium,
  },
  socialButtonStacked: {
    width: '100%',
  },
  socialButtonText: {
    marginLeft: Theme.Spacing.small,
    color: '#1F2C1F',
    fontWeight: '600',
  },
  trustPanel: {
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.22)',
    padding: Theme.Spacing.medium,
  },
  trustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.Spacing.extraSmall,
  },
  trustTitle: {
    color: '#1B5E20',
    fontWeight: '700',
    marginLeft: 8,
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
    flex: 6,
  },
  previewColumnStacked: {
    maxWidth: 640,
    alignSelf: 'center',
  },
  previewCard: {
    flex: 1,
    minHeight: 640,
    borderRadius: 28,
    padding: Theme.Spacing.extraLarge,
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
  previewEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(230, 244, 231, 0.10)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: Theme.Spacing.large,
  },
  previewEyebrowText: {
    color: '#E6F4E7',
    marginLeft: 8,
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
  previewFeatureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E6F4E7',
    marginRight: Theme.Spacing.medium,
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
  mapPreviewCard: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(230, 244, 231, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(230, 244, 231, 0.12)',
    marginBottom: Theme.Spacing.large,
  },
  mapPreviewGrid: {
    height: 220,
    position: 'relative',
    backgroundColor: 'rgba(13, 31, 17, 0.54)',
  },
  mapPath: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(165, 214, 167, 0.70)',
  },
  mapPathPrimary: {
    top: 38,
    left: 42,
    width: 210,
    height: 4,
    transform: [{ rotate: '-14deg' }],
  },
  mapPathSecondary: {
    top: 112,
    right: 36,
    width: 190,
    height: 4,
    transform: [{ rotate: '18deg' }],
  },
  mapDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#A5D6A7',
    borderWidth: 4,
    borderColor: '#F7FBF7',
  },
  mapDotOne: {
    top: 34,
    left: 64,
  },
  mapDotTwo: {
    top: 88,
    right: 94,
  },
  mapDotThree: {
    bottom: 42,
    left: 168,
  },
  mapOverlayCard: {
    position: 'absolute',
    left: Theme.Spacing.medium,
    right: Theme.Spacing.medium,
    bottom: Theme.Spacing.medium,
    borderRadius: 16,
    backgroundColor: 'rgba(247, 251, 247, 0.94)',
    padding: Theme.Spacing.medium,
  },
  mapOverlayLabel: {
    color: '#466046',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  mapOverlayValue: {
    color: '#16391A',
    fontSize: 22,
    lineHeight: 28,
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