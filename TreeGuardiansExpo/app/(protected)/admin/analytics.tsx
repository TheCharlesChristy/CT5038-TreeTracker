import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { NavigationButton } from '@/components/base/NavigationButton';
import { Theme } from '@/styles/theme';
import { canAccessManageUsers, useSessionUser } from '@/lib/session';

export default function AnalyticsPage() {
  const { user, isLoading } = useSessionUser();
  const authorized = canAccessManageUsers(user?.role);

  if (isLoading) {
    return (
      <AppContainer>
        <View style={styles.centered}>
          <AppText style={styles.subtitle}>Loading analytics access...</AppText>
        </View>
      </AppContainer>
    );
  }

  if (!authorized) {
    return (
      <AppContainer>
        <View style={styles.topBar}>
          <NavigationButton onPress={() => router.push('/mainPage')}>Back to Dashboard</NavigationButton>
        </View>
        <AppText variant="title" style={styles.title}>Access Restricted</AppText>
        <AppText style={styles.subtitle}>
          Your account role ({user?.role ?? 'guest'}) does not have permission to view analytics.
        </AppText>
        <AppButton title="Return Home" variant="secondary" onPress={() => router.push('/')} />
      </AppContainer>
    );
  }

  return (
    <AppContainer>
      <View style={styles.topBar}>
        <NavigationButton onPress={() => router.push('/mainPage')}>Back to Dashboard</NavigationButton>
      </View>

      <AppText variant="title" style={styles.title}>Analytics</AppText>
      <AppText style={styles.subtitle}>
        Admin analytics is now routed correctly. Connect this screen to aggregate API metrics next.
      </AppText>

      <View style={styles.card}>
        <AppText style={styles.metricLabel}>Tree dataset health</AppText>
        <AppText style={styles.metricValue}>Ready for API-backed metrics</AppText>
      </View>

      <AppButton title="Return Home" variant="secondary" onPress={() => router.push('/')} />
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    marginBottom: Theme.Spacing.medium,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Theme.Colours.primary,
    marginBottom: Theme.Spacing.small,
  },
  subtitle: {
    color: Theme.Colours.textMuted,
    marginBottom: Theme.Spacing.large,
  },
  card: {
    borderRadius: Theme.Radius.medium,
    borderWidth: 1,
    borderColor: '#D7E4D7',
    backgroundColor: '#F9FCF9',
    padding: Theme.Spacing.medium,
    marginBottom: Theme.Spacing.large,
  },
  metricLabel: {
    color: Theme.Colours.textMuted,
    marginBottom: Theme.Spacing.extraSmall,
  },
  metricValue: {
    color: Theme.Colours.textPrimary,
    fontFamily: 'Poppins_600SemiBold',
  },
});
