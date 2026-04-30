import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { FaviconHead } from '@/components/base/FaviconHead';
import { WebView } from 'react-native-webview';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { NavigationButton } from '@/components/base/NavigationButton';
import { Theme } from '@/styles/theme';

export default function PdfViewerPage() {
  const params = useLocalSearchParams<{ uri?: string; title?: string }>();
  const uri = typeof params.uri === 'string' ? params.uri : '';
  const title = typeof params.title === 'string' ? params.title : 'Document';

  if (!uri) {
    return (
      <AppContainer>
        <View style={styles.header}>
          <NavigationButton onPress={() => router.back()}>Back</NavigationButton>
        </View>
        <View style={styles.centered}>
          <AppText variant="subtitle" style={styles.errorTitle}>
            File not available
          </AppText>
          <AppText style={styles.errorText}>
            The PDF link is missing or invalid.
          </AppText>
        </View>
      </AppContainer>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Document Viewer | TreeGuardians' }} />
      <FaviconHead />
      <AppContainer noPadding showNavBar={false}>
      <View style={styles.header}>
        <NavigationButton onPress={() => router.back()}>Back</NavigationButton>
        <AppText variant="subtitle" style={styles.title}>
          {title}
        </AppText>
      </View>

      <WebView source={{ uri }} style={styles.webView} startInLoadingState />
    </AppContainer>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.Spacing.medium,
    paddingHorizontal: Theme.Spacing.medium,
    paddingVertical: Theme.Spacing.small,
    backgroundColor: Theme.Colours.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  title: {
    color: Theme.Colours.textPrimary,
    flexShrink: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: Theme.Colours.backgroundSoft,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.Spacing.large,
  },
  errorTitle: {
    color: Theme.Colours.textPrimary,
    marginBottom: Theme.Spacing.small,
  },
  errorText: {
    color: Theme.Colours.textMuted,
    textAlign: 'center',
  },
});

