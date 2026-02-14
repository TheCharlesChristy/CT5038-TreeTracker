import React from 'react';
import { StyleSheet, ViewStyle, ScrollView, ImageBackground, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../../styles/theme';

interface AppContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  backgroundImage?: any;
  style?: ViewStyle;
}

export const AppContainer = ({
  children,
  scrollable = false,
  backgroundImage,
  style,
}: AppContainerProps) => {
  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.inner}>{children}</View>
  );

  // If background image exists
  if (backgroundImage) {
    return (
      <ImageBackground
        source={backgroundImage}
        style={styles.background}
        resizeMode="cover"
        blurRadius={4} // Optional blur
      >
        { /* Optional overlay for readability */ }
        <View style={styles.overlay}>
          <SafeAreaView style={[styles.containerTransparent, style]}>
            {content}
          </SafeAreaView>
        </View>
      </ImageBackground>
    );
  }

  // Default container (no background image)
  return (
    <SafeAreaView style={[styles.container, style]}>
      {content}
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
  },

  container: {
    flex: 1,
    backgroundColor: Theme.Colours.background,
    padding: Theme.Spacing.medium,
  },

  containerTransparent: {
    flex: 1,
    padding: Theme.Spacing.medium,
  },

  scrollContent: {
    flexGrow: 1,
  },

  inner: {
    flex: 1,
  },
});