import { getResponsiveLayoutMetrics } from '@/styles/layout';
import { useStableViewportDimensions } from './useStableViewportDimensions';

export function useResponsiveLayout() {
  const { width, height } = useStableViewportDimensions();
  return getResponsiveLayoutMetrics(width, height);
}
