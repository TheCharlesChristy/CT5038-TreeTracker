import React, { useMemo, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Theme } from '@/styles';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Tree } from '@/objects/TreeDetails';

const { height } = Dimensions.get('window');

type ActiveField =
  | 'notes'
  | 'wildlife'
  | 'disease'
  | 'diameter'
  | 'height'
  | 'circumference';

interface TreeDetailsDashboardProps {
  tree: Tree;
  onClose: () => void;
}

export default function TreeDetailsDashboard({
  tree,
  onClose,
}: TreeDetailsDashboardProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const hasValue = (value: string | number | undefined | null) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim() !== '';
    return true;
  };

  const availableFields = useMemo(
    () => [
      { key: 'notes' as ActiveField, label: 'Notes', value: tree.notes },
      { key: 'wildlife' as ActiveField, label: 'Wildlife', value: tree.wildlife },
      { key: 'disease' as ActiveField, label: 'Disease', value: tree.disease },
      { key: 'diameter' as ActiveField, label: 'Diameter', value: tree.diameter, unit: 'cm' },
      { key: 'height' as ActiveField, label: 'Height', value: tree.height, unit: 'm' },
      { key: 'circumference' as ActiveField, label: 'Circumference', value: tree.circumference, unit: 'cm' },
    ],
    [tree]
  );

  const [activeField, setActiveField] = useState<ActiveField>('notes');

  const activeData =
    availableFields.find((field) => field.key === activeField) ??
    availableFields[0];

  const hasDisplayValue = hasValue(activeData?.value);

  const displayValue =
    activeData && hasDisplayValue
      ? `${activeData.value}${activeData.unit ? ` ${activeData.unit}` : ''}`
      : 'No information provided';

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <ScrollView
          contentContainerStyle={styles.cardContent}
          showsVerticalScrollIndicator={true}
        >
          <AppText style={Theme.Typography.title}>Tree Details</AppText>

          <View style={styles.selectorRow}>
            {availableFields.map((field) => (
              <TouchableOpacity
                key={field.key}
                onPress={() => setActiveField(field.key)}
                style={[
                  styles.selectorButton,
                  activeField === field.key && styles.selectorActive,
                ]}
              >
                <AppText style={styles.selectorText}>{field.label}</AppText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.infoBox}>
            <AppText style={Theme.Typography.subtitle}>
              {activeData?.label ?? 'Details'}
            </AppText>

            <AppText style={Theme.Typography.body}>
              {displayValue}
            </AppText>
          </View>

          <AppText style={[Theme.Typography.title, { marginTop: 15 }]}>
            Photos
          </AppText>

          <View style={styles.photoGrid}>
            {(tree.photos ?? []).length === 0 ? (
              <View style={styles.noPhotosBox}>
                <AppText style={Theme.Typography.body}>
                  No Photos Uploaded
                </AppText>
              </View>
            ) : (
              (tree.photos ?? []).map((photo, index) => (
                <View
                  key={index}
                  style={[
                    styles.photoBox,
                    isMobile ? styles.photoBoxMobile : styles.photoBoxDesktop,
                  ]}
                >
                  <Image source={{ uri: photo }} style={styles.image} />
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
        </ScrollView>
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

  cardContent: {
    paddingBottom: 10,
    paddingRight: 6,
  },

  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: 12,
  },

  selectorButton: {
    width: '31%',
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Theme.Radius.small,
    borderWidth: 1,
    borderColor: Theme.Colours.gray,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectorActive: {
    backgroundColor: Theme.Colours.accent,
    borderColor: Theme.Colours.accent,
  },

  selectorText: {
    textAlign: 'center',
    flexShrink: 1,
    fontWeight: 'bold',
  },

  infoBox: {
    minHeight: 100,
    borderWidth: 3,
    borderColor: Theme.Colours.gray,
    borderRadius: Theme.Radius.small,
    backgroundColor: Theme.Colours.white,
    padding: 12,
    marginBottom: 10,
    justifyContent: 'center',
  },

  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  noPhotosBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: Theme.Colours.gray,
    borderRadius: Theme.Radius.small,
    paddingVertical: 25,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoBox: {
    aspectRatio: 1,
    borderRadius: Theme.Radius.small,
    borderWidth: 2,
    borderColor: Theme.Colours.black,
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'solid',
    overflow: 'hidden',
  },

  photoBoxMobile: {
    width: '48%',
  },

  photoBoxDesktop: {
    width: '23%',
  },

  image: {
    width: '100%',
    height: '100%',
    borderRadius: Theme.Radius.small,
  },

  footer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  button: {
    flex: 1,
  },
});