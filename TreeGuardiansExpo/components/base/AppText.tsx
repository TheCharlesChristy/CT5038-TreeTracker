import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp, TextProps } from 'react-native';
import { Theme } from '@/styles/theme';

type Variant = 'title' | 'subtitle' | 'tagline' | 'body' | 'caption';

interface AppTextProps extends TextProps {
  children: React.ReactNode;
  variant?: Variant;
  style?: StyleProp<TextStyle>;
}

export const AppText = ({
  children,
  variant = 'body',
  style,
  ...props
}: AppTextProps) => {
  return (
    <Text {...props} style={[styles[variant], style]}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  primaryColor: {
    color: Theme.Colours.primary,
  },

  secondaryColor: {
    color: Theme.Colours.secondary,
  },

  accentColor: {
    color: Theme.Colours.accent,
  },

  title: {
    ...Theme.Typography.title,
  },
  subtitle: {
    ...Theme.Typography.subtitle,
  },
  tagline: {
    ...Theme.Typography.tagline,
  },
  body: {
    ...Theme.Typography.body,
  },
  caption: {
    ...Theme.Typography.caption,
  },
});
