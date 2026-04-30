import { ScrollView, StyleSheet, View, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '@/components/base/AppButton';
import { AppText } from '@/components/base/AppText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '@/styles';
import type { AppUserRole } from '@/utilities/authHelper';
import React, { useState, useMemo } from 'react';
import { fetchCharltonKingsWeather, WeatherData, DailyForecast } from '@/lib/weatherApi';
import { fetchRecentTreeActivity, LocalActivityItem } from '@/lib/activityApi';

type PopupType = 'weather' | 'activity' | null;

type DashboardPanelProps = {
  userRole: AppUserRole;
  totalTrees: number;
  healthyCount: number;
  treesNeedingAttention: number;
  onClose: () => void;
  onLogout: () => Promise<void> | void;
  isLoggingOut?: boolean;
};

function wmoEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code === 1) return '🌤️';
  if (code === 2) return '⛅';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌦️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code === 85 || code === 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

function rainColour(chance: number): string {
  if (chance >= 70) return '#1565C0';
  if (chance >= 40) return '#1976D2';
  return '#42A5F5';
}

function ForecastCard({ day }: { day: DailyForecast }) {
  return (
    <View style={styles.forecastCard}>
      <AppText style={styles.forecastDay}>{day.dayLabel}</AppText>
      <AppText style={styles.forecastEmoji}>{wmoEmoji(day.weatherCode)}</AppText>
      <AppText style={styles.forecastCondition}>{day.condition}</AppText>
      <View style={styles.forecastTemps}>
        <AppText style={styles.forecastTempHigh}>{day.tempHigh}°</AppText>
        <AppText style={styles.forecastTempLow}>{day.tempLow}°</AppText>
      </View>
      <View style={[styles.forecastRainBadge, { backgroundColor: rainColour(day.rainChance) }]}>
        <AppText style={styles.forecastRainText}>💧 {day.rainChance}%</AppText>
      </View>
    </View>
  );
}

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

  const [activityItems, setActivityItems] = useState<LocalActivityItem[]>([]);
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
              <ScrollView showsVerticalScrollIndicator={false}>

                {activePopup === 'weather' && (
                  <>
                    {weatherLoading ? (
                      <ActivityIndicator style={styles.weatherLoader} size="large" color="#1976D2" />
                    ) : weatherError ? (
                      <AppText style={styles.weatherErrorText}>{weatherError}</AppText>
                    ) : weatherData ? (
                      <>
                        {/* Current conditions hero */}
                        <View style={styles.weatherHero}>
                          <AppText style={styles.weatherEmoji}>{wmoEmoji(weatherData.weatherCode)}</AppText>
                          <AppText style={styles.weatherTempBig}>{weatherData.temperature}°C</AppText>
                          <AppText style={styles.weatherConditionLabel}>{weatherData.condition}</AppText>

                          <View style={styles.weatherDetailRow}>
                            <View style={styles.weatherDetailChip}>
                              <AppText style={styles.weatherDetailLabel}>💧 Humidity</AppText>
                              <AppText style={styles.weatherDetailValue}>{weatherData.humidity}%</AppText>
                            </View>
                            <View style={styles.weatherDetailChip}>
                              <AppText style={styles.weatherDetailLabel}>🌧️ Rain</AppText>
                              <AppText style={styles.weatherDetailValue}>{weatherData.chanceOfRain}%</AppText>
                            </View>
                          </View>
                        </View>

                        {/* Multi-day forecast */}
                        {weatherData.forecast.length > 0 ? (
                          <>
                            <AppText style={styles.forecastHeading}>4-Day Forecast</AppText>
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.forecastRow}
                            >
                              {weatherData.forecast.map((day) => (
                                <ForecastCard key={day.date} day={day} />
                              ))}
                            </ScrollView>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <AppText style={styles.weatherErrorText}>No weather data available.</AppText>
                    )}
                  </>
                )}

                {activePopup === 'activity' && (
                  <>
                    {activityLoading ? (
                      <ActivityIndicator style={styles.activityLoader} />
                    ) : activityError ? (
                      <AppText style={styles.activityErrorText}>{activityError}</AppText>
                    ) : activityItems.length > 0 ? (
                      activityItems.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.activityCard}
                          activeOpacity={item.treeId ? 0.75 : 1}
                          onPress={() => {
                            if (item.treeId) {
                              closePopup();
                              router.push(`/treeDashboard/${item.treeId}` as never);
                            }
                          }}
                        >
                          <View style={styles.activityCardIcon}>
                            <MaterialCommunityIcons
                              name={item.type === 'comment' ? 'message-text-outline' : 'tree-outline'}
                              size={18}
                              color={item.type === 'comment' ? '#2E6B3E' : '#1B5E20'}
                            />
                          </View>
                          <View style={styles.activityCardBody}>
                            <AppText style={styles.activityTitle}>{item.title}</AppText>
                            <AppText style={styles.activityMeta}>{item.subtitle}</AppText>
                          </View>
                          {item.treeId ? (
                            <MaterialCommunityIcons name="chevron-right" size={16} color="#9EB59E" />
                          ) : null}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <AppText style={styles.activityEmptyText}>No recent activity found.</AppText>
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
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  closeText: {
    color: Theme.Colours.primary,
    fontWeight: '600',
  },

  /* Weather */
  weatherLoader: {
    marginVertical: 32,
  },

  weatherErrorText: {
    color: Theme.Colours.error,
    marginVertical: 12,
    textAlign: 'center',
  },

  weatherHero: {
    borderRadius: 16,
    backgroundColor: '#1565C0',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },

  weatherEmoji: {
    fontSize: 48,
    marginBottom: 4,
  },

  weatherTempBig: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 52,
  },

  weatherConditionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#BBDEFB',
    marginTop: 4,
    marginBottom: 14,
  },

  weatherDetailRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },

  weatherDetailChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },

  weatherDetailLabel: {
    fontSize: 12,
    color: '#BBDEFB',
    fontWeight: '600',
  },

  weatherDetailValue: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 2,
  },

  forecastHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.Colours.textPrimary,
    marginBottom: 10,
  },

  forecastRow: {
    gap: 10,
    paddingBottom: 4,
  },

  forecastCard: {
    width: 100,
    borderRadius: 14,
    backgroundColor: '#EEF4FB',
    borderWidth: 1,
    borderColor: '#BBDEFB',
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },

  forecastDay: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1565C0',
    textAlign: 'center',
  },

  forecastEmoji: {
    fontSize: 26,
    marginVertical: 4,
  },

  forecastCondition: {
    fontSize: 11,
    color: '#455A64',
    textAlign: 'center',
    lineHeight: 14,
  },

  forecastTemps: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },

  forecastTempHigh: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C62828',
  },

  forecastTempLow: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565C0',
  },

  forecastRainBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },

  forecastRainText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Activity */
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderColor: '#E8F0E8',
  },

  activityCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EBF5EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  activityCardBody: {
    flex: 1,
  },

  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.Colours.textPrimary,
    marginBottom: 2,
  },

  activityMeta: {
    color: Theme.Colours.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },

  activityLoader: {
    marginVertical: 20,
  },

  activityErrorText: {
    color: Theme.Colours.error,
    marginVertical: 10,
  },

  activityEmptyText: {
    color: Theme.Colours.textMuted,
    marginVertical: 10,
  },

  /* Dashboard layout */
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
