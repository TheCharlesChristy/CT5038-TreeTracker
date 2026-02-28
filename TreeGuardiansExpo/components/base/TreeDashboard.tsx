import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Theme } from '@/styles';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Tree } from '../../objects/TreeDetails';

const { height } = Dimensions.get('window');

interface TreeDetailsDashboardProps {
  tree: Tree;
  onClose: () => void;
}

export default function TreeDetailsDashboard({ tree, onClose }: TreeDetailsDashboardProps) {
  // For now, placeholders are blank
const [photos, setPhotos] = useState<(string | null)[]>([ null, null, null, null ])

const removePhoto = (index: number) => {
    const updated = [...photos];
    updated[index] = null;
    setPhotos(updated);
}

  return (
    <View style={styles.overlay}>
      {/* Blur Background */}
      <BlurView intensity={50} style={StyleSheet.absoluteFill} />
      <View style={styles.dim} />

      {/* Centered Card */}
      <View style={styles.card}>
        <AppText style={Theme.Typography.title}>Tree Details</AppText>

        <AppText style={Theme.Typography.subtitle}>Tree Type:</AppText>
        <AppText style={Theme.Value.value}>{tree.treeType}</AppText>

        <AppText style={Theme.Typography.subtitle}>Wildlife:</AppText>
        <AppText style={Theme.Value.value}>{tree.wildlife}</AppText>

        {tree.disease && (
          <>
            <AppText style={Theme.Typography.subtitle}>Disease:</AppText>
            <AppText style={Theme.Value.value}>{tree.disease}</AppText>
          </>
        )}

        <AppText style={Theme.Typography.title}>
          Upload Photos
        </AppText>

        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoBox}>
              {photo && (
                <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => removePhoto(index)}
                >
                  <AppText
                  style={{
                    color: Theme.Colours.error,
                    fontSize: 60,
                    fontWeight: 'bold',
                  }}> X </AppText>

                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <AppButton
            title="Close"
            variant="secondary"
            onPress={onClose}
            style={styles.button}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '90%',
    maxHeight: height * 0.9,
    padding: 20,
    borderRadius: Theme.Radius.medium,
  },
  photoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  photoBox: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: Theme.Colours.gray,
    borderRadius: Theme.Radius.medium,
  },
  footer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    width: 100,
  },
  deleteButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: Theme.Colours.error,
    width: 22,
    height: 22,
    borderRadius: Theme.Radius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    },
});