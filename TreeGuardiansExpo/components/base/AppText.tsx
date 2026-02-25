import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { Theme } from '../../styles/theme';

type Variant = keyof typeof Theme.Typography;

interface AppTextProps {
  children: React.ReactNode;
  variant?: Variant;
  style?: StyleProp<TextStyle>;
}

export const AppText = ({
  children,
  variant = 'body',
  style,
}: AppTextProps) => {
  return (
    <Text style={[styles[variant], style]}>
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
  body: {
    ...Theme.Typography.body,
  },
  subtitle: {
    ...Theme.Typography.subtitle,
  },
  caption: {
    ...Theme.Typography.caption,
  },
});
