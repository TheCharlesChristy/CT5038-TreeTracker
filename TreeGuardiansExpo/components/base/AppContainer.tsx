import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../../styles/theme';

interface AppContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const AppContainer = ({ children, style }: AppContainerProps) => {
  return (
    <SafeAreaView style={[styles.container, style]}>
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.Colours.background,
    padding: Theme.Spacing.medium,
  },
});