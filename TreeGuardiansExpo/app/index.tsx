import { View, StyleSheet, Image } from 'react-native';
import { Stack, router } from 'expo-router';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { AuthenticatedRedirect } from '@/components/auth/AuthenticatedRedirect';
import { Theme } from '@/styles/theme';
import { FaviconHead } from '@/components/base/FaviconHead';

export default function Index() {
  return (
    <>
      <Stack.Screen options={{ title: 'TreeGuardians' }} />
      <FaviconHead title="TreeGuardians" />
      <AppContainer backgroundImage={require('@/assets/images/CharltonKings.jpg')}>
      <AuthenticatedRedirect />
      <View style={styles.screen}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Image
              source={require('@/assets/images/tree_icon.png')}
              style={styles.brandIcon}
              resizeMode="contain"
            />
          </View>

          <AppText variant="title" style={styles.title}>
            TreeGuardians
          </AppText>

          <AppText variant="tagline" style={styles.tagline}>
            Discover and share trees in your community
          </AppText>

          <View style={styles.divider} />

          <AppButton
            title="Create Account"
            variant="primary"
            style={styles.button}
            onPress={() => router.push('/registration')}
          />

          <AppButton
            title="Login"
            variant="secondary"
            style={styles.button}
            onPress={() => router.push('/login')}
          />

          <AppButton
            title="Explore Map"
            variant="ghost"
            style={styles.button}
            onPress={() => router.push('/mainPage')}
          />

          {__DEV__ && (
            <>
              <View style={styles.devDivider} />
              <AppButton
                title="DB Test Bench"
                variant="outline"
                style={styles.button}
                onPress={() => router.push('/dbTestBench')}
              />
              <AppButton
                title="Theme Preview"
                variant="outline"
                style={styles.button}
                onPress={() => router.push('/themePreview')}
              />
            </>
          )}
        </View>
      </View>
    </AppContainer>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.Spacing.large,
  },

  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: Theme.Radius.card,
    paddingVertical: Theme.Spacing.extraLarge,
    paddingHorizontal: Theme.Spacing.large,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.34)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },

  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(165, 214, 167, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.Spacing.medium,
  },

  brandIcon: {
    width: 44,
    height: 44,
  },

  title: {
    color: Theme.Colours.textPrimary,
    textAlign: 'center',
    marginBottom: Theme.Spacing.small,
  },

  tagline: {
    color: Theme.Colours.textMuted,
    textAlign: 'center',
    marginBottom: Theme.Spacing.large,
  },

  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(165, 214, 167, 0.55)',
    marginBottom: Theme.Spacing.large,
  },

  button: {
    width: '100%',
  },

  devDivider: {
    width: '100%',
    height: 1,
    backgroundColor: Theme.Colours.gray + '33',
    marginTop: Theme.Spacing.small,
    marginBottom: Theme.Spacing.medium,
  },
});
