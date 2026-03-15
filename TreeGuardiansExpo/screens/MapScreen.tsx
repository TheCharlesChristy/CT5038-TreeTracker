import React, { useState } from 'react';
import { View } from 'react-native';
import MapComponent from '@/components/base/MapComponent';
import PlotDashboard from '@/components/base/AddTreeDashboard';
import { Tree, TreeDetails } from '@/objects/TreeDetails';
import TreeDetailsDashboard from '@/components/base/TreeDashboard';

export default function MapScreen() {
    // determining how the user will plot the tree, either by map location or physically
    type PlotMode = 'device' | 'manual' | null;

    const [plotMode, setPlotMode] = useState<PlotMode>(null);
    const [selectedCoordinate, setSelectedCoordinate] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);

    // additional states for tree plotting
    const [trees, setTrees] = useState<Tree[]>([]);

    // This is needed for plotting
    const [isPlotting, setIsPlotting] = useState(false);

    // additional states for tree selection
    const [showDashboard, setShowDashboard] = useState(false);
    const [selectedTree, setSelectedTree] = useState<Tree | null>(null);

    const [pendingCoordinate, setPendingCoordinate] = useState<{
        latitude: number,
        longitude: number,
    } | null>(null);

    const handleMapPress = (coordinate: {latitude: number; longitude: number }) => {
        if (plotMode !== 'manual') return;

        setPendingCoordinate(coordinate);
        setShowDashboard(true);
    };

    // confirming dashboard
    const handleConfirm = (details: TreeDetails) => {
        if (!pendingCoordinate) return;

        const newTree = {
            latitude: pendingCoordinate.latitude,
            longitude: pendingCoordinate.longitude,
            ...details, // Spreads treeType, wildlife, disease
        };

        setTrees(prev => [...prev, newTree]);
        setShowDashboard(false);
        setPendingCoordinate(null);
        setIsPlotting(false);
        setPlotMode(null);
    };

    const handleCancel = () => {
        setShowDashboard(false);
        setPendingCoordinate(null);
    };

    return (
        <View style={{ flex: 1 }}>
            <MapComponent
            style={{ flex: 1 }}
            isPlotting={plotMode === 'manual'}
            plottedTrees={trees}
            onPress={handleMapPress}
            onTreeClick={(tree) => setSelectedTree(tree)}
            />

            {selectedTree && (
                <TreeDetailsDashboard
                tree={selectedTree}
                onClose={() => setSelectedTree(null)}
                />
            )}

            {showDashboard && (
                <PlotDashboard 
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                onSelectManual={() => {
                    setPlotMode('manual');
                    setShowDashboard(false);
                }}
                onSelectDevice={() => {
                    setPlotMode('device')
                    setShowDashboard(false);
                }}
                />
            )}
        </View>
    );
}