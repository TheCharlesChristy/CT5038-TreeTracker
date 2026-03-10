import React, { useState } from 'react';
import { View, Image, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Theme } from '@/styles';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Tree } from '@/objects/TreeDetails';

const { height } = Dimensions.get('window');

interface TreeDetailsDashboardProps {
  tree: Tree;
  onClose: () => void;
}

export default function TreeDetailsDashboard({ tree, onClose }: TreeDetailsDashboardProps) {
  // Toggles for optional fields
  const [showWildlife, setShowWildlife] = useState(false);
  const [showDisease, setShowDisease] = useState(false);
  const [showDiameter, setShowDiameter] = useState(false);
  const [showHeight, setShowHeight] = useState(false);
  const [showCircumference, setShowCircumference] = useState(false);

  // Map optional fields dynamically
  const optionalFields: {
    key: keyof Tree;
    label: string;
    unit?: string;
    toggle: boolean;
    setToggle: (val: boolean) => void;
  }[] = [
    { key: 'wildlife', label: 'Wildlife', toggle: showWildlife, setToggle: setShowWildlife },
    { key: 'disease', label: 'Disease', toggle: showDisease, setToggle: setShowDisease },
    { key: 'diameter', label: 'Diameter', unit: 'cm', toggle: showDiameter, setToggle: setShowDiameter },
    { key: 'height', label: 'Height', unit: 'm', toggle: showHeight, setToggle: setShowHeight },
    { key: 'circumference', label: 'Circumference', unit: 'cm', toggle: showCircumference, setToggle: setShowCircumference },
  ];

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <AppText style={Theme.Typography.title}>Tree Details</AppText>

        {/* Notes */}
        <AppText style={Theme.Typography.subtitle}>Notes / Seen Observations:</AppText>
        <AppText style={Theme.Typography.body}>{tree.notes || 'No notes provided'}</AppText>

        {/* Optional Fields with Checkboxes */}
        {optionalFields.map(field => (
          tree[field.key] && (
            <View key={field.key}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => field.setToggle(!field.toggle)}
              >
                <View style={[styles.checkbox, field.toggle && styles.checkboxActive]} />
                <AppText>{`Show ${field.label}`}</AppText>
              </TouchableOpacity>
              {field.toggle && (
                <AppText style={Theme.Typography.body}>
                  {tree[field.key]}{field.unit ? ` ${field.unit}` : ''}
                </AppText>
              )}
            </View>
          )
        ))}

        {/* Photos */}
        <AppText style={[Theme.Typography.title, { marginTop: 15 }]}>Photos</AppText>
        <View style={styles.photoGrid}>
          {(tree.photos ?? []).length === 0 ? (
            <AppText>No Photos Uploaded</AppText>
          ) : (
            (tree.photos ?? []).map((photo, index) => (
              <View key={index} style={styles.photoBox}>
                <Image source={{ uri: photo }} style={styles.image} />
              </View>
            ))
          )}
        </View>

        {/* Close Button */}
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
    flexWrap: 'wrap',
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

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderWidth: Theme.Border.extraSmall,
    borderColor: Theme.Colours.gray,
    marginRight: 10,
    borderRadius: Theme.Radius.small,
  },

  checkboxActive: {
    backgroundColor: Theme.Colours.accent,
  },
});