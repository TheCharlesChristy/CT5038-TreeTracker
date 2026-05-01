import { useEffect, useState } from 'react';
import { Dimensions, Platform, useWindowDimensions } from 'react-native';

type ViewportDimensions = {
  width: number;
  height: number;
};

function getBrowserViewport(): ViewportDimensions {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  const windowDimensions = Dimensions.get('window');

  return {
    width: windowDimensions.width,
    height: windowDimensions.height,
  };
}

export function useStableViewportDimensions(): ViewportDimensions {
  const nativeDimensions = useWindowDimensions();
  const [webDimensions, setWebDimensions] = useState<ViewportDimensions>(getBrowserViewport);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const syncViewport = () => {
      setWebDimensions(getBrowserViewport());
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => {
      window.removeEventListener('resize', syncViewport);
    };
  }, []);

  if (Platform.OS === 'web') {
    return webDimensions;
  }

  return {
    width: nativeDimensions.width,
    height: nativeDimensions.height,
  };
}
