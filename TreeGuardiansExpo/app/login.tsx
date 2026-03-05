<<<<<<< HEAD:TreeGuardiansExpo/app/(auth)/login.tsx
import { View } from 'react-native';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { NavigationButton } from '@/components/base/NavigationButton';
import { Theme } from '@/styles/theme';
=======
import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { AppContainer } from '../components/base/AppContainer';
import { AppText } from '../components/base/AppText';
import { AppButton } from '../components/base/AppButton';
import { AppInput } from '../components/base/AppInput';
import { NavigationButton } from '../components/base/NavigationButton';
import { Theme } from '../styles/theme';
>>>>>>> main:TreeGuardiansExpo/app/login.tsx
import { router } from 'expo-router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    // TODO: Implement real login logic (API call, token handling, etc.)
    Alert.alert(
      'Success',
      'Logged in successfully (stubbed logic).',
      [
        {
          text: 'OK',
          onPress: () => router.push('/'),
        },
      ],
    );
  };

  return (
    <AppContainer scrollable>
      {/* Top Left Back */}
      <NavigationButton onPress={() => router.push('/')}>
        Home
      </NavigationButton>

      {/* Login Form */}
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
            title="Log In"
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