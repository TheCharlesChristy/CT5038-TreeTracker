import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { AppContainer } from '@/components/base/AppContainer';
import { AppText } from '@/components/base/AppText';
import { AppButton } from '@/components/base/AppButton';
import { NavigationButton } from '@/components/base/NavigationButton';
import { Theme } from '@/styles/theme';
import { canAccessManageUsers, useSessionUser } from '@/lib/session';
import { fetchAnalytics, AnalyticsResponse } from '@/lib/adminApi';
import { FaviconHead } from '@/components/base/FaviconHead';

export default function AnalyticsPage() {
  const { user, isLoading } = useSessionUser();
  const authorized = canAccessManageUsers(user?.role);

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authorized) {
      return;
    }

    const loadAnalytics = async () => {
      try {
        setIsFetching(true);
        setError(null);

        const data = await fetchAnalytics();
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
        setError('Unable to load analytics.');
      } finally {
        setIsFetching(false);
      }
    };

    loadAnalytics();
  }, [authorized]);

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
          <NavigationButton onPress={() => router.push('/mainPage')}>
            Back to Map
          </NavigationButton>
        </View>

        <AppText variant="title" style={styles.title}>
          Access Restricted
        </AppText>

        <AppText style={styles.subtitle}>
          Your account role ({user?.role ?? 'guest'}) does not have permission to view analytics.
        </AppText>

        <AppButton
          title="Return to Map"
          variant="secondary"
          onPress={() => router.push('/mainPage')}
        />
      </AppContainer>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Analytics | TreeGuardians' }} />
      <FaviconHead title="Analytics | TreeGuardians" />
      <AppContainer>
        <ScrollView showsVerticalScrollIndicator>
        <View style={styles.topBar}>
          <NavigationButton onPress={() => router.push('/mainPage')}>
            Back to Map
          </NavigationButton>
        </View>

        <AppText variant="title" style={styles.title}>
          Analytics
        </AppText>

        <AppText style={styles.subtitle}>
          Overview of the TreeGuardians impact.
        </AppText>

        {isFetching ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Theme.Colours.primary} />
            <AppText style={styles.subtitle}>Loading analytics...</AppText>
          </View>
        ) : error ? (
          <View style={styles.card}>
            <AppText style={styles.metricLabel}>Error</AppText>
            <AppText style={styles.metricValue}>{error}</AppText>
          </View>
        ) : analytics ? (
          <>
            <View style={styles.card}>
              <AppText style={styles.metricLabel}>Total trees</AppText>
              <AppText style={styles.metricValue}>{analytics.totalTrees}</AppText>
            </View>

            <View style={styles.card}>
              <AppText style={styles.metricLabel}>Total users</AppText>
              <AppText style={styles.metricValue}>{analytics.totalUsers}</AppText>
            </View>

            <View style={styles.card}>
              <AppText style={styles.metricLabel}>Avoided runoff total</AppText>
              <AppText style={styles.metricValue}>
                {analytics.impactTotals.avoidedRunoff.toFixed(2)}
              </AppText>
            </View>

            <View style={styles.card}>
              <AppText style={styles.metricLabel}>Carbon dioxide stored total</AppText>
              <AppText style={styles.metricValue}>
                {analytics.impactTotals.carbonDioxideStored.toFixed(2)}
              </AppText>
            </View>

            <View style={styles.card}>
              <AppText style={styles.metricLabel}>Carbon dioxide removed total</AppText>
              <AppText style={styles.metricValue}>
                {analytics.impactTotals.carbonDioxideRemoved.toFixed(2)}
              </AppText>
            </View>

            <View style={styles.card}>
              <AppText style={styles.metricLabel}>Water intercepted total</AppText>
              <AppText style={styles.metricValue}>
                {analytics.impactTotals.waterIntercepted.toFixed(2)}
              </AppText>
            </View>

            <View style={styles.card}>
              <AppText style={styles.metricLabel}>Air quality improvement total</AppText>
              <AppText style={styles.metricValue}>
                {analytics.impactTotals.airQualityImprovement.toFixed(2)}
              </AppText>
            </View>

            <View style={styles.card}>
              <AppText style={styles.metricLabel}>Leaf area total</AppText>
              <AppText style={styles.metricValue}>
                {analytics.impactTotals.leafArea.toFixed(2)}
              </AppText>
            </View>

            <View style={styles.card}>
              <AppText style={styles.metricLabel}>Evapotranspiration total</AppText>
              <AppText style={styles.metricValue}>
                {analytics.impactTotals.evapotranspiration.toFixed(2)}
              </AppText>
            </View>

            <View style={styles.card}>
              <AppText style={styles.metricLabel}>Trunk circumference total</AppText>
              <AppText style={styles.metricValue}>
                {analytics.impactTotals.trunkCircumference.toFixed(2)}
              </AppText>
            </View>

            <View style={styles.card}>
              <AppText style={styles.metricLabel}>Trunk diameter total</AppText>
              <AppText style={styles.metricValue}>
                {analytics.impactTotals.trunkDiameter.toFixed(2)}
              </AppText>
            </View>

            <View style={styles.card}>
              <AppText style={styles.metricLabel}>Tree height total</AppText>
              <AppText style={styles.metricValue}>
                {analytics.impactTotals.treeHeight.toFixed(2)}
              </AppText>
            </View>
          </>
        ) : (
          <View style={styles.card}>
            <AppText style={styles.metricLabel}>No data</AppText>
            <AppText style={styles.metricValue}>No analytics available yet.</AppText>
          </View>
        )}

        <AppButton
          title="Return to Map"
          variant="secondary"
          onPress={() => router.push('/mainPage')}
        />
      </ScrollView>
    </AppContainer>
    </>
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
    marginBottom: Theme.Spacing.medium,
  },
  metricLabel: {
    color: Theme.Colours.textMuted,
    marginBottom: Theme.Spacing.extraSmall,
  },
  metricValue: {
    color: Theme.Colours.textPrimary,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
  },
});
