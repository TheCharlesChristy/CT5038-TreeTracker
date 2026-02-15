import { TouchableOpacity } from 'react-native';
import { AppText } from './AppText';
import { Theme } from '../../styles/theme';
import { GestureResponderEvent } from 'react-native';

interface BackButtonProps {
  onPress: (event: GestureResponderEvent) => void;
}

export const BackButton = ({ onPress }: BackButtonProps) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <AppText
        style={{
          color: Theme.Colours.primary,
          ...Theme.Typography.body,
        }}
      >
        ← Back
      </AppText>
    </TouchableOpacity>
  );
};
