import React from 'react';
import { SafeAreaViewBase, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../styles/theme';

interface AppContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const AppContainer = ({ children, style }: AppContainerProps) => {
  return (
    <SafeAreaViewBase style={[styles.container, style]}>
      {children}
    </SafeAreaViewBase>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.Colours.background,
    padding: Theme.Spacing.medium,
  },
});