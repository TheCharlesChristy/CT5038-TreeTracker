import { StyleSheet, View, TouchableOpacity, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from '@/components/base/AppText';
import { Theme } from '@/styles';

type FloatingActionBarProps = {
  searchActive: boolean;
  addActive: boolean;
  dashboardActive: boolean;
  isGuest: boolean;
  onSearchPress: () => void;
  onAddTreePress: () => void;
  onDashboardPress: () => void;
};

export function FloatingActionBar({
  searchActive,
  addActive,
  dashboardActive,
  isGuest,
  onSearchPress,
  onAddTreePress,
  onDashboardPress,
}: FloatingActionBarProps) {
  const { width } = useWindowDimensions();
  const compact = width < 500;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.fab, compact && styles.fabCompact, searchActive && styles.fabActive]}
        onPress={onSearchPress}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
        {!compact ? <AppText style={styles.fabLabel}>Search</AppText> : null}
      </TouchableOpacity>

      {!isGuest ? (
        <TouchableOpacity
          style={[styles.fab, compact && styles.fabCompact, addActive && styles.fabActive]}
          onPress={onAddTreePress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
          {!compact ? <AppText style={styles.fabLabel}>Add</AppText> : null}
        </TouchableOpacity>
      ) : null}

      {!isGuest ? (
        <TouchableOpacity
          style={[styles.fab, compact && styles.fabCompact, dashboardActive && styles.fabActive]}
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
    bottom: 24,
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
  fabLabel: {
    fontSize: 11,
    color: Theme.Colours.white,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 2,
  },
});
