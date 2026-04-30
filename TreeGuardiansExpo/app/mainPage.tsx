import React, { useState, useEffect, useCallback } from 'react';
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
import { AppText } from '@/components/base/AppText';
import { StatusMessageBox, StatusMessage } from '@/components/base/StatusMessageBox';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SearchTreesPanel } from '@/components/map/SearchTreesPanel';
import { DashboardPanel } from '@/components/map/DashboardPanel';
import { FloatingActionBar } from '@/components/map/FloatingActionBar';
import { TreeMarkerIcon } from '@/components/map/TreeMarkerIcon';
import { CircularCountdown } from '@/components/base/CircularCountdown';
import { Tree } from '@/objects/TreeDetails';
import { Theme } from '@/styles';
import { useTreeMapState } from '../hooks/useTreeMapState';
import { AppUserRole, getCurrentUser, logoutUser, normalizeUserRole } from '@/utilities/authHelper';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MainPage() {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [loggedInUserId, setLoggedInUserId] = useState<number | null>(null);
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null);
  const [loggedInUserRole, setLoggedInUserRole] = useState<AppUserRole>('user');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutStatus, setLogoutStatus] = useState<StatusMessage | null>(null);
  const logoutTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getCurrentUser().then((user) => {
      setLoggedInUsername(user?.username ?? null);
      setLoggedInUserId(user?.id != null ? Number(user.id) : null);
      setLoggedInUserRole(normalizeUserRole(user?.role));
    });
  }, []);

  const clearLogoutTimer = useCallback(() => {
    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current);
      logoutTimer.current = null;
    }
  }, []);

  useEffect(() => () => {
    clearLogoutTimer();
  }, [clearLogoutTimer]);

  const {
    mode,
    plottedTrees,
    selectedTree,
    searchQuery,
    distanceFilterKm,
    healthFilter,
    isLoadingTrees,
    plotPointer,
    showDimOverlay,
    searchResults,
    hasSearchFilters,
    healthyCount,
    treesNeedingAttention,
    draftTreeDetails,
    selectedDraftLocation,
    isSelectingManualLocation,
    addValidationError,
    isSubmittingTree,
    statusMessage,
    closeAllOverlays,
    openMode,
    setSearchQuery,
    setDistanceFilterKm,
    setHealthFilter,
    handleMapPointerMove,
    handleMapTreeClick,
    handleMapPress,
    handleSelectManualPlacement,
    handleCancelManualPlacement,
    handleSelectDevicePlacement,
    handleConfirmTreeAdd,
    handleCloseTreeDetails,
    handleSelectSearchResultTree,
    clearSearchFilters,
    clearStatusMessage,
    getDistanceFromCenterKm,
    nextRefreshAt,
    refreshIntervalMs,
  } = useTreeMapState();

  const renderTreeIcon = useCallback((tree: Tree, { zoom }: { zoom: number }) => {
    const selected = selectedTree?.id !== undefined && selectedTree.id === tree.id;
    return <TreeMarkerIcon selected={selected} zoomLevel={zoom} />;
  }, [selectedTree?.id]);

  const visibleTrees = hasSearchFilters ? searchResults : plottedTrees;
  const navOverlayInset = insets.top + (windowWidth < 760 ? 84 : 92);
  const actionBarBottomInset = 24 + insets.bottom;
  const actionBarHeight = 56;
  const panelBottomInset = actionBarBottomInset + actionBarHeight + 14;
  const refreshDurationSeconds = Math.max(1, Math.round(refreshIntervalMs / 1000));
  const activeFilterLabels = [
    searchQuery.trim() ? `Query: ${searchQuery.trim()}` : null,
    distanceFilterKm !== null ? `Distance: ${distanceFilterKm.toFixed(1)} km` : null,
    healthFilter !== 'all'
      ? `Health: ${healthFilter === 'healthy' ? 'Healthy' : 'Needs Attention'}`
      : null,
  ].filter((value): value is string => Boolean(value));

  const executeLogout = useCallback(async () => {
    clearLogoutTimer();
    const didLogout = await logoutUser();

    if (!didLogout) {
      setIsLoggingOut(false);
      setLogoutStatus({
        title: 'Logout Failed',
        message: 'We could not log you out. Please try again.',
        variant: 'error',
        createdAt: Date.now(),
      });
      return;
    }

    setLogoutStatus(null);
    setLoggedInUsername(null);
    setLoggedInUserId(null);
    setIsLoggingOut(false);
    router.replace('/');
  }, [clearLogoutTimer]);

  const cancelLogout = useCallback(() => {
    clearLogoutTimer();
    setLogoutStatus(null);
    setIsLoggingOut(false);
  }, [clearLogoutTimer]);

  const handleLogout = useCallback(() => {
    if (isLoggingOut) {
      return;
    }

    clearLogoutTimer();
    closeAllOverlays();
    setIsLoggingOut(true);
    setLogoutStatus({
      title: 'Logout Pending',
      message: 'You will be logged out in 3 seconds unless you cancel.',
      variant: 'error',
      createdAt: Date.now(),
    });
    logoutTimer.current = setTimeout(() => {
      void executeLogout();
    }, 3000);
  }, [clearLogoutTimer, closeAllOverlays, executeLogout, isLoggingOut]);

  return (
    <>
      <Stack.Screen options={{ title: 'Map | TreeHuggers' }} />
      <ActionSheetProvider>
        <AppContainer noPadding overlayNavBar>
        <View style={styles.page}>
          <MapComponent
            style={StyleSheet.absoluteFillObject}
            isPlotting={mode === 'add' && isSelectingManualLocation}
            plottedTrees={visibleTrees}
            selectedLocation={selectedDraftLocation}
            onPlotPointerMove={handleMapPointerMove}
            onTreeClick={handleMapTreeClick}
            onPress={handleMapPress}
            renderTreeIcon={renderTreeIcon}
          />

          {showDimOverlay ? (
            <TouchableOpacity style={styles.dimOverlay} onPress={closeAllOverlays} activeOpacity={1} />
          ) : null}

          <StatusMessageBox status={statusMessage} onClose={clearStatusMessage} />

          <StatusMessageBox
            status={logoutStatus}
            redirectDuration={logoutStatus?.title === 'Logout Pending' ? 3 : undefined}
            countdownLabel="Logging out…"
            closeLabel="Cancel"
            showCopyButton={false}
            onClose={cancelLogout}
          />

          {hasSearchFilters ? (
            <View style={styles.activeFiltersCard}>
              <View style={styles.activeFiltersHeader}>
                <MaterialCommunityIcons name="filter-variant" size={14} color="#E9F3EA" />
                <AppText style={styles.activeFiltersTitle}>Active Filters</AppText>
              </View>
              {activeFilterLabels.map((label) => (
                <AppText key={label} style={styles.activeFiltersText}>
                  {label}
                </AppText>
              ))}
            </View>
          ) : null}

          {mode === 'add' && isSelectingManualLocation && plotPointer ? (
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

          {mode === 'add' && isSelectingManualLocation ? (
            <TouchableOpacity
              style={styles.exitMapSelectionButton}
              activeOpacity={0.85}
              onPress={handleCancelManualPlacement}
            >
              <MaterialCommunityIcons name="close-circle-outline" size={18} color="#FFF4F4" />
              <AppText style={styles.exitMapSelectionText}>Exit Map Selection</AppText>
            </TouchableOpacity>
          ) : null}

          {mode === 'add' && loggedInUsername !== null && !isSelectingManualLocation ? (
            <PlotDashboard
              onConfirmAdd={handleConfirmTreeAdd}
              onCancel={closeAllOverlays}
              onSelectManual={handleSelectManualPlacement}
              onSelectDevice={handleSelectDevicePlacement}
              initialDetails={draftTreeDetails}
              selectedLocation={selectedDraftLocation}
              isSelectingOnMap={isSelectingManualLocation}
              locationError={addValidationError}
              isSubmitting={isSubmittingTree}
              topInset={navOverlayInset}
              bottomInset={panelBottomInset}
            />
          ) : null}

          {mode === 'view-tree' && selectedTree ? (
            <TreeDetailsDashboard
              tree={selectedTree}
              onClose={handleCloseTreeDetails}
              currentUserId={loggedInUserId}
              isGuardian={loggedInUserRole === 'guardian'}
              isAdmin={loggedInUserRole === 'admin'}
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
              onClearFilters={clearSearchFilters}
              onSelectTree={handleSelectSearchResultTree}
              getDistanceKm={getDistanceFromCenterKm}
              topInset={navOverlayInset}
              bottomInset={panelBottomInset}
            />
          ) : null}

          {mode === 'dashboard' && loggedInUsername !== null ? (
            <DashboardPanel
              userRole={loggedInUserRole}
              totalTrees={plottedTrees.length}
              healthyCount={healthyCount}
              treesNeedingAttention={treesNeedingAttention}
              onClose={closeAllOverlays}
              onLogout={handleLogout}
              isLoggingOut={isLoggingOut}
              topInset={navOverlayInset}
              bottomInset={panelBottomInset}
            />
          ) : null}

          {!isSelectingManualLocation ? (
            <FloatingActionBar
              searchActive={mode === 'search'}
              addActive={mode === 'add'}
              dashboardActive={mode === 'dashboard'}
              isGuest={loggedInUsername === null}
              bottomOffset={actionBarBottomInset}
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

          {nextRefreshAt !== null ? (
            <View
              style={[
                styles.refreshTimer,
                {
                  left: insets.left + 4,
                  bottom: insets.bottom + 4,
                },
              ]}
            >
              <CircularCountdown
                key={`refresh-${nextRefreshAt}`}
                duration={refreshDurationSeconds}
                size={28}
                strokeWidth={2}
                color="rgba(150, 150, 150, 0.55)"
                trackColor="rgba(150, 150, 150, 0.38)"
                showLabel={false}
                trackOnly={false}
              />
            </View>
          ) : null}
        </View>
        </AppContainer>
      </ActionSheetProvider>
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },

  activeFiltersCard: {
    position: 'absolute',
    top: 46,
    alignSelf: 'center',
    zIndex: 180,
    maxWidth: 260,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(17, 43, 24, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(220, 235, 223, 0.24)',
  },

  activeFiltersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },

  activeFiltersTitle: {
    ...Theme.Typography.caption,
    color: '#E9F3EA',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
  },

  activeFiltersText: {
    ...Theme.Typography.caption,
    color: '#F2F6F2',
    fontSize: 11,
    lineHeight: 14,
  },

  exitMapSelectionButton: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
    zIndex: 240,
    minHeight: 56,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: 'rgba(160, 28, 28, 0.68)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 214, 214, 0.42)',
    borderTopColor: 'rgba(255, 240, 240, 0.68)',
    shadowColor: '#220909',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 10,
  },

  exitMapSelectionText: {
    color: '#FFF6F6',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.2,
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
    left: 16,
    bottom: 96,
    zIndex: 230,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  loadingText: {
    ...Theme.Typography.caption,
    color: '#E9EDE9',
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'Poppins_600SemiBold',
  },

  refreshTimer: {
    position: 'absolute',
    zIndex: 230,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
