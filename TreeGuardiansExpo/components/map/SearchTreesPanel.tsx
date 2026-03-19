import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { AppButton } from '@/components/base/AppButton';
import { AppText } from '@/components/base/AppText';
import { Tree } from '@/objects/TreeDetails';
import { Theme } from '@/styles';

type HealthFilter = 'all' | 'healthy' | 'attention';

type SearchTreesPanelProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  healthFilter: HealthFilter;
  onHealthFilterChange: (value: HealthFilter) => void;
  distanceFilterKm: number;
  onDistanceFilterKmChange: (value: number) => void;
  searchResults: Tree[];
  onClose: () => void;
  onSelectTree: (tree: Tree) => void;
  getDistanceKm: (tree: Tree) => number;
};

export function SearchTreesPanel({
  searchQuery,
  onSearchQueryChange,
  healthFilter,
  onHealthFilterChange,
  distanceFilterKm,
  onDistanceFilterKmChange,
  searchResults,
  onClose,
  onSelectTree,
  getDistanceKm,
}: SearchTreesPanelProps) {
  return (
    <View style={styles.searchPanelWrap}>
      <View style={styles.searchPanel}>
        <View style={styles.panelHeaderRow}>
          <AppText style={styles.panelTitle}>Search Trees</AppText>
          <AppButton
            title="Close"
            variant="tertiary"
            onPress={onClose}
            style={styles.panelCloseWrap}
            buttonStyle={styles.panelCloseButton}
          />
        </View>

        <TextInput
          placeholder="Search notes, wildlife, disease, or tree id"
          placeholderTextColor={Theme.Colours.textLight}
          value={searchQuery}
          onChangeText={onSearchQueryChange}
          style={styles.searchInput}
        />

        <View style={styles.filterSection}>
          <AppText style={styles.filterLabel}>Tree Health</AppText>
          <View style={styles.filterRow}>
            {(['all', 'healthy', 'attention'] as const).map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => onHealthFilterChange(value)}
                style={[
                  styles.filterChip,
                  healthFilter === value && styles.filterChipActive,
                ]}
              >
                <AppText
                  style={[
                    styles.filterChipText,
                    healthFilter === value && styles.filterChipTextActive,
                  ]}
                >
                  {value === 'all'
                    ? 'All'
                    : value === 'healthy'
                      ? 'Healthy'
                      : 'Needs Attention'}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <AppText style={styles.filterLabel}>Distance ({distanceFilterKm.toFixed(1)} km)</AppText>
          <View style={styles.filterRow}>
            {[1.0, 2.5, 4.0, 6.0].map((distance) => (
              <TouchableOpacity
                key={distance}
                onPress={() => onDistanceFilterKmChange(distance)}
                style={[
                  styles.filterChip,
                  distanceFilterKm === distance && styles.filterChipActive,
                ]}
              >
                <AppText
                  style={[
                    styles.filterChipText,
                    distanceFilterKm === distance && styles.filterChipTextActive,
                  ]}
                >
                  {distance} km
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView style={styles.searchResultList} showsVerticalScrollIndicator>
          {searchResults.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <AppText style={styles.emptyStateTitle}>No trees match current filters</AppText>
              <AppText style={styles.emptyStateBody}>Try relaxing health or distance filters.</AppText>
            </View>
          ) : (
            searchResults.map((tree) => (
              <TouchableOpacity
                key={`${tree.id ?? 'tree'}-${tree.latitude}-${tree.longitude}`}
                style={styles.searchResultCard}
                onPress={() => onSelectTree(tree)}
              >
                <AppText style={styles.searchResultTitle}>
                  Tree #{tree.id ?? 'Unknown'}
                </AppText>
                <AppText style={styles.searchResultMeta}>
                  {getDistanceKm(tree).toFixed(2)} km away
                </AppText>
                <AppText style={styles.searchResultBody}>
                  {tree.notes || tree.wildlife || tree.disease || 'No additional notes'}
                </AppText>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchPanelWrap: {
    position: 'absolute',
    top: 12,
    left: 0,
    bottom: 104,
    zIndex: 220,
    width: '90%',
    maxWidth: 440,
    padding: 14,
  },
  searchPanel: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#F9FCF9',
    borderWidth: 1,
    borderColor: '#D5E1D5',
    padding: 14,
    shadowColor: '#0F1711',
    shadowOffset: { width: 2, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 14,
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
  panelCloseWrap: {
    marginBottom: 0,
  },
  panelCloseButton: {
    marginBottom: 0,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  searchInput: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C9D8C9',
    backgroundColor: Theme.Colours.white,
    paddingHorizontal: 12,
    ...Theme.Typography.body,
    color: Theme.Colours.textPrimary,
  },
  filterSection: {
    marginTop: 12,
  },
  filterLabel: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFD0C0',
    backgroundColor: '#F2F7F2',
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  filterChipActive: {
    backgroundColor: Theme.Colours.primary,
    borderColor: Theme.Colours.primary,
  },
  filterChipText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
  },
  filterChipTextActive: {
    color: Theme.Colours.white,
  },
  searchResultList: {
    marginTop: 14,
  },
  searchResultCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E4D8',
    backgroundColor: Theme.Colours.white,
    marginBottom: 8,
  },
  searchResultTitle: {
    ...Theme.Typography.body,
    fontFamily: 'Poppins_600SemiBold',
    color: Theme.Colours.textPrimary,
  },
  searchResultMeta: {
    ...Theme.Typography.caption,
    color: Theme.Colours.secondary,
    marginTop: 2,
  },
  searchResultBody: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginTop: 4,
  },
  emptyStateCard: {
    borderWidth: 1,
    borderColor: '#D9E4D9',
    borderRadius: 12,
    backgroundColor: Theme.Colours.white,
    padding: 12,
  },
  emptyStateTitle: {
    ...Theme.Typography.body,
    fontFamily: 'Poppins_600SemiBold',
    color: Theme.Colours.textPrimary,
  },
  emptyStateBody: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginTop: 4,
  },
});
