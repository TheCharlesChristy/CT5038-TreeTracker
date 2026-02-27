import React, { useState } from 'react';
import { View } from 'react-native';
import MapComponent from '../components/base/MapComponent';
import PlotDashboard from '../components/base/PlotDashboard';

export default function MapScreen() {
    const [isPlotting, setIsPlotting] = useState(false);
    const [showDashboard, setShowDashboard] = useState(false);
    const [pendingCoordinate, setPendingCoordinate] = useState<{
        latitude: number,
        longitude: number,
    } | null>(null);

    const [trees, setTrees] = useState<
    {   id: string; 
        latitude: number; 
        longitude: number }[]
    >([]);

    const handleMapPress = (coordinate: {latitude: number; longitude: number }) => {
        if (!isPlotting) return;

        setPendingCoordinate(coordinate);
        setShowDashboard(true);
    };

    // confirming dashboard
    const handleConfirm = () => {
        if (!pendingCoordinate) return;

        const newTree = {
            id: Date.now().toString(),
            latitude: pendingCoordinate.latitude,
            longitude: pendingCoordinate.longitude,
        };

        setTrees(prev => [...prev, newTree]);

        setShowDashboard(false);
        setPendingCoordinate(null);
    };

    const handleCancel = () => {
        setShowDashboard(false);
        setPendingCoordinate(null);
    };

    return (
        <View style={{ flex: 1, position: 'relative' }}>
            <MapComponent
            style={{ flex: 1 }}
            isPlotting={isPlotting}
            plottedTrees={trees}
            onPress={handleMapPress}
            />

            {showDashboard && (
                <PlotDashboard 
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                />
            )}
        </View>
    );
}