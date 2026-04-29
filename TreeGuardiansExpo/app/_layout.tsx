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

  // On web, fonts load via CSS so we never block the render — doing so causes
  // a hydration mismatch (#418) because the static export pre-renders with
  // fonts resolved but the browser's first render sees fontsLoaded=false.
  if (!fontsLoaded && Platform.OS !== 'web') return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
