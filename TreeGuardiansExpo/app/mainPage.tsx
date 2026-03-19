import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';

import MapComponent from '@/components/base/MapComponent';
import PlotDashboard from '@/components/base/AddTreeDashboard';
import TreeDetailsDashboard from '@/components/base/TreeDashboard';
import { AppContainer } from '@/components/base/AppContainer';
import { NavigationButton } from '@/components/base/NavigationButton';
import { AppText } from '@/components/base/AppText';
import { ManualPlacementPanel } from '@/components/map/ManualPlacementPanel';
import { SearchTreesPanel } from '@/components/map/SearchTreesPanel';
import { DashboardPanel } from '@/components/map/DashboardPanel';
import { FloatingActionBar } from '@/components/map/FloatingActionBar';
import { Theme } from '@/styles';
import { useTreeMapState } from '@/hooks/useTreeMapState';

export default function MainPage() {
  const { width: windowWidth } = useWindowDimensions();
  const isWideLayout = windowWidth >= 1024;

  const {
    mode,
    userRole,
    plottedTrees,
    selectedTree,
    searchQuery,
    distanceFilterKm,
    healthFilter,
    isLoadingTrees,
    plotPointer,
    showDimOverlay,
    searchResults,
    healthyCount,
    treesNeedingAttention,
    closeAllOverlays,
    openMode,
    setSearchQuery,
    setDistanceFilterKm,
    setHealthFilter,
    handleMapPointerMove,
    handleMapTreeClick,
    handleMapPress,
    handlePlotConfirm,
    handleSelectManualPlacement,
    handleSelectDevicePlacement,
    handleCloseTreeDetails,
    handleSelectSearchResultTree,
    getDistanceFromCenterKm,
  } = useTreeMapState();

  return (
    <ActionSheetProvider>
      <AppContainer noPadding>
        <View style={styles.page}>
          <MapComponent
            style={StyleSheet.absoluteFillObject}
            isPlotting={mode === 'manual-placement'}
            plottedTrees={plottedTrees}
            onPlotPointerMove={handleMapPointerMove}
            onTreeClick={handleMapTreeClick}
            onPress={handleMapPress}
            renderTreeIcon={(tree) => {
              const selected = selectedTree?.id !== undefined && selectedTree.id === tree.id;

              return `
                <div style="
                  width: 34px;
                  height: 34px;
                  border-radius: 12px;
                  background: ${selected ? '#194C22' : Theme.Colours.primary};
                  border: 2px solid ${selected ? '#F2F8F2' : '#DDE9DD'};
                  box-shadow: 0 8px 16px rgba(12, 20, 14, 0.33);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: ${selected ? '24px' : '21px'};
                  transform: ${selected ? 'scale(1.07)' : 'scale(1)'};
                  transition: transform 160ms ease;
                ">🌳</div>
              `;
            }}
          />

          {showDimOverlay ? (
            <TouchableOpacity style={styles.dimOverlay} onPress={closeAllOverlays} activeOpacity={1} />
          ) : null}

          <View style={styles.topLeft}>
            <NavigationButton
              onPress={() => {
                closeAllOverlays();
                router.push('/');
              }}
            >
              Home
            </NavigationButton>
          </View>

          {mode === 'manual-placement' ? (
            <ManualPlacementPanel
              isWideLayout={isWideLayout}
              coordinateText={
                plotPointer
                  ? `${plotPointer.latitude.toFixed(6)}, ${plotPointer.longitude.toFixed(6)}`
                  : 'Move cursor on map'
              }
              onCancel={closeAllOverlays}
            />
          ) : null}

          {mode === 'manual-placement' && plotPointer ? (
            <View
              pointerEvents="none"
              style={[
                styles.cursorCoordinatePill,
                {
                  left: Math.min(plotPointer.screenX + 14, windowWidth - 200),
                  top: Math.max(plotPointer.screenY - 56, 10),
                },
              ]}
            >
              <AppText style={styles.cursorCoordinateText}>
                {plotPointer.latitude.toFixed(6)}
              </AppText>
              <AppText style={styles.cursorCoordinateText}>
                {plotPointer.longitude.toFixed(6)}
              </AppText>
            </View>
          ) : null}

          {mode === 'add' ? (
            <PlotDashboard
              onConfirm={handlePlotConfirm}
              onCancel={closeAllOverlays}
              onSelectManual={handleSelectManualPlacement}
              onSelectDevice={handleSelectDevicePlacement}
            />
          ) : null}

          {mode === 'view-tree' && selectedTree ? (
            <TreeDetailsDashboard
              tree={selectedTree}
              onClose={handleCloseTreeDetails}
            />
          ) : null}

          {mode === 'search' ? (
            <SearchTreesPanel
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              healthFilter={healthFilter}
              onHealthFilterChange={setHealthFilter}
              distanceFilterKm={distanceFilterKm}
              onDistanceFilterKmChange={setDistanceFilterKm}
              searchResults={searchResults}
              onClose={closeAllOverlays}
              onSelectTree={handleSelectSearchResultTree}
              getDistanceKm={getDistanceFromCenterKm}
            />
          ) : null}

          {mode === 'dashboard' ? (
            <DashboardPanel
              userRole={userRole}
              totalTrees={plottedTrees.length}
              healthyCount={healthyCount}
              treesNeedingAttention={treesNeedingAttention}
              onClose={closeAllOverlays}
            />
          ) : null}

          {mode !== 'manual-placement' ? (
            <FloatingActionBar
              searchActive={mode === 'search'}
              dashboardActive={mode === 'dashboard'}
              onSearchPress={() => {
                if (mode === 'search') {
                  closeAllOverlays();
                  return;
                }
                openMode('search');
              }}
              onAddTreePress={() => openMode('add')}
              onDashboardPress={() => {
                if (mode === 'dashboard') {
                  closeAllOverlays();
                  return;
                }
                openMode('dashboard');
              }}
            />
          ) : null}

          {isLoadingTrees ? (
            <View style={styles.loadingPill}>
              <ActivityIndicator color={Theme.Colours.white} size="small" />
              <AppText style={styles.loadingText}>Syncing trees...</AppText>
            </View>
          ) : null}
        </View>
      </AppContainer>
    </ActionSheetProvider>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },

  topLeft: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 180,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(249, 252, 249, 0.92)',
  },

  dimOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8, 14, 10, 0.38)',
    zIndex: 160,
  },

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

  manualPlacementPanel: {
    position: 'absolute',
    zIndex: 210,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(253, 255, 253, 0.95)',
    borderWidth: 1,
    borderColor: '#D6E5D7',
    shadowColor: '#0D1610',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },

  manualPlacementPanelWide: {
    top: 84,
    right: 16,
    width: 320,
  },

  manualPlacementPanelBottom: {
    left: 16,
    right: 16,
    bottom: 104,
  },

  manualPlacementTitle: {
    ...Theme.Typography.subtitle,
    fontSize: 18,
    lineHeight: 24,
    color: Theme.Colours.textPrimary,
  },

  manualPlacementBody: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginTop: 2,
  },

  manualPlacementCoords: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D5E4D5',
    backgroundColor: Theme.Colours.white,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  manualPlacementCoordsLabel: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
  },

  manualPlacementCoordsText: {
    ...Theme.Typography.body,
    marginTop: 2,
    color: Theme.Colours.textPrimary,
    fontFamily: 'Poppins_600SemiBold',
  },

  manualPlacementCancelButton: {
    marginTop: 8,
    marginBottom: 0,
  },

  cursorCoordinatePill: {
    position: 'absolute',
    zIndex: 260,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 25, 18, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(220, 235, 223, 0.35)',
    minWidth: 164,
  },

  cursorCoordinateText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.white,
    fontFamily: 'Poppins_600SemiBold',
    lineHeight: 16,
  },

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

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  statCard: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: Theme.Colours.white,
    borderWidth: 1,
    borderColor: '#D7E4D7',
    padding: 12,
  },

  statValue: {
    ...Theme.Typography.title,
    fontSize: 28,
    lineHeight: 34,
    color: Theme.Colours.primary,
  },

  statLabel: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
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

  dashboardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E4D8',
    backgroundColor: Theme.Colours.white,
    marginBottom: 8,
  },

  dashboardItemTitle: {
    ...Theme.Typography.body,
    fontFamily: 'Poppins_600SemiBold',
    color: Theme.Colours.textPrimary,
  },

  dashboardItemText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginTop: 2,
  },

  dashboardItemAction: {
    ...Theme.Typography.caption,
    color: Theme.Colours.primary,
    fontFamily: 'Poppins_600SemiBold',
  },

  loadingPill: {
    position: 'absolute',
    top: 76,
    alignSelf: 'center',
    zIndex: 230,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(12, 19, 14, 0.84)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    gap: 8,
  },

  loadingText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.white,
  },
});