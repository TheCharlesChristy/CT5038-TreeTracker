import { ScrollView, StyleSheet, View, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '@/components/base/AppButton';
import { AppText } from '@/components/base/AppText';
import { Theme } from '@/styles';
import type { AppUserRole } from '@/utilities/authHelper';
import React, { useState, useMemo } from 'react';
import { fetchCharltonKingsWeather } from '@/lib/weatherApi';
import { fetchRecentTreeActivity, LocalTreeActivityItem } from '@/lib/activityApi';

type PopupType = 'weather' | 'activity' | null;

type WeatherData = {
  temperature: number;
  humidity: number;
  chanceOfRain: number;
  time?: string;
};

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
  const [activePopup, setActivePopup] = useState<PopupType>(null);

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [activityItems, setActivityItems] = useState<LocalTreeActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  const popupTitle = useMemo(() => {
    if (activePopup === 'weather') return 'Charlton Kings Weather';
    if (activePopup === 'activity') return 'Local Tree Activity';
    return '';
  }, [activePopup]);

  const openWeatherPopup = async () => {
    try {
      setActivePopup('weather');
      setWeatherLoading(true);
      setWeatherError(null);

      const data = await fetchCharltonKingsWeather();
      setWeatherData(data);
    } catch (error) {
      console.error('Failed to load weather data:', error);
      setWeatherError('Unable to load weather data right now.');
    } finally {
      setWeatherLoading(false);
    }
  };

  const openActivityPopup = async () => {
    try {
      setActivePopup('activity');
      setActivityLoading(true);
      setActivityError(null);

      const items = await fetchRecentTreeActivity();
      setActivityItems(items);
    } catch (error) {
      console.error('Failed to load local activity:', error);
      setActivityError('Unable to load local activity right now.');
    } finally {
      setActivityLoading(false);
    }
  };

  const closePopup = () => {
    setActivePopup(null);
  };

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
          />

          <AppButton
            title="Local Activity"
            variant="secondary"
            onPress={openActivityPopup}
            style={styles.dashboardActionButton}
          />

          <AppButton
            title="View Weather Data"
            variant="secondary"
            onPress={openWeatherPopup}
            style={styles.dashboardActionButton}
          />

          <AppButton
            title="My Trees"
            variant="secondary"
            onPress={() => {
              onClose();
              router.push('/(protected)/myTrees' as never);
            }}
            style={styles.dashboardActionButton}
          />

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

        {activePopup && (
          <Modal
            transparent
            animationType="fade"
            onRequestClose={closePopup}
          >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>

              <View style={styles.modalHeader}>
                <AppText style={styles.panelTitle}>{popupTitle}</AppText>

                <TouchableOpacity onPress={closePopup}>
                  <AppText style={styles.closeText}>Close</AppText>
                </TouchableOpacity>
              </View>
              <ScrollView>
                
                {activePopup === 'weather' && (
                  <>
                    {weatherLoading ? (
                      <ActivityIndicator />
                    ) : weatherError ? (
                      <AppText>{weatherError}</AppText>
                    ) : weatherData ? (
                      <>
                        <AppText>Temperature: {weatherData.temperature}°C</AppText>
                        <AppText>Humidity: {weatherData.humidity}%</AppText>
                        <AppText>Chance of Rain: {weatherData.chanceOfRain}%</AppText>
                      </>
                    ) : (
                      <AppText>No weather data</AppText>
                    )}
                  </>
                )}

                {activePopup === 'activity' && (
                  <>
                    {activityLoading ? (
                      <ActivityIndicator />
                    ) : activityError ? (
                      <AppText>{activityError}</AppText>
                    ) : activityItems.length > 0 ? (
                      activityItems.map((item) => (
                        <View key={item.id} style={styles.activityCard}>
                          <AppText>{item.title}</AppText>
                          <AppText style={styles.activityMeta}>{item.subtitle}</AppText>
                        </View>
                      ))
                    ) : (
                      <AppText>No activity found</AppText>
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
          </Modal>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  modalCard: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  closeText: {
    color: Theme.Colours.primary,
  },

  activityCard: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },

  activityMeta: {
    color: Theme.Colours.textMuted,
    fontSize: 12,
  },

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
