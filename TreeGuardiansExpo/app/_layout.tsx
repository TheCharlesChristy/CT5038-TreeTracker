import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync();
}

export default function Layout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular: require('@/assets/fonts/Poppins_400Regular.ttf'),
    Poppins_600SemiBold: require('@/assets/fonts/Poppins_600SemiBold.ttf'),
    Inter_400Regular: require('@/assets/fonts/Inter_400Regular.ttf'),
    Inter_600SemiBold: require('@/assets/fonts/Inter_600SemiBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded && Platform.OS !== 'web') {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const styleId = 'treeguardians-scrollbar-style';

    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      * {
        scrollbar-width: thin;
        scrollbar-color: rgba(47, 106, 62, 0.42) transparent;
      }

      *::-webkit-scrollbar {
        width: 7px;
        height: 7px;
      }

      *::-webkit-scrollbar-track {
        background: transparent;
      }

      *::-webkit-scrollbar-thumb {
        background-color: rgba(47, 106, 62, 0.34);
        border-radius: 999px;
        border: 2px solid rgba(252, 254, 251, 0.78);
      }

      *::-webkit-scrollbar-thumb:hover {
        background-color: rgba(47, 106, 62, 0.54);
      }

      *::-webkit-scrollbar-corner {
        background: transparent;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // On web, fonts load via CSS so we never block the render — doing so causes
  // a hydration mismatch (#418) because the static export pre-renders with
  // fonts resolved but the browser's first render sees fontsLoaded=false.
  if (!fontsLoaded && Platform.OS !== 'web') return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        title: 'TreeHuggers',
      }}
    />
  );
}
