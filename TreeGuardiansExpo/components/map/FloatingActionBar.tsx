import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/base/AppButton';

type FloatingActionBarProps = {
  searchActive: boolean;
  addActive: boolean;
  dashboardActive: boolean;
  onSearchPress: () => void;
  onAddTreePress: () => void;
  onDashboardPress: () => void;
};

export function FloatingActionBar({
  searchActive,
  addActive,
  dashboardActive,
  onSearchPress,
  onAddTreePress,
  onDashboardPress,
}: FloatingActionBarProps) {
  return (
    <View style={styles.floatingActionBar}>
      <AppButton
        title="Search"
        variant={searchActive ? 'primary' : 'secondary'}
        onPress={onSearchPress}
        style={styles.actionButtonWrap}
        buttonStyle={styles.actionButton}
      />

      <AppButton
        title="Add Tree +"
        variant={addActive ? 'primary' : 'secondary'}
        onPress={onAddTreePress}
        style={styles.actionButtonWrapMain}
        buttonStyle={styles.actionButtonMain}
      />

      <AppButton
        title="Dashboard"
        variant={dashboardActive ? 'primary' : 'secondary'}
        onPress={onDashboardPress}
        style={styles.actionButtonWrap}
        buttonStyle={styles.actionButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  floatingActionBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    zIndex: 190,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D7E5D8',
    backgroundColor: 'rgba(250, 253, 250, 0.97)',
    shadowColor: '#0D1610',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 14,
  },
  actionButtonWrap: {
    flex: 1,
    marginBottom: 0,
  },
  actionButtonWrapMain: {
    flex: 1.25,
    marginHorizontal: 8,
    marginBottom: 0,
  },
  actionButton: {
    marginBottom: 0,
    minHeight: 50,
  },
  actionButtonMain: {
    marginBottom: 0,
    minHeight: 52,
  },
});
