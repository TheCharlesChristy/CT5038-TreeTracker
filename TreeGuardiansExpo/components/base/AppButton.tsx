import React, { useRef } from 'react';
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle, TextStyle, Animated } from 'react-native';
import { AppText } from './AppText';
import { Theme } from '@/styles/theme';

type Variant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'ghost'
  | 'outline'
  | 'invisible';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

const textColorForVariant: Record<Variant, string> = {
  primary: Theme.Colours.white,
  secondary: Theme.Colours.primary,
  tertiary: Theme.Colours.textPrimary,
  accent: Theme.Colours.white,
  ghost: Theme.Colours.textMuted,
  outline: Theme.Colours.primary,
  invisible: Theme.Colours.textPrimary,
};

export const AppButton = ({
  title, onPress, variant = 'primary', style, buttonStyle, textStyle, disabled = false,
}: AppButtonProps) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) {
      return;
    }

    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style, disabled && styles.wrapperDisabled]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.base, styles[variant], buttonStyle, disabled && styles.disabled]}
        activeOpacity={disabled ? 1 : 0.85}
        disabled={disabled}
      >
        <AppText style={[styles.text, { color: textColorForVariant[variant] }, textStyle]}>
          {title}
        </AppText>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: Theme.Spacing.medium,
    paddingHorizontal: Theme.Spacing.large,
    borderRadius: Theme.Radius.medium,
    alignItems: 'center',
    marginBottom: 12,
  },

  primary: {
    backgroundColor: Theme.Colours.primary,
    shadowColor: Theme.Colours.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },

  secondary: {
    backgroundColor: Theme.Colours.white,
    borderWidth: 2,
    borderColor: Theme.Colours.primary,
  },

  tertiary: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    marginBottom: 4,
  },

  accent: {
    backgroundColor: Theme.Colours.secondary,
    shadowColor: Theme.Colours.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  ghost: {
    backgroundColor: 'transparent',
    marginBottom: 4,
  },

  invisible: {},

  outline: {
    borderWidth: 1,
    borderColor: Theme.Colours.primary,
    backgroundColor: Theme.Colours.white,
  },

  disabled: {
    opacity: 0.62,
  },

  wrapperDisabled: {
    opacity: 0.9,
  },

  text: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
