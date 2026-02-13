import { TouchableOpacity } from 'react-native';
import { AppText } from './AppText';
import { Theme } from '../../styles/theme';
import { GestureResponderEvent } from 'react-native';

interface AppButtonProps {
  onPress: (event: GestureResponderEvent) => void;
}

export const BackButton = ({ onPress }: AppButtonProps) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <AppText
        style={{
          color: Theme.Colours.primary,
          fontSize: Theme.Typography.body,
        }}
      >
        ← Back
      </AppText>
    </TouchableOpacity>
  );
};
