import React from 'react';
import {
  Platform,
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

type AppTouchableOpacityProps = Omit<PressableProps, 'style'> & {
  activeOpacity?: number;
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
};

export function AppTouchableOpacity({
  activeOpacity = 0.85,
  disabled,
  style,
  ...props
}: AppTouchableOpacityProps) {
  const shouldDimOnPress = Platform.OS !== 'android' && activeOpacity < 1;

  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={(state) => {
        const resolvedStyle = typeof style === 'function' ? style(state) : style;
        const flattenedStyle = StyleSheet.flatten(resolvedStyle);
        const baseOpacity = typeof flattenedStyle?.opacity === 'number' ? flattenedStyle.opacity : 1;

        return [
          resolvedStyle,
          shouldDimOnPress && state.pressed && !disabled && { opacity: baseOpacity * activeOpacity },
        ];
      }}
    />
  );
}
