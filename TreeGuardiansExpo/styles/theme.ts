import { Colours } from './tokens/colours';
import { Spacing } from './tokens/spacing';
import { Typography } from './tokens/typography';
import { BorderRadius } from './tokens/radius';

export const Theme = {
  Colours,
  Spacing,
  Typography,
  BorderRadius,

  background: {
    flex: 1,
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
      borderRadius: BorderRadius.small,
    },
    secondary: {
      backgroundColor: Colours.secondary,
      padding: Spacing.medium,
      borderRadius: BorderRadius.small,
    },
    text: {
        color: Colours.white,
        fontWeight: 'bold',
    },
  },

} as const;
