import { Colours } from './colours';
import { Spacing } from './spacing';
import { Typography } from './typography';

export const Theme = {
  Colours,
  Spacing,
  Typography,

  borderRadius: {
    small: 6,
    medium: 10,
    large: 16,
    },

  container: {
    flex: 1,
    backgroundColor: Colours.background,
    padding: Spacing.medium,
  },

  button: {
    primary: {
      backgroundColor: Colours.primary,
      padding: Spacing.medium,
      borderRadius: 8,
    },
    secondary: {
      backgroundColor: Colours.secondary,
      padding: Spacing.medium,
      borderRadius: 8,
    },
    text: {
        color: Colours.white,
        fontWeight: 'bold',
    },
  },

  textVariants: {
    title: {
      fontSize: Typography.title,
      fontWeight: 'bold',
      color: Colours.black,
    },
    body: {
      fontSize: Typography.body,
      color: Colours.black,
    },
    small: {
      fontSize: Typography.small,
      color: Colours.black,
    },
  },
} as const;
