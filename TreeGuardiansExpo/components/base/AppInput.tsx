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

const TEXT_STYLE_KEYS = new Set([
  'color',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'includeFontPadding',
  'letterSpacing',
  'lineHeight',
  'textAlign',
  'textAlignVertical',
  'textDecorationColor',
  'textDecorationLine',
  'textDecorationStyle',
  'textShadowColor',
  'textShadowOffset',
  'textShadowRadius',
  'textTransform',
  'writingDirection',
]);

const splitInputStyles = (style?: StyleProp<TextStyle | ViewStyle>) => {
  const flattenedStyle = StyleSheet.flatten(style);

  if (!flattenedStyle) {
    return {
      textInputStyle: undefined,
      wrapperStyle: undefined,
    };
  }

  const textInputStyle: TextStyle = {};
  const wrapperStyle: ViewStyle = {};

  Object.entries(flattenedStyle).forEach(([key, value]) => {
    if (TEXT_STYLE_KEYS.has(key)) {
      (textInputStyle as Record<string, unknown>)[key] = value;
      return;
    }

    (wrapperStyle as Record<string, unknown>)[key] = value;
  });

  return {
    textInputStyle,
    wrapperStyle,
  };
};

interface AppInputProps extends TextInputProps {
  containerStyle?: StyleProp<ViewStyle>;
  inputWrapperStyle?: StyleProp<ViewStyle>;
  leftAdornment?: ReactNode;
  rightAdornment?: ReactNode;
  invalid?: boolean;
  style?: StyleProp<TextStyle | ViewStyle>;
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
  const { textInputStyle, wrapperStyle } = splitInputStyles(style);

  return (
    <View style={[styles.container, containerStyle]}>
      <View
        style={[
          styles.inputWrapper,
          multiline && styles.inputWrapperMultiline,
          invalid && styles.inputWrapperInvalid,
          !editable && styles.inputWrapperDisabled,
          wrapperStyle,
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
            textInputStyle,
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.52)',
    paddingHorizontal: Theme.Spacing.medium,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },

  inputWrapperMultiline: {
    alignItems: 'flex-start',
    paddingVertical: Theme.Spacing.small,
  },

  inputWrapperInvalid: {
    borderColor: Theme.Colours.error,
  },

  inputWrapperDisabled: {
    backgroundColor: 'rgba(239, 243, 239, 0.9)',
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
    outlineStyle: 'none',
  } as TextStyle,

  inputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },

  inputDisabled: {
    color: Theme.Colours.textMuted,
  },
});
