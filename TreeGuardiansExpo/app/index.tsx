import { View, StyleSheet } from 'react-native';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { Theme } from '@/styles/theme';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Index() {
  return (
    <AppContainer backgroundImage={require('@/assets/images/CharltonKings.jpg')}>
      <View style={styles.screen}>

        {/* Branded Card */}
        <View style={styles.card}>

          {/* Tree Icon */}
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="tree" size={44} color={Theme.Colours.primary} />
          </View>

          {/* Title */}
          <AppText variant="title" style={styles.title}>
          TreeGuardians
          </AppText>

          {/* Tagline */}
          <AppText variant="tagline" style={styles.tagline}>
            Discover and share trees in your community
          </AppText>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Primary CTA */}
          <AppButton
            title="Create Account"
            variant="primary"
            style={styles.button}
            onPress={() => router.push('/registration')}
          />

          {/* Secondary CTA */}
          <AppButton
            title="Login"
            variant="secondary"
            style={styles.button}
            onPress={() => router.push('/login')}
          />

          {/* Tertiary — ghost */}
          <AppButton
            title="Continue as Guest"
            variant="ghost"
            style={styles.button}
            onPress={() => router.push('/mainPage')}
          />

          {/* Dev-only utilities */}
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
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: Theme.Radius.card,
    paddingVertical: Theme.Spacing.extraLarge,
    paddingHorizontal: Theme.Spacing.large,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 14,
  },

  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.Colours.accent + '55',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.Spacing.medium,
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
    backgroundColor: Theme.Colours.accent + '88',
    marginBottom: Theme.Spacing.large,
  },

  button: {
    width: '100%',
  },

  devDivider: {
    width: '100%',
    height: 1,
    backgroundColor: Theme.Colours.gray + '44',
    marginTop: Theme.Spacing.small,
    marginBottom: Theme.Spacing.medium,
  },
});
