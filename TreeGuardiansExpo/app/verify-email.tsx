import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { FaviconHead } from '@/components/base/FaviconHead';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { Theme } from '@/styles/theme';
import { API_BASE, ENDPOINTS } from '@/config/api';

export default function VerifyEmailScreen() {
  const { width } = useWindowDimensions();
  const isMobileLayout = width < 680;

  const { token } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Verifying your email...');
  const [error, setError] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setMessage('Missing verification token.');
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${API_BASE}${ENDPOINTS.AUTH_VERIFY_EMAIL}?token=${token}`
        );

        const data = await res.json();

        if (!res.ok) {
          setMessage(data.error || 'Verification failed.');
          setError(true);
        } else {
          setMessage('Your email has been successfully verified!');
          setError(false);
        }

      } catch {
        setMessage('Network error during verification.');
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  return (
    <>
      <Stack.Screen options={{ title: 'Verify Email | TreeGuardians' }} />
      <FaviconHead title="Verify Email | TreeGuardians" />
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
              Email Verification
            </AppText>

            {/* Subtitle */}
            <AppText variant="body" style={styles.subtitle}>
              {loading ? 'Please wait while we verify your email.' : 'Verification result:'}
            </AppText>

            {/* Inline status */}
            <View style={styles.messageBox}>
              <AppText
                variant="body"
                style={[
                  styles.messageText,
                  error ? styles.errorText : styles.successText,
                ]}
              >
                {message}
              </AppText>
            </View>

            {/* Button instead of auto redirect */}
            {!loading && (
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

  messageBox: {
    marginBottom: Theme.Spacing.medium,
  },
  messageText: {
    fontSize: 16,
  },
  successText: {
    color: '#1B5E20',
    fontWeight: '600',
  },
  errorText: {
    color: '#B3261E',
    fontWeight: '600',
  },

  submitButton: {
    marginTop: Theme.Spacing.medium,
  },
  submitButtonInner: {
    minHeight: 54,
    borderRadius: 14,
    justifyContent: 'center',
  },
});