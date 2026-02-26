import { View } from 'react-native';
import { AppContainer } from '../components/base/AppContainer';
import { AppText } from '../components/base/AppText';
import { AppButton } from '../components/base/AppButton';
import { NavigationButton } from '../components/base/NavigationButton';
import { Theme } from '../styles/theme';
import { router } from 'expo-router';

export default function Login() {
  return (
    <AppContainer>
      
      {/* Top Left Back */}
      <NavigationButton onPress={() => router.back()} />

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

        <AppButton title="Main Page" onPress={() => router.push('/')} />
        <AppButton
          title="Continue as Guest"
          variant="secondary"
          onPress={() => {}}
        />
      </View>

    </AppContainer>
  );
};