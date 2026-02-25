import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { Theme } from '../../styles/theme';

type Variant = 'primary' | 'secondary' | 'accent' | 'outline';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  style?: ViewStyle;
}

export const AppButton = ({
  title, onPress, variant = 'primary', style,
}: AppButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.base, styles[variant], style]}
      activeOpacity={0.8}
    >
      <AppText
        style={[styles.text, variant === 'outline' ? styles.outlineText : undefined]}>
        {title}
      </AppText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: Theme.Spacing.medium,
    paddingHorizontal: Theme.Spacing.large,
    borderRadius: Theme.Radius.medium,
    alignItems: 'center',
    marginBottom: Theme.Spacing.medium,
  },

  primary: {
    backgroundColor: Theme.Colours.primary,
  },

  secondary: {
    backgroundColor: Theme.Colours.secondary,
  },

  accent: {
    backgroundColor: Theme.Colours.accent,
  },

  outline: {
    borderWidth: Theme.Border.extraSmall,
    borderColor: Theme.Colours.primary,
    backgroundColor: 'transparent',
  },

  text: {
    color: Theme.Colours.white,
    fontWeight: '600',
  },

  outlineText: {
    color: Theme.Colours.primary,
  },
});
