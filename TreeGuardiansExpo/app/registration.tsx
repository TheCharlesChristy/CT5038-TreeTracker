import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { AppContainer } from '../components/base/AppContainer';
import { AppText } from '../components/base/AppText';
import { AppButton } from '../components/base/AppButton';
import { AppInput } from '../components/base/AppInput';
import { NavigationButton } from '../components/base/NavigationButton';
import { Theme } from '../styles/theme';
import { router } from 'expo-router';

export default function CreateAccount() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleCreateAccount = () => {
    // Validation
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    if (!confirmPassword) {
      Alert.alert('Error', 'Please confirm your password');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // TODO: Implement account creation logic
    // This would typically call an API endpoint or database function
    Alert.alert(
      'Success',
      'Account created successfully!',
      [
        {
          text: 'OK',
          onPress: () => router.push('/login'),
        },
      ]
    );
  };

  return (
    <AppContainer scrollable>
      {/* Top Left Back */}
      <NavigationButton onPress={() => router.back()} />

      {/* Form Content */}
      <View style={styles.formContainer}>
        <AppText
          variant="title"
          style={styles.title}
        >
          Create Account
        </AppText>

        <AppText
          variant="body"
          style={styles.subtitle}
        >
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
            title="Create Account"
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
    color: Theme.Colours.gray,
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
