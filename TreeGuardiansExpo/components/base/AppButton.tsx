import React, { useRef } from 'react';
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle, Animated } from 'react-native';
import { AppText } from './AppText';
import { Theme } from '@/styles/theme';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'invisible';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  textStyle?: any;
}

const textColorForVariant: Record<Variant, string> = {
  primary: Theme.Colours.white,
  secondary: Theme.Colours.primary,
  accent: Theme.Colours.white,
  ghost: Theme.Colours.textMuted,
  outline: Theme.Colours.primary,
  invisible: Theme.Colours.textPrimary,
};

export const AppButton = ({
  title, onPress, variant = 'primary', style, textStyle
}: AppButtonProps) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
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
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.base, styles[variant]]}
        activeOpacity={0.85}
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
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },

  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Theme.Colours.primary,
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
    backgroundColor: 'transparent',
  },

  text: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
