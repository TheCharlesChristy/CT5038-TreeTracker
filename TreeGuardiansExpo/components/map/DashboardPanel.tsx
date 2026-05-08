import {
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '@/components/base/AppButton';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/base/AppTouchableOpacity';
import { AppText } from '@/components/base/AppText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Layout, Theme } from '@/styles';
import type { AppUserRole } from '@/utilities/authHelper';
import React, { useState, useMemo } from 'react';
import { fetchCharltonKingsWeather, WeatherData, DailyForecast } from '@/lib/weatherApi';
import { fetchRecentTreeActivity, LocalActivityItem } from '@/lib/activityApi';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

type PopupType = 'weather' | 'activity' | null;

type DashboardPanelProps = {
  userRole: AppUserRole;
  totalTrees: number;
  healthyCount: number;
  treesNeedingAttention: number;
  onClose: () => void;
  onLogout: () => Promise<void> | void;
  isLoggingOut?: boolean;
  onOpenMyTrees?: () => void;
  topInset?: number;
  bottomInset?: number;
};

type GridButtonProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

function GridButton({ icon, label, onPress, style }: GridButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.gridButton,
        style,
        Platform.OS === 'android' && styles.gridButtonAndroid,
        Platform.OS === 'android' && Layout.androidFlatSurface,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.gridButtonIconCircle}>
        <MaterialCommunityIcons name={icon} size={26} color="#FFFFFF" />
      </View>
      <AppText style={styles.gridButtonLabel}>{label}</AppText>
    </TouchableOpacity>
  );
}

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
  onOpenMyTrees,
  topInset = 12,
  bottomInset = 104,
}: DashboardPanelProps) {
  const [activePopup, setActivePopup] = useState<PopupType>(null);
  const layout = useResponsiveLayout();
  const gridButtonStyle = layout.isPhone ? styles.gridButtonPhone : styles.gridButtonWide;
  const scrollGutterStyle = { paddingRight: layout.isPhone ? 10 : 12 };

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
    <View style={[styles.dashboardWrap, { top: topInset, bottom: bottomInset, padding: layout.edgeInset }]}>
      <View style={[styles.dashboardPanel, { borderRadius: layout.cardRadius, padding: layout.panelPadding }]}>
        <View style={styles.panelHeaderRow}>
          <AppText style={styles.panelTitle}>Your Dashboard</AppText>
          <AppButton
            title="Close"
            variant="tertiary"
            onPress={onClose}
            style={styles.panelCloseWrap}
            buttonStyle={styles.panelCloseButton}
          />
        </View>

        <ScrollView
          style={styles.dashboardList}
          contentContainerStyle={[styles.dashboardListContent, scrollGutterStyle]}
          scrollIndicatorInsets={{ right: 2 }}
          showsVerticalScrollIndicator
        >
          <View style={styles.buttonGrid}>
            <GridButton
              icon="account-outline"
              label="My Profile"
              style={gridButtonStyle}
              onPress={() => { onClose(); router.push('/(protected)/myProfile' as never); }}
            />
            <GridButton
              icon="timeline-text-outline"
              label="Local Activity"
              style={gridButtonStyle}
              onPress={openActivityPopup}
            />
            <GridButton
              icon="weather-partly-cloudy"
              label="Weather"
              style={gridButtonStyle}
              onPress={openWeatherPopup}
            />
            <GridButton
              icon="tree-outline"
              label="My Trees"
              style={gridButtonStyle}
              onPress={() => {
                onClose();
                if (onOpenMyTrees) {
                  onOpenMyTrees();
                } else {
                  router.push('/(protected)/myTrees' as never);
                }
              }}
            />
            {userRole === 'admin' ? (
              <>
                <GridButton
                  icon="chart-bar"
                  label="Analytics"
                  style={gridButtonStyle}
                  onPress={() => { onClose(); router.push('/(protected)/admin/analytics' as never); }}
                />
                <GridButton
                  icon="account-group-outline"
                  label="Manage Users"
                  style={gridButtonStyle}
                  onPress={() => { onClose(); router.push('/(protected)/admin/manageUsers' as never); }}
                />
              </>
            ) : null}
          </View>

          <TouchableOpacity
            style={[
              styles.logoutRow,
              Platform.OS === 'android' && styles.logoutRowAndroid,
              Platform.OS === 'android' && Layout.androidFlatSurface,
              isLoggingOut && styles.logoutRowDisabled,
            ]}
            onPress={() => { void onLogout(); }}
            disabled={isLoggingOut}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="logout" size={18} color="#A53333" style={{ marginRight: 8 }} />
            <AppText style={styles.logoutRowText}>
              {isLoggingOut ? 'Logout Pending…' : 'Log Out'}
            </AppText>
          </TouchableOpacity>

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
          <View style={[styles.modalOverlay, { padding: layout.edgeInset }]}>
            <View style={[styles.modalCard, { borderRadius: layout.cardRadius, padding: layout.panelPadding }]}>

              <View style={styles.modalHeader}>
                <AppText style={styles.panelTitle}>{popupTitle}</AppText>

                <TouchableOpacity onPress={closePopup}>
                  <AppText style={styles.closeText}>Close</AppText>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator>

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
    gap: 10,
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
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },

  weatherDetailChip: {
    flex: 1,
    minWidth: 112,
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
    minWidth: 0,
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
    left: 0,
    right: 0,
    zIndex: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dashboardPanel: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '100%',
    borderRadius: 26,
    backgroundColor: 'rgba(238, 248, 239, 0.98)',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,0.95)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.70)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.06)',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(0,0,0,0.12)',
    padding: 18,
    shadowColor: '#030e04',
    shadowOffset: { width: 0, height: 28 },
    shadowOpacity: 0.48,
    shadowRadius: 40,
    elevation: 30,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  panelTitle: {
    ...Theme.Typography.subtitle,
    color: Theme.Colours.textPrimary,
    flex: 1,
    minWidth: 0,
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
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },

  gridButton: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 150,
    minWidth: 118,
    minHeight: 98,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(30, 100, 50, 0.82)',
    borderWidth: 1.2,
    borderColor: 'rgba(180, 230, 190, 0.30)',
    borderTopColor: 'rgba(220, 255, 230, 0.65)',
    shadowColor: '#030e05',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },

  gridButtonPhone: {
    flexBasis: 132,
    minWidth: 118,
    minHeight: 88,
    paddingVertical: 10,
  },

  gridButtonWide: {
    flexBasis: 150,
    minHeight: 102,
  },

  gridButtonAndroid: {
    backgroundColor: Theme.Colours.primary,
    borderColor: '#CFE6D0',
    borderTopColor: '#F0F8F0',
  },

  gridButtonIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  gridButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: 0,
    textShadowColor: 'rgba(0, 0, 0, 0.40)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(160, 28, 28, 0.10)',
    borderWidth: 1.2,
    borderColor: 'rgba(200, 100, 100, 0.28)',
    borderTopColor: 'rgba(255, 210, 210, 0.65)',
    marginTop: 0,
    marginBottom: 8,
    shadowColor: '#3c0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutRowAndroid: {
    backgroundColor: '#FCEAEA',
    borderColor: '#E7BCBC',
    borderTopColor: '#F9DCDC',
  },
  logoutRowDisabled: {
    opacity: 0.50,
  },
  logoutRowText: {
    color: '#A53333',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0,
  },
  dashboardStatsRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCardCompact: {
    flex: 1,
    minWidth: 86,
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
    textAlign: 'center',
  },
});
