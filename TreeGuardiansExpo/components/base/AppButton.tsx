import React, { useRef } from 'react';
import { Platform, StyleSheet, StyleProp, ViewStyle, TextStyle, Animated } from 'react-native';
import { AppText } from './AppText';
import { Theme } from '@/styles/theme';
import { AppTouchableOpacity as TouchableOpacity } from './AppTouchableOpacity';
import { Layout } from '@/styles/layout';

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

const webTouchStyle = Platform.select({
  web: {
    WebkitTapHighlightColor: 'transparent',
    cursor: 'pointer',
  } as object,
  default: {},
});

const textColorForVariant: Record<Variant, string> = {
  primary: Theme.Colours.white,
  secondary: Theme.Colours.primary,
  tertiary: Theme.Colours.textPrimary,
  accent: Theme.Colours.white,
  ghost: Theme.Colours.textMuted,
  outline: Theme.Colours.primary,
  invisible: Theme.Colours.textPrimary,
};

const androidVariantStyles: Record<Variant, ViewStyle> = {
  primary: {
    backgroundColor: Theme.Colours.primary,
    borderColor: Theme.Colours.primary,
  },
  secondary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9D8C9',
  },
  tertiary: {
    backgroundColor: 'transparent',
  },
  accent: {
    backgroundColor: Theme.Colours.secondary,
    borderColor: Theme.Colours.secondary,
  },
  ghost: {
    backgroundColor: 'rgba(245, 250, 245, 0.92)',
    borderColor: 'rgba(46, 125, 50, 0.20)',
  },
  outline: {
    backgroundColor: '#FFFFFF',
    borderColor: '#BFD0C0',
  },
  invisible: {
    backgroundColor: 'transparent',
  },
};

export const AppButton = ({
  title, onPress, variant = 'primary', style, buttonStyle, textStyle, disabled = false,
}: AppButtonProps) => {
  const androidVariantStyle = Platform.OS === 'android'
    ? androidVariantStyles[variant]
    : null;
  const androidSurfaceStyle = Platform.OS === 'android'
    ? [styles.androidButtonSurface, Layout.androidFlatSurface]
    : null;
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
        style={[
          styles.base,
          styles[variant],
          androidVariantStyle,
          buttonStyle,
          androidSurfaceStyle,
          disabled && styles.disabled,
          webTouchStyle,
        ]}
        activeOpacity={Platform.OS === 'android' || disabled ? 1 : 0.85}
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
    justifyContent: 'center',
    minWidth: 0,
    marginBottom: 12,
    borderWidth: 0,
  },

  primary: {
    backgroundColor: 'rgba(46, 125, 50, 0.86)',
    shadowColor: Theme.Colours.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },

  secondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.46)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },

  tertiary: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    marginBottom: 4,
  },

  accent: {
    backgroundColor: 'rgba(102, 187, 106, 0.86)',
    shadowColor: Theme.Colours.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },

  ghost: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginBottom: 4,
  },

  invisible: {},

  outline: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.46)',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },

  disabled: {
    opacity: 0.62,
  },

  androidButtonSurface: {
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },

  wrapperDisabled: {
    opacity: 0.9,
  },

  text: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    letterSpacing: 0,
    backgroundColor: 'transparent',
    textAlign: 'center',
    flexShrink: 1,
  },
});
