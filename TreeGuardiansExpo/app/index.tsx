import { View, ImageBackground, StyleSheet } from 'react-native';
import { AppContainer } from '../components/base/AppContainer';
import { AppText } from '../components/base/AppText';
import { AppButton } from '../components/base/AppButton';
import { BackButton } from '../components/base/BackButton';
import { Theme } from '../styles/theme';
import { router } from 'expo-router';

export default function HomeScreen() {
  return (
    <AppContainer backgroundImage={require('../assets/CharltonKings.webp')}>
      <BackButton onPress={() => router.push('/themePreview')}/>
      {/* Center Content */}
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <AppText
          style={{
            ...Theme.Typography.title,
            marginBottom: Theme.Spacing.extraLarge,
          }}
        >
          🌲 TreeGuardians 🌲
        </AppText>
        <AppButton title="Login" variant="accent" onPress={() => router.push('/login')} />
        <AppButton title="Create Account" variant="primary" onPress={() => router.push('/registration')} />
        <AppButton
          title="Continue as Guest"
          variant="secondary"
          onPress={() => {}}
        />
      </View>
    </AppContainer>
  );
};
