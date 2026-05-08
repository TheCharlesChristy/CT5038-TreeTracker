import { Platform, ViewStyle } from 'react-native';
import { Theme } from './theme';

export const Breakpoints = {
  compact: 380,
  phone: 680,
  tablet: 900,
  desktop: 1160,
} as const;

export type ResponsiveLayoutMetrics = ReturnType<typeof getResponsiveLayoutMetrics>;

export function getResponsiveLayoutMetrics(width: number, height = 0) {
  const isCompact = width < Breakpoints.compact;
  const isPhone = width < Breakpoints.phone;
  const isTablet = width >= Breakpoints.phone && width < Breakpoints.tablet;
  const isDesktop = width >= Breakpoints.tablet;

  const screenPadding = isCompact
    ? Theme.Spacing.small
    : isPhone
      ? Theme.Spacing.medium
      : Theme.Spacing.large;

  const panelPadding = isCompact ? 10 : isPhone ? 14 : 18;
  const edgeInset = isCompact ? 10 : isPhone ? 12 : 16;
  const fieldMinWidth = isCompact ? 140 : 160;

  return {
    width,
    height,
    isCompact,
    isPhone,
    isTablet,
    isDesktop,
    screenPadding,
    panelPadding,
    edgeInset,
    fieldMinWidth,
    cardRadius: isPhone ? Theme.Radius.large : Theme.Radius.card,
    controlRadius: isPhone ? Theme.Radius.medium : Theme.Radius.large,
    contentMaxWidth: Breakpoints.desktop,
    mapPanelWidth: (isPhone ? 'auto' : '90%') as ViewStyle['width'],
    mapPanelMaxWidth: (isPhone ? undefined : 440) as ViewStyle['maxWidth'],
    mapPanelHorizontalInset: isPhone ? edgeInset : 0,
  };
}

export const Layout = {
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  } as ViewStyle,

  fillAndShrink: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,

  androidFlatSurface: Platform.select({
    android: {
      elevation: 0,
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
    } as ViewStyle,
    default: {},
  }) as ViewStyle,
};
