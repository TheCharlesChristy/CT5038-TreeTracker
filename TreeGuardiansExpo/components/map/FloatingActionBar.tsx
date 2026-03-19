import { StyleSheet, View, TouchableOpacity } from 'react-native';
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
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.fab, searchActive && styles.fabActive]}
        onPress={onSearchPress}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
        <AppText style={styles.fabLabel}>Search</AppText>
      </TouchableOpacity>

      {!isGuest ? (
        <TouchableOpacity
          style={[styles.fab, styles.fabLarge, addActive && styles.fabActive]}
          onPress={onAddTreePress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
          <AppText style={styles.fabLabel}>Add</AppText>
        </TouchableOpacity>
      ) : null}

      {!isGuest ? (
        <TouchableOpacity
          style={[styles.fab, dashboardActive && styles.fabActive]}
          onPress={onDashboardPress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="view-dashboard-outline" size={20} color="#fff" />
          <AppText style={styles.fabLabel}>Dashboard</AppText>
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
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  fab: {
    minWidth: 90,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(18, 72, 32, 0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
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
  fabLarge: {
    minWidth: 100,
    height: 62,
    borderRadius: 31,
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