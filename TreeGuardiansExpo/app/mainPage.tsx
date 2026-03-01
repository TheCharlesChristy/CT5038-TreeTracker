import { View, StyleSheet } from 'react-native';
import React, { useState } from 'react';
import MapComponent from '../components/base/MapComponent';
import { router } from 'expo-router';
import { NavigationButton } from '../components/base/NavigationButton';
import { AppContainer } from '../components/base/AppContainer';
import { AppButton } from '@/components/base/AppButton';
import PlotDashboard from '../components/base/PlotDashboard';
import { Theme } from '@/styles';
import { Tree, TreeDetails } from '../objects/TreeDetails';
import TreeDetailsDashboard from '@/components/base/TreeDashboard';

export default function MainPage() {
  // Plot mode toggle
  type PlotMode = 'manual' | 'device' | null;
  const [plotMode, setPlotMode] = useState<PlotMode>(null);

  // For manual plotting
  const [isPlotting, setIsPlotting] = useState(false);

  // Dashboard Tree State (Before map Placement)
  const [currentTree, setCurrentTree] = useState<TreeDetails | null>(null);

  // Map Tree State (after sucessful tree placement)
  const [plottedTrees, setPlottedTrees] = useState<Tree[]>([]);

  // Dashboard and insertion of plotted trees
  const [showDashboard, setShowDashboard] = useState(false);

  // Selected tree
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);

  return (
    <AppContainer noPadding>
      <MapComponent
        style={StyleSheet.absoluteFillObject}
        isPlotting={isPlotting}
        plottedTrees={plottedTrees}
        onTreeClick={(tree) => setSelectedTree(tree)}

        onPress={(coordinate) => {
          if (!isPlotting || plotMode !== 'manual' || !currentTree) return;
          
          const completeTree: Tree = {
            ...currentTree,
            id: Date.now().toString(),
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            } as Tree;

          setPlottedTrees((prev) => [...prev, completeTree])

          setCurrentTree(null);
          setIsPlotting(false);
          setPlotMode(null);
        }}

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
      
      {/* Ensure the tree has values before opening, otherwise do not allow */}
      {selectedTree !== null && (
        <TreeDetailsDashboard
        tree={selectedTree}
        onClose={() => setSelectedTree(null)}
        />
      )}

      {showDashboard && (
      <PlotDashboard
        onConfirm={(details) => {
          setCurrentTree(details);
          setShowDashboard(false);
        }}
        
        onCancel={() => {
          setShowDashboard(false);
          setIsPlotting(false);
        }}

        onSelectManual={() => {
          setPlotMode('manual');
          setIsPlotting(true);
          setShowDashboard(false);
        }}

        onSelectDevice={() => {
          setPlotMode('device');
          // setIsPlotting(true);
          setShowDashboard(false);
        }}
      />
      )}

      {/* Top Left Back */}
      {!isPlotting && (
        <View style={styles.topLeft}>
          <NavigationButton
            onPress={() => {
              setIsPlotting(false);
              setPlottedTrees([]); // Clears temporary markers
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

      {/* Bottom Buttons (hidden in plot mode) */}
      {!isPlotting && (
        <View style={styles.bottomBar}>
          <AppButton
            title="Search"
            variant="accent"
            onPress={() => router.push('/')}
            style={styles.sideButton}
          />

          <AppButton
            title="Dashboard"
            variant="primary"
            onPress={() => router.push('/')}
            style={styles.middleButton}
          />

          <AppButton
            title="Plot"
            variant="accent"
            onPress={() => setShowDashboard(true)}
            style={styles.sideButton}
          />
        </View>
      )}
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  topLeft: {
    position: 'absolute',
    top: 15,
    left: 20,
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