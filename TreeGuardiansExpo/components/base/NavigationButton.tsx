import { TouchableOpacity, GestureResponderEvent} from 'react-native';
import { ReactNode } from 'react';
import { AppText } from './AppText';
import { Theme } from '@/styles';

interface NavigationButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  children?: ReactNode;
  color?: string;
}

export const NavigationButton = ({ onPress, children, color }: NavigationButtonProps) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <AppText style={[ { color: Theme.Colours.primary }, color && { color }]}> 
        {children ?? '← Back'}
      </AppText>
    </TouchableOpacity>
  );
};
