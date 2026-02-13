import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { Theme } from '../../styles/theme';

type Variant = 'title' | 'body' | 'small';

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
  title: {
    ...Theme.textVariants.title,
  },
  body: {
    ...Theme.textVariants.body,
  },
  small: {
    ...Theme.textVariants.small,
  },
});
