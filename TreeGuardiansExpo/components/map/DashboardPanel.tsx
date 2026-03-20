import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '@/components/base/AppButton';
import { AppText } from '@/components/base/AppText';
import { Theme } from '@/styles';
import type { AppUserRole } from '@/utilities/authHelper';

type DashboardPanelProps = {
  userRole: AppUserRole;
  totalTrees: number;
  healthyCount: number;
  treesNeedingAttention: number;
  onClose: () => void;
  onLogout: () => Promise<void> | void;
  isLoggingOut?: boolean;
};

export function DashboardPanel({
  userRole,
  totalTrees,
  healthyCount,
  treesNeedingAttention,
  onClose,
  onLogout,
  isLoggingOut = false,
}: DashboardPanelProps) {
  return (
    <View style={styles.dashboardWrap}>
      <View style={styles.dashboardPanel}>
        <View style={styles.panelHeaderRow}>
          <AppText style={styles.panelTitle}>Tree Dashboard</AppText>
          <AppButton
            title="Close"
            variant="tertiary"
            onPress={onClose}
            style={styles.panelCloseWrap}
            buttonStyle={styles.panelCloseButton}
          />
        </View>

        <AppText style={styles.dashboardSubtitle}>Select an action to continue.</AppText>

        <ScrollView style={styles.dashboardList} contentContainerStyle={styles.dashboardListContent}>
          <AppButton
            title="Manage Profile"
            variant="primary"
            onPress={() => {
              onClose();
              router.push('/(protected)/myProfile' as never);
            }}
            style={styles.dashboardActionButton}
          />

          <AppButton
            title="Local Activity"
            variant="secondary"
            onPress={() => {
              onClose();
              Alert.alert('Local Activity', 'Local activity feed is ready to connect. This should show a popup, must not redirect to a new page.');
            }}
            style={styles.dashboardActionButton}
          />

          <AppButton
            title="View Weather Data"
            variant="secondary"
            onPress={() => {
              Alert.alert('Weather Data', 'Weather integration is ready to connect. Show a popup with current weather data for the area, including temperature, humidity, and precipitation.');
            }}
            style={styles.dashboardActionButton}
          />

          {(userRole === 'guardian' || userRole === 'admin') ? (
            <AppButton
              title="My Trees"
              variant="secondary"
              onPress={() => {
                onClose();
                router.push('/(protected)/myTrees' as never);
              }}
              style={styles.dashboardActionButton}
            />
          ) : null}

          {userRole === 'admin' ? (
            <>
              <AppButton
                title="Analytics"
                variant="secondary"
                onPress={() => {
                  onClose();
                  router.push('/(protected)/admin/analytics' as never);
                }}
                style={styles.dashboardActionButton}
              />

              <AppButton
                title="Manage Users"
                variant="secondary"
                onPress={() => {
                  onClose();
                  router.push('/(protected)/admin/manageUsers' as never);
                }}
                style={styles.dashboardActionButton}
              />
            </>
          ) : null}

          <AppButton
            title={isLoggingOut ? 'Logout Pending...' : 'Log Out'}
            variant="outline"
            onPress={() => {
              void onLogout();
            }}
            disabled={isLoggingOut}
            style={styles.dashboardActionButton}
            buttonStyle={styles.logoutButton}
            textStyle={styles.logoutButtonText}
          />

          <View style={styles.dashboardStatsRow}>
            <View style={styles.statCardCompact}>
              <AppText style={styles.statValueCompact}>{totalTrees}</AppText>
              <AppText style={styles.statLabelCompact}>Total Trees</AppText>
            </View>

            <View style={styles.statCardCompact}>
              <AppText style={styles.statValueCompact}>{healthyCount}</AppText>
              <AppText style={styles.statLabelCompact}>Healthy</AppText>
            </View>

            <View style={styles.statCardCompact}>
              <AppText style={styles.statValueCompact}>{treesNeedingAttention}</AppText>
              <AppText style={styles.statLabelCompact}>Need Attention</AppText>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dashboardWrap: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    bottom: 104,
    zIndex: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dashboardPanel: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '100%',
    borderRadius: 18,
    backgroundColor: '#F9FCF9',
    borderWidth: 1,
    borderColor: '#D5E1D5',
    padding: 18,
    shadowColor: '#0F1711',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    elevation: 18,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  panelTitle: {
    ...Theme.Typography.subtitle,
    color: Theme.Colours.textPrimary,
  },
  dashboardSubtitle: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginBottom: 12,
  },
  panelCloseWrap: {
    marginBottom: 0,
  },
  panelCloseButton: {
    marginBottom: 0,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  dashboardList: {
    marginTop: 4,
  },
  dashboardListContent: {
    paddingBottom: 10,
  },
  dashboardActionButton: {
    marginBottom: 8,
  },
  logoutButton: {
    backgroundColor: '#FFF2F2',
    borderColor: '#E6B8B8',
  },
  logoutButtonText: {
    color: '#A53333',
  },
  dashboardStatsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  statCardCompact: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: Theme.Colours.white,
    borderWidth: 1,
    borderColor: '#D7E4D7',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statValueCompact: {
    ...Theme.Typography.subtitle,
    color: Theme.Colours.primary,
  },
  statLabelCompact: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
  },
});
