import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { AppText } from './AppText';
import { Theme } from '../../styles/theme';

type Variant = 'primary' | 'secondary' | 'outline';

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
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    marginBottom: Theme.Spacing.medium,
  },

  primary: {
    backgroundColor: Theme.Colours.primary,
  },

  secondary: {
    backgroundColor: Theme.Colours.secondary,
  },

  outline: {
    borderWidth: 2,
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
