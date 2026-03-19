import { View, StyleSheet, Alert } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import MapComponent from '@/components/base/MapComponent';
import { router, useFocusEffect } from 'expo-router';
import { NavigationButton } from '@/components/base/NavigationButton';
import { AppContainer } from '@/components/base/AppContainer';
import { AppButton } from '@/components/base/AppButton';
import PlotDashboard from '@/components/base/AddTreeDashboard';
import { Theme } from '@/styles';
import { Tree, TreeDetails } from '@/objects/TreeDetails';
import TreeDetailsDashboard from '@/components/base/TreeDashboard';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { API_BASE, ENDPOINTS } from '@/config/api';
import { getItem } from '@/utilities/authStorage';
import { showAlert } from '@/utilities/showAlert';
import RoleDashboard from '@/components/base/Dashboard';
import { logoutUser, validateSession } from "@/utilities/authHelper";

export default function MainPage() {
  type PlotMode = 'manual' | 'device' | null;
  type UserRole = 'registered_user' | 'guardian' | 'admin'

  interface LoggedInUser {
    id: number;
    username: string;
    role: UserRole;
  }

  const [plotMode, setPlotMode] = useState<PlotMode>(null);

  // For manual plotting
  const [isPlotting, setIsPlotting] = useState(false);

  // Dashboard Tree State (Before map Placement)
  const [currentTree, setCurrentTree] = useState<TreeDetails | null>(null);

  // Map Tree State (after sucessful tree placement)
  const [plottedTrees, setPlottedTrees] = useState<Tree[]>([]);

  // Dashboard and insertion of plotted trees
  const [showAddTreeDashboard, setShowAddTreeDashboard] = useState(false);

  // Selected tree
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);

  // User states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<LoggedInUser | null>(null);

  // User Dashboard
  const [showRoleDashboard, setShowRoleDashboard] = useState(false);

  const plotWithDeviceLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      if (!currentTree) return;

      const completeTree: Tree = {
        ...currentTree,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      } as Tree;

      uploadTreeToServer(completeTree);

      // Reset state
      setCurrentTree(null);
      setPlotMode(null);
      setIsPlotting(false);

    } catch (error) {
      console.warn(error);
    }
  };

  // Device trigger for plotting tree with location
  useEffect(() => {
    if (plotMode === 'device' && currentTree) {
      plotWithDeviceLocation();
    }
  }, [plotMode, currentTree]);

  // ===================================================================================================
  // Uploading and fetching trees

  const uploadPhotos = async (treeId: string, photos: string[]) => {
  if (!photos || photos.length === 0) return;

  const formData = new FormData();
  formData.append("tree_id", treeId);

  for (let i = 0; i < photos.length; i++) {
    let uri = photos[i];

    // Handle web blob URLs
    if (uri.startsWith("blob:")) {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], `photo_${i}.jpg`, { type: blob.type });
        formData.append("photos", file);
      } catch (err) {
        console.error("Failed to convert blob URL to file:", err);
        continue; // skip this photo
      }
    } else { // Handle mobile file:// URIs
      if (!uri.startsWith("file://")) uri = "file://" + uri;
      formData.append("photos", {
        uri,
        name: `photo_${i}.jpg`,
        type: "image/jpeg",
      } as any);
    }
  }

  try {
    const response = await fetch(
      API_BASE + ENDPOINTS.UPLOAD_PHOTOS,
      {
        method: "POST",
        body: formData,
        // Do NOT set Content-Type manually for FormData
      }
    );

      // For debugging, parse as text first to catch HTML errors
      const text = await response.text();
      console.log("Upload response:", text);

      // Try JSON parse if response is JSON
      try {
        const data = JSON.parse(text);
        if (!response.ok || data.error) {
          throw new Error(data.error || "Upload failed");
        }
        console.log("Photos uploaded successfully:", data);
      } catch {
        console.warn("Non-JSON response received from server.");
      }
    } catch (error) {
      console.error("Photo upload error:", error);
    }
  };

  // =================================================
  // Authentication

  const checkSession = async () => {
    const auth = await validateSession();

    setIsLoggedIn(auth.isLoggedIn);
    setUser(auth.user);
  };

  useEffect(() => {
    fetchTreesFromServer();
    checkSession();
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkSession();
    }, [])
  );

  const uploadTreeToServer = async (tree: TreeDetails) => {
    try {
      const accessToken = await getItem("accessToken");

      if (!accessToken) {
        Alert.alert("Sign In Required", "You must be signed in to plot a tree.");
        router.push("/login");
        return;
      }

      const response = await fetch(API_BASE + ENDPOINTS.ADD_TREE_DATA, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(tree),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed");
      }

      const treeId = data.tree_id;

      if (tree.photos?.length) {
        await uploadPhotos(String(treeId), tree.photos);
      }

      await fetchTreesFromServer();
      console.log("Tree saved successfully");
    } catch (err) {
      console.error("Tree upload failed:", err);
      Alert.alert("Error", "Tree could not be saved");
    }
  };

  const fetchTreesFromServer = async () => {
    try {
      const response = await fetch(
        API_BASE + ENDPOINTS.GET_TREES
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Server error:", data);
        throw new Error("Failed to fetch trees");
      }

      if (!Array.isArray(data)) {
        console.error("Unexpected response:", data);
        return;
      }

      // Map server response to TreeDisplay type
      const mappedTrees = data.map((t: any) => ({
        notes: t.notes || "", 
        wildlife: t.wildlife || undefined,
        disease: t.disease || undefined,
        diameter: t.diameter || undefined,
        height: t.height || undefined,
        circumference: t.circumference || undefined,
        photos: t.photos || [],
        latitude: t.latitude,
        longitude: t.longitude,
        id: t.id,
      }));

      if (!response.ok) {
        throw new Error("Failed to fetch trees");
      }

      setPlottedTrees(mappedTrees);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  const handleLogout = async () => {
    const success = await logoutUser();

    setIsLoggedIn(false);
    setUser(null);
    setShowRoleDashboard(false);

    if (success) {
      showAlert("Logged Out", "You have been logged out.");
    }

    router.push("/");
  };

  return (
    <ActionSheetProvider>
    <AppContainer noPadding>
      <View style={{ flex: 1 }}>
      <MapComponent
        style={StyleSheet.absoluteFillObject}
        isPlotting={isPlotting}
        plottedTrees={plottedTrees}
        onTreeClick={(tree) => setSelectedTree(tree)}

        onPress={(coordinate) => {
          if (!isPlotting || plotMode !== 'manual' || !currentTree) return;
          
          const completeTree: Tree = {
            ...currentTree,
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            } as Tree;

          uploadTreeToServer(completeTree);

          setCurrentTree(null);
          setIsPlotting(false);
          setPlotMode(null);
        }}

        // This is needed because how the map is implemented, it is parsing html from string into leaflet to work on both mobile and web. See MapCompoenent.tsx
        renderTreeIcon={(tree) => `
          <div style="
            width:30px;
            height:30px;
            border-radius:${Theme.Border.medium}px;
            background:${Theme.Colours.primary};
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:22px;
          ">
            🌳
          </div>
        `}
      />

      {/* Adding background dim when a dashboard is open */}
      {(showAddTreeDashboard || selectedTree !== null || showRoleDashboard) && (
        <View
        style={Theme.dimOverlay}
        pointerEvents="auto"
      /> 
      )}

      {/* Ensure the tree has values before opening, otherwise do not allow */}
      {selectedTree !== null && (
        <TreeDetailsDashboard
        tree={selectedTree}
        onClose={() => setSelectedTree(null)}
        />
      )}
      
      {showAddTreeDashboard && (
      <PlotDashboard
        onConfirm={(details) => {
          setCurrentTree(details);
          setShowAddTreeDashboard(false);
        }}
        
        onCancel={() => {
          setShowAddTreeDashboard(false);
          setIsPlotting(false);
        }}

        onSelectManual={() => {
          setPlotMode('manual');
          setIsPlotting(true);
          setShowAddTreeDashboard(false);
        }}

        onSelectDevice={() => {
          setPlotMode('device');
          setShowAddTreeDashboard(false);
        }}
      />
      )}

      {/* Top Left Back */}
      {!isPlotting && (
        <View style={styles.topLeft}>
          <NavigationButton
            onPress={() => {
              setIsPlotting(false);
              router.push('/');
            }}
          >
            Home
          </NavigationButton>
        </View>
      )}

      {/* Closing Plot Mode Button */}
      {isPlotting && (
        <View style={styles.plotHeader}>
          <AppButton
            title="X"
            variant="invisible"

            onPress={() => {
              setIsPlotting(false);
              setPlotMode(null);
            }}

            style={styles.closeButton}
            textStyle={{ color: Theme.Colours.error,
              fontSize: 60,
              fontWeight: 'bold',
             }}
          />
        </View>
      )}

      {/* Role dashboard */}
        {showRoleDashboard && (
          <RoleDashboard
            role={user?.role}
            onClose={() => setShowRoleDashboard(false)}
            onLogout={handleLogout}
          />
      )}

      {/* Bottom Buttons (hidden in plot mode) */}
      {!isPlotting && (
        <View style={styles.bottomBar}>
        
        {/* Change from plot to sign in if the user is not signed in */}
        {isLoggedIn ? (
          <>
            <AppButton
              title="Search"
              variant="accent"
              onPress={() => router.push('/')}
              style={styles.sideButton}
            />

            <AppButton
              title="Dashboard"
              variant="primary"
              onPress={() => {                
                setShowRoleDashboard(true);
              }}
              style={styles.middleButton}
            />

            <AppButton
              title="Plot"
              variant="accent"
              onPress={() => setShowAddTreeDashboard(true)}
              style={styles.sideButton}
            />
          </>
          ) : (
            <>
              {/* Placeholder button without function */}
              <AppButton
                title=""
                variant="accent"
                onPress={() => {}}
                style={styles.sideButton}
              />

              <AppButton
                title="Sign In"
                variant="primary"
                onPress={() => router.push('/login')}
                style={styles.middleButton}
              />

              {/* Placeholder button without function */}
              <AppButton
                title=""
                variant="accent"
                onPress={() => {}}
                style={styles.sideButton}
              />
            </>
          )}
        </View>
      )}
      </View>
    </AppContainer>
    </ActionSheetProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 20,
    elevation: 20,
  },

  topLeft: {
    position: 'absolute',
    top: 15,
    left: 20,
    marginBottom: 10,
    zIndex: 10,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },

  sideButton: {
    width: 70,
    height: 60,
    borderRadius: Theme.Border.medium,
    justifyContent: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginBottom: 0,
  },

  middleButton: {
    flex: 1,
    marginHorizontal: 15,
    borderRadius: Theme.Border.medium,
    marginBottom: 0,
  },

  plotHeader: {
    position: 'absolute',
    top: 100,
    right: 20,
    zIndex: 20,
  },

  closeButton: {
    width: 50,
    height: 50,
    borderRadius: Theme.Border.medium,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
});