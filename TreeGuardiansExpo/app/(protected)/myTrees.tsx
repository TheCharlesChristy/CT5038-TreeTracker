import { useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { FaviconHead } from '@/components/base/FaviconHead';
import { AppText } from '@/components/base/AppText';
import { Theme } from '@/styles/theme';

/**
 * My Trees is shown as a map overlay on mainPage. This route remains for
 * bookmarks and deep links; it forwards to the map with the overlay open.
 */
export default function MyTreesRedirect() {
  useEffect(() => {
    router.replace({ pathname: '/mainPage', params: { openMyTrees: '1' } });
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'My Trees | TreeGuardians' }} />
      <FaviconHead title="My Trees | TreeGuardians" />
      <View style={styles.centered}>
        <ActivityIndicator color={Theme.Colours.primary} />
        <AppText style={styles.hint}>Opening map…</AppText>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F4F8F4',
  },
  hint: {
    color: Theme.Colours.textMuted,
  },
});
