import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';

import MapComponent from '@/components/base/MapComponent';
import PlotDashboard from '@/components/base/AddTreeDashboard';
import TreeDetailsDashboard from '@/components/base/TreeDashboard';
import { AppButton } from '@/components/base/AppButton';
import { AppContainer } from '@/components/base/AppContainer';
import { NavigationButton } from '@/components/base/NavigationButton';
import { AppText } from '@/components/base/AppText';
import { Theme } from '@/styles';
import { Tree, TreeDetails } from '@/objects/TreeDetails';
import { API_BASE, ENDPOINTS } from '@/config/api';

type PageMode =
  | 'explore'
  | 'add'
  | 'manual-placement'
  | 'view-tree'
  | 'search'
  | 'dashboard';

type UserRole = 'user' | 'guardian' | 'admin';

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

export default function MainPage() {
  const [mode, setMode] = useState<PageMode>('explore');

  const [currentTree, setCurrentTree] = useState<TreeDetails | null>(null);
  const [plottedTrees, setPlottedTrees] = useState<Tree[]>([]);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [distanceFilterKm, setDistanceFilterKm] = useState(2.5);
  const [healthFilter, setHealthFilter] = useState<'all' | 'healthy' | 'attention'>('all');
  const [pendingDevicePlacement, setPendingDevicePlacement] = useState(false);

  const [isLoadingTrees, setIsLoadingTrees] = useState(false);

  // Auth is still stubbed in this project. Wire this to real user session role when available.
  const [userRole] = useState<UserRole>('user');

  const mapInteractive = mode === 'explore' || mode === 'manual-placement' || mode === 'view-tree';
  const showDimOverlay = mode !== 'explore' && mode !== 'manual-placement';

  const closeAllOverlays = () => {
    setSelectedTree(null);
    setCurrentTree(null);
    setPendingDevicePlacement(false);
    setMode('explore');
  };

  const openMode = (nextMode: Exclude<PageMode, 'manual-placement'>) => {
    setSelectedTree(null);
    setCurrentTree(null);
    setMode(nextMode);
  };

  const uploadPhotos = useCallback(async (treeId: string, photos: string[]) => {
    if (!photos || photos.length === 0) {
      return;
    }

    const formData = new FormData();
    formData.append('tree_id', treeId);

    for (let i = 0; i < photos.length; i += 1) {
      let uri = photos[i];

      if (uri.startsWith('blob:')) {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          const file = new File([blob], `photo_${i}.jpg`, { type: blob.type });
          formData.append('photos', file);
        } catch (error) {
          console.error('Failed to convert blob URL to file:', error);
        }
        continue;
      }

      if (!uri.startsWith('file://')) {
        uri = `file://${uri}`;
      }

      formData.append('photos', {
        uri,
        name: `photo_${i}.jpg`,
        type: 'image/jpeg',
      } as any);
    }

    try {
      const response = await fetch(API_BASE + ENDPOINTS.UPLOAD_PHOTOS, {
        method: 'POST',
        body: formData,
      });

      const text = await response.text();

      try {
        const data = JSON.parse(text);
        if (!response.ok || data.error) {
          throw new Error(data.error || 'Upload failed');
        }
      } catch {
        if (!response.ok) {
          throw new Error('Photo upload failed');
        }
      }
    } catch (error) {
      console.error('Photo upload error:', error);
    }
  }, []);

  const fetchTreesFromServer = useCallback(async () => {
    try {
      setIsLoadingTrees(true);

      const response = await fetch(API_BASE + ENDPOINTS.GET_TREES);
      const data = await response.json();

      if (!response.ok) {
        console.error('Server error:', data);
        throw new Error('Failed to fetch trees');
      }

      if (!Array.isArray(data)) {
        console.error('Unexpected tree payload:', data);
        return;
      }

      const mappedTrees = data.map((treeItem: any) => ({
        notes: treeItem.notes || '',
        wildlife: treeItem.wildlife || undefined,
        disease: treeItem.disease || undefined,
        diameter: treeItem.diameter || undefined,
        height: treeItem.height || undefined,
        circumference: treeItem.circumference || undefined,
        photos: treeItem.photos || [],
        latitude: treeItem.latitude,
        longitude: treeItem.longitude,
        id: treeItem.id,
      }));

      setPlottedTrees(mappedTrees);
    } catch (error) {
      console.error('Tree fetch error:', error);
    } finally {
      setIsLoadingTrees(false);
    }
  }, []);

  const uploadTreeToServer = useCallback(async (tree: TreeDetails) => {
    try {
      const response = await fetch(API_BASE + ENDPOINTS.ADD_TREE_DATA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tree),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save tree');
      }

      const treeId = data.tree_id;

      if (tree.photos?.length) {
        await uploadPhotos(treeId, tree.photos);
      }

      await fetchTreesFromServer();
    } catch (error) {
      console.error('Tree upload failed:', error);
      Alert.alert('Save Failed', 'Tree could not be saved. Please try again.');
    }
  }, [uploadPhotos, fetchTreesFromServer]);

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
        } as Tree;

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

        const hasDisease = !!tree.disease && tree.disease.trim().length > 0;
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
    () => plottedTrees.filter((tree) => !!tree.disease && tree.disease.trim().length > 0).length,
    [plottedTrees]
  );

  return (
    <ActionSheetProvider>
      <AppContainer noPadding>
        <View style={styles.page}>
          <MapComponent
            style={StyleSheet.absoluteFillObject}
            isPlotting={mode === 'manual-placement'}
            plottedTrees={plottedTrees}
            onTreeClick={(tree) => {
              if (!mapInteractive) {
                return;
              }

              setSelectedTree(tree);
              setMode('view-tree');
            }}
            onPress={(coordinate) => {
              if (mode !== 'manual-placement' || !currentTree) {
                return;
              }

              const completeTree: Tree = {
                ...currentTree,
                latitude: coordinate.latitude,
                longitude: coordinate.longitude,
              } as Tree;

              uploadTreeToServer(completeTree);

              setCurrentTree(null);
              setMode('explore');
            }}
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
            <View style={styles.manualBanner}>
              <AppText style={styles.manualBannerTitle}>Select Location On Map</AppText>
              <AppText style={styles.manualBannerBody}>
                Tap a location to place the new tree marker.
              </AppText>
              <AppButton
                title="Cancel Placement"
                variant="secondary"
                onPress={closeAllOverlays}
                style={styles.manualCancelButton}
              />
            </View>
          ) : null}

          {mode === 'add' ? (
            <PlotDashboard
              onConfirm={(details) => {
                setCurrentTree(details);
              }}
              onCancel={closeAllOverlays}
              onSelectManual={() => {
                setMode('manual-placement');
              }}
              onSelectDevice={() => {
                setMode('explore');
                setPendingDevicePlacement(true);
              }}
            />
          ) : null}

          {mode === 'view-tree' && selectedTree ? (
            <TreeDetailsDashboard
              tree={selectedTree}
              onClose={() => {
                setSelectedTree(null);
                setMode('explore');
              }}
            />
          ) : null}

          {mode === 'search' ? (
            <View style={styles.searchPanelWrap}>
              <View style={styles.searchPanel}>
                <View style={styles.panelHeaderRow}>
                  <AppText style={styles.panelTitle}>Search Trees</AppText>
                  <AppButton
                    title="Close"
                    variant="tertiary"
                    onPress={closeAllOverlays}
                    style={styles.panelCloseWrap}
                    buttonStyle={styles.panelCloseButton}
                  />
                </View>

                <TextInput
                  placeholder="Search notes, wildlife, disease, or tree id"
                  placeholderTextColor={Theme.Colours.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchInput}
                />

                <View style={styles.filterSection}>
                  <AppText style={styles.filterLabel}>Tree Health</AppText>
                  <View style={styles.filterRow}>
                    {(['all', 'healthy', 'attention'] as const).map((value) => (
                      <TouchableOpacity
                        key={value}
                        onPress={() => setHealthFilter(value)}
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
                        onPress={() => setDistanceFilterKm(distance)}
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

                <ScrollView style={styles.searchResultList} showsVerticalScrollIndicator={true}>
                  {searchResults.length === 0 ? (
                    <View style={styles.emptyStateCard}>
                      <AppText style={styles.emptyStateTitle}>No trees match current filters</AppText>
                      <AppText style={styles.emptyStateBody}>Try relaxing health or distance filters.</AppText>
                    </View>
                  ) : (
                    searchResults.map((tree) => {
                      const distance = haversineDistanceKm(
                        { latitude: tree.latitude, longitude: tree.longitude },
                        CHARLTON_CENTER
                      );

                      return (
                        <TouchableOpacity
                          key={`${tree.id ?? 'tree'}-${tree.latitude}-${tree.longitude}`}
                          style={styles.searchResultCard}
                          onPress={() => {
                            setSelectedTree(tree);
                            setMode('view-tree');
                          }}
                        >
                          <AppText style={styles.searchResultTitle}>
                            Tree #{tree.id ?? 'Unknown'}
                          </AppText>
                          <AppText style={styles.searchResultMeta}>
                            {distance.toFixed(2)} km away
                          </AppText>
                          <AppText style={styles.searchResultBody}>
                            {tree.notes || tree.wildlife || tree.disease || 'No additional notes'}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            </View>
          ) : null}

          {mode === 'dashboard' ? (
            <View style={styles.dashboardWrap}>
              <View style={styles.dashboardPanel}>
                <View style={styles.panelHeaderRow}>
                  <AppText style={styles.panelTitle}>Tree Dashboard</AppText>
                  <AppButton
                    title="Close"
                    variant="tertiary"
                    onPress={closeAllOverlays}
                    style={styles.panelCloseWrap}
                    buttonStyle={styles.panelCloseButton}
                  />
                </View>

                <AppText style={styles.dashboardSubtitle}>
                  Select an action to continue.
                </AppText>

                <ScrollView style={styles.dashboardList} contentContainerStyle={styles.dashboardListContent}>
                  <AppButton
                    title="Manage Profile"
                    variant="primary"
                    onPress={() => {
                      closeAllOverlays();
                        router.push('/(protected)/myProfile' as never);
                    }}
                    style={styles.dashboardActionButton}
                  />

                  <AppButton
                    title="Local Activity"
                    variant="secondary"
                    onPress={() => {
                      closeAllOverlays();
                      router.push('/dbTestBench');
                    }}
                    style={styles.dashboardActionButton}
                  />

                  <AppButton
                    title="View Weather Data"
                    variant="secondary"
                    onPress={() => {
                      Alert.alert('Weather Data', 'Weather integration is ready to connect.');
                    }}
                    style={styles.dashboardActionButton}
                  />

                  {(userRole === 'guardian' || userRole === 'admin') ? (
                    <AppButton
                      title="My Trees"
                      variant="secondary"
                      onPress={() => {
                        closeAllOverlays();
                        router.push('/(protected)/myTrees' as never);
                      }}
                      style={styles.dashboardActionButton}
                    />
                  ) : null}

                  {userRole === 'admin' ? (
                    <>
                      <AppButton
                        title="Analytics"
                        variant="secondary"
                        onPress={() => {
                          Alert.alert('Analytics', 'Analytics view is ready to connect.');
                        }}
                        style={styles.dashboardActionButton}
                      />

                      <AppButton
                        title="Manage Users"
                        variant="secondary"
                        onPress={() => {
                          closeAllOverlays();
                          router.push('/(protected)/admin/manageUsers' as never);
                        }}
                        style={styles.dashboardActionButton}
                      />
                    </>
                  ) : null}

                  <View style={styles.dashboardStatsRow}>
                    <View style={styles.statCardCompact}>
                      <AppText style={styles.statValueCompact}>{plottedTrees.length}</AppText>
                      <AppText style={styles.statLabelCompact}>Total Trees</AppText>
                    </View>

                    <View style={styles.statCardCompact}>
                      <AppText style={styles.statValueCompact}>{healthyCount}</AppText>
                      <AppText style={styles.statLabelCompact}>Healthy</AppText>
                    </View>

                    <View style={styles.statCardCompact}>
                      <AppText style={styles.statValueCompact}>{treesNeedingAttention}</AppText>
                      <AppText style={styles.statLabelCompact}>Need Attention</AppText>
                    </View>
                  </View>
                </ScrollView>
              </View>
            </View>
          ) : null}

          {mode !== 'manual-placement' ? (
            <View style={styles.floatingActionBar}>
              <AppButton
                title="Search"
                variant={mode === 'search' ? 'primary' : 'secondary'}
                onPress={() => {
                  if (mode === 'search') {
                    closeAllOverlays();
                    return;
                  }
                  openMode('search');
                }}
                style={styles.actionButtonWrap}
                buttonStyle={styles.actionButton}
              />

              <AppButton
                title="Add Tree +"
                variant="primary"
                onPress={() => openMode('add')}
                style={styles.actionButtonWrapMain}
                buttonStyle={styles.actionButtonMain}
              />

              <AppButton
                title="Dashboard"
                variant={mode === 'dashboard' ? 'primary' : 'secondary'}
                onPress={() => {
                  if (mode === 'dashboard') {
                    closeAllOverlays();
                    return;
                  }
                  openMode('dashboard');
                }}
                style={styles.actionButtonWrap}
                buttonStyle={styles.actionButton}
              />
            </View>
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

  manualBanner: {
    position: 'absolute',
    top: 74,
    left: 16,
    right: 16,
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

  manualBannerTitle: {
    ...Theme.Typography.subtitle,
    fontSize: 18,
    lineHeight: 24,
    color: Theme.Colours.textPrimary,
  },

  manualBannerBody: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginTop: 2,
  },

  manualCancelButton: {
    marginTop: 8,
    marginBottom: 0,
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