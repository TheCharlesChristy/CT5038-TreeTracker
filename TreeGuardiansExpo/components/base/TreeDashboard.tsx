import React, { useState } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
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
  return (
    <View style={styles.overlay}>

      {/* Centered Card */}
      <View style={styles.card}>
        <AppText style={Theme.Typography.title}>Tree Details</AppText>

        <AppText style={Theme.Typography.subtitle}>Tree Type:</AppText>
        <AppText style={Theme.Typography.body}>{tree.treeType}</AppText>

        <AppText style={Theme.Typography.subtitle}>Wildlife:</AppText>
        <AppText style={Theme.Typography.body}>{tree.wildlife}</AppText>

        {tree.disease && (
          <>
            <AppText style={Theme.Typography.subtitle}>Disease:</AppText>
            <AppText style={Theme.Typography.body}>{tree.disease}</AppText>
          </>
        )}

  <AppText style={Theme.Typography.title}>
    Photos
  </AppText>

  <View style={styles.photoGrid}>
    {(tree.photos ?? []).length === 0 ? (
      <AppText>No Photos Uploaded</AppText>
    ) : (
        (tree.photos ?? []).map((photo, index) => (
          <View key={index} style={styles.photoBox}>
            <Image
            source={{ uri: photo }}
            style={styles.image}
            />
            </View>
        ))
      )}
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

  image: {
    width: '100%',
    height: '100%',
    borderRadius: Theme.Radius.small,
  },

  photoBox: {
    width: '17%',
    aspectRatio: 1,
    borderRadius: Theme.Border.medium,
    borderWidth: 3,
    borderColor: Theme.Colours.black,
    marginBottom: 10,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'solid',
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