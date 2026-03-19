import { Colours } from './tokens/colours';
import { Spacing } from './tokens/spacing';
import { Typography } from './tokens/typography';
import { Radius } from './tokens/radius';
import { Border } from './tokens/border';

export const Theme = {
  Colours,
  Spacing,
  Typography,
  Radius,
  Border,

  dimOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.37)',
    zIndex: 25,
  },

  background: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: Colours.white,
    padding: Spacing.medium,
  },

  button: {
    primary: {
      backgroundColor: Colours.primary,
      padding: Spacing.medium,
      borderRadius: Radius.small,
    },
    secondary: {
      backgroundColor: Colours.secondary,
      padding: Spacing.medium,
      borderRadius: Radius.small,
    },
    text: {
        color: Colours.white,
        fontWeight: 'bold',
    },
  },

} as const;
