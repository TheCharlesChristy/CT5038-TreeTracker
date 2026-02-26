import { View } from 'react-native';
import { AppContainer } from '../components/base/AppContainer';
import { AppText } from '../components/base/AppText';
import { AppButton } from '../components/base/AppButton';
import { NavigationButton } from '../components/base/NavigationButton';
import { Theme } from '../styles/theme';
import { router } from 'expo-router';

export default function Index() {
  return (
    <AppContainer backgroundImage={require('../assets/images/CharltonKings.webp')}>

      {/* Top Left Back */}
      <NavigationButton onPress={() => router.push('/themePreview')}>
        Theme Preview
      </NavigationButton>

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
          TreeGuardians
        </AppText>
        <AppButton title="Login" variant="accent" onPress={() => router.push('/login')} />
        <AppButton title="Create Account" variant="primary" onPress={() => router.push('/registration')} />
        <AppButton
          title="Continue as Guest"
          variant="secondary"
          onPress={() => router.push('/mainPage')}
        />
      </View>
    </AppContainer>
  );
};
