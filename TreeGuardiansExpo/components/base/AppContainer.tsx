import React from 'react';
import { StyleSheet, StyleProp, ViewStyle, ScrollView, ImageBackground, View, ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '@/styles/theme';

interface AppContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  backgroundImage?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  noPadding?: boolean;
}

export const AppContainer = ({
  children,
  scrollable = false,
  backgroundImage,
  style,
  noPadding,
}: AppContainerProps) => {
  const containerPaddingStyle = noPadding ? null : styles.padding;
  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, containerPaddingStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.inner, containerPaddingStyle]}>{children}</View>
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
            {content}
          </SafeAreaView>
        </View>
      </ImageBackground>
    );
  }

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
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
  },

  container: {
    flex: 1,
    backgroundColor: Theme.Colours.white,
  },

  padding: {
    padding: Theme.Spacing.medium,
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
});
