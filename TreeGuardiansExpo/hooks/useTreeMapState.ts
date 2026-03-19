import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { Tree, TreeDetails } from '@/objects/TreeDetails';
import { getSessionUser } from '@/lib/session';
import { addTreeData, fetchTrees } from '@/lib/treeApi';
import { PlotPointer } from '@/components/base/MapComponent.types';

export type PageMode =
  | 'explore'
  | 'add'
  | 'manual-placement'
  | 'view-tree'
  | 'search'
  | 'dashboard';

export type HealthFilter = 'all' | 'healthy' | 'attention';

const CHARLTON_CENTER = {
  latitude: 51.8865,
  longitude: -2.0475,
};

const haversineDistanceKm = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const earthRadiusKm = 6371;
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

export function useTreeMapState() {
  const [mode, setMode] = useState<PageMode>('explore');

  const [currentTree, setCurrentTree] = useState<TreeDetails | null>(null);
  const [plottedTrees, setPlottedTrees] = useState<Tree[]>([]);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [distanceFilterKm, setDistanceFilterKm] = useState(2.5);
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [pendingDevicePlacement, setPendingDevicePlacement] = useState(false);

  const [isLoadingTrees, setIsLoadingTrees] = useState(false);
  const [plotPointer, setPlotPointer] = useState<PlotPointer | null>(null);

  const userRole = getSessionUser().role;

  const mapInteractive = mode === 'explore' || mode === 'manual-placement' || mode === 'view-tree';
  const showDimOverlay = mode !== 'explore' && mode !== 'manual-placement';

  const closeAllOverlays = useCallback(() => {
    setSelectedTree(null);
    setCurrentTree(null);
    setPendingDevicePlacement(false);
    setPlotPointer(null);
    setMode('explore');
  }, []);

  const openMode = useCallback((nextMode: Exclude<PageMode, 'manual-placement'>) => {
    setSelectedTree(null);
    setCurrentTree(null);
    setMode(nextMode);
  }, []);

  const fetchTreesFromServer = useCallback(async () => {
    try {
      setIsLoadingTrees(true);
      const trees = await fetchTrees();
      setPlottedTrees(trees);
    } catch (error) {
      console.error('Tree fetch error:', error);
    } finally {
      setIsLoadingTrees(false);
    }
  }, []);

  const uploadTreeToServer = useCallback(async (tree: TreeDetails) => {
    try {
      await addTreeData(tree);
      await fetchTreesFromServer();
    } catch (error) {
      console.error('Tree upload failed:', error);
      Alert.alert('Save Failed', 'Tree could not be saved. Please try again.');
    }
  }, [fetchTreesFromServer]);

  useEffect(() => {
    fetchTreesFromServer();
  }, [fetchTreesFromServer]);

  useEffect(() => {
    if (!pendingDevicePlacement || !currentTree) {
      return;
    }

    const placeTreeUsingDeviceLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Location permission is required to place a tree.');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});

        const completeTree: Tree = {
          ...currentTree,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        await uploadTreeToServer(completeTree);

        setCurrentTree(null);
        setMode('explore');
      } catch (error) {
        console.warn(error);
        Alert.alert('Location Error', 'Unable to get current location. Please try again.');
      }
    };

    placeTreeUsingDeviceLocation();
    setPendingDevicePlacement(false);
  }, [pendingDevicePlacement, currentTree, uploadTreeToServer]);

  const searchResults = useMemo(() => {
    const textQuery = searchQuery.trim().toLowerCase();

    return plottedTrees
      .filter((tree) => {
        const aggregateText = `${tree.notes || ''} ${tree.wildlife || ''} ${tree.disease || ''}`.toLowerCase();

        const matchesText =
          textQuery.length === 0 ||
          aggregateText.includes(textQuery) ||
          `${tree.id ?? ''}`.includes(textQuery);

        const distance = haversineDistanceKm(
          { latitude: tree.latitude, longitude: tree.longitude },
          CHARLTON_CENTER
        );
        const withinDistance = distance <= distanceFilterKm;

        const hasDisease = Boolean(tree.disease && tree.disease.trim().length > 0);
        const matchesHealth =
          healthFilter === 'all' ||
          (healthFilter === 'healthy' && !hasDisease) ||
          (healthFilter === 'attention' && hasDisease);

        return matchesText && withinDistance && matchesHealth;
      })
      .sort((a, b) => {
        const aDistance = haversineDistanceKm(
          { latitude: a.latitude, longitude: a.longitude },
          CHARLTON_CENTER
        );
        const bDistance = haversineDistanceKm(
          { latitude: b.latitude, longitude: b.longitude },
          CHARLTON_CENTER
        );

        return aDistance - bDistance;
      });
  }, [distanceFilterKm, healthFilter, plottedTrees, searchQuery]);

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
      CHARLTON_CENTER
    );
  }, []);

  const handleMapPointerMove = useCallback((pointer: PlotPointer | null) => {
    if (mode !== 'manual-placement') {
      setPlotPointer(null);
      return;
    }

    setPlotPointer(pointer);
  }, [mode]);

  const handleMapTreeClick = useCallback((tree: Tree) => {
    if (!mapInteractive) {
      return;
    }

    setSelectedTree(tree);
    setMode('view-tree');
  }, [mapInteractive]);

  const handleMapPress = useCallback((coordinate: { latitude: number; longitude: number }) => {
    if (mode !== 'manual-placement' || !currentTree) {
      return;
    }

    const completeTree: Tree = {
      ...currentTree,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    };

    uploadTreeToServer(completeTree);

    setCurrentTree(null);
    setPlotPointer(null);
    setMode('explore');
  }, [mode, currentTree, uploadTreeToServer]);

  const handlePlotConfirm = useCallback((details: TreeDetails) => {
    setCurrentTree(details);
  }, []);

  const handleSelectManualPlacement = useCallback(() => {
    setMode('manual-placement');
  }, []);

  const handleSelectDevicePlacement = useCallback(() => {
    setMode('explore');
    setPendingDevicePlacement(true);
  }, []);

  const handleCloseTreeDetails = useCallback(() => {
    setSelectedTree(null);
    setMode('explore');
  }, []);

  const handleSelectSearchResultTree = useCallback((tree: Tree) => {
    setSelectedTree(tree);
    setMode('view-tree');
  }, []);

  return {
    mode,
    userRole,
    plottedTrees,
    selectedTree,
    searchQuery,
    distanceFilterKm,
    healthFilter,
    isLoadingTrees,
    plotPointer,
    mapInteractive,
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
  };
}
