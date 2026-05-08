import React from 'react';
import { Platform, StyleSheet, StyleProp, ViewStyle, ScrollView, ImageBackground, View, ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '@/styles/theme';
import { NavBar } from './NavBar';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

interface AppContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  backgroundImage?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  noPadding?: boolean;
  showNavBar?: boolean;
  overlayNavBar?: boolean;
}

const webScrollStyle = Platform.select({
  web: { overflowX: 'hidden' } as object,
  default: {},
});

const webOverflowStyle = Platform.select({
  web: { overflow: 'hidden' } as object,
  default: {},
});

export const AppContainer = ({
  children,
  scrollable = false,
  backgroundImage,
  style,
  noPadding,
  showNavBar = true,
  overlayNavBar = false,
}: AppContainerProps) => {
  const layout = useResponsiveLayout();
  const containerPaddingStyle = noPadding
    ? null
    : { paddingHorizontal: layout.screenPadding, paddingVertical: layout.screenPadding };
  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, containerPaddingStyle]}
      showsVerticalScrollIndicator
      showsHorizontalScrollIndicator={false}
      style={webScrollStyle}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.inner, containerPaddingStyle, webOverflowStyle]}>{children}</View>
  );

  if (backgroundImage) {
    return (
      <ImageBackground
        source={backgroundImage}
        style={styles.background}
        resizeMode="cover"
        blurRadius={4}
      >
        <View style={styles.overlay}>
          <SafeAreaView style={[styles.containerTransparent, style]}>
            {showNavBar && !overlayNavBar && <NavBar />}
            {content}
            {showNavBar && overlayNavBar ? (
              <View style={styles.navOverlay} pointerEvents="box-none">
                <NavBar />
              </View>
            ) : null}
          </SafeAreaView>
        </View>
      </ImageBackground>
    );
  }

  return (
    <SafeAreaView style={[styles.container, style]}>
      {showNavBar && !overlayNavBar && <NavBar />}
      {content}
      {showNavBar && overlayNavBar ? (
        <View style={styles.navOverlay} pointerEvents="box-none">
          <NavBar />
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
  },

  container: {
    flex: 1,
    backgroundColor: Theme.Colours.white,
  },

  containerTransparent: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  inner: {
    flex: 1,
  },

  navOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 300,
  },
});
