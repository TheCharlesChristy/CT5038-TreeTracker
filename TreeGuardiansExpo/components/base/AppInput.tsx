import React from 'react';
import { TextInput, StyleSheet, View, TextInputProps, ViewStyle } from 'react-native';
import { Theme } from '@/styles/theme';

interface AppInputProps extends TextInputProps {
  containerStyle?: ViewStyle;
}

export const AppInput = ({ style, containerStyle, ...props }: AppInputProps) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        {...props}
        placeholderTextColor={Theme.Colours.gray}
        style={[styles.input, style]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.Spacing.medium,
  },

  input: {
    backgroundColor: Theme.Colours.white,
    paddingVertical: Theme.Spacing.medium,
    paddingHorizontal: Theme.Spacing.medium,
    borderRadius: Theme.Border.medium,
    borderWidth: 1,
    borderColor: Theme.Colours.gray,
    ...Theme.Typography.body,
    color: Theme.Colours.black,
  },
});
