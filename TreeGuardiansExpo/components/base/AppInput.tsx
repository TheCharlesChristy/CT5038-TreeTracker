import React, { ReactNode, forwardRef } from 'react';
import {
  TextInput,
  StyleSheet,
  View,
  TextInputProps,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Theme } from '@/styles/theme';

interface AppInputProps extends TextInputProps {
  containerStyle?: StyleProp<ViewStyle>;
  inputWrapperStyle?: StyleProp<ViewStyle>;
  leftAdornment?: ReactNode;
  rightAdornment?: ReactNode;
  invalid?: boolean;
  style?: StyleProp<TextStyle>;
}

export const AppInput = forwardRef<TextInput, AppInputProps>(({
  style,
  containerStyle,
  inputWrapperStyle,
  leftAdornment,
  rightAdornment,
  invalid = false,
  editable = true,
  multiline = false,
  ...props
}, ref) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <View
        style={[
          styles.inputWrapper,
          multiline && styles.inputWrapperMultiline,
          invalid && styles.inputWrapperInvalid,
          !editable && styles.inputWrapperDisabled,
          inputWrapperStyle,
        ]}
      >
        {leftAdornment ? <View style={styles.adornment}>{leftAdornment}</View> : null}

        <TextInput
          {...props}
          ref={ref}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={Theme.Colours.textLight}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            !editable && styles.inputDisabled,
            style,
          ]}
        />

        {rightAdornment ? <View style={styles.adornment}>{rightAdornment}</View> : null}
      </View>
    </View>
  );
});

AppInput.displayName = 'AppInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.Spacing.medium,
  },

  inputWrapper: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.Colours.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9AA79A',
    paddingHorizontal: Theme.Spacing.medium,
  },

  inputWrapperMultiline: {
    alignItems: 'flex-start',
    paddingVertical: Theme.Spacing.small,
  },

  inputWrapperInvalid: {
    borderColor: Theme.Colours.error,
  },

  inputWrapperDisabled: {
    backgroundColor: '#EFF3EF',
    borderColor: '#C7D1C7',
  },

  adornment: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  input: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: Theme.Spacing.small,
    ...Theme.Typography.body,
    color: Theme.Colours.black,
  },

  inputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },

  inputDisabled: {
    color: Theme.Colours.textMuted,
  },
});
