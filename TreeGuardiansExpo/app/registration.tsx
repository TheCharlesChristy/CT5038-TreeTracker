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
import { normalizePhone, isValidPhone } from '@/utilities/phone';

export default function CreateAccount() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateAccount = async () => {
    if (loading) return;

    if (!username.trim()) {
      showAlert('Error', 'Please enter a username');
      return;
    }

    if (!email.trim()) {
      showAlert('Error', 'Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert('Error', 'Please enter a valid email address');
      return;
    }

    // Optional phone validation, removes any white space inbetween the numbers and keeps the trailing + if present
    const normalizedPhone = normalizePhone(phone);

    if (!isValidPhone(normalizedPhone)) {
      showAlert('Error', 'Please enter a valid phone number');
      return;
    }

    if (!password) {
      showAlert('Error', 'Please enter a password');
      return;
    }

    if (password.length < 8) {
      showAlert('Error', 'Password must be at least 8 characters long');
      return;
    }

    if (!confirmPassword) {
      showAlert('Error', 'Please confirm your password');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Error', 'Passwords do not match');
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
    <AppContainer scrollable>
      <NavigationButton onPress={() => router.push('/')}>
        Home
      </NavigationButton>

      <View style={styles.formContainer}>
        <AppText variant="title" style={styles.title}>
          Create Account
        </AppText>

        <AppText variant="body" style={styles.subtitle}>
          Join TreeGuardians to help track and protect our trees
        </AppText>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <AppText variant="body" style={styles.label}>
              Username
            </AppText>
            <AppInput
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <AppText variant="body" style={styles.label}>
              Email
            </AppText>
            <AppInput
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <AppText variant="body" style={styles.label}>
              Phone Number
            </AppText>
            <AppInput
              placeholder="Enter your phone number (optional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
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
              containerStyle={styles.passwordInputContainer}
            />
            <AppText variant="caption" style={styles.helpText}>
              Must be at least 8 characters
            </AppText>
          </View>

          <View style={styles.inputGroup}>
            <AppText variant="body" style={styles.label}>
              Confirm Password
            </AppText>
            <AppInput
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <AppButton
            title={loading ? 'Creating...' : 'Create Account'}
            onPress={handleCreateAccount}
            style={styles.submitButton}
          />

          <View style={styles.footer}>
            <AppText variant="body" style={styles.footerText}>
              Already have an account?{' '}
            </AppText>
            <AppButton
              title="Sign In"
              variant="outline"
              onPress={() => router.push('/login')}
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
    marginBottom: 0,
  },
  label: {
    marginBottom: Theme.Spacing.small,
    color: Theme.Colours.black,
    fontWeight: '600',
  },
  helpText: {
    marginTop: Theme.Spacing.extraSmall,
    marginBottom: Theme.Spacing.medium,
    color: Theme.Colours.gray,
  },
  passwordInputContainer: {
    marginBottom: 0,
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
  },
  linkButton: {
    marginLeft: Theme.Spacing.small,
    marginBottom: 0,
    paddingVertical: Theme.Spacing.small,
    paddingHorizontal: Theme.Spacing.medium,
  },
});