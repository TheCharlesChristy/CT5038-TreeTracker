import { Platform, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/base/AppTouchableOpacity';
import { AppText } from '@/components/base/AppText';
import { Layout, Theme } from '@/styles';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

type FloatingActionBarProps = {
  searchActive: boolean;
  addActive: boolean;
  dashboardActive: boolean;
  isGuest: boolean;
  bottomOffset?: number;
  onSearchPress: () => void;
  onAddTreePress: () => void;
  onDashboardPress: () => void;
};

export function FloatingActionBar({
  searchActive,
  addActive,
  dashboardActive,
  isGuest,
  bottomOffset = 24,
  onSearchPress,
  onAddTreePress,
  onDashboardPress,
}: FloatingActionBarProps) {
  const layout = useResponsiveLayout();
  const compact = layout.width < 500;
  const androidFabStyle = Platform.OS === 'android'
    ? [styles.fabAndroid, Layout.androidFlatSurface]
    : null;

  return (
    <View style={[styles.container, { bottom: bottomOffset, left: layout.edgeInset, right: layout.edgeInset }]}>
      <TouchableOpacity
        style={[
          styles.fab,
          compact && styles.fabCompact,
          searchActive && styles.fabActive,
          androidFabStyle,
          searchActive && Platform.OS === 'android' && styles.fabAndroidActive,
        ]}
        onPress={onSearchPress}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
        {!compact ? <AppText style={styles.fabLabel}>Search</AppText> : null}
      </TouchableOpacity>

      {!isGuest ? (
        <TouchableOpacity
          style={[
            styles.fab,
            compact && styles.fabCompact,
            addActive && styles.fabActive,
            androidFabStyle,
            addActive && Platform.OS === 'android' && styles.fabAndroidActive,
          ]}
          onPress={onAddTreePress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
          {!compact ? <AppText style={styles.fabLabel}>Add</AppText> : null}
        </TouchableOpacity>
      ) : null}

      {!isGuest ? (
        <TouchableOpacity
          style={[
            styles.fab,
            compact && styles.fabCompact,
            dashboardActive && styles.fabActive,
            androidFabStyle,
            dashboardActive && Platform.OS === 'android' && styles.fabAndroidActive,
          ]}
          onPress={onDashboardPress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="view-dashboard-outline" size={20} color="#fff" />
          {!compact ? <AppText style={styles.fabLabel}>Dashboard</AppText> : null}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 190,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-evenly',
  },
  fab: {
    width: 112,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(18, 72, 32, 0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderTopColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#0D1610',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  fabCompact: {
    width: 56,
    paddingHorizontal: 0,
  },
  fabActive: {
    backgroundColor: 'rgba(12, 44, 20, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.55)',
    borderTopColor: 'rgba(255, 255, 255, 0.7)',
  },
  fabAndroid: {
    backgroundColor: Theme.Colours.primary,
    borderColor: '#DCEADC',
    borderTopColor: '#EEF6EE',
    overflow: 'hidden',
  },
  fabAndroidActive: {
    backgroundColor: '#12391D',
  },
  fabLabel: {
    fontSize: 11,
    color: Theme.Colours.white,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 2,
  },
});
