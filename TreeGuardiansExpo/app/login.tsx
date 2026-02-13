import { View } from 'react-native';
import { AppContainer } from '../components/base/AppContainer';
import { AppText } from '../components/base/AppText';
import { AppButton } from '../components/base/AppButton';
import { BackButton } from '../components/base/BackButton';
import { Theme } from '../styles/theme';
import { router } from 'expo-router';

export default function LoginScreen() {
  return (
    <AppContainer>
      
      {/* Top Left Back */}
      <BackButton onPress={() => router.back()} />

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
            fontSize: Theme.Typography.title,
            marginBottom: Theme.Spacing.extraLarge,
          }}
        >
          TreeGuardians
        </AppText>

        <AppButton title="Registration" onPress={() => router.push('/registration')} />
        <AppButton
          title="Continue as Guest"
          variant="secondary"
          onPress={() => {}}
        />
      </View>

    </AppContainer>
  );
};