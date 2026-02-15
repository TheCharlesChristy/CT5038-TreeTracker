import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { Theme } from '../../styles/theme';

interface BackButtonProps {
  onPress: () => void;
  style?: ViewStyle;
}

export const BackButton = ({ onPress, style }: BackButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.button, style]}
      activeOpacity={0.8}
    >
      <AppText style={styles.text}>
        ← Back
      </AppText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
  },

  text: {
    color: Theme.Colours.primary,
    ...Theme.Typography.body,
  },
});
