import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { AppInput } from '@/components/base/AppInput';
import { NavigationButton } from '@/components/base/NavigationButton';
import { Theme } from '@/styles/theme';
import { router } from 'expo-router';
import { saveItem } from '@/utilities/authStorage';
import { API_BASE, ENDPOINTS } from '@/config/api';
import { showAlert } from '@/utilities/showAlert'

export default function Login() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!usernameOrEmail.trim()) {
      showAlert('Error', 'Please enter your username or email');
      return;
    }

    if (!password) {
      showAlert('Error', 'Please enter your password');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(API_BASE + ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usernameOrEmail,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert('Login failed', data.error || 'Unable to log in');
        return;
      }

      await saveItem('accessToken', data.accessToken);
      await saveItem('refreshToken', data.refreshToken);
      await saveItem('user', JSON.stringify(data.user));

      showAlert(
        'Success',
        `Welcome back, ${data.user.username}!`,
        () => router.replace('/mainPage')
      );
    } catch (error) {
      console.error('Login error:', error);
      showAlert('Error', 'Something went wrong during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppContainer scrollable>
      <NavigationButton onPress={() => router.push('/')}>
        Home
      </NavigationButton>

      <View style={styles.formContainer}>
        <AppText variant="title" style={styles.title}>
          Welcome Back
        </AppText>

        <AppText variant="body" style={styles.subtitle}>
          Log in to continue your TreeGuardians journey
        </AppText>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <AppText variant="body" style={styles.label}>
              Username or Email
            </AppText>
            <AppInput
              placeholder="Enter your username or email"
              value={usernameOrEmail}
              onChangeText={setUsernameOrEmail}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <AppText variant="body" style={styles.label}>
              Password
            </AppText>
            <AppInput
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <AppButton
            title={loading ? "Logging In..." : "Log In"}
            onPress={handleLogin}
            style={styles.submitButton}
          />

          <View style={styles.footer}>
            <AppText variant="body" style={styles.footerText}>
              Don&apos;t have an account?
            </AppText>
            <AppButton
              title="Sign Up"
              variant="outline"
              onPress={() => router.push('/registration')}
              style={styles.linkButton}
            />
          </View>
        </View>
      </View>
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Theme.Spacing.extraLarge,
  },
  title: {
    textAlign: 'center',
    marginBottom: Theme.Spacing.small,
    color: Theme.Colours.primary,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Theme.Spacing.extraLarge,
    color: Theme.Colours.gray,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: Theme.Spacing.medium,
  },
  label: {
    marginBottom: Theme.Spacing.small,
    color: Theme.Colours.black,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: Theme.Spacing.large,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Theme.Spacing.large,
    flexWrap: 'wrap',
  },
  footerText: {
    color: Theme.Colours.gray,
    marginRight: Theme.Spacing.small,
  },
  linkButton: {
    marginBottom: 0,
    paddingVertical: Theme.Spacing.small,
    paddingHorizontal: Theme.Spacing.medium,
  },
});