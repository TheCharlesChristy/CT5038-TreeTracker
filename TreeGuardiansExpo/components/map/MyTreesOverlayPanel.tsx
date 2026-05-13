import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/base/AppButton';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/base/AppTouchableOpacity';
import { AppText } from '@/components/base/AppText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '@/styles';
import { Tree } from '@/objects/TreeDetails';
import {
  MY_TREES_HEALTH_COLOUR,
  type MyTreesFilterModel,
  myTreesHealthKey,
  myTreesHealthLabel,
} from '@/hooks/useMyTreesFilterModel';
import { MyTreesFilterToolbar } from '@/components/map/MyTreesFilterToolbar';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export type MyTreesOverlayPanelProps = {
  filter: MyTreesFilterModel;
  onClose: () => void;
  onSelectTree: (tree: Tree) => void;
  topInset?: number;
  bottomInset?: number;
};

export function MyTreesOverlayPanel({
  filter,
  onClose,
  onSelectTree,
  topInset = 12,
  bottomInset = 104,
}: MyTreesOverlayPanelProps) {
  const { myTrees, displayedTrees, treeSummary } = filter;
  const layout = useResponsiveLayout();

  return (
    <View
      style={[
        styles.wrap,
        {
          top: topInset,
          bottom: bottomInset,
          left: layout.mapPanelHorizontalInset,
          right: layout.isPhone ? layout.mapPanelHorizontalInset : undefined,
          width: layout.mapPanelWidth,
          maxWidth: layout.isPhone ? undefined : 420,
          paddingLeft: layout.isPhone ? 0 : layout.edgeInset,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[styles.panel, { borderRadius: layout.cardRadius, padding: layout.panelPadding }]}
        pointerEvents="auto"
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <AppText style={styles.panelTitle}>My Trees</AppText>
            <AppText style={styles.panelSubtitle}>
              {myTrees.length} on your account · tap a row or map pin for details
            </AppText>
          </View>
          <AppButton
            title="Close"
            variant="tertiary"
            onPress={onClose}
            style={styles.panelCloseWrap}
            buttonStyle={styles.panelCloseButton}
          />
        </View>

        <MyTreesFilterToolbar
          treeSummary={treeSummary}
          roleFilter={filter.roleFilter}
          setRoleFilter={filter.setRoleFilter}
          healthFilter={filter.healthFilter}
          setHealthFilter={filter.setHealthFilter}
          speciesFilter={filter.speciesFilter}
          setSpeciesFilter={filter.setSpeciesFilter}
          availableSpecies={filter.availableSpecies}
          sortKey={filter.sortKey}
          setSortKey={filter.setSortKey}
        />

        <ScrollView style={styles.list} showsVerticalScrollIndicator nestedScrollEnabled>
          {displayedTrees.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="tree-outline" size={36} color={Theme.Colours.textMuted} />
              <AppText style={styles.emptyTitle}>
                {myTrees.length === 0 ? 'No trees yet' : 'No trees match the current filters.'}
              </AppText>
              <AppText style={styles.emptyBody}>
                {myTrees.length === 0
                  ? 'Trees you create or are assigned to guard will appear here and on the map.'
                  : 'Try relaxing health, species, or role filters.'}
              </AppText>
            </View>
          ) : (
            displayedTrees.map((tree, index) => {
              const hKey = myTreesHealthKey(tree);
              const hColour = MY_TREES_HEALTH_COLOUR[hKey] ?? '#7A7A7A';

              return (
                <TouchableOpacity
                  key={tree.id ?? `${tree.latitude}-${tree.longitude}-${index}`}
                  style={styles.row}
                  onPress={() => onSelectTree(tree)}
                  activeOpacity={0.85}
                >
                  <View style={styles.rowIcon}>
                    <MaterialCommunityIcons name="pine-tree" size={20} color="#2F6A3E" />
                  </View>
                  <View style={styles.rowBody}>
                    <View style={styles.rowTitleRow}>
                      <AppText style={styles.rowTitle} numberOfLines={1}>
                        {tree.species ? `${tree.species} · ` : ''}Tree #{tree.id ?? '-'}
                      </AppText>
                      <View
                        style={[
                          styles.healthBadge,
                          { backgroundColor: `${hColour}22`, borderColor: `${hColour}55` },
                        ]}
                      >
                        <AppText style={[styles.healthBadgeText, { color: hColour }]}>
                          {myTreesHealthLabel(tree)}
                        </AppText>
                      </View>
                    </View>
                    <AppText style={styles.rowMeta}>
                      {tree.latitude.toFixed(4)}, {tree.longitude.toFixed(4)}
                    </AppText>
                    <AppText style={styles.rowCta}>Tap to open</AppText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={Theme.Colours.textMuted} />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    zIndex: 220,
    width: '90%',
    maxWidth: 420,
    paddingLeft: 12,
  },
  panel: {
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
    maxHeight: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  panelTitle: {
    ...Theme.Typography.subtitle,
    color: Theme.Colours.textPrimary,
  },
  panelSubtitle: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginTop: 4,
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
  list: {
    flexGrow: 1,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E4D8',
    backgroundColor: Theme.Colours.white,
    marginBottom: 8,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F3E5',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  rowTitle: {
    ...Theme.Typography.body,
    fontFamily: 'Poppins_600SemiBold',
    color: Theme.Colours.textPrimary,
    flex: 1,
    minWidth: 0,
  },
  healthBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
  },
  healthBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
  },
  rowMeta: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginTop: 2,
  },
  rowCta: {
    color: Theme.Colours.primary,
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 4,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E4D9',
    backgroundColor: Theme.Colours.white,
  },
  emptyTitle: {
    ...Theme.Typography.body,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 10,
    color: Theme.Colours.textPrimary,
  },
  emptyBody: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
});
