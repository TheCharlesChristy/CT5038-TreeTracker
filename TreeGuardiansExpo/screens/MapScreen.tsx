import React, { useState } from 'react';
import { View } from 'react-native';
import MapComponent from '../components/base/MapComponent';
import PlotDashboard from '../components/base/PlotDashboard';
import { Tree, TreeDetails } from '../objects/TreeDetails';
import TreeDetailsDashboard from '@/components/base/TreeDashboard';

export default function MapScreen() {
    const [trees, setTrees] = useState<Tree[]>([]);
    const [isPlotting, setIsPlotting] = useState(false);
    const [showDashboard, setShowDashboard] = useState(false);
    const [selectedTree, setSelectedTree] = useState<Tree | null>(null);

    const [pendingCoordinate, setPendingCoordinate] = useState<{
        latitude: number,
        longitude: number,
    } | null>(null);

    const handleMapPress = (coordinate: {latitude: number; longitude: number }) => {
        if (!isPlotting) return;

        setPendingCoordinate(coordinate);
        setShowDashboard(true);
    };

    // confirming dashboard
    const handleConfirm = (details: TreeDetails) => {
        if (!pendingCoordinate) return;

        const newTree = {
            id: Date.now().toString(),
            latitude: pendingCoordinate.latitude,
            longitude: pendingCoordinate.longitude,
            ...details, // Spreads treeType, wildlife, disease
        };

        setTrees(prev => [...prev, newTree]);
        setShowDashboard(false);
        setPendingCoordinate(null);
        setIsPlotting(false)
    };

    const handleCancel = () => {
        setShowDashboard(false);
        setPendingCoordinate(null);
    };

    return (
        <View style={{ flex: 1 }}>
            <MapComponent
            style={{ flex: 1 }}
            isPlotting={isPlotting}
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
                />
            )}
        </View>
    );
}