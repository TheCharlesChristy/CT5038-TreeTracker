import { View } from 'react-native';
import { AppContainer } from '../components/base/AppContainer';
import { AppText } from '../components/base/AppText';
import { AppButton } from '../components/base/AppButton';
import { BackButton } from '../components/base/BackButton';
import { Theme } from '../styles/theme';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen = ({ navigation }: Props) => {
  return (
    <AppContainer>
      
      {/* Top Left Back */}
      <BackButton onPress={() => navigation.goBack()} />

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

        <AppButton title="Login" onPress={() => {}} />
        <AppButton title="Create Account" onPress={() => {}} />
        <AppButton
          title="Continue as Guest"
          variant="secondary"
          onPress={() => {}}
        />
      </View>

    </AppContainer>
  );
};
