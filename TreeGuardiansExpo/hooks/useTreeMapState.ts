import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Tree, TreeDetails } from '@/objects/TreeDetails';
import { addTreeData, fetchTrees } from '@/lib/treeApi';
import {
  CHARLTON_CENTER,
  MapCoordinate,
  PlotPointer,
  isCoordinateWithinCharltonKingsBoundary,
} from '@/components/base/MapComponent.types';
import { haversineDistanceKm } from '@/utilities/geo';
import type { StatusMessage } from '@/components/base/StatusMessageBox';

export type PageMode = 'explore' | 'add' | 'view-tree' | 'search' | 'dashboard' | 'my-trees';

export type HealthFilter = 'all' | 'healthy' | 'attention';
export type DistanceFilterKm = number | null;
export const TREE_REFRESH_INTERVAL_MS = 10000;

export function useTreeMapState() {
  const [mode, setMode] = useState<PageMode>('explore');
  const modeBeforeTreeViewRef = useRef<PageMode>('explore');

  const [plottedTrees, setPlottedTrees] = useState<Tree[]>([]);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);

  const [draftTreeDetails, setDraftTreeDetails] = useState<TreeDetails | null>(null);
  const [selectedDraftLocation, setSelectedDraftLocation] = useState<MapCoordinate | null>(null);
  const [isSelectingManualLocation, setIsSelectingManualLocation] = useState(false);
  const [addValidationError, setAddValidationError] = useState<string | null>(null);
  const [isSubmittingTree, setIsSubmittingTree] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [searchCenter, setSearchCenter] = useState<MapCoordinate>(CHARLTON_CENTER);

  const [searchQuery, setSearchQuery] = useState('');
  const [distanceFilterKm, setDistanceFilterKm] = useState<DistanceFilterKm>(null);
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');

  const [isLoadingTrees, setIsLoadingTrees] = useState(false);
  const [plotPointer, setPlotPointer] = useState<PlotPointer | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState<number | null>(null);

  const showDimOverlay =
    mode !== 'explore' && mode !== 'add' && mode !== 'my-trees';

  const clearAddDraft = useCallback(() => {
    setDraftTreeDetails(null);
    setSelectedDraftLocation(null);
    setIsSelectingManualLocation(false);
    setAddValidationError(null);
    setPlotPointer(null);
    setIsSubmittingTree(false);
  }, []);

  const closeAllOverlays = useCallback(() => {
    modeBeforeTreeViewRef.current = 'explore';
    setSelectedTree(null);
    clearAddDraft();
    setMode('explore');
  }, [clearAddDraft]);

  const openMode = useCallback((nextMode: PageMode) => {
    setSelectedTree(null);

    if (nextMode !== 'add' || mode !== 'add') {
      clearAddDraft();
    }

    setMode(nextMode);
  }, [clearAddDraft, mode]);

  const filterTrees = useCallback((trees: Tree[], query: string, distanceKm: DistanceFilterKm, health: HealthFilter) => {
    const textQuery = query.trim().toLowerCase();

    return trees
      .filter((tree) => {
        const aggregateText = `${tree.species || ''} ${tree.notes || ''} ${tree.wildlife || ''} ${tree.disease || ''}`.toLowerCase();

        const matchesText =
          textQuery.length === 0 ||
          aggregateText.includes(textQuery) ||
          `${tree.id ?? ''}`.includes(textQuery);

        const distance = haversineDistanceKm(
          { latitude: tree.latitude, longitude: tree.longitude },
          searchCenter
        );
        const withinDistance = distanceKm === null || distance <= distanceKm;

        const hasDisease = Boolean(tree.disease && tree.disease.trim().length > 0);
        const matchesHealth =
          health === 'all' ||
          (health === 'healthy' && !hasDisease) ||
          (health === 'attention' && hasDisease);

        return matchesText && withinDistance && matchesHealth;
      })
      .sort((a, b) => {
        const aDistance = haversineDistanceKm(
          { latitude: a.latitude, longitude: a.longitude },
          searchCenter
        );
        const bDistance = haversineDistanceKm(
          { latitude: b.latitude, longitude: b.longitude },
          searchCenter
        );

        return aDistance - bDistance;
      });
    }, 
    [searchCenter]
  );

  const fetchTreesFromServer = useCallback(async () => {
    try {
      setIsLoadingTrees(true);
      const trees = await fetchTrees();
      setPlottedTrees(trees);
      setStatusMessage((current) => current?.title === 'Tree Sync Problem' ? null : current);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected tree loading error.';
      console.error('Tree fetch error:', error);
      setStatusMessage((current) => {
        if (current?.variant === 'success') {
          return current;
        }
        return {
          title: 'Tree Sync Problem',
          message: `We could not refresh trees from the server. ${message}`,
          variant: 'error',
          createdAt: Date.now(),
        };
      });
    } finally {
      setIsLoadingTrees(false);
    }
  }, []);

  useEffect(() => {
    setNextRefreshAt(Date.now() + TREE_REFRESH_INTERVAL_MS);
    fetchTreesFromServer();
  }, [fetchTreesFromServer]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNextRefreshAt(Date.now() + TREE_REFRESH_INTERVAL_MS);
      void fetchTreesFromServer();
    }, TREE_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchTreesFromServer]);

  const searchResults = useMemo(
    () => filterTrees(plottedTrees, searchQuery, distanceFilterKm, healthFilter),
    [distanceFilterKm, filterTrees, healthFilter, plottedTrees, searchQuery]
  );

  const hasSearchFilters = useMemo(
    () => searchQuery.trim().length > 0 || distanceFilterKm !== null || healthFilter !== 'all',
    [distanceFilterKm, healthFilter, searchQuery]
  );

  const healthyCount = useMemo(
    () => plottedTrees.filter((tree) => !(tree.disease && tree.disease.trim())).length,
    [plottedTrees]
  );

  const treesNeedingAttention = useMemo(
    () => plottedTrees.filter((tree) => Boolean(tree.disease && tree.disease.trim().length > 0)).length,
    [plottedTrees]
  );

  const getDistanceFromCenterKm = useCallback((tree: Tree) => {
    return haversineDistanceKm(
      { latitude: tree.latitude, longitude: tree.longitude },
      searchCenter ?? CHARLTON_CENTER
    );
  }, 
  [searchCenter]
  );

  const clearAddValidationError = useCallback(() => {
    setAddValidationError(null);
  }, []);

  const clearStatusMessage = useCallback(() => {
    setStatusMessage(null);
  }, []);

  const handleMapPointerMove = useCallback((pointer: PlotPointer | null) => {
    if (mode !== 'add' || !isSelectingManualLocation) {
      setPlotPointer(null);
      return;
    }

    setPlotPointer(pointer);
  }, [mode, isSelectingManualLocation]);

  const handleMapTreeClick = useCallback((tree: Tree) => {
    if (mode === 'add') {
      return;
    }

    if (mode !== 'view-tree') {
      modeBeforeTreeViewRef.current = mode;
    }

    setSelectedTree(tree);
    setMode('view-tree');
  }, [mode]);

  const handleMapPress = useCallback((coordinate: MapCoordinate) => {
    if (mode !== 'add' || !isSelectingManualLocation) {
      return;
    }

    if (!isCoordinateWithinCharltonKingsBoundary(coordinate)) {
      setAddValidationError(
        'That point is outside the Charlton Kings boundary. Tap inside the highlighted area on the map.'
      );
      return;
    }

    setSelectedDraftLocation(coordinate);
    setIsSelectingManualLocation(false);
    setAddValidationError(null);
    setPlotPointer(null);
  }, [mode, isSelectingManualLocation]);

  const handleSelectManualPlacement = useCallback((details: TreeDetails) => {
    setDraftTreeDetails(details);
    setIsSelectingManualLocation(true);
    setAddValidationError(null);
    setMode('add');
  }, []);

  const handleCancelManualPlacement = useCallback(() => {
    setIsSelectingManualLocation(false);
    setAddValidationError(null);
    setPlotPointer(null);
  }, []);

  const handleSelectDevicePlacement = useCallback(async (details: TreeDetails) => {
    setDraftTreeDetails(details);
    setIsSelectingManualLocation(false);
    setAddValidationError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setAddValidationError('Location permission is required to fetch your device coordinates.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const deviceCoordinate: MapCoordinate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      if (!isCoordinateWithinCharltonKingsBoundary(deviceCoordinate)) {
        setAddValidationError(
          'Your current location is outside the Charlton Kings boundary. Use “Select On Map” to pick a point inside the highlighted area.'
        );
        return;
      }

      setSelectedDraftLocation(deviceCoordinate);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown location error.';
      setAddValidationError(`Unable to get current location: ${message}`);
    }
  }, []);

  const handleConfirmTreeAdd = useCallback(async (details: TreeDetails) => {
    const mergedDetails: TreeDetails = {
      ...(draftTreeDetails ?? {}),
      ...details,
    };

    setDraftTreeDetails(mergedDetails);
    setAddValidationError(null);

    if (!selectedDraftLocation) {
      setAddValidationError('Select a location first using "Use My Location" or "Select On Map".');
      return;
    }

    if (!isCoordinateWithinCharltonKingsBoundary(selectedDraftLocation)) {
      setAddValidationError(
        'Selected location is outside the Charlton Kings boundary. Choose a point inside the highlighted area.'
      );
      return;
    }

    const completeTree: Tree = {
      ...mergedDetails,
      latitude: selectedDraftLocation.latitude,
      longitude: selectedDraftLocation.longitude,
    };

    try {
      setIsSubmittingTree(true);
      await addTreeData(completeTree);
      await fetchTreesFromServer();

      setStatusMessage({
        variant: 'success',
        title: 'Tree Added Successfully',
        message: `Tree was added at ${selectedDraftLocation.latitude.toFixed(6)}, ${selectedDraftLocation.longitude.toFixed(6)}.`,
        createdAt: Date.now(),
      });

      clearAddDraft();
      setMode('explore');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusMessage({
        variant: 'error',
        title: 'Tree Add Failed',
        message,
        createdAt: Date.now(),
      });
    } finally {
      setIsSubmittingTree(false);
    }
  }, [draftTreeDetails, selectedDraftLocation, fetchTreesFromServer, clearAddDraft]);

  const handleCloseTreeDetails = useCallback(() => {
    setSelectedTree(null);
    setMode(modeBeforeTreeViewRef.current);
  }, []);

  const handleSelectSearchResultTree = useCallback((tree: Tree) => {
    if (mode !== 'view-tree') {
      modeBeforeTreeViewRef.current = mode;
    }

    setSelectedTree(tree);
    setMode('view-tree');
  }, [mode]);

  const clearSearchFilters = useCallback(() => {
    setSearchQuery('');
    setDistanceFilterKm(null);
    setHealthFilter('all');
  }, []);

  return {
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
    setSearchCenter,
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
    clearAddValidationError,
    clearStatusMessage,
    getDistanceFromCenterKm,
    nextRefreshAt,
    refreshIntervalMs: TREE_REFRESH_INTERVAL_MS,
  };
}
