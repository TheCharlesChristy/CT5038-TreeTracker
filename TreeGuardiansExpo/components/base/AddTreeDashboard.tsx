import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Theme } from '@/styles';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { AppText } from './AppText';
import { TreeDetails, TreePhoto } from '@/objects/TreeDetails';
import type { MapCoordinate } from './MapComponent.types';
import { TreeHealth, TreeHealthSelect } from './TreeHealthSelect';
import * as ImagePicker from 'expo-image-picker';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { ErrorMessageBox } from './ErrorMessageBox';
import { TreeSpeciesSelect } from './TreeSpeciesSelect';
import { estimateTreeEcoStats } from '@/lib/treeEcoEstimates';

type NumericField = 'diameter' | 'height' | 'circumference';

interface PlotDashboardProps {
  onConfirmAdd: (details: TreeDetails) => void;
  onCancel: () => void;
  onSelectManual: (details: TreeDetails) => void;
  onSelectDevice: (details: TreeDetails) => void;
  initialDetails?: TreeDetails | null;
  selectedLocation: MapCoordinate | null;
  isSelectingOnMap: boolean;
  locationError?: string | null;
  isSubmitting?: boolean;
  topInset?: number;
  bottomInset?: number;
}

const MAX_PHOTOS = 5;

export default function PlotDashboard({
  onConfirmAdd,
  onCancel,
  onSelectManual,
  onSelectDevice,
  initialDetails = null,
  selectedLocation,
  isSelectingOnMap,
  locationError,
  isSubmitting = false,
  topInset = 12,
  bottomInset = 104,
}: PlotDashboardProps) {
  const [species, setSpecies] = useState('');
  const [health, setHealth] = useState<TreeHealth>('ok');
  const [wildlifeList, setWildlifeList] = useState<string[]>([]);
  const [diseaseList, setDiseaseList] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [diameter, setDiameter] = useState('');
  const [height, setHeight] = useState('');
  const [circumference, setCircumference] = useState('');

  const [errors, setErrors] = useState<Record<NumericField, string>>({
    diameter: '',
    height: '',
    circumference: '',
  });

  const [photos, setPhotos] = useState<TreePhoto[]>([]);

  const { width } = useWindowDimensions();
  const isMobile = width < 900;
  const { showActionSheetWithOptions } = useActionSheet();

  useEffect(() => {
    setSpecies(initialDetails?.species ?? '');
    setHealth(initialDetails?.health ?? 'ok');
    setNotes(initialDetails?.notes ?? '');
    setWildlifeList(
      initialDetails?.wildlifeList ??
        (initialDetails?.wildlife ? [initialDetails.wildlife] : [])
    );
    setDiseaseList(
      initialDetails?.diseaseList ??
        (initialDetails?.disease ? [initialDetails.disease] : [])
    );
    setDiameter(
      initialDetails?.diameter === undefined || initialDetails.diameter === null
        ? ''
        : String(initialDetails.diameter)
    );
    setHeight(
      initialDetails?.height === undefined || initialDetails.height === null
        ? ''
        : String(initialDetails.height)
    );
    setCircumference(
      initialDetails?.circumference === undefined || initialDetails.circumference === null
        ? ''
        : String(initialDetails.circumference)
    );
    setPhotos(initialDetails?.photos ?? []);
  }, [initialDetails]);

  const isNumeric = (value: string) => /^(\d+)?([.]\d*)?$/.test(value);

  const handleNumericChange = (
    value: string,
    field: NumericField,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setter(value);
    setErrors((prev) => ({
      ...prev,
      [field]: value.trim() === '' || isNumeric(value) ? '' : 'Enter a valid number',
    }));
  };

  const validate = () => {
    const nextErrors: Record<NumericField, string> = {
      diameter: diameter.trim() && !isNumeric(diameter) ? 'Enter a valid number' : '',
      height: height.trim() && !isNumeric(height) ? 'Enter a valid number' : '',
      circumference:
        circumference.trim() && !isNumeric(circumference) ? 'Enter a valid number' : '',
    };

    setErrors(nextErrors);
    return Object.values(nextErrors).every((value) => value === '');
  };

  const buildTreeDetails = (): TreeDetails => {
    const estimates = estimateTreeEcoStats({
      species: species.trim() || undefined,
      diameter: diameter.trim() ? Number(diameter) : undefined,
      height: height.trim() ? Number(height) : undefined,
      circumference: circumference.trim() ? Number(circumference) : undefined,
    });

    return {
      species: species.trim() || undefined,
      health,
      notes: notes.trim() || undefined,
      wildlifeList: wildlifeList.map((entry) => entry.trim()).filter((entry) => entry.length > 0),
      diseaseList: diseaseList.map((entry) => entry.trim()).filter((entry) => entry.length > 0),
      diameter: estimates.diameter || undefined,
      height: estimates.height || undefined,
      circumference: estimates.circumference || undefined,
      avoidedRunoff: estimates.avoidedRunoff || undefined,
      carbonDioxideStored: estimates.carbonDioxideStored || undefined,
      carbonDioxideRemoved: estimates.carbonDioxideRemoved || undefined,
      waterIntercepted: estimates.waterIntercepted || undefined,
      airQualityImprovement: estimates.airQualityImprovement || undefined,
      leafArea: estimates.leafArea || undefined,
      evapotranspiration: estimates.evapotranspiration || undefined,
      photos,
    };
  };

  const updateListItem = (
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string
  ) => {
    const nextList = [...list];
    nextList[index] = value;
    setter(nextList);
  };

  const removeListItem = (
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) => {
    setter(list.filter((_, itemIndex) => itemIndex !== index));
  };

  const locationSummary = useMemo(() => {
    if (!selectedLocation) {
      return 'No location selected yet.';
    }

    return `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`;
  }, [selectedLocation]);

  const estimatedStats = useMemo(() => {
    return estimateTreeEcoStats({
      species,
      diameter: diameter.trim() ? Number(diameter) : undefined,
      height: height.trim() ? Number(height) : undefined,
      circumference: circumference.trim() ? Number(circumference) : undefined,
    });
  }, [species, diameter, height, circumference]);

  const upsertPhotoAtIndex = (
    photo: { uri: string; fileName?: string; mimeType?: string },
    slotIndex: number
  ) => {
    setPhotos((prev) => {
      const next = [...prev];

      const newPhoto: TreePhoto = {
        image_url: photo.uri,
        fileName: photo.fileName,
        mimeType: photo.mimeType,
      };

      if (slotIndex < next.length) {
        next[slotIndex] = newPhoto;
      } else if (next.length < MAX_PHOTOS) {
        next.push(newPhoto);
      }

      return next;
    });
  };

  const chooseImageSource = (slotIndex: number) => {
    const isWeb = Platform.OS === 'web';
    const options = isWeb
      ? ['Choose from Gallery', 'Remove Photo', 'Cancel']
      : ['Take Photo', 'Choose from Gallery', 'Remove Photo', 'Cancel'];

    const cancelButtonIndex = options.length - 1;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
      },
      async (selectedIndex) => {
        if (selectedIndex === undefined || selectedIndex === cancelButtonIndex) {
          return;
        }

        const removeIndex = isWeb ? 1 : 2;
        if (selectedIndex === removeIndex) {
          setPhotos((prev) => prev.filter((_, index) => index !== slotIndex));
          return;
        }

        if (!isWeb && selectedIndex === 0) {
          await takePhoto(slotIndex);
          return;
        }

        await pickImage(slotIndex);
      }
    );
  };

  const canAddPhoto = photos.length < MAX_PHOTOS;

  const pickImage = async (slotIndex: number) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      alert('Permission to access photos is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (result.canceled) {
      return;
    }

    const selected = result.assets[0];

    if (selected.mimeType === 'image/gif') {
      alert('GIF files are not supported. Please choose a static image.');
      return;
    }

    upsertPhotoAtIndex(
      {
        uri: selected.uri,
        fileName: selected.fileName ?? undefined,
        mimeType: selected.mimeType ?? undefined,
      },
      slotIndex
    );
  };

  const takePhoto = async (slotIndex: number) => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      alert('Camera permission is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (asset.mimeType === 'image/gif') {
      alert('GIF files are not supported. Please choose a static image.');
      return;
    }

    upsertPhotoAtIndex(
      {
        uri: asset.uri,
        fileName: asset.fileName ?? asset.uri.split('/').pop() ?? 'camera-photo.jpg',
        mimeType: asset.mimeType ?? 'image/jpeg',
      },
      slotIndex
    );
  };

  const summaryText = useMemo(() => {
    return `${photos.length}/${MAX_PHOTOS} photo${photos.length === 1 ? '' : 's'} selected`;
  }, [photos.length]);

  return (
    <View style={[styles.overlay, { top: topInset, bottom: bottomInset }]} pointerEvents="box-none">
      <View style={[styles.panel, isMobile ? styles.panelMobile : styles.panelDesktop]}>
        <ScrollView
          contentContainerStyle={styles.panelContent}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.headerRow}>
            <View>
              <AppText style={styles.eyebrow}>Add Tree</AppText>
              <AppText style={styles.title}>Tree Details</AppText>
              <AppText style={styles.subtitle}>Complete details, pick a location, then confirm to submit.</AppText>
            </View>

            <AppButton
              title="Close"
              variant="tertiary"
              onPress={onCancel}
              style={styles.closeButtonWrap}
              buttonStyle={styles.closeButton}
            />
          </View>

          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Observations</AppText>

            <TreeSpeciesSelect
              value={species}
              onChange={setSpecies}
            />

            <TreeHealthSelect value={health} onChange={setHealth} />

            <View style={styles.dynamicListSection}>
              <View style={styles.dynamicListHeader}>
                <AppText style={styles.dynamicListTitle}>Wildlife Seen</AppText>
              </View>

              {wildlifeList.length === 0 ? (
                <AppText style={styles.emptyListText}>No wildlife added yet.</AppText>
              ) : (
                wildlifeList.map((entry, index) => (
                  <View key={`wildlife-${index}`} style={styles.dynamicListRow}>
                    <AppInput
                      placeholder={`Wildlife ${index + 1}`}
                      value={entry}
                      onChangeText={(value) => updateListItem(wildlifeList, setWildlifeList, index, value)}
                      containerStyle={styles.dynamicListInputContainer}
                      style={styles.dynamicListInput}
                    />
                    <AppButton
                      title="Remove"
                      variant="primary"
                      onPress={() => removeListItem(wildlifeList, setWildlifeList, index)}
                      style={styles.removeActionWrap}
                      buttonStyle={styles.removeActionButton}
                      textStyle={styles.removeActionText}
                    />
                  </View>
                ))
              )}

              <AppButton
                title="Add Wildlife"
                variant="outline"
                onPress={() => setWildlifeList((current) => [...current, ''])}
                style={styles.fullWidthActionWrap}
                buttonStyle={styles.fullWidthActionButton}
                textStyle={styles.inlineActionText}
              />
            </View>

            <View style={styles.dynamicListSection}>
              <View style={styles.dynamicListHeader}>
                <AppText style={styles.dynamicListTitle}>Diseases</AppText>
              </View>

              {diseaseList.length === 0 ? (
                <AppText style={styles.emptyListText}>No diseases added yet.</AppText>
              ) : (
                diseaseList.map((entry, index) => (
                  <View key={`disease-${index}`} style={styles.dynamicListRow}>
                    <AppInput
                      placeholder={`Disease ${index + 1}`}
                      value={entry}
                      onChangeText={(value) => updateListItem(diseaseList, setDiseaseList, index, value)}
                      containerStyle={styles.dynamicListInputContainer}
                      style={styles.dynamicListInput}
                    />
                    <AppButton
                      title="Remove"
                      variant="primary"
                      onPress={() => removeListItem(diseaseList, setDiseaseList, index)}
                      style={styles.removeActionWrap}
                      buttonStyle={styles.removeActionButton}
                      textStyle={styles.removeActionText}
                    />
                  </View>
                ))
              )}

              <AppButton
                title="Add Disease"
                variant="outline"
                onPress={() => setDiseaseList((current) => [...current, ''])}
                style={styles.fullWidthActionWrap}
                buttonStyle={styles.fullWidthActionButton}
                textStyle={styles.inlineActionText}
              />
            </View>
          </View>

          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Measurements</AppText>

            <View style={styles.metricsRow}>
              <View style={styles.metricField}>
                <AppText style={styles.metricLabel}>Diameter</AppText>
                <View style={styles.inputWithUnit}>
                  <AppInput
                    placeholder="0"
                    value={diameter}
                    onChangeText={(value) => handleNumericChange(value, 'diameter', setDiameter)}
                    keyboardType="numeric"
                    invalid={!!errors.diameter}
                    containerStyle={styles.inputUnitContainer}
                  />
                  <AppText style={styles.unitLabel}>cm</AppText>
                </View>
                {errors.diameter ? <AppText style={styles.errorText}>{errors.diameter}</AppText> : null}
              </View>

              <View style={styles.metricField}>
                <AppText style={styles.metricLabel}>Height</AppText>
                <View style={styles.inputWithUnit}>
                  <AppInput
                    placeholder="0"
                    value={height}
                    onChangeText={(value) => handleNumericChange(value, 'height', setHeight)}
                    keyboardType="numeric"
                    invalid={!!errors.height}
                    containerStyle={styles.inputUnitContainer}
                  />
                  <AppText style={styles.unitLabel}>m</AppText>
                </View>
                {errors.height ? <AppText style={styles.errorText}>{errors.height}</AppText> : null}
              </View>
            </View>

            <View style={styles.metricField}>
              <AppText style={styles.metricLabel}>Circumference</AppText>
              <View style={styles.inputWithUnit}>
                <AppInput
                  placeholder="0"
                  value={circumference}
                  onChangeText={(value) =>
                    handleNumericChange(value, 'circumference', setCircumference)
                  }
                  keyboardType="numeric"
                  invalid={!!errors.circumference}
                  containerStyle={styles.inputUnitContainer}
                />
                <AppText style={styles.unitLabel}>cm</AppText>
              </View>
              {errors.circumference ? (
                <AppText style={styles.errorText}>{errors.circumference}</AppText>
              ) : null}
            </View>

            <View style={styles.estimateBox}>
              <AppText style={styles.estimateTitle}>Estimated Environmental Impact</AppText>
              <AppText style={styles.estimateItem}>
                Avoided Runoff: {estimatedStats.avoidedRunoff ?? '—'} m³
              </AppText>
              <AppText style={styles.estimateItem}>
                CO₂ Stored: {estimatedStats.carbonDioxideStored ?? '—'} kg
              </AppText>
              <AppText style={styles.estimateItem}>
                CO₂ Removed: {estimatedStats.carbonDioxideRemoved ?? '—'} kg
              </AppText>
              <AppText style={styles.estimateItem}>
                Water Intercepted: {estimatedStats.waterIntercepted ?? '—'} m³
              </AppText>
              <AppText style={styles.estimateItem}>
                Air Quality Gain: {estimatedStats.airQualityImprovement ?? '—'} g/year
              </AppText>
              <AppText style={styles.estimateItem}>
                Leaf Area: {estimatedStats.leafArea ?? '—'} m²
              </AppText>
              <AppText style={styles.estimateItem}>
                Evapotranspiration: {estimatedStats.evapotranspiration ?? '—'} m³
              </AppText>
            </View>
          </View>

          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Location</AppText>
            <AppText style={styles.locationText}>{locationSummary}</AppText>
            {isSelectingOnMap ? (
              <AppText style={styles.locationHint}>Click on the map to store a location.</AppText>
            ) : null}
            <ErrorMessageBox message={locationError || ''} visible={Boolean(locationError)} />

            <View style={styles.locationActionRow}>
              <AppButton
                title="Use My Location"
                variant="outline"
                onPress={() => {
                  if (!validate()) {
                    return;
                  }

                  onSelectDevice(buildTreeDetails());
                }}
                style={styles.locationButton}
              />

              <AppButton
                title="Select On Map"
                variant="primary"
                onPress={() => {
                  if (!validate()) {
                    return;
                  }

                  onSelectManual(buildTreeDetails());
                }}
                style={styles.locationButton}
              />
            </View>
          </View>

          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Photos</AppText>
            <AppText style={styles.photoHint}>Upload up to 5 photos</AppText>

            <TouchableOpacity
              onPress={() => {
                if (canAddPhoto) {
                  chooseImageSource(photos.length);
                }
              }}
              activeOpacity={0.85}
              style={[styles.uploadDropZone, !canAddPhoto && styles.uploadDropZoneDisabled]}
            >
              <AppText style={styles.cameraEmoji}>📷</AppText>
              <AppText style={styles.uploadTitle}>Tap to add a photo</AppText>
              <AppText style={styles.uploadSummary}>{summaryText}</AppText>
            </TouchableOpacity>

            {photos.length > 0 ? (
              <View style={styles.photoGrid}>
                {photos.map((photo, index) => (
                  <TouchableOpacity
                    key={`${photo}-${index}`}
                    onPress={() => chooseImageSource(index)}
                    style={styles.photoCard}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: photo.image_url }} style={styles.photoImage} />
                    <View style={styles.photoBadge}>
                      <AppText style={styles.photoBadgeText}>Edit</AppText>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Notes</AppText>
            <AppInput
              placeholder="Additional notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              style={styles.input}
            />
          </View>

          <View style={[styles.footer, isMobile && styles.footerMobile]}>
            <AppButton
              title="Cancel"
              variant="secondary"
              onPress={onCancel}
              style={[styles.footerButton, isMobile && styles.footerButtonMobile]}
            />

            <AppButton
              title={isSubmitting ? 'Submitting...' : 'Confirm Add Tree'}
              variant="primary"
              disabled={isSubmitting}
              onPress={() => {
                if (!validate()) {
                  return;
                }

                onConfirmAdd(buildTreeDetails());
              }}
              style={[styles.footerButton, isMobile && styles.footerButtonMobile]}
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
    right: 0,
    left: 0,
    zIndex: 220,
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 14,
  },

  panel: {
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#F7FAF6',
    borderWidth: 1,
    borderColor: '#D5E0D4',
    shadowColor: '#101A12',
    shadowOffset: { width: -2, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 18,
  },

  panelDesktop: {
    width: '42%',
    maxWidth: 560,
    minWidth: 430,
  },

  panelMobile: {
    width: '100%',
  },

  panelContent: {
    padding: 18,
    paddingBottom: 30,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  eyebrow: {
    ...Theme.Typography.caption,
    color: Theme.Colours.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },

  title: {
    ...Theme.Typography.subtitle,
    color: Theme.Colours.textPrimary,
  },

  subtitle: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginTop: 3,
    maxWidth: 300,
  },

  closeButtonWrap: {
    marginBottom: 0,
  },

  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 0,
  },

  section: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBE5DB',
    backgroundColor: Theme.Colours.white,
  },

  sectionTitle: {
    ...Theme.Typography.body,
    fontFamily: 'Poppins_600SemiBold',
    color: Theme.Colours.textPrimary,
    marginBottom: 10,
  },

  dynamicListSection: {
    marginTop: 8,
  },

  dynamicListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },

  dynamicListTitle: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textPrimary,
    fontFamily: 'Poppins_600SemiBold',
  },

  inlineActionWrap: {
    marginBottom: 0,
  },

  inlineActionButton: {
    marginBottom: 0,
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },

  inlineActionText: {
    fontSize: 13,
  },

  fullWidthActionWrap: {
    marginBottom: 0,
  },

  fullWidthActionButton: {
    width: '100%',
    marginBottom: 0,
    minHeight: 42,
    paddingVertical: 10,
    borderRadius: 12,
  },

  emptyListText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginBottom: 8,
  },

  dynamicListRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },

  dynamicListInput: {
    flex: 1,
  },

  dynamicListInputContainer: {
    flex: 1,
    marginBottom: 8,
  },

  removeActionWrap: {
    width: 108,
    alignSelf: 'stretch',
    marginBottom: 8,
  },

  removeActionButton: {
    flex: 1,
    minHeight: 0,
    height: '100%',
    marginBottom: 0,
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 0,
    backgroundColor: 'rgba(160, 28, 28, 0.58)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 214, 214, 0.42)',
    borderTopColor: 'rgba(255, 240, 240, 0.68)',
    shadowColor: '#220909',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },

  removeActionText: {
    color: Theme.Colours.white,
    fontSize: 13,
  },

  input: {
    marginBottom: 8,
  },

  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  metricField: {
    flex: 1,
  },

  errorText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.error,
    marginTop: -4,
    marginBottom: 8,
  },

  photoHint: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textMuted,
    marginBottom: 8,
  },

  locationText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textPrimary,
  },

  locationHint: {
    ...Theme.Typography.caption,
    color: Theme.Colours.secondary,
    marginTop: 6,
  },

  locationActionRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },

  locationButton: {
    flex: 1,
    marginBottom: 0,
  },

  uploadDropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#9AB89A',
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6EF',
  },

  uploadDropZoneDisabled: {
    opacity: 0.64,
  },

  cameraEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },

  uploadTitle: {
    ...Theme.Typography.body,
    fontFamily: 'Poppins_600SemiBold',
    color: Theme.Colours.textPrimary,
  },

  uploadSummary: {
    ...Theme.Typography.caption,
    marginTop: 4,
    color: Theme.Colours.textMuted,
  },

  photoGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  photoCard: {
    width: 88,
    height: 88,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#D4DED4',
  },

  photoImage: {
    width: '100%',
    height: '100%',
  },

  photoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(14, 23, 16, 0.78)',
  },

  photoBadgeText: {
    ...Theme.Typography.caption,
    color: Theme.Colours.white,
    lineHeight: 14,
    fontSize: 11,
  },

  footer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },

  footerMobile: {
    flexDirection: 'column-reverse',
  },

  footerButton: {
    flex: 1,
    marginBottom: 0,
  },

  footerButtonMobile: {
    width: '100%',
  },

  estimateBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F4FBF3',
    borderWidth: 1,
    borderColor: '#D7E4D4',
    gap: 4,
  },

  estimateTitle: {
    ...Theme.Typography.body,
    fontFamily: 'Poppins_600SemiBold',
    color: '#23422A',
    marginBottom: 4,
  },

  estimateItem: {
    ...Theme.Typography.caption,
    color: '#35503B',
  },

  metricLabel: {
    ...Theme.Typography.caption,
    color: Theme.Colours.textPrimary,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 4,
  },

  unitLabel: {
    ...Theme.Typography.body,
    color: Theme.Colours.textMuted,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    paddingRight: 4,
  },

  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },

  inputUnitContainer: {
    flex: 1,
    marginBottom: 0,
  },
});
