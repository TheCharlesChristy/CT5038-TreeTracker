import React from 'react';
import { PanResponder, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/base/AppTouchableOpacity';
import { AppButton } from '@/components/base/AppButton';
import { AppText } from '@/components/base/AppText';
import { Tree } from '@/objects/TreeDetails';
import { Theme } from '@/styles';
import { TreeHealthFilterSelect } from '@/components/base/TreeHealthSelect';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

import type { DistanceFilterKm } from '@/hooks/useTreeMapState';

type HealthFilter = 'all' | 'healthy' | 'attention';

type SearchTreesPanelProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  healthFilter: HealthFilter;
  onHealthFilterChange: (value: HealthFilter) => void;
  distanceFilterKm: DistanceFilterKm;
  onDistanceFilterKmChange: (value: DistanceFilterKm) => void;
  searchResults: Tree[];
  onClose: () => void;
  onClearFilters: () => void;
  onSelectTree: (tree: Tree) => void;
  getDistanceKm: (tree: Tree) => number;
  topInset?: number;
  bottomInset?: number;
};

const DISTANCE_OPTIONS: DistanceFilterKm[] = [null, 1.0, 2.5, 4.0, 6.0];
const MIN_DISTANCE_KM = 0.5;
const MAX_DISTANCE_KM = 6;

export function SearchTreesPanel({
  searchQuery,
  onSearchQueryChange,
  healthFilter,
  onHealthFilterChange,
  distanceFilterKm,
  onDistanceFilterKmChange,
  searchResults,
  onClose,
  onClearFilters,
  onSelectTree,
  getDistanceKm,
  topInset = 12,
  bottomInset = 104,
}: SearchTreesPanelProps) {
  const [sliderWidth, setSliderWidth] = React.useState(0);
  const layout = useResponsiveLayout();

  const updateDistanceFromPosition = React.useCallback((positionX: number) => {
    if (sliderWidth <= 0) {
      return;
    }

    const clampedX = Math.max(0, Math.min(positionX, sliderWidth));
    const ratio = clampedX / sliderWidth;
    const rawDistance = MIN_DISTANCE_KM + ratio * (MAX_DISTANCE_KM - MIN_DISTANCE_KM);
    const roundedDistance = Math.round(rawDistance * 10) / 10;
    onDistanceFilterKmChange(roundedDistance);
  }, [onDistanceFilterKmChange, sliderWidth]);

  const distanceRatio = distanceFilterKm === null
    ? 1
    : (distanceFilterKm - MIN_DISTANCE_KM) / (MAX_DISTANCE_KM - MIN_DISTANCE_KM);

  const panResponder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      updateDistanceFromPosition(event.nativeEvent.locationX);
    },
    onPanResponderMove: (event) => {
      updateDistanceFromPosition(event.nativeEvent.locationX);
    },
  }), [updateDistanceFromPosition]);

  return (
    <View
      style={[
        styles.searchPanelWrap,
        {
          top: topInset,
          bottom: bottomInset,
          left: layout.mapPanelHorizontalInset,
          right: layout.isPhone ? layout.mapPanelHorizontalInset : undefined,
          width: layout.mapPanelWidth,
          maxWidth: layout.mapPanelMaxWidth,
          padding: layout.edgeInset,
        },
      ]}
    >
      <View style={[styles.searchPanel, { borderRadius: layout.cardRadius, padding: layout.panelPadding }]}>
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
          placeholder="Search species, notes, wildlife, disease, or tree id"
          placeholderTextColor={Theme.Colours.textLight}
          value={searchQuery}
          onChangeText={onSearchQueryChange}
          style={styles.searchInput}
        />

        <View style={styles.filterSection}>
          <AppText style={styles.filterLabel}>Tree Health</AppText>
          <TreeHealthFilterSelect value={healthFilter} onChange={onHealthFilterChange} compact />
        </View>

        <View style={styles.filterSection}>
          <AppText style={styles.filterLabel}>
            Distance ({distanceFilterKm === null ? 'Any' : `${distanceFilterKm.toFixed(1)} km`})
          </AppText>
          <View style={styles.distanceTopRow}>
            <TouchableOpacity
              onPress={() => onDistanceFilterKmChange(null)}
              style={[styles.anyChip, distanceFilterKm === null && styles.anyChipActive]}
              activeOpacity={0.85}
            >
              <AppText style={[styles.anyChipText, distanceFilterKm === null && styles.anyChipTextActive]}>
                Any
              </AppText>
            </TouchableOpacity>
            <AppText style={styles.sliderRangeText}>{MIN_DISTANCE_KM.toFixed(1)} - {MAX_DISTANCE_KM.toFixed(1)} km</AppText>
          </View>
          <View
            style={styles.sliderWrap}
            onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
            {...panResponder.panHandlers}
          >
            <View style={styles.sliderTrack} />
            <View style={[styles.sliderFill, { width: `${Math.max(0, Math.min(distanceRatio, 1)) * 100}%` }]} />
            <View
              style={[
                styles.sliderThumb,
                { left: `${Math.max(0, Math.min(distanceRatio, 1)) * 100}%` },
                distanceFilterKm === null && styles.sliderThumbMuted,
              ]}
            />
          </View>
          <View style={styles.sliderStopsRow}>
            {DISTANCE_OPTIONS.slice(1).map((distance) => {
              const selected = distanceFilterKm === distance;
              return (
                <TouchableOpacity
                  key={distance}
                  onPress={() => onDistanceFilterKmChange(distance)}
                  style={styles.sliderStop}
                  activeOpacity={0.85}
                >
                  <AppText style={[styles.sliderLabel, selected && styles.sliderLabelActive]}>
                    {distance} km
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.actionRow}>
          <AppButton
            title="Clear Filters"
            variant="secondary"
            onPress={onClearFilters}
            style={styles.clearActionButton}
            buttonStyle={styles.clearButton}
            textStyle={styles.clearButtonText}
          />
        </View>

        <ScrollView style={styles.searchResultList} showsVerticalScrollIndicator>
          {searchResults.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <AppText style={styles.emptyStateTitle}>No trees match current filters</AppText>
              <AppText style={styles.emptyStateBody}>Try relaxing health or distance filters.</AppText>
            </View>
          ) : (
            <>
              {searchResults.map((tree) => (
                <TouchableOpacity
                  key={`${tree.id ?? 'tree'}-${tree.latitude}-${tree.longitude}`}
                  style={styles.searchResultCard}
                  onPress={() => onSelectTree(tree)}
                >
                  <AppText style={styles.searchResultTitle}>
                    {tree.species ? `${tree.species} · ` : ''}Tree #{tree.id ?? 'Unknown'}
                  </AppText>
                  <AppText style={styles.searchResultMeta}>
                    {getDistanceKm(tree).toFixed(2)} km away
                  </AppText>
                  <AppText style={styles.searchResultBody}>
                    {tree.notes || tree.wildlife || tree.disease || 'No additional notes'}
                  </AppText>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchPanelWrap: {
    position: 'absolute',
    left: 0,
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
    gap: 10,
    marginBottom: 12,
  },
  panelTitle: {
    ...Theme.Typography.subtitle,
    color: Theme.Colours.textPrimary,
    flex: 1,
    minWidth: 0,
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
  distanceTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  anyChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFD0C0',
    backgroundColor: '#F2F7F2',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  anyChipActive: {
    backgroundColor: Theme.Colours.primary,
    borderColor: Theme.Colours.primary,
  },
  anyChipText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
  },
  anyChipTextActive: {
    color: Theme.Colours.white,
  },
  sliderRangeText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    flexShrink: 1,
  },
  sliderWrap: {
    position: 'relative',
    height: 28,
    justifyContent: 'center',
  },
  sliderTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#C8D7C9',
    borderRadius: 999,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    backgroundColor: Theme.Colours.primary,
    borderRadius: 999,
  },
  sliderThumb: {
    position: 'absolute',
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Theme.Colours.white,
    borderWidth: 3,
    borderColor: Theme.Colours.primary,
    shadowColor: '#12301A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 3,
  },
  sliderThumbMuted: {
    borderColor: '#A9B8AC',
  },
  sliderStopsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 6,
  },
  sliderStop: {
    alignItems: 'center',
    flexGrow: 1,
  },
  sliderLabel: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
  },
  sliderLabelActive: {
    color: Theme.Colours.primary,
    fontFamily: 'Poppins_600SemiBold',
  },
  searchResultList: {
    marginTop: 14,
  },
  actionRow: {
    marginTop: 14,
  },
  clearActionButton: {
    marginBottom: 0,
  },
  clearButton: {
    marginBottom: 0,
    borderColor: '#D8C5C5',
    backgroundColor: '#FBF2F2',
  },
  clearButtonText: {
    color: '#9C3A3A',
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
